# Formula Engine Specification

## Extensible Formula Engine for React Applications

**Version:** 1.0
**Status:** Implementation Complete

---

## Table of Contents

1. [Overview](#1-overview)
2. [Syntax & Grammar](#2-syntax--grammar)
3. [Type System](#3-type-system)
4. [Core API](#4-core-api)
5. [Function Library](#5-function-library)
6. [Evaluation Model](#6-evaluation-model)
7. [Editor UI/UX](#7-editor-uiux)
8. [Error Handling](#8-error-handling)
9. [Performance & Scalability](#9-performance--scalability)
10. [Extending the Engine](#10-extending-the-engine)

---

## 1. Overview

### 1.1 Purpose

The **Formula Engine** is a flexible, reusable formula evaluation engine that enables users to define expressions over named variables. The engine is designed to be **context-agnostic** — it can power:

- **MUI DataGrid** — derived columns with row-level and aggregate computations
- **Batch data processing** — transform arrays of data programmatically
- **Interactive playgrounds** — test and validate formulas in isolation
- **Export/transformation pipelines** — apply formulas during data export

### 1.2 Design Goals

| Goal | Description |
|------|-------------|
| **Decoupled** | Core engine has zero UI dependencies; can run in browser, Node.js, or Web Worker |
| **Usability** | Excel-inspired syntax familiar to scientists; rich editor with autocomplete and syntax highlighting |
| **Correctness** | Strict typing with clear errors; scientific precision prioritized over convenience |
| **Extensibility** | Adding new functions is trivial; architecture supports future async/server-side evaluation |
| **Performance** | Handle datasets from 20 to 20 million rows without freezing UI |
| **Self-Documenting** | All function documentation embedded in code; single source of truth |

### 1.3 Architectural Layers

| Layer | Dependencies | Package |
|-------|--------------|---------|
| **Core Engine** | None (pure TypeScript) | `formulaq/core` |
| **Editor** | React, CodeMirror | `formulaq/editor` |
| **Integrations** | Core + Editor + target | `formulaq/datagrid`, `formulaq/playground` |

### 1.4 System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Formula Engine                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │    Parser    │  │  Validator   │  │     Evaluator        │  │
│  │              │  │              │  │                      │  │
│  │  Chevrotain  │──│  Type Check  │──│  Row Evaluator       │  │
│  │  Lexer       │  │  Var Resolve │  │  Batch Evaluator     │  │
│  │  Grammar     │  │  Func Valid  │  │  Aggregation Cache   │  │
│  │  AST Builder │  │  Agg Detect  │  │  Chunked Executor    │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                   Function Registry                       │  │
│  │                                                           │  │
│  │  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────┐ │  │
│  │  │ Aggregation│ │    Math    │ │  Logical   │ │ String │ │  │
│  │  │ SUM, AVG   │ │ LOG, POWER │ │ IF, AND    │ │ CONCAT │ │  │
│  │  │ MIN, MAX   │ │ LOG10      │ │ OR, NOT    │ │        │ │  │
│  │  │ COUNT      │ │            │ │ IFNULL     │ │        │ │  │
│  │  │ PERCENTILE │ │            │ │            │ │        │ │  │
│  │  └────────────┘ └────────────┘ └────────────┘ └────────┘ │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 1.5 Design Principles

#### Self-Documenting Functions

All function metadata lives in the function definition itself. This single source of truth powers runtime evaluation, validation, editor autocomplete, function browser, and generated documentation.

| Traditional Approach | Formula Engine Approach |
|---------------------|-------------------------|
| Code and docs separate | Docs embedded in code |
| Docs get stale | Docs always accurate |
| Manual sync required | Automatic sync |
| Runtime and docs diverge | Single source of truth |

#### Null Propagation

All operations follow SQL-like null semantics:

- `null + 5` → `null`
- `null == null` → `null` (not `true`)
- Aggregations skip nulls: `SUM([1, null, 3])` → `4`

#### ViewModels Pattern

For complex functions, extract pure computation logic into separate viewModel files for testability:

```typescript
// sqrt.viewModel.ts - Pure function, easy to test
export function computeSqrt(x: number | null): number | null {
  if (x === null) return null;
  if (x < 0) return null;
  return Math.sqrt(x);
}

// sqrt.ts - Formula Engine wrapper
export const SQRT: FormulaFunction = {
  // ... metadata ...
  async evaluate(args) {
    const result = computeSqrt(args[0]?.value as number | null);
    return { type: 'number.float', value: result };
  },
};
```

### 1.6 Module Responsibilities

Each module has a clear, single responsibility:

| Module | Responsibility |
|--------|----------------|
| `formula-parser/` | Lexing and parsing formulas to AST |
| `formula-validator/` | Type checking and semantic validation |
| `formula-evaluator/` | Row-level and batch evaluation |
| `functions/` | Function definitions and registry |
| `editor/` | React components for formula editing |
| `datagrid/` | MUI DataGrid integration |

---

## 2. Syntax & Grammar

### 2.1 Variable References

Variables are referenced using the `@` prefix:

```
@variable_name
@result_data.minimized_affinity
@mol_structure
```

**Rules:**

- Variable names are case-sensitive
- Valid characters: alphanumeric, underscore (`_`), period (`.`)
- No spaces or special characters
- The `@` prefix is mandatory for all variable references
- Periods are part of the identifier (not property access)

### 2.2 Function Calls

Functions use standard call syntax:

```
FUNCTION_NAME(arg1, arg2, ...)
```

**Rules:**

- Function names are case-sensitive (e.g., `MAX` ≠ `max`)
- Parentheses are required, even for zero-argument functions
- Arguments are comma-separated
- Nested function calls are supported to arbitrary depth

### 2.3 Operators

#### Arithmetic Operators

| Operator | Description | Example | Precedence |
|----------|-------------|---------|------------|
| `^` | Exponentiation | `@x ^ 2` | 1 (highest) |
| `*` | Multiplication | `@x * @y` | 2 |
| `/` | Division | `@x / @y` | 2 |
| `%` | Modulo | `@x % 10` | 2 |
| `+` | Addition | `@x + @y` | 3 |
| `-` | Subtraction | `@x - @y` | 3 |
| `-` | Unary negation | `-@x` | 1 |
| `+` | Unary plus (no-op) | `+@x` | 1 |

**Precedence:** Standard mathematical precedence. Exponentiation (`^`) is right-associative.

```
2 + 3 * 4       → 14 (not 20)
2 ^ 3 ^ 2       → 512 (2^9, right-associative)
-2 ^ 2          → -4 (negation after exponentiation)
```

#### Comparison Operators

| Operator | Description | Example |
|----------|-------------|---------|
| `==` | Equal | `@x == @y` |
| `!=` | Not equal | `@x != @y` |
| `<>` | Not equal (alt) | `@x <> @y` |
| `<` | Less than | `@x < @y` |
| `>` | Greater than | `@x > @y` |
| `<=` | Less or equal | `@x <= @y` |
| `>=` | Greater or equal | `@x >= @y` |

**Result:** Boolean (`TRUE` or `FALSE`)

#### String Concatenation

| Operator | Description | Example |
|----------|-------------|---------|
| `&` | Concatenate | `@first_name & " " & @last_name` |

### 2.4 Literals

#### Numeric Literals

```
42
3.14159
-1.5e10
.5
```

#### String Literals

Both single and double quotes are supported:

```
"hello world"
'hello world'
```

#### Boolean Literals

```
TRUE
FALSE
```

### 2.5 Built-in Constants

| Constant | Value | Description |
|----------|-------|-------------|
| `PI` | 3.141592653589793 | Pi |
| `E` | 2.718281828459045 | Euler's number |
| `TRUE` | true | Boolean true |
| `FALSE` | false | Boolean false |

### 2.6 Grammar (EBNF)

```ebnf
formula      = expression ;

expression   = comparison ;

comparison   = additive { comp_op additive } ;
comp_op      = "==" | "!=" | "<>" | "<" | ">" | "<=" | ">=" ;

additive     = multiplicative { ("+" | "-" | "&") multiplicative } ;
multiplicative = unary { ("*" | "/" | "%") unary } ;

unary        = ("-" | "+") unary | power ;
power        = primary ["^" unary] ;  (* right-associative *)

primary      = literal
             | constant
             | variable_ref
             | function_call
             | "(" expression ")" ;

variable_ref = "@" identifier ;
identifier   = (letter | "_") { letter | digit | "_" | "." } ;

function_call = function_name "(" [ arg_list ] ")" ;
function_name = letter { letter | digit | "_" } ;
arg_list     = expression { "," expression } ;

literal      = number | string | boolean ;
number       = ["-"] digit+ ["." digit+] [("e"|"E") ["+"|"-"] digit+] ;
string       = '"' { any_char_except_quote | escape } '"'
             | "'" { any_char_except_quote | escape } "'" ;
boolean      = "TRUE" | "FALSE" ;

constant     = "PI" | "E" | "TRUE" | "FALSE" ;
```

**Note:** Logical operations (`AND`, `OR`, `NOT`) are implemented as functions, not operators:

```
AND(@a > 0, @b > 0, @c > 0)   ✓ Correct (variadic function)
@a > 0 AND @b > 0             ✗ Invalid (no keyword operators)

NOT(@x > 5)                    ✓ Correct (function)
NOT @x > 5                     ✗ Invalid (no prefix operator)
```

---

## 3. Type System

### 3.1 Data Types

| Type | Description | Examples |
|------|-------------|----------|
| `number.integer` | Whole numbers | `42`, `-7`, `0` |
| `number.float` | IEEE 754 double-precision float | `3.14`, `-1e10`, `0.5` |
| `string.text` | UTF-8 text | `"hello"`, `'world'` |
| `boolean.boolean` | True or false | `TRUE`, `FALSE` |

**Nullability:** Each variable/column has a `nullable: boolean` property. Null values are represented as `value: null` within the Value interface.

### 3.2 Null Handling

**Null propagation:** Most operations return `null` if any operand is `null`:

```
@colA + @colB   → null if either is null
@colA * 2       → null if @colA is null
```

**Aggregations skip nulls:**

```
SUM(@col)       → sum of non-null values
AVG(@col)       → average of non-null values
COUNT(@col)     → count of non-null values
```

**All-null aggregation:** When all values are null, aggregations return `null` (Excel-like behavior).

**Comparison with null operands:** Following SQL three-valued logic, comparison operators return `null` when either operand is `null`:

```
null == null    → null (not true)
null != 5       → null
@x > 0          → null if @x is null
```

**Empty string is NOT null:** Empty string (`""`) is a valid string value, distinct from `null`.

### 3.3 Type Coercion

**Strict typing:** No implicit coercion. Type mismatches produce errors.

| Expression | Result |
|------------|--------|
| `"5" + 3` | Error: cannot add string and number |
| `5 + "hello"` | Error: cannot add number and string |
| `TRUE + 1` | Error: cannot add boolean and number |
| `@num_col & "suffix"` | Error: `&` requires string operands |

**Explicit conversion:** Use `IF` for type conversion when needed:

```
IF(TRUE, 1, 0)                    → 1 (boolean to number)
IF(@num > 0, "positive", "zero")  → string result based on number
```

### 3.4 Boolean Semantics

Booleans are distinct from numbers:

- `TRUE` and `FALSE` are not `1` and `0`
- Use `IF(condition, 1, 0)` for numeric conversion
- Comparison operators return boolean
- Logical functions (`AND`, `OR`, `NOT`) require boolean arguments

---

## 4. Core API

### 4.1 VariableProvider Interface

The `VariableProvider` supplies information about available variables at **parse/validation time**. This enables autocomplete and type checking without requiring actual data.

```typescript
interface VariableProvider {
  /** List all available variable names with metadata. */
  getVariables(): VariableInfo[];

  /** Check if a variable exists. */
  hasVariable(name: string): boolean;

  /** Get type information for a variable. */
  getVariableType(name: string): ValueType | undefined;

  /** Check if a variable can contain null values. */
  isNullable(name: string): boolean;
}

interface VariableInfo {
  name: string;
  type: ValueType;
  nullable: boolean;
  description?: string;
  group?: string;
}
```

### 4.2 EvaluationContext Interface

The `EvaluationContext` provides actual values at **evaluation time**.

```typescript
interface EvaluationContext {
  /** Variable values as arrays. */
  variables: Record<string, Value[]>;

  /** Current row index for row-level operations. */
  currentIndex?: number;

  /** Total number of rows. */
  rowCount: number;

  /** Abort signal for cancellation support. */
  signal?: AbortSignal;

  /** Progress callback for long operations. */
  onProgress?: (completed: number, total: number) => void;
}

type ValueType =
  | 'number.integer'
  | 'number.float'
  | 'string.text'
  | 'boolean.boolean';

interface Value {
  type: ValueType;
  value: number | string | boolean | null;
}
```

### 4.3 FormulaEngine Interface

```typescript
interface FormulaEngine {
  /** Parse a formula string into an AST. */
  parse(formula: string): ASTNode;

  /** Validate an AST against a variable provider. */
  validate(ast: ASTNode, provider: VariableProvider): ValidatedAST;

  /** Evaluate a single row. */
  evaluateRow(ast: ValidatedAST, context: EvaluationContext): Promise<Value>;

  /** Evaluate all rows with progress reporting. */
  evaluateBatch(ast: ValidatedAST, context: EvaluationContext): Promise<BatchResult>;

  /** Convenience: parse + validate + evaluateBatch. */
  execute(
    formula: string,
    provider: VariableProvider,
    context: EvaluationContext
  ): Promise<BatchResult>;

  /** Get all registered functions (for autocomplete). */
  getFunctions(): FunctionInfo[];

  /** Register a custom function. */
  registerFunction(fn: FormulaFunction): void;

  /** Extract variable references from an AST. */
  getDependencies(ast: ASTNode): string[];
}

interface BatchResult {
  values: Value[];
  errors: RuntimeError[];
  hasErrors: boolean;
  successCount: number;
  errorCount: number;
}

interface ValidatedAST {
  root: ASTNode;
  resultType: ValueType;
  dependencies: string[];
  hasAggregations: boolean;
  aggregations: string[];
}
```

### 4.4 AST Node Types

```typescript
type ASTNode =
  | LiteralNode
  | VariableRefNode
  | BinaryOpNode
  | UnaryOpNode
  | FunctionCallNode;

interface LiteralNode {
  type: 'Literal';
  valueType: ValueType;
  value: number | string | boolean | null;
}

interface VariableRefNode {
  type: 'VariableRef';
  name: string;
}

interface BinaryOpNode {
  type: 'BinaryOp';
  operator: '+' | '-' | '*' | '/' | '^' | '%' | '&'
          | '==' | '!=' | '<>' | '<' | '>' | '<=' | '>=';
  left: ASTNode;
  right: ASTNode;
}

interface UnaryOpNode {
  type: 'UnaryOp';
  operator: '-' | '+';
  operand: ASTNode;
}

interface FunctionCallNode {
  type: 'FunctionCall';
  name: string;
  args: ASTNode[];
}
```

### 4.5 Error Types

```typescript
class FormulaError extends Error {
  constructor(
    message: string,
    public code: string,
    public position?: { start: number; end: number }
  ) {
    super(message);
  }
}

class SyntaxError extends FormulaError {}
class SemanticError extends FormulaError {}

interface RuntimeError {
  rowIndex: number;
  variableName?: string;
  code: RuntimeErrorCode;
  message: string;
  details?: Record<string, unknown>;
}

type RuntimeErrorCode =
  | 'DIV_BY_ZERO'
  | 'DOMAIN_ERROR'
  | 'OVERFLOW'
  | 'TYPE_ERROR'
  | 'NULL_ERROR';
```

---

## 5. Function Library

### 5.1 Aggregation Functions

Aggregations operate on entire variable arrays and return a single scalar value that broadcasts to all rows.

| Function | Signature | Description |
|----------|-----------|-------------|
| `SUM` | `SUM(@col) → number` | Sum of non-null values |
| `AVG` | `AVG(@col) → number` | Arithmetic mean of non-null values |
| `MIN` | `MIN(@col) → number` | Minimum non-null value |
| `MAX` | `MAX(@col) → number` | Maximum non-null value |
| `COUNT` | `COUNT(@col) → number` | Count of non-null values |
| `PERCENTILE` | `PERCENTILE(@col, k) → number` | k-th percentile (k in 0-100) |

**Broadcast behavior:**

```
@value / MAX(@value)   → Each row's value divided by column maximum
@score - AVG(@score)   → Deviation from mean for each row
```

### 5.2 Row-Level Math Functions

| Function | Signature | Description |
|----------|-----------|-------------|
| `LOG` | `LOG(x) → number` | Natural logarithm (ln) |
| `LOG10` | `LOG10(x) → number` | Base-10 logarithm |
| `POWER` | `POWER(x, n) → number` | x raised to power n (same as `x ^ n`) |

**Domain errors return null:**

- `LOG(0)` → `null`
- `LOG(-1)` → `null`
- `POWER(-1, 0.5)` → `null`

### 5.3 Logical Functions

| Function | Signature | Description |
|----------|-----------|-------------|
| `IF` | `IF(condition, then_value, else_value) → any` | Conditional expression |
| `AND` | `AND(cond1, cond2, ...) → boolean` | True if all conditions true |
| `OR` | `OR(cond1, cond2, ...) → boolean` | True if any condition true |
| `NOT` | `NOT(condition) → boolean` | Logical negation |
| `IFNULL` | `IFNULL(value, default) → any` | Return default if value is null |

**Examples:**

```
IF(@score > 50, "pass", "fail")
AND(@age >= 18, @consent == TRUE)
IFNULL(@optional_value, 0)
```

### 5.4 String Functions

| Function | Signature | Description |
|----------|-----------|-------------|
| `CONCAT` | `CONCAT(s1, s2, ...) → string` | Concatenate strings |

**Note:** The `&` operator is equivalent to `CONCAT()`.

### 5.5 Function Registry Interface

Functions are self-documenting — all metadata lives in the function definition:

```typescript
interface FormulaFunction {
  name: string;
  description: string;
  params: ParamDef[];
  returnType: ValueType;
  isAggregation: boolean;
  isVariadic?: boolean;
  minArgs?: number;
  maxArgs?: number;
  category?: string;
  examples?: FunctionExample[];

  evaluate(args: readonly Value[], context: EvaluationContext): Promise<Value | null>;
}

interface FunctionExample {
  formula: string;
  description: string;
}

interface ParamDef {
  name: string;
  type: ValueType | ValueType[] | 'any';
  description: string;
  optional?: boolean;
  defaultValue?: Value;
}
```

**Example registration:**

```typescript
engine.registerFunction({
  name: 'AVG',
  description: 'Calculate arithmetic mean of values',
  params: [
    { name: 'values', type: ['number.integer', 'number.float'], description: 'Numeric values' }
  ],
  returnType: 'number.float',
  isAggregation: true,
  category: 'Aggregation',
  examples: [
    { formula: 'AVG(@score)', description: 'Average of all scores' },
    { formula: '@value / AVG(@value)', description: 'Normalize values to mean' }
  ],
  async evaluate(args, context) {
    // Implementation
  }
});
```

---

## 6. Evaluation Model

### 6.1 Evaluation Modes

#### Row-Level Evaluation

Most expressions evaluate per-row:

```
@colA + @colB           → Computed for each row independently
LOG(@value)             → Computed for each row
IF(@x > 0, @x, 0)       → Computed for each row
```

#### Aggregation with Broadcast

Aggregation functions compute once and broadcast:

```
@value / AVG(@value)
```

Evaluation:

1. Compute `AVG(@value)` → single scalar (e.g., `50`)
2. For each row: compute `@value / 50`

#### Mixed Expressions

Expressions can combine both modes:

```
(@score - AVG(@score)) / PERCENTILE(@score, 75)
```

Evaluation:

1. Compute all aggregations first (single pass over data)
2. Then evaluate row-level expression with aggregation results as constants

### 6.2 Aggregation Pre-computation

```
Formula: "@price - AVG(@price)"

Step 1: Detect aggregations           Step 2: Pre-compute           Step 3: Row evaluation

AVG(@price) found                      AVG(@price) = 45.50          Row 0: 29.99 - 45.50 = -15.51
                                       (computed once)               Row 1: 59.99 - 45.50 =  14.49
                                       (cached)                      Row 2: 49.99 - 45.50 =   4.49
```

### 6.3 Dependency Graph

Formula columns can reference other formula columns:

```
FormulaCol1 = @colA + @colB
FormulaCol2 = @FormulaCol1 * 2
FormulaCol3 = @FormulaCol2 / AVG(@FormulaCol1)
```

**Dependency resolution:**

1. Build directed acyclic graph (DAG) of formula dependencies
2. Topological sort to determine evaluation order
3. Evaluate in order, caching intermediate results

**Circular reference detection:**

- Detect cycles during formula creation/edit
- Reject formulas that would create cycles
- Display clear error: "Circular reference: FormulaCol1 → FormulaCol2 → FormulaCol1"

---

## 7. Editor UI/UX

### 7.1 Entry Point

**Toolbar button:** "+ Formula Column" button in the DataGrid toolbar.

### 7.2 Editor Dialog

Modal dialog with the following components:

```
┌─────────────────────────────────────────────────────────────────┐
│  Create Formula Column                                     [X]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Column Name:  [________________________]                       │
│                                                                 │
│  Formula:                                                       │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ @value / AVG(@value) * 100                              │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ✓ Formula is valid                                      │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Preview (first 10 rows):                                       │
│  ┌─────────────┬─────────────┬─────────────────┐               │
│  │ @value      │ AVG(@value) │ Result          │               │
│  ├─────────────┼─────────────┼─────────────────┤               │
│  │ 50          │ 45          │ 111.11          │               │
│  │ 40          │ 45          │ 88.89           │               │
│  │ 45          │ 45          │ 100.00          │               │
│  └─────────────┴─────────────┴─────────────────┘               │
│                                                                 │
│                              [Cancel]  [Create Column]          │
└─────────────────────────────────────────────────────────────────┘
```

### 7.3 Formula Editor Features

#### Syntax Highlighting

| Token Type | Color (suggested) |
|------------|-------------------|
| Variable reference (`@name`) | Blue |
| Function name | Purple |
| Number literal | Green |
| String literal | Orange |
| Operator | Gray |
| Parentheses | Dark gray |
| Error | Red underline |

#### Autocomplete

| Trigger | Shows |
|---------|-------|
| User types `@` | List of all column names |
| User types after `@` | Filtered column names matching prefix |
| User types letter (no `@`) | Function names matching prefix |
| User types `(` after function | Parameter signature hint |

**Keyboard navigation:**

- `↑` / `↓`: Navigate suggestions
- `Tab` or `Enter`: Accept suggestion
- `Escape`: Dismiss autocomplete

#### Real-time Validation

- Debounce: 300ms after last keystroke
- Show validation status below editor:
  - ✓ "Formula is valid" (green)
  - ✗ "Error: Unknown variable '@foo'" (red)
  - ✗ "Error: Expected ')' at position 15" (red)

### 7.4 Preview Panel

- Shows **first 10 rows of the dataset** (not viewport-dependent)
- Columns displayed:
  - Referenced source columns
  - Intermediate aggregation values (if any)
  - Final result
- Updates in real-time as formula changes (debounced)
- Shows `#ERROR` for rows with runtime errors
- Shows `null` for null results

### 7.5 Edit Existing Formula

**Trigger:** Column header menu → "Edit Formula"

Opens same dialog, pre-populated with existing formula and column name.

Column name field is editable. Renaming auto-updates all dependent formulas.

### 7.6 Delete Formula Column

**Trigger:** Column header menu → "Delete Column"

**Behavior:**

1. Check for dependent formula columns
2. If dependencies exist:
   - Show dialog listing all dependent columns
   - Block deletion until dependencies are removed
3. If no dependencies:
   - Confirm deletion
   - Remove column

```
┌─────────────────────────────────────────────────────────────────┐
│  Cannot Delete Column                                      [X]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  The column "normalized_score" cannot be deleted because        │
│  the following formula columns depend on it:                    │
│                                                                 │
│    • weighted_score                                             │
│    • final_ranking                                              │
│                                                                 │
│  Please delete or modify these columns first.                   │
│                                                                 │
│                                                      [OK]       │
└─────────────────────────────────────────────────────────────────┘
```

### 7.7 Column Rename Flow

When renaming a column (source or formula):

1. Show list of formula columns that reference this column
2. Confirm rename
3. Auto-update all formulas to use new name
4. Revalidate all affected formulas

---

## 8. Error Handling

### 8.1 Error Categories

| Error Type | When Detected | Behavior |
|------------|---------------|----------|
| `SyntaxError` | `parse()` | Thrown immediately |
| `SemanticError` | `validate()` | Thrown immediately |
| `RuntimeError` | `evaluateBatch()` | Collected in `BatchResult.errors`, evaluation continues |

### 8.2 Syntax Errors

Detected at parse time. Formula cannot be saved.

| Error | Example | Message |
|-------|---------|---------|
| Unexpected token | `@a + + @b` | "Unexpected '+' at position 6" |
| Missing parenthesis | `IF(@a > 0, @a` | "Expected ')' at end of input" |
| Unknown function | `FOO(@a)` | "Unknown function 'FOO'" |
| Unknown variable | `@nonexistent` | "Unknown variable 'nonexistent'" |
| Invalid literal | `1.2.3` | "Invalid number literal at position 0" |

### 8.3 Semantic Errors

Detected at validation time. Formula cannot be saved.

| Error | Example | Message |
|-------|---------|---------|
| Type mismatch | `"hello" + 5` | "Cannot add string and number" |
| Wrong argument count | `IF(@a > 0, @a)` | "IF requires 3 arguments, got 2" |
| Wrong argument type | `AVG("hello")` | "AVG requires numeric variable, got string" |
| Circular reference | `@self + 1` | "Circular reference detected" |

### 8.4 Runtime Errors

Detected during evaluation. **Errors are collected, not thrown.** Evaluation continues for all rows.

| Error Code | Example | Cell Display |
|------------|---------|--------------|
| `DIV_BY_ZERO` | `@a / @b` where `@b` is 0 | `#DIV/0!` |
| `DOMAIN_ERROR` | `LOG(-1)` | `null` |
| `OVERFLOW` | `POWER(10, 1000)` | `#NUM!` |

### 8.5 Error Display

**In Editor:**

- Syntax/semantic errors shown below editor with red styling
- Error position highlighted in formula text
- Cannot save formula until errors resolved

**In Grid:**

| Location | Display |
|----------|---------|
| Column header | Warning icon (⚠) if any cells have errors |
| Cell | Error code (`#DIV/0!`, `#NUM!`) or `null` |
| Tooltip on cell | Full error message |

---

## 9. Performance & Scalability

### 9.1 Scale Requirements

| Dataset Size | Expected Behavior |
|--------------|-------------------|
| 20 - 1,000 rows | Instant (<100ms) |
| 1,000 - 100,000 rows | Fast (<1s) |
| 100,000 - 1,000,000 rows | Progress bar, <10s |
| 1,000,000 - 20,000,000 rows | Progress bar, chunked processing, cancellable |

### 9.2 Non-Blocking Evaluation

**Requirement:** UI must never freeze during computation.

**Implementation:**

- Chunked execution: evaluate N rows, yield to main thread, repeat
- Suggested chunk size: 1,000-10,000 rows (tune based on formula complexity)
- Configurable delay between chunks (default: 0ms with setTimeout)

### 9.3 Progress UI

For operations exceeding 500ms:

```
┌─────────────────────────────────────────────────────────────────┐
│  Evaluating formula...                                          │
│                                                                 │
│  [████████████████████░░░░░░░░░░░░░░░░░░░░]  52%               │
│                                                                 │
│  10,400,000 / 20,000,000 rows  •  ~8 sec remaining             │
│                                                                 │
│                                                      [Cancel]   │
└─────────────────────────────────────────────────────────────────┘
```

**Features:**

- Percentage complete
- Rows processed / total
- Estimated time remaining
- Cancel button (aborts and reverts)

### 9.4 Cancellation Support

- Use `AbortSignal` for cancellation
- Check signal between chunks
- Return partial results on abort
- Revert to previous state in UI

---

## 10. Extending the Engine

### 10.1 Adding Custom Functions

Row-level functions operate on values from a single row at a time.

```typescript
import { createFormulaEngine } from 'formulaq/core';
import type { FormulaFunction, Value } from 'formulaq/core';

const ABS: FormulaFunction = {
  name: 'ABS',
  description: 'Returns the absolute value of a number',
  params: [
    {
      name: 'x',
      type: ['number.integer', 'number.float'],
      description: 'The number to get absolute value of',
    },
  ],
  returnType: 'number.float',
  isAggregation: false,
  category: 'Math',
  examples: [
    { formula: 'ABS(-5)', description: 'Returns 5' },
    { formula: 'ABS(@profit)', description: 'Get absolute value of profit' },
  ],

  async evaluate(args: readonly Value[]): Promise<Value | null> {
    const x = args[0];
    if (x === undefined || x.value === null) {
      return { type: 'number.float', value: null };
    }
    return { type: 'number.float', value: Math.abs(x.value as number) };
  },
};

const engine = createFormulaEngine();
engine.registerFunction(ABS);
```

### 10.2 Adding Aggregation Functions

Aggregation functions operate on **all values** across rows.

```typescript
const MEDIAN: FormulaFunction = {
  name: 'MEDIAN',
  description: 'Returns the median (middle value) of a numeric column',
  params: [
    {
      name: 'values',
      type: ['number.integer', 'number.float'],
      description: 'Numeric values to find median of',
    },
  ],
  returnType: 'number.float',
  isAggregation: true,  // <-- Key flag
  category: 'Aggregation',
  examples: [
    { formula: 'MEDIAN(@salary)', description: 'Middle salary value' },
  ],

  async evaluate(args: readonly Value[]): Promise<Value | null> {
    const numbers: number[] = [];
    for (const arg of args) {
      if (arg.value !== null && typeof arg.value === 'number') {
        numbers.push(arg.value);
      }
    }

    if (numbers.length === 0) {
      return { type: 'number.float', value: null };
    }

    numbers.sort((a, b) => a - b);
    const mid = Math.floor(numbers.length / 2);
    const median = numbers.length % 2 === 0
      ? (numbers[mid - 1]! + numbers[mid]!) / 2
      : numbers[mid]!;

    return { type: 'number.float', value: median };
  },
};
```

### 10.3 Adding Variadic Functions

```typescript
const MAX_OF: FormulaFunction = {
  name: 'MAX_OF',
  description: 'Returns the maximum of the provided values',
  params: [
    { name: 'value1', type: ['number.integer', 'number.float'], description: 'First value' },
    { name: 'value2', type: ['number.integer', 'number.float'], description: 'Second value' },
  ],
  returnType: 'number.float',
  isAggregation: false,
  isVariadic: true,
  minArgs: 2,
  category: 'Math',
  examples: [
    { formula: 'MAX_OF(@a, @b)', description: 'Larger of two values' },
    { formula: 'MAX_OF(@price, @cost, @fee)', description: 'Largest of three' },
  ],

  async evaluate(args: readonly Value[]): Promise<Value | null> {
    let max: number | null = null;
    for (const arg of args) {
      if (arg.value !== null) {
        const num = arg.value as number;
        if (max === null || num > max) max = num;
      }
    }
    return { type: 'number.float', value: max };
  },
};
```

### 10.4 Best Practices

1. **Always handle null** - Return null for null inputs
2. **Return domain errors as null** - Don't throw for LOG(-1)
3. **Use descriptive names and descriptions** - Powers the help system
4. **Include examples** - Required for good UX
5. **Keep evaluate() async** - For consistency and future extensibility
6. **Separate pure logic** - Extract computation into viewModel for testing

### 10.5 Custom Variable Providers

```typescript
const provider: VariableProvider = {
  getVariables() {
    return [
      { name: 'price', type: 'number.float', nullable: false },
      { name: 'quantity', type: 'number.integer', nullable: false },
    ];
  },
  hasVariable(name: string) {
    return ['price', 'quantity'].includes(name);
  },
  getVariableType(name: string) {
    const types: Record<string, ValueType> = {
      price: 'number.float',
      quantity: 'number.integer',
    };
    return types[name];
  },
  isNullable(name: string) {
    return false;
  },
};
```

### 10.6 Custom Evaluation Contexts

```typescript
const context: EvaluationContext = {
  variables: {
    price: [
      { type: 'number.float', value: 29.99 },
      { type: 'number.float', value: 49.99 },
    ],
    quantity: [
      { type: 'number.integer', value: 5 },
      { type: 'number.integer', value: 3 },
    ],
  },
  rowCount: 2,
  signal: abortController.signal,
  onProgress: (done, total) => console.log(`${done}/${total}`),
};
```

---

## Appendix: Type Reference

### ValueType

```typescript
type ValueType =
  | 'number.integer'
  | 'number.float'
  | 'string.text'
  | 'boolean.boolean';
```

### Value

```typescript
interface Value {
  type: ValueType;
  value: number | string | boolean | null;
}
```

### ParamDef

```typescript
interface ParamDef {
  name: string;
  type: ValueType | ValueType[] | 'any';
  description: string;
  optional?: boolean;
  defaultValue?: Value;
}
```

### FunctionExample

```typescript
interface FunctionExample {
  formula: string;
  description: string;
}
```

### FormulaFunction

```typescript
interface FormulaFunction {
  name: string;
  description: string;
  params: ParamDef[];
  returnType: ValueType;
  isAggregation: boolean;
  isVariadic?: boolean;
  minArgs?: number;
  maxArgs?: number;
  category?: string;
  examples?: FunctionExample[];

  evaluate(args: readonly Value[], context: EvaluationContext): Promise<Value | null>;
}
```

### EvaluationContext

```typescript
interface EvaluationContext {
  variables: Record<string, readonly Value[]>;
  rowCount: number;
  currentIndex?: number;
  signal?: AbortSignal;
  onProgress?: (completed: number, total: number) => void;
}
```
