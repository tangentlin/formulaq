# FormulaQ Core

The core engine for parsing, validating, and evaluating formula expressions. This package has zero React dependencies and can be used in any JavaScript/TypeScript environment.

## Installation

```typescript
import { createFormulaEngine } from 'formulaq/core';
```

## Quick Start

```typescript
import { createFormulaEngine, type EvaluationContext } from 'formulaq/core';

// Create the engine with default functions
const engine = createFormulaEngine();

// Define your data
const context: EvaluationContext = {
  variables: {
    price: [
      { type: 'number.float', value: 10.0 },
      { type: 'number.float', value: 25.0 },
      { type: 'number.float', value: null }, // Null value
    ],
    quantity: [
      { type: 'number.float', value: 2 },
      { type: 'number.float', value: 3 },
      { type: 'number.float', value: 4 },
    ],
  },
  rowCount: 3,
};

// Execute a formula
const result = await engine.execute('@price * @quantity', context);

// Check results
console.log(result.values);
// [
//   { type: 'number.float', value: 20 },
//   { type: 'number.float', value: 75 },
//   { type: 'number.float', value: null }  // Null propagation
// ]
```

## API Reference

### FormulaQEngine

The main interface for interacting with the formula engine.

#### `createFormulaEngine(options?)`

Creates a new FormulaQ engine instance.

```typescript
import { createFormulaEngine, type EngineOptions } from 'formulaq/core';

const options: EngineOptions = {
  includeDefaultFunctions: true, // Include built-in functions (default: true)
};

const engine = createFormulaEngine(options);
```

#### `engine.parse(formula)`

Parses a formula string into an AST.

```typescript
const ast = engine.parse('@price * @quantity');
```

Throws `FormulaSyntaxError` if the formula is syntactically invalid.

#### `engine.validate(formula, provider)`

Validates a formula against available variables.

```typescript
import type { VariableProvider } from 'formulaq/core';

const provider: VariableProvider = {
  getVariables: () => [
    { name: 'price', type: 'number.float', nullable: true },
    { name: 'quantity', type: 'number.float', nullable: true },
  ],
  hasVariable: (name) => ['price', 'quantity'].includes(name),
  getVariableType: (name) => 'number.float',
  isNullable: (name) => true,
};

const validated = engine.validate('@price * @quantity', provider);
// Returns ValidatedAST with type information and dependencies
```

Throws `FormulaSemanticError` if validation fails.

#### `engine.evaluateRow(formula, rowContext)`

Evaluates a formula for a single row.

```typescript
const rowContext: RowContext = {
  variables: {
    price: { type: 'number.float', value: 10.0 },
    quantity: { type: 'number.float', value: 2 },
  },
  rowIndex: 0,
  aggregatedValues: {}, // Pre-computed aggregations
};

const value = await engine.evaluateRow('@price * @quantity', rowContext);
// { type: 'number.float', value: 20 }
```

#### `engine.evaluateBatch(formula, context, options?)`

Evaluates a formula across all rows in a dataset.

```typescript
const context: EvaluationContext = {
  variables: {
    price: [
      { type: 'number.float', value: 10.0 },
      { type: 'number.float', value: 25.0 },
    ],
    quantity: [
      { type: 'number.float', value: 2 },
      { type: 'number.float', value: 3 },
    ],
  },
  rowCount: 2,
};

const options: BatchEvaluationOptions = {
  chunkSize: 1000, // Rows per chunk (default: 1000)
  delayMs: 0, // Delay between chunks (default: 0)
  signal: abortController.signal, // For cancellation
  onProgress: (completed, total) => {
    console.log(`Progress: ${completed}/${total}`);
  },
};

const result = await engine.evaluateBatch(validated, context, options);

console.log(result.values); // Array of computed values
console.log(result.errors); // Array of runtime errors
console.log(result.hasErrors); // boolean
console.log(result.successCount); // Number of successful rows
console.log(result.errorCount); // Number of failed rows
```

#### `engine.execute(formula, context, options?)`

Convenience method that validates and evaluates in one call.

```typescript
const result = await engine.execute('@price * @quantity', context);
```

#### `engine.getFunctions()`

Returns metadata for all registered functions.

```typescript
const functions = engine.getFunctions();
// [
//   { name: 'SUM', description: '...', params: [...], returnType: 'number.float', isAggregation: true },
//   { name: 'AVG', ... },
//   ...
// ]
```

#### `engine.registerFunction(fn)`

Registers a custom function.

```typescript
import type { FormulaFunction, Value } from 'formulaq/core';

const myFunction: FormulaFunction = {
  name: 'DOUBLE',
  description: 'Doubles a numeric value',
  params: [{ name: 'value', type: 'number.float', description: 'Value to double' }],
  returnType: 'number.float',
  isAggregation: false,
  async evaluate(args, context): Promise<Value> {
    const value = args[0]?.value;
    if (value === null || typeof value !== 'number') {
      return { type: 'number.float', value: null };
    }
    return { type: 'number.float', value: value * 2 };
  },
};

engine.registerFunction(myFunction);
```

#### `engine.getDependencies(formula)`

Extracts variable names referenced in a formula.

```typescript
const deps = engine.getDependencies('@price * @quantity + @tax');
// ['price', 'quantity', 'tax']
```

## Type System

### Value Types

```typescript
type ValueType =
  | 'number.integer' // Whole numbers
  | 'number.float' // Double-precision floats
  | 'string.text' // UTF-8 strings
  | 'boolean.boolean'; // True/false
```

### Value Interface

```typescript
interface Value {
  readonly type: ValueType;
  readonly value: number | string | boolean | null;
}
```

### Creating Values

```typescript
const numValue: Value = { type: 'number.float', value: 42.5 };
const strValue: Value = { type: 'string.text', value: 'hello' };
const boolValue: Value = { type: 'boolean.boolean', value: true };
const nullValue: Value = { type: 'number.float', value: null };
```

## AST Node Types

The parser produces an Abstract Syntax Tree with these node types:

```typescript
// Literal values
interface LiteralNode {
  type: 'Literal';
  valueType: ValueType;
  value: number | string | boolean | null;
}

// Variable references
interface VariableRefNode {
  type: 'VariableRef';
  name: string; // Without @ prefix
}

// Binary operations
interface BinaryOpNode {
  type: 'BinaryOp';
  operator: '+' | '-' | '*' | '/' | '^' | '%' | '&' | '==' | '!=' | '<>' | '<' | '>' | '<=' | '>=';
  left: ASTNode;
  right: ASTNode;
}

// Unary operations
interface UnaryOpNode {
  type: 'UnaryOp';
  operator: '-' | '+';
  operand: ASTNode;
}

// Function calls
interface FunctionCallNode {
  type: 'FunctionCall';
  name: string;
  args: ASTNode[];
}
```

### Working with AST

```typescript
const ast = engine.parse('@price * 2 + SUM(@discount)');

function visitNode(node: ASTNode): void {
  switch (node.type) {
    case 'Literal':
      console.log('Literal:', node.value);
      break;
    case 'VariableRef':
      console.log('Variable:', node.name);
      break;
    case 'BinaryOp':
      console.log('Binary:', node.operator);
      visitNode(node.left);
      visitNode(node.right);
      break;
    case 'UnaryOp':
      console.log('Unary:', node.operator);
      visitNode(node.operand);
      break;
    case 'FunctionCall':
      console.log('Function:', node.name);
      node.args.forEach(visitNode);
      break;
  }
}

visitNode(ast);
```

## Built-in Functions

### Aggregation Functions

| Function     | Signature             | Description                        |
| ------------ | --------------------- | ---------------------------------- |
| `SUM`        | `SUM(@var)`           | Sum of all non-null values         |
| `AVG`        | `AVG(@var)`           | Arithmetic mean of non-null values |
| `MIN`        | `MIN(@var)`           | Minimum value                      |
| `MAX`        | `MAX(@var)`           | Maximum value                      |
| `COUNT`      | `COUNT(@var)`         | Count of non-null values           |
| `PERCENTILE` | `PERCENTILE(@var, k)` | k-th percentile (0-100)            |

```typescript
// Aggregation examples
const formula = 'AVG(@score)'; // Returns single value for all rows
const formula2 = '@score - AVG(@score)'; // Deviation from mean
const formula3 = 'PERCENTILE(@score, 90)'; // 90th percentile
```

### Math Functions

| Function | Signature     | Description         |
| -------- | ------------- | ------------------- |
| `LOG`    | `LOG(x)`      | Natural logarithm   |
| `LOG10`  | `LOG10(x)`    | Base-10 logarithm   |
| `POWER`  | `POWER(x, n)` | x raised to power n |

```typescript
const formula = 'LOG(@concentration)';
const formula2 = 'POWER(@base, @exponent)';
```

### Logical Functions

| Function | Signature                | Description            |
| -------- | ------------------------ | ---------------------- |
| `IF`     | `IF(cond, then, else)`   | Conditional expression |
| `AND`    | `AND(a, b, ...)`         | Logical AND (variadic) |
| `OR`     | `OR(a, b, ...)`          | Logical OR (variadic)  |
| `NOT`    | `NOT(x)`                 | Logical negation       |
| `IFNULL` | `IFNULL(value, default)` | Null coalescing        |

```typescript
const formula = 'IF(@score >= 90, "A", IF(@score >= 80, "B", "C"))';
const formula2 = 'AND(@active, @verified, @premium)';
const formula3 = 'IFNULL(@value, 0)';
```

### String Functions

| Function | Signature             | Description                     |
| -------- | --------------------- | ------------------------------- |
| `CONCAT` | `CONCAT(s1, s2, ...)` | String concatenation (variadic) |

```typescript
const formula = 'CONCAT(@first_name, " ", @last_name)';
```

## Error Handling

### Error Types

```typescript
import {
  FormulaError,
  FormulaSyntaxError,
  FormulaSemanticError,
  type FormulaRuntimeError,
} from 'formulaq/core';
```

### Syntax Errors

Thrown during parsing for malformed formulas.

```typescript
try {
  engine.parse('@x + + @y');
} catch (error) {
  if (error instanceof FormulaSyntaxError) {
    console.log(error.message); // Human-readable message
    console.log(error.code); // 'UNEXPECTED_TOKEN', etc.
    console.log(error.position); // { start: 5, end: 6 }
    console.log(error.expected); // What was expected
    console.log(error.found); // What was found
  }
}
```

### Semantic Errors

Thrown during validation for type mismatches, unknown variables, etc.

```typescript
try {
  engine.validate('@unknown + 1', provider);
} catch (error) {
  if (error instanceof FormulaSemanticError) {
    console.log(error.code); // 'UNKNOWN_VARIABLE', etc.
    console.log(error.variableName); // 'unknown'
    console.log(error.functionName); // For function errors
  }
}
```

### Runtime Errors

Collected during evaluation (not thrown).

```typescript
const result = await engine.evaluateBatch(formula, context);

for (const error of result.errors) {
  console.log(error.rowIndex); // Which row failed
  console.log(error.code); // 'DIV_BY_ZERO', 'DOMAIN_ERROR', etc.
  console.log(error.message); // Human-readable message
}
```

## Batch Evaluation

### Progress Reporting

```typescript
const result = await engine.evaluateBatch(formula, context, {
  chunkSize: 1000,
  onProgress: (completed, total) => {
    const percent = Math.round((completed / total) * 100);
    console.log(`Processing: ${percent}%`);
  },
});
```

### Cancellation

```typescript
const controller = new AbortController();

// Cancel after 5 seconds
setTimeout(() => controller.abort(), 5000);

try {
  const result = await engine.evaluateBatch(formula, context, {
    signal: controller.signal,
  });
} catch (error) {
  if (error.name === 'AbortError') {
    console.log('Evaluation cancelled');
  }
}
```

### Chunked Execution

For large datasets, evaluation is chunked to keep the UI responsive:

```typescript
const result = await engine.evaluateBatch(formula, context, {
  chunkSize: 500, // Process 500 rows at a time
  delayMs: 16, // 16ms delay for ~60fps UI
});
```

## Variable Provider

The `VariableProvider` interface is used for validation and autocomplete:

```typescript
interface VariableProvider {
  // List all available variables
  getVariables(): VariableInfo[];

  // Check if a variable exists
  hasVariable(name: string): boolean;

  // Get the type of a variable
  getVariableType(name: string): ValueType | undefined;

  // Check if a variable can be null
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

### Creating a Variable Provider

```typescript
import type { VariableProvider, VariableInfo } from 'formulaq/core';

const variables: VariableInfo[] = [
  { name: 'price', type: 'number.float', nullable: true, description: 'Product price' },
  { name: 'quantity', type: 'number.integer', nullable: false, description: 'Order quantity' },
  { name: 'name', type: 'string.text', nullable: true, description: 'Product name' },
];

const provider: VariableProvider = {
  getVariables: () => variables,
  hasVariable: (name) => variables.some((v) => v.name === name),
  getVariableType: (name) => variables.find((v) => v.name === name)?.type,
  isNullable: (name) => variables.find((v) => v.name === name)?.nullable ?? true,
};
```

## Evaluation Context

The `EvaluationContext` provides data for formula evaluation:

```typescript
interface EvaluationContext {
  // Variable values indexed by name
  variables: Record<string, Value[]>;

  // Total number of rows
  rowCount: number;

  // Current row index (for row-level evaluation)
  currentIndex?: number;

  // Abort signal for cancellation
  signal?: AbortSignal;

  // Progress callback
  onProgress?: (completed: number, total: number) => void;
}
```

### Creating an Evaluation Context

```typescript
const context: EvaluationContext = {
  variables: {
    price: [
      { type: 'number.float', value: 10.0 },
      { type: 'number.float', value: 25.0 },
      { type: 'number.float', value: 15.0 },
    ],
    quantity: [
      { type: 'number.float', value: 2 },
      { type: 'number.float', value: 3 },
      { type: 'number.float', value: null },
    ],
  },
  rowCount: 3,
};
```

## Custom Functions

### Basic Custom Function

```typescript
const doubleFunction: FormulaFunction = {
  name: 'DOUBLE',
  description: 'Doubles a numeric value',
  params: [{ name: 'value', type: 'number.float', description: 'Value to double' }],
  returnType: 'number.float',
  isAggregation: false,
  category: 'Math',

  async evaluate(args): Promise<Value> {
    const value = args[0]?.value;
    if (value === null || typeof value !== 'number') {
      return { type: 'number.float', value: null };
    }
    return { type: 'number.float', value: value * 2 };
  },
};

engine.registerFunction(doubleFunction);
```

### Variadic Function

```typescript
const productFunction: FormulaFunction = {
  name: 'PRODUCT',
  description: 'Multiplies all arguments',
  params: [{ name: 'values', type: 'number.float', description: 'Numbers to multiply' }],
  returnType: 'number.float',
  isAggregation: false,
  isVariadic: true,
  minArgs: 2,

  async evaluate(args): Promise<Value> {
    let result = 1;
    for (const arg of args) {
      if (arg.value === null || typeof arg.value !== 'number') {
        return { type: 'number.float', value: null };
      }
      result *= arg.value;
    }
    return { type: 'number.float', value: result };
  },
};
```

### Custom Aggregation Function

```typescript
const medianFunction: FormulaFunction = {
  name: 'MEDIAN',
  description: 'Calculates the median value',
  params: [{ name: 'values', type: 'number.float', description: 'Values to aggregate' }],
  returnType: 'number.float',
  isAggregation: true,
  category: 'Aggregation',

  async evaluate(args, context): Promise<Value> {
    // For aggregations, the first arg contains the variable name
    const varName = args[0]?.value as string;
    const values = context.variables[varName];

    if (!values) {
      return { type: 'number.float', value: null };
    }

    // Filter out nulls and extract numbers
    const numbers = values
      .filter((v) => v.value !== null && typeof v.value === 'number')
      .map((v) => v.value as number)
      .sort((a, b) => a - b);

    if (numbers.length === 0) {
      return { type: 'number.float', value: null };
    }

    const mid = Math.floor(numbers.length / 2);
    const median = numbers.length % 2 === 0 ? (numbers[mid - 1] + numbers[mid]) / 2 : numbers[mid];

    return { type: 'number.float', value: median };
  },
};
```

## Exports

```typescript
// Engine
export { createFormulaEngine } from 'formulaq/core';
export type { FormulaQEngine, EngineOptions, BatchEvaluationOptions } from 'formulaq/core';

// Types
export type { Value, ValueType, RawValue, VariableInfo } from 'formulaq/core';
export type {
  ASTNode,
  LiteralNode,
  VariableRefNode,
  BinaryOpNode,
  UnaryOpNode,
  FunctionCallNode,
} from 'formulaq/core';
export type { ValidatedAST, BinaryOperator, UnaryOperator } from 'formulaq/core';

// Context
export type { VariableProvider, EvaluationContext, EvaluationOptions } from 'formulaq/core';
export type { RowContext, RowEvaluationResult } from 'formulaq/core';

// Results
export type { BatchResult, BatchResultStats } from 'formulaq/core';
export { createBatchResult, createEmptyBatchResult, computeBatchResultStats } from 'formulaq/core';

// Errors
export { FormulaError, FormulaSyntaxError, FormulaSemanticError } from 'formulaq/core';
export type {
  FormulaRuntimeError,
  ErrorPosition,
  SyntaxErrorCode,
  SemanticErrorCode,
  RuntimeErrorCode,
} from 'formulaq/core';

// Functions
export type {
  FormulaFunction,
  FunctionInfo,
  FunctionRegistry,
  ParamDef,
  FunctionEvaluator,
} from 'formulaq/core';
```
