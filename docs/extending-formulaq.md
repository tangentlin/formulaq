# Extending FormulaQ

This guide covers how to extend FormulaQ with custom functions, aggregations, and other customizations.

---

## Table of Contents

1. [Overview](#overview)
2. [Self-Documenting Functions](#self-documenting-functions)
3. [Adding Custom Functions](#adding-custom-functions)
   - [Basic Row-Level Functions](#basic-row-level-functions)
   - [Functions with Multiple Parameters](#functions-with-multiple-parameters)
   - [Handling Null Values](#handling-null-values)
4. [Adding Aggregation Functions](#adding-aggregation-functions)
5. [Adding Variadic Functions](#adding-variadic-functions)
6. [Function Categories](#function-categories)
7. [Testing Custom Functions](#testing-custom-functions)
8. [Best Practices](#best-practices)
9. [Maintenance Guidelines](#maintenance-guidelines)
10. [Type Reference](#type-reference)

---

## Overview

FormulaQ's function system is designed for extensibility. Every built-in function uses the same registration mechanism available to custom functions. Functions are registered with the `FormulaQEngine` and automatically become available for:

- Formula validation (type checking)
- Editor autocomplete
- Formula evaluation

### Architecture

```
FormulaFunction
├── Metadata (name, description, params, returnType)
├── Examples (usage examples for help system)
├── Flags (isAggregation, isVariadic)
└── evaluate() - The actual implementation
```

---

## Self-Documenting Functions

FormulaQ uses a **self-documenting** approach where all function documentation is embedded directly in the function definition. This single source of truth powers:

- **Editor autocomplete** - Shows description and first example
- **Function Browser** - Displays all examples and full documentation
- **Validation messages** - Uses parameter descriptions in error messages
- **Generated documentation** - Can be extracted for API docs

### The `examples` Field

Every function should include usage examples:

```typescript
const SQRT: FormulaFunction = {
  name: 'SQRT',
  description: 'Returns the square root of a number',
  // ... other fields ...

  // Required for good user experience
  examples: [
    { formula: 'SQRT(16)', description: 'Returns 4' },
    { formula: 'SQRT(@variance)', description: 'Standard deviation from variance' },
  ],
};
```

### Example Guidelines

| Do | Don't |
|----|-------|
| Show realistic use cases | Use trivial examples like `SQRT(1)` |
| Include variable references `@name` | Only show literals |
| Explain what the result means | Leave description empty |
| Show 2-3 diverse examples | Add 10+ examples |

### How Examples Are Used

1. **Autocomplete**: The first example is shown in the dropdown
2. **Function Browser**: All examples are displayed in the detail panel
3. **Insert Template**: The first example is used as the insert template

---

## Adding Custom Functions

### Basic Row-Level Functions

Row-level functions operate on values from a single row at a time.

```typescript
import { createFormulaEngine } from 'formulaq/core';
import type { FormulaFunction, Value } from 'formulaq/core';

// Define the function
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

    // Handle null propagation
    if (x === undefined || x.value === null) {
      return { type: 'number.float', value: null };
    }

    // Ensure we have a number
    if (typeof x.value !== 'number') {
      return { type: 'number.float', value: null };
    }

    return { type: 'number.float', value: Math.abs(x.value) };
  },
};

// Register with the engine
const engine = createFormulaEngine();
engine.registerFunction(ABS);

// Now ABS() can be used in formulas
// e.g., ABS(@profit) or ABS(-5)
```

### Functions with Multiple Parameters

```typescript
const ROUND: FormulaFunction = {
  name: 'ROUND',
  description: 'Rounds a number to specified decimal places',
  params: [
    {
      name: 'value',
      type: ['number.integer', 'number.float'],
      description: 'The number to round',
    },
    {
      name: 'decimals',
      type: 'number.integer',
      description: 'Number of decimal places',
      optional: true,
      defaultValue: { type: 'number.integer', value: 0 },
    },
  ],
  returnType: 'number.float',
  isAggregation: false,
  category: 'Math',
  examples: [
    { formula: 'ROUND(3.14159, 2)', description: 'Returns 3.14' },
    { formula: 'ROUND(@price)', description: 'Round price to nearest integer' },
  ],

  async evaluate(args: readonly Value[]): Promise<Value | null> {
    const value = args[0];
    const decimals = args[1];

    if (value === undefined || value.value === null) {
      return { type: 'number.float', value: null };
    }

    const numValue = value.value as number;
    const numDecimals = (decimals?.value as number) ?? 0;

    const factor = Math.pow(10, numDecimals);
    const result = Math.round(numValue * factor) / factor;

    return { type: 'number.float', value: result };
  },
};
```

### Handling Null Values

FormulaQ uses null propagation by convention. If any input is null, the output should typically be null:

```typescript
async evaluate(args: readonly Value[]): Promise<Value | null> {
  // Check for null inputs
  for (const arg of args) {
    if (arg === undefined || arg.value === null) {
      return { type: 'number.float', value: null };
    }
  }

  // Safe to proceed with non-null values
  // ...
}
```

---

## Adding Aggregation Functions

Aggregation functions operate on **all values** across rows, not just a single row. They are computed once before row-level evaluation and their results are cached.

Key differences from row-level functions:
- Set `isAggregation: true`
- The `args` parameter contains the **full array** of values for the variable
- Results are broadcast to all rows

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
  isAggregation: true,  // <-- This is the key flag
  category: 'Aggregation',
  examples: [
    { formula: 'MEDIAN(@salary)', description: 'Middle salary value' },
    { formula: 'MEDIAN(@response_time)', description: 'Typical response time' },
  ],

  async evaluate(args: readonly Value[]): Promise<Value | null> {
    // For aggregation functions, args IS the full array of values
    // (not a single value per row)

    // Extract non-null numeric values
    const numbers: number[] = [];
    for (const arg of args) {
      if (arg.value !== null && typeof arg.value === 'number') {
        numbers.push(arg.value);
      }
    }

    // Handle all-null case
    if (numbers.length === 0) {
      return { type: 'number.float', value: null };
    }

    // Sort and find median
    numbers.sort((a, b) => a - b);
    const mid = Math.floor(numbers.length / 2);

    let median: number;
    if (numbers.length % 2 === 0) {
      median = (numbers[mid - 1]! + numbers[mid]!) / 2;
    } else {
      median = numbers[mid]!;
    }

    return { type: 'number.float', value: median };
  },
};

// Usage in formula: MEDIAN(@scores)
```

### Aggregation with Multiple Arguments

Some aggregations like `PERCENTILE` take additional parameters:

```typescript
const PERCENTILE: FormulaFunction = {
  name: 'PERCENTILE',
  description: 'Returns the k-th percentile of values',
  params: [
    {
      name: 'values',
      type: ['number.integer', 'number.float'],
      description: 'Numeric values',
    },
    {
      name: 'k',
      type: ['number.integer', 'number.float'],
      description: 'Percentile (0-100)',
    },
  ],
  returnType: 'number.float',
  isAggregation: true,
  category: 'Aggregation',
  examples: [
    { formula: 'PERCENTILE(@scores, 90)', description: '90th percentile score' },
    { formula: 'PERCENTILE(@latency, 95)', description: 'P95 latency' },
  ],

  async evaluate(args: readonly Value[], context): Promise<Value | null> {
    // For PERCENTILE, we need to handle this specially
    // The first argument is the variable name (as a string value)
    // The second argument is the percentile k

    const varNameValue = args[0];
    const kValue = args[1];

    if (varNameValue?.value === null || kValue?.value === null) {
      return { type: 'number.float', value: null };
    }

    // Get the variable data from context
    const varName = varNameValue.value as string;
    const k = kValue.value as number;
    const values = context.variables[varName];

    if (!values) {
      return { type: 'number.float', value: null };
    }

    // Compute percentile...
    // (implementation details)

    return { type: 'number.float', value: result };
  },
};
```

---

## Adding Variadic Functions

Variadic functions accept a variable number of arguments. Use `isVariadic: true` and optionally `minArgs`/`maxArgs`:

```typescript
const MAX_OF: FormulaFunction = {
  name: 'MAX_OF',
  description: 'Returns the maximum of the provided values',
  params: [
    {
      name: 'value1',
      type: ['number.integer', 'number.float'],
      description: 'First value',
    },
    {
      name: 'value2',
      type: ['number.integer', 'number.float'],
      description: 'Second value',
    },
  ],
  returnType: 'number.float',
  isAggregation: false,
  isVariadic: true,      // Accepts variable number of args
  minArgs: 2,            // At least 2 arguments required
  // maxArgs: undefined  // No maximum (omit for unlimited)
  category: 'Math',
  examples: [
    { formula: 'MAX_OF(@a, @b)', description: 'Larger of two values' },
    { formula: 'MAX_OF(@price, @cost, @fee)', description: 'Largest of three' },
  ],

  async evaluate(args: readonly Value[]): Promise<Value | null> {
    let max: number | null = null;

    for (const arg of args) {
      if (arg.value === null) {
        continue; // Skip nulls
      }

      const num = arg.value as number;
      if (max === null || num > max) {
        max = num;
      }
    }

    return { type: 'number.float', value: max };
  },
};

// Usage: MAX_OF(@a, @b, @c, 100)
```

---

## Function Categories

Categories help organize functions in the autocomplete dropdown:

```typescript
const myFunction: FormulaFunction = {
  // ...
  category: 'Financial',  // Custom category
};
```

Built-in categories:
- `'Aggregation'` - SUM, AVG, MIN, MAX, COUNT, PERCENTILE
- `'Math'` - LOG, LOG10, POWER
- `'Logical'` - IF, AND, OR, NOT, IFNULL
- `'String'` - CONCAT

---

## Testing Custom Functions

### Unit Testing the Function Logic

Separate pure computation logic into a viewModel for easy testing:

```typescript
// myFunction.viewModel.ts
export function computeMyValue(input: number | null): number | null {
  if (input === null) return null;
  return input * 2;
}

// myFunction.viewModel.test.ts
import { describe, it, expect } from 'vitest';
import { computeMyValue } from './myFunction.viewModel';

describe('computeMyValue', () => {
  it('doubles positive numbers', () => {
    expect(computeMyValue(5)).toBe(10);
  });

  it('handles null input', () => {
    expect(computeMyValue(null)).toBeNull();
  });

  it('handles zero', () => {
    expect(computeMyValue(0)).toBe(0);
  });
});
```

### Integration Testing with the Engine

```typescript
import { describe, it, expect } from 'vitest';
import { createFormulaEngine } from 'formulaq/core';
import { MY_FUNCTION } from './myFunction';

describe('MY_FUNCTION integration', () => {
  it('evaluates correctly in formulas', async () => {
    const engine = createFormulaEngine();
    engine.registerFunction(MY_FUNCTION);

    const context = {
      variables: {
        value: [
          { type: 'number.float', value: 5 },
          { type: 'number.float', value: 10 },
        ],
      },
      rowCount: 2,
    };

    const result = await engine.execute('MY_FUNCTION(@value)', context);

    expect(result.values[0]?.value).toBe(10);  // 5 * 2
    expect(result.values[1]?.value).toBe(20);  // 10 * 2
  });
});
```

---

## Best Practices

### 1. Always Handle Null

```typescript
// Good
if (arg?.value === null) {
  return { type: 'number.float', value: null };
}

// Bad - will throw on null
const result = (arg.value as number) * 2;
```

### 2. Return Domain Errors as Null

For mathematical domain errors (e.g., LOG of negative number), return null instead of throwing:

```typescript
// Good
if (x <= 0) {
  return { type: 'number.float', value: null };
}

// Bad - disrupts evaluation
if (x <= 0) {
  throw new Error('Domain error');
}
```

### 3. Use Descriptive Names and Descriptions

```typescript
// Good
{
  name: 'DAYS_BETWEEN',
  description: 'Returns the number of days between two dates',
  params: [
    { name: 'start_date', type: 'string.text', description: 'Start date (ISO format)' },
    { name: 'end_date', type: 'string.text', description: 'End date (ISO format)' },
  ],
  examples: [
    { formula: 'DAYS_BETWEEN(@start, @end)', description: 'Days in date range' },
    { formula: 'DAYS_BETWEEN("2024-01-01", @due_date)', description: 'Days since new year' },
  ],
}

// Bad
{
  name: 'FUNC1',
  description: 'Does stuff',
  params: [
    { name: 'a', type: 'any', description: 'input' },
  ],
  // Missing examples!
}
```

### 4. Keep evaluate() Async

Even if your function is synchronous, keep the async signature for consistency:

```typescript
// Good
async evaluate(args: readonly Value[]): Promise<Value | null> {
  return { type: 'number.float', value: 42 };
}
```

### 5. Separate Pure Logic into viewModel

For complex functions, extract the pure computation logic:

```typescript
// math.viewModel.ts - Pure functions, easy to test
export function computeComplex(x: number, y: number): number {
  // Complex math here
}

// math.ts - FormulaQ wrapper
export const COMPLEX: FormulaFunction = {
  // ...
  async evaluate(args) {
    const x = extractNumber(args[0]);
    const y = extractNumber(args[1]);
    if (x === null || y === null) return nullFloat();

    const result = computeComplex(x, y);
    return { type: 'number.float', value: result };
  },
};
```

---

## Maintenance Guidelines

### Keeping Documentation in Sync

Because FormulaQ uses self-documenting functions, documentation stays automatically up-to-date. Here's how to maintain this system:

#### 1. Always Add Examples When Creating Functions

Every new function **must** include the `examples` field:

```typescript
// ✓ Complete function definition
const MY_FUNCTION: FormulaFunction = {
  name: 'MY_FUNCTION',
  description: 'Clear description of what it does',
  params: [...],
  returnType: 'number.float',
  isAggregation: false,
  category: 'MyCategory',
  examples: [  // ← Required for help system
    { formula: 'MY_FUNCTION(@value)', description: 'What it returns' },
  ],
  async evaluate(args) { ... },
};
```

#### 2. Update Examples When Behavior Changes

If you modify a function's behavior, update its examples to reflect the new behavior:

```typescript
// Before: Function only accepted positive numbers
examples: [
  { formula: 'SQRT(16)', description: 'Returns 4' },
],

// After: Function now handles negative numbers with absolute value
examples: [
  { formula: 'SQRT(16)', description: 'Returns 4' },
  { formula: 'SQRT(-16)', description: 'Returns 4 (uses absolute value)' },
],
```

#### 3. Use Consistent Example Patterns

Follow these patterns across all functions:

| Pattern | Example |
|---------|---------|
| Simple literal | `SQRT(16)` |
| Single variable | `SQRT(@value)` |
| Multiple variables | `@price * @quantity` |
| With constants | `@price * 1.08` |
| Nested functions | `IF(@value > AVG(@value), "High", "Low")` |

#### 4. Review Checklist for New Functions

Before merging a new function, verify:

- [ ] `description` is clear and concise
- [ ] All `params` have descriptions
- [ ] `examples` includes 2-3 realistic use cases
- [ ] First example is the most common use case
- [ ] Examples include variable references (`@name`)
- [ ] Category is set appropriately
- [ ] ViewModels tests cover edge cases

### Architectural Decisions

When extending FormulaQ, follow these principles:

1. **Single Source of Truth**: All function metadata lives in `FormulaFunction`
2. **ViewModels Pattern**: Extract pure logic for testability
3. **Null Propagation**: Return null for invalid inputs, don't throw
4. **Async Evaluate**: Keep `evaluate()` async even for sync operations

### Related Documentation

- [Architecture](./architecture.md) - System design and principles
- [Technical Implementation](./technical-implementation.md) - Implementation details

---

## Type Reference

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
  formula: string;      // 'SUM(@sales)'
  description: string;  // 'Total of all sales'
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
  examples?: FunctionExample[];  // Usage examples for help system

  evaluate(args: readonly Value[], context: EvaluationContext): Promise<Value | null>;
}
```

### EvaluationContext

```typescript
interface EvaluationContext {
  variables: Record<string, readonly Value[]>;
  rowCount: number;
  currentIndex?: number;
}
```

---

## Complete Example: Adding a SQRT Function

Here's a complete example of adding a square root function:

```typescript
// sqrt.viewModel.ts
export function computeSqrt(x: number | null): number | null {
  if (x === null) return null;
  if (x < 0) return null; // Domain error
  return Math.sqrt(x);
}

// sqrt.viewModel.test.ts
import { describe, it, expect } from 'vitest';
import { computeSqrt } from './sqrt.viewModel';

describe('computeSqrt', () => {
  it('computes square root of positive numbers', () => {
    expect(computeSqrt(4)).toBe(2);
    expect(computeSqrt(9)).toBe(3);
    expect(computeSqrt(2)).toBeCloseTo(1.414, 3);
  });

  it('returns 0 for 0', () => {
    expect(computeSqrt(0)).toBe(0);
  });

  it('returns null for negative numbers', () => {
    expect(computeSqrt(-1)).toBeNull();
  });

  it('returns null for null input', () => {
    expect(computeSqrt(null)).toBeNull();
  });
});

// sqrt.ts
import type { FormulaFunction, Value } from 'formulaq/core';
import { computeSqrt } from './sqrt.viewModel';

export const SQRT: FormulaFunction = {
  name: 'SQRT',
  description: 'Returns the square root of a number',
  params: [
    {
      name: 'x',
      type: ['number.integer', 'number.float'],
      description: 'The number to compute square root of (must be >= 0)',
    },
  ],
  returnType: 'number.float',
  isAggregation: false,
  category: 'Math',
  examples: [
    { formula: 'SQRT(16)', description: 'Returns 4' },
    { formula: 'SQRT(@variance)', description: 'Standard deviation from variance' },
  ],

  async evaluate(args: readonly Value[]): Promise<Value | null> {
    const x = args[0];

    if (x === undefined || x.value === null) {
      return { type: 'number.float', value: null };
    }

    if (typeof x.value !== 'number') {
      return { type: 'number.float', value: null };
    }

    const result = computeSqrt(x.value);
    return { type: 'number.float', value: result };
  },
};

// Usage
import { createFormulaEngine } from 'formulaq/core';
import { SQRT } from './sqrt';

const engine = createFormulaEngine();
engine.registerFunction(SQRT);

// Now you can use: SQRT(@value), SQRT(16), etc.
```
