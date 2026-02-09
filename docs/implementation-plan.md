# FormulaQ Implementation Plan

## Table of Contents

1. [Clarifying Questions](#1-clarifying-questions)
2. [Component Decomposition](#2-component-decomposition)
3. [Approach Decisions](#3-approach-decisions)
4. [Implementation Steps](#4-implementation-steps)

---

## 1. Design Decisions

The following decisions have been made for this implementation:

| Question | Decision |
|----------|----------|
| **Package Structure** | Single package with subpaths (`formulaq/core`, `formulaq/editor`) |
| **Chemistry/RDKit** | Not included in MVP - completely omitted |
| **Evaluation Strategy** | Main thread with chunked execution (no Web Worker) |
| **Parser Library** | Chevrotain |
| **Preview with no data** | Show "No data to preview" message |
| **Number types** | All numbers as `number.float` |
| **Column rename** | Silent auto-update of dependent formulas |
| **Validation debounce** | Cascaded - preview runs after successful validation |

### Chunked Execution Strategy

Instead of Web Workers, evaluation will use a **chunked execution utility** that:
- Processes data in configurable chunk sizes (default: 1000 rows)
- Yields to the main thread between chunks (configurable wait: default 0ms, can use 16ms for 60fps)
- Reports progress after each chunk
- Supports cancellation via AbortSignal
- Is a generalized utility usable beyond just formula evaluation

```typescript
interface ChunkedExecutorOptions<T, R> {
  items: T[];
  chunkSize?: number;        // Default: 1000
  delayMs?: number;          // Default: 0 (uses setTimeout(0) to yield)
  process: (chunk: T[], startIndex: number) => R[];
  onProgress?: (completed: number, total: number) => void;
  signal?: AbortSignal;
}

function executeInChunks<T, R>(options: ChunkedExecutorOptions<T, R>): Promise<R[]>;
```

### Type Inference Mapping

```typescript
// GridColDef.type → ValueType mapping:
// 'number' → 'number.float'
// 'string' → 'string.text'
// 'boolean' → 'boolean.boolean'
// 'singleSelect' → 'string.text'
// undefined/other → 'string.text' (default)
```

### Other Defaults

- **Keyboard shortcuts**: Ctrl/Cmd+Enter to save, Escape to close, undo/redo via CodeMirror
- **Formula storage**: Raw strings (re-parsing is fast with Chevrotain)
- **Error aggregation**: Tooltip with error count on hover, click opens details dialog

---

## 2. Component Decomposition

### 2.1 Layer 1: FormulaQ Core (Zero dependencies)

```
src/core/
├── parser/
│   ├── Parser.ts              # Chevrotain-based parser
│   ├── Parser.test.ts
│   ├── tokens.ts              # Token definitions
│   └── grammar.ts             # Grammar rules
│
├── validator/
│   ├── Validator.ts           # Semantic validation
│   ├── Validator.test.ts
│   ├── Validator.types.ts
│   └── Validator.viewModel.ts # Pure validation logic
│
├── evaluator/
│   ├── Evaluator.ts           # Row and batch evaluation
│   ├── Evaluator.test.ts
│   ├── Evaluator.types.ts
│   └── Evaluator.viewModel.ts
│
├── functions/
│   ├── FunctionRegistry.ts    # Function storage and lookup
│   ├── FunctionRegistry.test.ts
│   ├── aggregations.ts        # SUM, AVG, MIN, MAX, COUNT, PERCENTILE
│   ├── aggregations.test.ts
│   ├── math.ts                # LOG, LOG10, POWER
│   ├── math.test.ts
│   ├── logical.ts             # IF, AND, OR, NOT, IFNULL
│   ├── logical.test.ts
│   ├── string.ts              # CONCAT
│   └── string.test.ts
│
├── utils/
│   ├── chunkedExecutor.ts     # Generalized chunked execution utility
│   └── chunkedExecutor.test.ts
│
├── types/
│   ├── ast.ts                 # ASTNode types
│   ├── values.ts              # Value, ValueType (no string.smiles)
│   ├── errors.ts              # FormulaError, SyntaxError, SemanticError
│   ├── context.ts             # EvaluationContext, VariableProvider
│   └── results.ts             # BatchResult, RuntimeError
│
├── engine.ts                  # FormulaQEngine facade
└── engine.test.ts
```

### 2.2 Layer 2: FormulaQ Editor (React + CodeMirror)

```
src/editor/
├── FormulaEditor/
│   ├── FormulaEditor.tsx         # Main editor component
│   ├── FormulaEditor.types.ts    # Props interface
│   ├── FormulaEditor.stories.tsx
│   └── FormulaEditor.viewModel.ts # Editor state logic
│
├── codemirror/
│   ├── formulaLanguage.ts        # Lezer grammar extension
│   ├── autocomplete.ts           # Autocomplete provider
│   ├── autocomplete.viewModel.ts # Autocomplete logic
│   ├── autocomplete.viewModel.test.ts
│   ├── highlighting.ts           # Syntax highlighting theme
│   └── errorMarker.ts            # Error underline extension
│
├── ValidationStatus/
│   ├── ValidationStatus.tsx
│   ├── ValidationStatus.types.ts
│   └── ValidationStatus.stories.tsx
│
└── hooks/
    ├── useFormulaValidation.ts   # Debounced validation hook
    └── useFormulaValidation.viewModel.ts
```

### 2.3 Layer 3a: FormulaQ Playground

```
src/playground/
├── Playground/
│   ├── Playground.tsx            # Main layout component
│   ├── Playground.types.ts
│   ├── Playground.stories.tsx
│   └── Playground.viewModel.ts   # State management logic
│
├── VariablePanel/
│   ├── VariablePanel.tsx         # Left panel container
│   ├── VariablePanel.types.ts
│   └── VariablePanel.stories.tsx
│
├── VariableEditor/
│   ├── VariableEditor.tsx        # Add/edit variable form
│   ├── VariableEditor.types.ts
│   ├── VariableEditor.stories.tsx
│   └── VariableEditor.viewModel.ts
│
├── VariableCard/
│   ├── VariableCard.tsx          # Single variable display
│   ├── VariableCard.types.ts
│   └── VariableCard.stories.tsx
│
├── ResultsPanel/
│   ├── ResultsPanel.tsx          # Right panel - results table
│   ├── ResultsPanel.types.ts
│   ├── ResultsPanel.stories.tsx
│   └── ResultsPanel.viewModel.ts
│
├── AggregationDisplay/
│   ├── AggregationDisplay.tsx    # Shows computed aggregations
│   ├── AggregationDisplay.types.ts
│   └── AggregationDisplay.stories.tsx
│
└── hooks/
    ├── usePlaygroundState.ts     # Main state hook
    └── usePlaygroundEvaluation.ts # Evaluation orchestration
```

### 2.4 Layer 3b: FormulaQ DataGrid Integration

```
src/datagrid/
├── FormulaColumnDialog/
│   ├── FormulaColumnDialog.tsx      # Modal dialog
│   ├── FormulaColumnDialog.types.ts
│   ├── FormulaColumnDialog.stories.tsx
│   └── FormulaColumnDialog.viewModel.ts
│
├── PreviewTable/
│   ├── PreviewTable.tsx             # Preview first 10 rows
│   ├── PreviewTable.types.ts
│   └── PreviewTable.stories.tsx
│
├── DeleteColumnDialog/
│   ├── DeleteColumnDialog.tsx       # Deletion confirmation
│   ├── DeleteColumnDialog.types.ts
│   └── DeleteColumnDialog.stories.tsx
│
├── ProgressOverlay/
│   ├── ProgressOverlay.tsx          # Evaluation progress (inline, not modal)
│   ├── ProgressOverlay.types.ts
│   └── ProgressOverlay.stories.tsx
│
├── adapters/
│   ├── GridVariableProvider.ts      # Columns → VariableProvider
│   ├── GridVariableProvider.test.ts
│   ├── GridEvaluationContext.ts     # Rows → EvaluationContext
│   └── GridEvaluationContext.test.ts
│
├── dependency/
│   ├── DependencyManager.ts         # Track formula dependencies
│   ├── DependencyManager.test.ts
│   ├── DependencyManager.viewModel.ts
│   └── topologicalSort.ts           # Evaluation ordering
│
└── hooks/
    ├── useFormulaColumns.ts         # Main integration hook
    └── useFormulaColumns.viewModel.ts
```

### 2.5 Component Hierarchy Diagram

```
App
├── DataGrid
│   ├── FormulaColumnDialog (modal)
│   │   ├── TextField (column name)
│   │   ├── FormulaEditor
│   │   │   ├── CodeMirror
│   │   │   │   ├── Autocomplete popup
│   │   │   │   └── Error markers
│   │   │   └── ValidationStatus
│   │   └── PreviewTable
│   │
│   ├── DeleteColumnDialog (modal)
│   └── RenameColumnDialog (modal)
│
└── Playground (standalone)
    ├── VariablePanel
    │   ├── VariableEditor (modal/inline)
    │   └── VariableCard (repeated)
    │
    ├── FormulaEditor (center)
    │
    └── ResultsPanel
        ├── AggregationDisplay
        └── ResultsTable
```

---

## 3. Approach Decisions

### 3.1 Parser Implementation

#### Approach A: Chevrotain (Recommended)

**Description**: Use Chevrotain to define tokens and grammar rules in TypeScript.

**Pros**:
- Excellent error messages with position info
- Fast parsing (~1ms for typical formulas)
- TypeScript-native, great IDE support
- Built-in support for error recovery
- Well-documented with many examples

**Cons**:
- Learning curve for team unfamiliar with parser combinators
- ~50KB bundle addition
- Grammar changes require understanding Chevrotain patterns

**Best when**: Production-quality error messages are important, formula complexity may grow.

**Estimated complexity**: Medium

---

#### Approach B: Hand-written Recursive Descent

**Description**: Write a custom parser from scratch with explicit recursive descent functions.

**Pros**:
- Full control over every aspect
- Zero dependencies
- Potentially smaller bundle

**Cons**:
- More code to write and maintain (~500-1000 lines)
- Error messages require manual implementation
- Harder to extend grammar later
- Higher risk of subtle bugs

**Best when**: Bundle size is critical, grammar is simple and won't change.

**Estimated complexity**: High

---

#### Recommendation: Approach A (Chevrotain)

Chevrotain provides the best balance of features, performance, and maintainability. The error message quality is critical for end-user experience, and the bundle size is acceptable.

---

### 3.2 State Management for Playground

#### Approach A: Local React State (Recommended)

**Description**: Use `useState` and `useReducer` within the Playground component tree.

**Pros**:
- Simple, no additional dependencies
- Easy to understand and debug
- View model pattern keeps logic testable

**Cons**:
- May become complex if state grows significantly

**Best when**: State is localized to Playground, no need for global state.

**Estimated complexity**: Low

---

#### Approach B: Zustand

**Description**: Use Zustand for lightweight global state.

**Pros**:
- Clean API, minimal boilerplate
- Easy to share state between components
- Good DevTools support

**Cons**:
- Additional dependency
- Overkill for MVP scope

**Best when**: State needs to be shared across many disconnected components.

**Estimated complexity**: Low-Medium

---

#### Recommendation: Approach A (Local State)

For MVP, local state with view models is sufficient. Playground state is self-contained. We can migrate to Zustand later if needed.

---

### 3.3 CodeMirror Grammar

#### Approach A: Lezer Grammar (Recommended)

**Description**: Write a Lezer grammar file that compiles to an incremental parser.

**Pros**:
- Incremental parsing (fast for large formulas)
- Integrates seamlessly with CodeMirror 6
- Provides syntax tree for highlighting
- Error recovery built-in

**Cons**:
- Lezer grammar syntax learning curve
- Build step required (lezer-generator)

**Best when**: Want best-in-class editor experience.

**Estimated complexity**: Medium

---

#### Approach B: StreamLanguage (Legacy Mode)

**Description**: Use CodeMirror's StreamLanguage with a simple token function.

**Pros**:
- Simpler to implement initially
- No separate grammar file
- No build step

**Cons**:
- Not incremental (slower on large inputs)
- Less accurate syntax tree
- CodeMirror docs recommend Lezer for new code

**Best when**: Quick prototype, grammar is very simple.

**Estimated complexity**: Low

---

#### Recommendation: Approach A (Lezer)

The grammar is moderately complex (operators, nested functions, strings). Lezer provides better long-term maintainability and performance.

---

## 4. Implementation Steps

### Phase 1: Project Setup & Core Types

---

#### Step 1: Initialize Project Structure

**Goal**: Set up single package with subpath exports, TypeScript, Vite, and tooling.

**Dependencies**: None

**Files to create/modify**:
- `package.json` - Package with exports field for subpaths
- `tsconfig.json` - TypeScript config with strict mode
- `vite.config.ts` - Vite configuration with library mode
- `oxlint.json` - Oxlint configuration
- `src/core/index.ts` - Core entry point (exports public API)
- `src/editor/index.ts` - Editor entry point
- `src/playground/index.ts` - Playground entry point
- `src/datagrid/index.ts` - DataGrid entry point

**Acceptance Criteria**:
- [ ] `pnpm install` succeeds
- [ ] `pnpm build` compiles TypeScript without errors
- [ ] `pnpm lint` runs Oxlint without errors
- [ ] `pnpm format` runs Oxfmt
- [ ] Package exports work: `import { parse } from 'formulaq/core'`

**Storybook**: No
**View Model**: No
**Unit Tests**: No

**Code Style Checkpoints**:
- [ ] No barrel files created (entry files export from specific modules)
- [ ] No argument destructuring in any function

---

#### Step 2: Define Core Type System

**Goal**: Create all TypeScript interfaces for the type system, AST, errors, and contexts.

**Dependencies**: Step 1

**Files to create/modify**:
- `src/core/types/values.ts` - `Value`, `ValueType`, `VariableInfo`
- `src/core/types/ast.ts` - All AST node types
- `src/core/types/errors.ts` - `FormulaError`, `SyntaxError`, `SemanticError`, `RuntimeError`
- `src/core/types/context.ts` - `VariableProvider`, `EvaluationContext`
- `src/core/types/results.ts` - `BatchResult`, `ValidatedAST`
- `src/core/types/functions.ts` - `FormulaFunction`, `ParamDef`, `FunctionInfo`

**Acceptance Criteria**:
- [ ] All types from spec §3-4 are defined (excluding `string.smiles`)
- [ ] `ValueType` = `'number.integer' | 'number.float' | 'string.text' | 'boolean.boolean'`
- [ ] Types compile without errors
- [ ] JSDoc comments on all public interfaces

**Storybook**: No
**View Model**: No
**Unit Tests**: No

**Code Style Checkpoints**:
- [ ] No barrel files created
- [ ] No argument destructuring in any function

---

### Phase 2: Parser Implementation

---

#### Step 3: Set Up Chevrotain and Define Tokens

**Goal**: Install Chevrotain and define all lexer tokens for the formula language.

**Dependencies**: Step 2

**Files to create/modify**:
- `package.json` - Add Chevrotain dependency
- `src/core/parser/tokens.ts` - Token definitions
- `src/core/parser/tokens.test.ts` - Token tests

**Acceptance Criteria**:
- [ ] All tokens from EBNF grammar defined: operators, literals, keywords, variable ref
- [ ] Tokens handle string escapes correctly
- [ ] Number literals handle scientific notation
- [ ] `@` prefix recognized for variables
- [ ] Whitespace ignored (but not in strings)

**Storybook**: No
**View Model**: No
**Unit Tests**: Yes - test tokenization of sample formulas

**Code Style Checkpoints**:
- [ ] No barrel files created
- [ ] No argument destructuring in any function

---

#### Step 4: Implement Chevrotain Grammar Rules

**Goal**: Define grammar rules to parse formulas into AST nodes.

**Dependencies**: Step 3

**Files to create/modify**:
- `src/core/parser/grammar.ts` - Grammar rules
- `src/core/parser/grammar.test.ts` - Grammar tests
- `src/core/parser/astBuilder.ts` - CST to AST visitor
- `src/core/parser/astBuilder.viewModel.ts` - Pure AST construction logic

**Acceptance Criteria**:
- [ ] All operators with correct precedence (^, *, /, %, +, -, &, comparisons)
- [ ] Right-associative exponentiation
- [ ] Unary operators (-, +)
- [ ] Function calls with arbitrary arguments
- [ ] Variable references with `@` prefix
- [ ] Parentheses for grouping
- [ ] Multi-line formulas work

**Storybook**: No
**View Model**: Yes - `astBuilder.viewModel.ts` for pure AST construction
**Unit Tests**: Yes - test parsing various formulas

**Code Style Checkpoints**:
- [ ] No barrel files created
- [ ] No argument destructuring in any function

---

#### Step 5: Create Parser Facade with Error Handling

**Goal**: Create the main `parse()` function with detailed error messages and position info.

**Dependencies**: Step 4

**Files to create/modify**:
- `src/core/parser/Parser.ts` - Main parser class
- `src/core/parser/Parser.test.ts` - Parser tests
- `src/core/parser/Parser.viewModel.ts` - Error formatting logic

**Acceptance Criteria**:
- [ ] `parse(formula: string): ASTNode` works for valid formulas
- [ ] `SyntaxError` thrown for invalid formulas with position info
- [ ] Error messages include what was expected vs found
- [ ] Position info includes start and end offsets
- [ ] Parser is stateless (can be reused)

**Storybook**: No
**View Model**: Yes - error message formatting
**Unit Tests**: Yes - test error cases

**Code Style Checkpoints**:
- [ ] No barrel files created
- [ ] No argument destructuring in any function

---

### Phase 3: Validator Implementation

---

#### Step 6: Implement Variable Resolution

**Goal**: Validate that all `@variable` references exist in the VariableProvider.

**Dependencies**: Step 5

**Files to create/modify**:
- `src/core/validator/Validator.ts` - Validator class
- `src/core/validator/Validator.types.ts` - Validator-specific types
- `src/core/validator/variableResolver.ts` - Variable lookup logic
- `src/core/validator/variableResolver.test.ts`
- `src/core/validator/variableResolver.viewModel.ts`

**Acceptance Criteria**:
- [ ] Unknown variables produce `SemanticError`
- [ ] Error includes variable name and position
- [ ] All variables extracted and returned in `ValidatedAST.dependencies`
- [ ] Works with simple VariableProvider mock

**Storybook**: No
**View Model**: Yes - `variableResolver.viewModel.ts`
**Unit Tests**: Yes - test unknown variable detection

**Code Style Checkpoints**:
- [ ] No barrel files created
- [ ] No argument destructuring in any function

---

#### Step 7: Implement Type Checking

**Goal**: Validate type compatibility for operators and ensure type inference.

**Dependencies**: Step 6

**Files to create/modify**:
- `src/core/validator/typeChecker.ts` - Type checking logic
- `src/core/validator/typeChecker.test.ts`
- `src/core/validator/typeChecker.viewModel.ts` - Pure type inference

**Acceptance Criteria**:
- [ ] Arithmetic operators require numeric operands
- [ ] Comparison operators work on compatible types
- [ ] String concatenation (`&`) requires string operands
- [ ] Boolean operators require boolean operands
- [ ] `SemanticError` for type mismatches with clear message
- [ ] Return type inferred for entire expression

**Storybook**: No
**View Model**: Yes - `typeChecker.viewModel.ts`
**Unit Tests**: Yes - test type mismatch cases

**Code Style Checkpoints**:
- [ ] No barrel files created
- [ ] No argument destructuring in any function

---

#### Step 8: Implement Function Signature Validation

**Goal**: Validate function calls against FunctionRegistry signatures.

**Dependencies**: Step 7

**Files to create/modify**:
- `src/core/validator/functionValidator.ts` - Function call validation
- `src/core/validator/functionValidator.test.ts`
- `src/core/validator/functionValidator.viewModel.ts`

**Acceptance Criteria**:
- [ ] Unknown function names produce `SemanticError`
- [ ] Wrong argument count produces error
- [ ] Wrong argument types produce error
- [ ] Optional arguments handled correctly
- [ ] Variadic functions (AND, OR, CONCAT) work
- [ ] Aggregation functions validated for variable ref arguments

**Storybook**: No
**View Model**: Yes - `functionValidator.viewModel.ts`
**Unit Tests**: Yes - test function validation

**Code Style Checkpoints**:
- [ ] No barrel files created
- [ ] No argument destructuring in any function

---

#### Step 9: Complete Validator with Aggregation Detection

**Goal**: Finalize validator to produce `ValidatedAST` with aggregation info.

**Dependencies**: Step 8

**Files to create/modify**:
- `src/core/validator/Validator.ts` - Complete implementation
- `src/core/validator/Validator.test.ts`
- `src/core/validator/aggregationDetector.ts` - Find aggregation calls
- `src/core/validator/aggregationDetector.viewModel.ts`

**Acceptance Criteria**:
- [ ] `ValidatedAST` includes `hasAggregations: boolean`
- [ ] `ValidatedAST` includes `aggregations: string[]` (function names)
- [ ] `ValidatedAST` includes `resultType: ValueType`
- [ ] Full formula validation in single pass
- [ ] All error types tested

**Storybook**: No
**View Model**: Yes - aggregation detection
**Unit Tests**: Yes - comprehensive validator tests

**Code Style Checkpoints**:
- [ ] No barrel files created
- [ ] No argument destructuring in any function

---

### Phase 4: Function Registry

---

#### Step 10: Create Function Registry

**Goal**: Build registry for storing and looking up function definitions.

**Dependencies**: Step 2

**Files to create/modify**:
- `src/core/functions/FunctionRegistry.ts` - Registry class
- `src/core/functions/FunctionRegistry.test.ts`
- `src/core/functions/FunctionRegistry.types.ts`

**Acceptance Criteria**:
- [ ] `registerFunction(fn: FormulaFunction)` adds function
- [ ] `getFunction(name: string)` retrieves function
- [ ] `getFunctions()` returns all for autocomplete
- [ ] `hasFunction(name: string)` checks existence
- [ ] Case-sensitive lookup

**Storybook**: No
**View Model**: No (simple CRUD)
**Unit Tests**: Yes - registry operations

**Code Style Checkpoints**:
- [ ] No barrel files created
- [ ] No argument destructuring in any function

---

#### Step 11: Implement Aggregation Functions

**Goal**: Implement SUM, AVG, MIN, MAX, COUNT, PERCENTILE.

**Dependencies**: Step 10

**Files to create/modify**:
- `src/core/functions/aggregations.ts` - All aggregation functions
- `src/core/functions/aggregations.test.ts`
- `src/core/functions/aggregations.viewModel.ts` - Pure computation logic

**Acceptance Criteria**:
- [ ] All 6 aggregation functions implemented
- [ ] Null values skipped correctly
- [ ] All-null returns null (except COUNT returns 0)
- [ ] PERCENTILE handles k=0 and k=100 edge cases
- [ ] Functions marked as `isAggregation: true`

**Storybook**: No
**View Model**: Yes - pure math operations
**Unit Tests**: Yes - comprehensive edge cases

**Code Style Checkpoints**:
- [ ] No barrel files created
- [ ] No argument destructuring in any function

---

#### Step 12: Implement Math Functions

**Goal**: Implement LOG, LOG10, POWER.

**Dependencies**: Step 10

**Files to create/modify**:
- `src/core/functions/math.ts` - Math functions
- `src/core/functions/math.test.ts`
- `src/core/functions/math.viewModel.ts`

**Acceptance Criteria**:
- [ ] LOG(x) returns natural log
- [ ] LOG10(x) returns base-10 log
- [ ] POWER(x, n) returns x^n
- [ ] Domain errors return null (LOG(0), LOG(-1), etc.)
- [ ] Null input returns null

**Storybook**: No
**View Model**: Yes - pure math
**Unit Tests**: Yes - including domain errors

**Code Style Checkpoints**:
- [ ] No barrel files created
- [ ] No argument destructuring in any function

---

#### Step 13: Implement Logical Functions

**Goal**: Implement IF, AND, OR, NOT, IFNULL.

**Dependencies**: Step 10

**Files to create/modify**:
- `src/core/functions/logical.ts` - Logical functions
- `src/core/functions/logical.test.ts`
- `src/core/functions/logical.viewModel.ts`

**Acceptance Criteria**:
- [ ] IF(cond, then, else) returns correct branch
- [ ] AND(...) returns true if all true, variadic
- [ ] OR(...) returns true if any true, variadic
- [ ] NOT(x) inverts boolean
- [ ] IFNULL(value, default) returns default if null
- [ ] Short-circuit evaluation for AND/OR

**Storybook**: No
**View Model**: Yes - pure logic
**Unit Tests**: Yes - truth tables

**Code Style Checkpoints**:
- [ ] No barrel files created
- [ ] No argument destructuring in any function

---

#### Step 14: Implement String Functions

**Goal**: Implement CONCAT.

**Dependencies**: Step 10

**Files to create/modify**:
- `src/core/functions/string.ts` - String functions
- `src/core/functions/string.test.ts`
- `src/core/functions/string.viewModel.ts`

**Acceptance Criteria**:
- [ ] CONCAT(s1, s2, ...) joins strings
- [ ] Variadic (2+ arguments)
- [ ] Null handling: null in any position makes result null
- [ ] Empty string preserved (not treated as null)

**Storybook**: No
**View Model**: Yes
**Unit Tests**: Yes

**Code Style Checkpoints**:
- [ ] No barrel files created
- [ ] No argument destructuring in any function

---

### Phase 5: Evaluator Implementation

---

#### Step 15: Create Chunked Executor Utility

**Goal**: Create a generalized utility for chunked async execution on main thread.

**Dependencies**: Step 2

**Files to create/modify**:
- `src/core/utils/chunkedExecutor.ts` - Chunked execution utility
- `src/core/utils/chunkedExecutor.test.ts`

**Acceptance Criteria**:
- [ ] `executeInChunks<T, R>(options)` processes items in batches
- [ ] Configurable `chunkSize` (default: 1000)
- [ ] Configurable `delayMs` between chunks (default: 0, uses setTimeout(0))
- [ ] `onProgress(completed, total)` callback after each chunk
- [ ] `AbortSignal` support for cancellation
- [ ] Returns `Promise<R[]>` with all results
- [ ] Throws on abort with partial results available

**Storybook**: No
**View Model**: No (utility)
**Unit Tests**: Yes - chunking, progress, cancellation

**Code Style Checkpoints**:
- [ ] No barrel files created
- [ ] No argument destructuring in any function

---

#### Step 16: Implement Row-Level Evaluator

**Goal**: Evaluate expressions for a single row.

**Dependencies**: Steps 9, 11-14

**Files to create/modify**:
- `src/core/evaluator/Evaluator.ts` - Evaluator class
- `src/core/evaluator/Evaluator.types.ts`
- `src/core/evaluator/rowEvaluator.ts` - Single row evaluation
- `src/core/evaluator/rowEvaluator.test.ts`
- `src/core/evaluator/rowEvaluator.viewModel.ts` - Pure evaluation logic

**Acceptance Criteria**:
- [ ] `evaluateRow(ast, context)` returns single Value
- [ ] All operators implemented correctly
- [ ] Null propagation works
- [ ] Function calls invoke registered functions
- [ ] Runtime errors return null (don't throw)

**Storybook**: No
**View Model**: Yes - `rowEvaluator.viewModel.ts`
**Unit Tests**: Yes - evaluate various expressions

**Code Style Checkpoints**:
- [ ] No barrel files created
- [ ] No argument destructuring in any function

---

#### Step 17: Implement Aggregation Pre-computation

**Goal**: Compute aggregations once before row evaluation.

**Dependencies**: Step 16

**Files to create/modify**:
- `src/core/evaluator/aggregationComputer.ts` - Compute aggregations
- `src/core/evaluator/aggregationComputer.test.ts`
- `src/core/evaluator/aggregationComputer.viewModel.ts`

**Acceptance Criteria**:
- [ ] Extract all aggregation calls from AST
- [ ] Compute each aggregation once
- [ ] Cache results in evaluation context
- [ ] Replace aggregation nodes with cached values during row eval

**Storybook**: No
**View Model**: Yes
**Unit Tests**: Yes - test aggregation caching

**Code Style Checkpoints**:
- [ ] No barrel files created
- [ ] No argument destructuring in any function

---

#### Step 18: Implement Batch Evaluator

**Goal**: Evaluate all rows with chunking and progress reporting using chunkedExecutor.

**Dependencies**: Steps 15, 17

**Files to create/modify**:
- `src/core/evaluator/batchEvaluator.ts` - Batch evaluation
- `src/core/evaluator/batchEvaluator.test.ts`
- `src/core/evaluator/batchEvaluator.viewModel.ts`

**Acceptance Criteria**:
- [ ] `evaluateBatch(ast, context)` returns `Promise<BatchResult>`
- [ ] Uses `executeInChunks` internally
- [ ] Configurable chunk size (default 1000) and delay (default 0)
- [ ] Calls `onProgress(completed, total)` after each chunk
- [ ] Respects `AbortSignal` for cancellation
- [ ] Collects runtime errors (doesn't throw)
- [ ] Returns `BatchResult` with values and errors

**Storybook**: No
**View Model**: Yes
**Unit Tests**: Yes - test chunking, cancellation

**Code Style Checkpoints**:
- [ ] No barrel files created
- [ ] No argument destructuring in any function

---

#### Step 19: Create FormulaQEngine Facade

**Goal**: Create main engine facade combining parser, validator, evaluator.

**Dependencies**: Step 18

**Files to create/modify**:
- `src/core/engine.ts` - Main engine facade
- `src/core/engine.test.ts`

**Acceptance Criteria**:
- [ ] Implements `FormulaQEngine` interface from spec
- [ ] `parse()`, `validate()`, `evaluateRow()`, `evaluateBatch()`, `execute()`
- [ ] `getFunctions()` returns all registered functions
- [ ] `registerFunction()` adds custom functions
- [ ] `getDependencies()` extracts variable refs
- [ ] Factory function `createFormulaEngine()` creates engine

**Storybook**: No
**View Model**: No (facade pattern)
**Unit Tests**: Yes - integration tests

**Code Style Checkpoints**:
- [ ] No barrel files created
- [ ] No argument destructuring in any function

---

### Phase 6: Editor Component

---

#### Step 20: Set Up Storybook

**Goal**: Configure Storybook 10 for component development.

**Dependencies**: Step 1

**Files to create/modify**:
- `.storybook/main.ts` - Storybook config
- `.storybook/preview.tsx` - Preview decorators
- `package.json` - Add Storybook dependencies

**Acceptance Criteria**:
- [ ] `pnpm storybook` starts Storybook
- [ ] MUI theme configured
- [ ] Stories can import from `formulaq/core`

**Storybook**: Yes (setup)
**View Model**: No
**Unit Tests**: No

**Code Style Checkpoints**:
- [ ] No barrel files created
- [ ] No argument destructuring in any function

---

#### Step 21: Create Lezer Grammar for Formula Language

**Goal**: Define Lezer grammar for syntax highlighting.

**Dependencies**: Step 20

**Files to create/modify**:
- `src/editor/codemirror/formula.grammar` - Lezer grammar
- `src/editor/codemirror/formulaLanguage.ts` - CodeMirror extension
- `package.json` - Add @lezer/generator dependency

**Acceptance Criteria**:
- [ ] Grammar recognizes all token types
- [ ] Syntax tree nodes for variables, functions, operators, literals
- [ ] Build step generates parser from grammar
- [ ] Incremental parsing works

**Storybook**: No
**View Model**: No
**Unit Tests**: No (tested via highlighting)

**Code Style Checkpoints**:
- [ ] No barrel files created
- [ ] No argument destructuring in any function

---

#### Step 22: Implement Syntax Highlighting Theme

**Goal**: Create color theme for formula syntax.

**Dependencies**: Step 21

**Files to create/modify**:
- `src/editor/codemirror/highlighting.ts` - Highlight styles
- `src/editor/codemirror/highlighting.stories.tsx` - Preview stories

**Acceptance Criteria**:
- [ ] Variables (`@name`) highlighted in blue
- [ ] Functions highlighted in purple
- [ ] Numbers in green
- [ ] Strings in orange
- [ ] Operators in gray
- [ ] Works with light theme

**Storybook**: Yes - highlighting preview story
**View Model**: No
**Unit Tests**: No

**Code Style Checkpoints**:
- [ ] No barrel files created
- [ ] No argument destructuring in any function

---

#### Step 23: Implement Autocomplete Extension

**Goal**: CodeMirror autocomplete for variables and functions.

**Dependencies**: Steps 21, 10

**Files to create/modify**:
- `src/editor/codemirror/autocomplete.ts` - Autocomplete extension
- `src/editor/codemirror/autocomplete.viewModel.ts` - Completion logic
- `src/editor/codemirror/autocomplete.viewModel.test.ts`
- `src/editor/codemirror/autocomplete.stories.tsx`

**Acceptance Criteria**:
- [ ] `@` triggers variable suggestions
- [ ] Letter triggers function suggestions
- [ ] Suggestions filtered by prefix
- [ ] Shows type info for variables
- [ ] Shows signature for functions
- [ ] Keyboard navigation works (up/down, Tab, Escape)

**Storybook**: Yes - autocomplete demo story
**View Model**: Yes - `autocomplete.viewModel.ts`
**Unit Tests**: Yes - completion generation logic

**Code Style Checkpoints**:
- [ ] No barrel files created
- [ ] No argument destructuring in any function

---

#### Step 24: Implement Error Marker Extension

**Goal**: Underline errors in editor with red squiggles.

**Dependencies**: Step 21

**Files to create/modify**:
- `src/editor/codemirror/errorMarker.ts` - Error decoration
- `src/editor/codemirror/errorMarker.stories.tsx`

**Acceptance Criteria**:
- [ ] Errors underlined with red wavy line
- [ ] Tooltip shows error message on hover
- [ ] Multiple errors can be shown simultaneously
- [ ] Decorations update when errors change

**Storybook**: Yes - error display story
**View Model**: No
**Unit Tests**: No

**Code Style Checkpoints**:
- [ ] No barrel files created
- [ ] No argument destructuring in any function

---

#### Step 25: Create ValidationStatus Component

**Goal**: Status bar showing validation result below editor.

**Dependencies**: Step 20

**Files to create/modify**:
- `src/editor/ValidationStatus/ValidationStatus.tsx`
- `src/editor/ValidationStatus/ValidationStatus.types.ts`
- `src/editor/ValidationStatus/ValidationStatus.stories.tsx`

**Acceptance Criteria**:
- [ ] Shows "Formula is valid" in green when valid (checkmark icon)
- [ ] Shows error message in red when invalid (X icon)
- [ ] Shows "Validating..." during validation
- [ ] Compact design fits below editor

**Storybook**: Yes - all states
**View Model**: No (presentational)
**Unit Tests**: No

**Code Style Checkpoints**:
- [ ] No barrel files created
- [ ] No argument destructuring in any function

---

#### Step 26: Create FormulaEditor Component

**Goal**: Main editor component combining CodeMirror with all extensions.

**Dependencies**: Steps 22-25

**Files to create/modify**:
- `src/editor/FormulaEditor/FormulaEditor.tsx`
- `src/editor/FormulaEditor/FormulaEditor.types.ts`
- `src/editor/FormulaEditor/FormulaEditor.stories.tsx`
- `src/editor/FormulaEditor/FormulaEditor.viewModel.ts`

**Acceptance Criteria**:
- [ ] Renders CodeMirror with formula language
- [ ] Props: `value`, `onChange`, `variableProvider`, `onValidation`
- [ ] Debounced validation (300ms)
- [ ] Validation status displayed
- [ ] Error markers shown in editor
- [ ] Autocomplete works

**Storybook**: Yes - interactive story with controls
**View Model**: Yes - validation orchestration
**Unit Tests**: No (component tested via Storybook)

**Code Style Checkpoints**:
- [ ] No barrel files created
- [ ] No argument destructuring in any function

---

### Phase 7: Playground

---

#### Step 27: Create VariableCard Component

**Goal**: Display a single test variable with edit/delete actions.

**Dependencies**: Step 20

**Files to create/modify**:
- `src/playground/VariableCard/VariableCard.tsx`
- `src/playground/VariableCard/VariableCard.types.ts`
- `src/playground/VariableCard/VariableCard.stories.tsx`

**Acceptance Criteria**:
- [ ] Shows variable name and type
- [ ] Shows preview of values (truncated if long)
- [ ] Edit button opens editor
- [ ] Delete button with confirmation
- [ ] Compact card design

**Storybook**: Yes - card variants
**View Model**: No (presentational)
**Unit Tests**: No

**Code Style Checkpoints**:
- [ ] No barrel files created
- [ ] No argument destructuring in any function

---

#### Step 28: Create VariableEditor Component

**Goal**: Form for adding/editing test variables.

**Dependencies**: Step 27

**Files to create/modify**:
- `src/playground/VariableEditor/VariableEditor.tsx`
- `src/playground/VariableEditor/VariableEditor.types.ts`
- `src/playground/VariableEditor/VariableEditor.stories.tsx`
- `src/playground/VariableEditor/VariableEditor.viewModel.ts`
- `src/playground/VariableEditor/VariableEditor.viewModel.test.ts`

**Acceptance Criteria**:
- [ ] Name input with validation (no spaces, valid chars)
- [ ] Type selector dropdown
- [ ] Values input (JSON array or comma-separated)
- [ ] Parse and validate values against type
- [ ] Save/Cancel buttons
- [ ] Works for both add and edit modes

**Storybook**: Yes - add mode, edit mode
**View Model**: Yes - input parsing and validation
**Unit Tests**: Yes - value parsing logic

**Code Style Checkpoints**:
- [ ] No barrel files created
- [ ] No argument destructuring in any function

---

#### Step 29: Create VariablePanel Component

**Goal**: Left panel container for variable list.

**Dependencies**: Steps 27-28

**Files to create/modify**:
- `src/playground/VariablePanel/VariablePanel.tsx`
- `src/playground/VariablePanel/VariablePanel.types.ts`
- `src/playground/VariablePanel/VariablePanel.stories.tsx`

**Acceptance Criteria**:
- [ ] "Variables" header with "+ Add" button
- [ ] Lists all VariableCards
- [ ] Opens VariableEditor on add/edit
- [ ] Handles empty state

**Storybook**: Yes - with variables, empty state
**View Model**: No (composition)
**Unit Tests**: No

**Code Style Checkpoints**:
- [ ] No barrel files created
- [ ] No argument destructuring in any function

---

#### Step 30: Create ResultsPanel Component

**Goal**: Right panel showing evaluation results table.

**Dependencies**: Step 20

**Files to create/modify**:
- `src/playground/ResultsPanel/ResultsPanel.tsx`
- `src/playground/ResultsPanel/ResultsPanel.types.ts`
- `src/playground/ResultsPanel/ResultsPanel.stories.tsx`
- `src/playground/ResultsPanel/ResultsPanel.viewModel.ts`

**Acceptance Criteria**:
- [ ] Table with Index and Result columns
- [ ] Shows null and error values distinctly
- [ ] Statistics section: Min, Max, Nulls, Errors
- [ ] Handles empty state (no results yet)
- [ ] Scrollable for many rows

**Storybook**: Yes - with results, errors, empty
**View Model**: Yes - statistics calculation
**Unit Tests**: Yes - statistics logic

**Code Style Checkpoints**:
- [ ] No barrel files created
- [ ] No argument destructuring in any function

---

#### Step 31: Create AggregationDisplay Component

**Goal**: Display computed aggregation values.

**Dependencies**: Step 20

**Files to create/modify**:
- `src/playground/AggregationDisplay/AggregationDisplay.tsx`
- `src/playground/AggregationDisplay/AggregationDisplay.types.ts`
- `src/playground/AggregationDisplay/AggregationDisplay.stories.tsx`

**Acceptance Criteria**:
- [ ] Lists aggregation function calls and their values
- [ ] Format: "AVG(@score) = 86.6"
- [ ] Handles no aggregations gracefully
- [ ] Updates when formula changes

**Storybook**: Yes - with aggregations, empty
**View Model**: No (presentational)
**Unit Tests**: No

**Code Style Checkpoints**:
- [ ] No barrel files created
- [ ] No argument destructuring in any function

---

#### Step 32: Create Playground State Hook

**Goal**: Main state management for Playground.

**Dependencies**: Steps 29-31, Step 26

**Files to create/modify**:
- `src/playground/hooks/usePlaygroundState.ts`
- `src/playground/hooks/usePlaygroundState.viewModel.ts`
- `src/playground/hooks/usePlaygroundState.viewModel.test.ts`

**Acceptance Criteria**:
- [ ] State: variables, formula, ast, validationError, results, runtimeErrors
- [ ] Actions: addVariable, editVariable, removeVariable, setFormula
- [ ] Creates VariableProvider from variables
- [ ] Creates EvaluationContext from variables
- [ ] Triggers evaluation on valid formula + variable changes

**Storybook**: No (hook)
**View Model**: Yes - state transitions
**Unit Tests**: Yes - state logic

**Code Style Checkpoints**:
- [ ] No barrel files created
- [ ] No argument destructuring in any function

---

#### Step 33: Create Playground Component

**Goal**: Main Playground layout combining all panels.

**Dependencies**: Steps 32, 26

**Files to create/modify**:
- `src/playground/Playground/Playground.tsx`
- `src/playground/Playground/Playground.types.ts`
- `src/playground/Playground/Playground.stories.tsx`

**Acceptance Criteria**:
- [ ] Three-panel layout: Variables | Editor | Results
- [ ] Responsive (panels stack on mobile)
- [ ] Header with title
- [ ] All interactions work end-to-end

**Storybook**: Yes - full interactive story
**View Model**: No (composition)
**Unit Tests**: No

**Code Style Checkpoints**:
- [ ] No barrel files created
- [ ] No argument destructuring in any function

---

### Phase 8: DataGrid Integration

---

#### Step 34: Create GridVariableProvider Adapter

**Goal**: Adapt DataGrid columns to VariableProvider interface.

**Dependencies**: Step 2

**Files to create/modify**:
- `src/datagrid/adapters/GridVariableProvider.ts`
- `src/datagrid/adapters/GridVariableProvider.test.ts`
- `src/datagrid/adapters/GridVariableProvider.viewModel.ts`

**Acceptance Criteria**:
- [ ] Takes `GridColDef[]` as input
- [ ] Maps column types to ValueType (all numbers → `number.float`)
- [ ] Includes formula columns in provider
- [ ] `getVariables()` returns all columns
- [ ] `getVariableType()` returns inferred type

**Storybook**: No
**View Model**: Yes - type mapping logic
**Unit Tests**: Yes - type inference

**Code Style Checkpoints**:
- [ ] No barrel files created
- [ ] No argument destructuring in any function

---

#### Step 35: Create GridEvaluationContext Adapter

**Goal**: Adapt DataGrid rows to EvaluationContext interface.

**Dependencies**: Step 34

**Files to create/modify**:
- `src/datagrid/adapters/GridEvaluationContext.ts`
- `src/datagrid/adapters/GridEvaluationContext.test.ts`
- `src/datagrid/adapters/GridEvaluationContext.viewModel.ts`

**Acceptance Criteria**:
- [ ] Takes row data array as input
- [ ] Converts to `variables: Record<string, Value[]>`
- [ ] Handles null/undefined cell values
- [ ] Sets `rowCount` correctly
- [ ] Can attach AbortSignal and onProgress

**Storybook**: No
**View Model**: Yes - row conversion logic
**Unit Tests**: Yes - data conversion

**Code Style Checkpoints**:
- [ ] No barrel files created
- [ ] No argument destructuring in any function

---

#### Step 36: Create DependencyManager

**Goal**: Track dependencies between formula columns for evaluation ordering and rename propagation.

**Dependencies**: Step 19

**Files to create/modify**:
- `src/datagrid/dependency/DependencyManager.ts`
- `src/datagrid/dependency/DependencyManager.test.ts`
- `src/datagrid/dependency/DependencyManager.viewModel.ts`
- `src/datagrid/dependency/topologicalSort.ts`
- `src/datagrid/dependency/topologicalSort.test.ts`

**Acceptance Criteria**:
- [ ] Build dependency graph from formula columns
- [ ] Detect circular references
- [ ] Topological sort for evaluation order
- [ ] `getEvaluationOrder()` returns ordered column IDs
- [ ] `getDependents(columnId)` returns columns that depend on given column
- [ ] `getBlockers(columnId)` returns columns that block deletion
- [ ] `updateReferences(oldName, newName)` updates all formulas referencing renamed column

**Storybook**: No
**View Model**: Yes - graph algorithms
**Unit Tests**: Yes - graph operations, cycle detection, rename propagation

**Code Style Checkpoints**:
- [ ] No barrel files created
- [ ] No argument destructuring in any function

---

#### Step 37: Create PreviewTable Component

**Goal**: Table showing first 10 rows of formula preview.

**Dependencies**: Step 20

**Files to create/modify**:
- `src/datagrid/PreviewTable/PreviewTable.tsx`
- `src/datagrid/PreviewTable/PreviewTable.types.ts`
- `src/datagrid/PreviewTable/PreviewTable.stories.tsx`

**Acceptance Criteria**:
- [ ] Shows referenced variables and result
- [ ] Shows aggregation intermediate values
- [ ] Handles null and error values
- [ ] "No data to preview" empty state
- [ ] Compact table styling

**Storybook**: Yes - with data, empty, errors
**View Model**: No (presentational)
**Unit Tests**: No

**Code Style Checkpoints**:
- [ ] No barrel files created
- [ ] No argument destructuring in any function

---

#### Step 38: Create FormulaColumnDialog Component

**Goal**: Modal dialog for creating/editing formula columns.

**Dependencies**: Steps 26, 37

**Files to create/modify**:
- `src/datagrid/FormulaColumnDialog/FormulaColumnDialog.tsx`
- `src/datagrid/FormulaColumnDialog/FormulaColumnDialog.types.ts`
- `src/datagrid/FormulaColumnDialog/FormulaColumnDialog.stories.tsx`
- `src/datagrid/FormulaColumnDialog/FormulaColumnDialog.viewModel.ts`

**Acceptance Criteria**:
- [ ] Column name input with uniqueness validation
- [ ] FormulaEditor integration
- [ ] PreviewTable showing results
- [ ] Create/Save and Cancel buttons
- [ ] Create disabled when invalid
- [ ] Edit mode pre-populates values
- [ ] Handles formula evaluation for preview

**Storybook**: Yes - create mode, edit mode
**View Model**: Yes - dialog state management
**Unit Tests**: No (tested via Storybook)

**Code Style Checkpoints**:
- [ ] No barrel files created
- [ ] No argument destructuring in any function

---

#### Step 39: Create DeleteColumnDialog Component

**Goal**: Confirmation dialog for deleting formula columns.

**Dependencies**: Step 36

**Files to create/modify**:
- `src/datagrid/DeleteColumnDialog/DeleteColumnDialog.tsx`
- `src/datagrid/DeleteColumnDialog/DeleteColumnDialog.types.ts`
- `src/datagrid/DeleteColumnDialog/DeleteColumnDialog.stories.tsx`

**Acceptance Criteria**:
- [ ] Shows column name being deleted
- [ ] Lists dependent columns that block deletion
- [ ] Delete button disabled if blocked
- [ ] Simple confirmation if no dependents
- [ ] Cancel and Delete buttons

**Storybook**: Yes - blocked, unblocked states
**View Model**: No (presentational)
**Unit Tests**: No

**Code Style Checkpoints**:
- [ ] No barrel files created
- [ ] No argument destructuring in any function

---

#### Step 40: Create ProgressOverlay Component

**Goal**: Inline overlay showing evaluation progress for large datasets.

**Dependencies**: Step 20

**Files to create/modify**:
- `src/datagrid/ProgressOverlay/ProgressOverlay.tsx`
- `src/datagrid/ProgressOverlay/ProgressOverlay.types.ts`
- `src/datagrid/ProgressOverlay/ProgressOverlay.stories.tsx`

**Acceptance Criteria**:
- [ ] Linear progress bar with percentage
- [ ] Rows processed / total display
- [ ] Cancel button
- [ ] Fades out on completion
- [ ] Shows only after 500ms threshold (handled by parent)

**Storybook**: Yes - various progress states
**View Model**: No (presentational)
**Unit Tests**: No

**Code Style Checkpoints**:
- [ ] No barrel files created
- [ ] No argument destructuring in any function

---

#### Step 41: Create useFormulaColumns Hook

**Goal**: Main hook for managing formula columns in DataGrid.

**Dependencies**: Steps 34-40

**Files to create/modify**:
- `src/datagrid/hooks/useFormulaColumns.ts`
- `src/datagrid/hooks/useFormulaColumns.viewModel.ts`
- `src/datagrid/hooks/useFormulaColumns.viewModel.test.ts`

**Acceptance Criteria**:
- [ ] Takes `baseColumns` and `rows` as input
- [ ] Returns augmented `columns` array with formula columns
- [ ] `addFormula(name, formula)` creates new column
- [ ] `editFormula(id, formula)` updates existing
- [ ] `removeFormula(id)` deletes column
- [ ] `renameColumn(oldName, newName)` silently updates dependent formulas
- [ ] Returns `isEvaluating` and `progress` state
- [ ] Evaluates in dependency order using chunked executor

**Storybook**: No (hook)
**View Model**: Yes - formula column management
**Unit Tests**: Yes - state management logic

**Code Style Checkpoints**:
- [ ] No barrel files created
- [ ] No argument destructuring in any function

---

### Phase 9: Integration & Polish

---

#### Step 42: Create Full DataGrid Integration Demo

**Goal**: Complete working demo of DataGrid with formula columns.

**Dependencies**: Step 41

**Files to create/modify**:
- `src/datagrid/demo/DataGridDemo.tsx`
- `src/datagrid/demo/DataGridDemo.stories.tsx`
- `src/datagrid/demo/sampleData.ts`

**Acceptance Criteria**:
- [ ] DataGrid with sample data (100+ rows)
- [ ] "+ Formula Column" toolbar button
- [ ] Create formula column via dialog
- [ ] Edit formula via column menu
- [ ] Delete formula via column menu
- [ ] Formula columns update on source data change

**Storybook**: Yes - interactive demo
**View Model**: No
**Unit Tests**: No

**Code Style Checkpoints**:
- [ ] No barrel files created
- [ ] No argument destructuring in any function

---

#### Step 43: Add End-to-End Storybook Tests

**Goal**: Add play functions to stories for interaction testing.

**Dependencies**: Steps 26, 33, 42

**Files to create/modify**:
- `src/editor/FormulaEditor/FormulaEditor.stories.tsx` - Add play functions
- `src/playground/Playground/Playground.stories.tsx` - Add play functions
- `src/datagrid/FormulaColumnDialog/FormulaColumnDialog.stories.tsx` - Add play functions

**Acceptance Criteria**:
- [ ] FormulaEditor: type formula, verify autocomplete, verify validation
- [ ] Playground: add variable, enter formula, verify results
- [ ] Dialog: create formula column, verify preview, save

**Storybook**: Yes - play functions
**View Model**: No
**Unit Tests**: No

**Code Style Checkpoints**:
- [ ] No barrel files created
- [ ] No argument destructuring in any function

---

#### Step 44: Performance Testing & Optimization

**Goal**: Verify performance requirements are met with chunked execution.

**Dependencies**: Steps 41-42

**Files to create/modify**:
- `src/core/__benchmarks__/evaluation.bench.ts` - Benchmark tests
- `src/datagrid/demo/LargeDataDemo.stories.tsx` - Large dataset story

**Acceptance Criteria**:
- [ ] 1,000 rows evaluates in < 100ms
- [ ] 100,000 rows evaluates in < 1s with progress updates
- [ ] 1,000,000 rows shows progress, can cancel, UI responsive
- [ ] Chunk size tunable for different formula complexities
- [ ] Memory usage reasonable for large datasets

**Storybook**: Yes - large data demo
**View Model**: No
**Unit Tests**: No (benchmarks)

**Code Style Checkpoints**:
- [ ] No barrel files created
- [ ] No argument destructuring in any function

---

#### Step 45: Documentation & API Reference

**Goal**: Add JSDoc documentation and usage examples.

**Dependencies**: All previous steps

**Files to create/modify**:
- All public API files - Add comprehensive JSDoc
- `README.md` - Main usage documentation
- `src/core/README.md` - Core API documentation
- `src/editor/README.md` - Editor component documentation
- `src/playground/README.md` - Playground documentation
- `src/datagrid/README.md` - DataGrid integration documentation

**Acceptance Criteria**:
- [ ] All public functions have JSDoc with examples
- [ ] All interfaces have property descriptions
- [ ] README files have quick-start guides
- [ ] README files have API reference sections
- [ ] Storybook docs pages for each component

**Storybook**: Yes - MDX docs
**View Model**: No
**Unit Tests**: No

**Code Style Checkpoints**:
- [ ] No barrel files created
- [ ] No argument destructuring in any function

---

## Summary

### Total Steps: 44 (Steps 2-45)

**Note:** Step 1 (project skeleton) was pre-existing. The implementation covers Steps 2-45, for a total of 44 actionable steps.

### Phase Breakdown:

| Phase | Steps | Description |
|-------|-------|-------------|
| 1. Project Setup | 1-2 | Initialize structure and types |
| 2. Parser | 3-5 | Chevrotain-based parser |
| 3. Validator | 6-9 | Type checking and semantic validation |
| 4. Functions | 10-14 | Function registry and implementations |
| 5. Evaluator | 15-19 | Chunked executor, row/batch evaluation |
| 6. Editor | 20-26 | CodeMirror-based formula editor |
| 7. Playground | 27-33 | Interactive testing UI |
| 8. DataGrid | 34-41 | MUI DataGrid integration |
| 9. Polish | 42-45 | Demos, tests, documentation |

### Critical Path:

```
Types (2) → Parser (3-5) → Validator (6-9) → Functions (10-14)
    ↓
Chunked Executor (15) → Evaluator (16-19)
    ↓
Storybook (20) → Editor (21-26) → Playground (27-33)
    ↓
DataGrid Adapters (34-36) → DataGrid UI (37-41) → Integration (42-45)
```

### Key Dependencies:

- **Storybook setup (20)** blocks all UI development
- **Parser (5)** blocks Validator
- **Function Registry (10)** blocks function implementations
- **Chunked Executor (15)** enables non-blocking batch evaluation
- **FormulaEditor (26)** blocks Playground and DataGrid dialogs
- **DependencyManager (36)** handles silent rename propagation
