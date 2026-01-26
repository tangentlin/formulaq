/**
 * Logical functions for the FormulaQ function registry.
 *
 * Implements IF, AND, OR, NOT, and IFNULL functions.
 *
 * @module
 */

import type { FormulaFunction } from '../types/functions.ts';
import type { Value } from '../types/values.ts';
import type { FunctionRegistryImpl } from './function-registry.ts';
import {
  evaluateAnd,
  evaluateIf,
  evaluateIfNull,
  evaluateNot,
  evaluateOr,
} from './logical.view-model.ts';

/**
 * IF function - Conditional branching.
 *
 * Returns thenValue if condition is true, elseValue if false, null if condition is null.
 *
 * @example
 * ```
 * IF(true, "yes", "no")  // Returns "yes"
 * IF(false, "yes", "no") // Returns "no"
 * IF(null, "yes", "no")  // Returns null
 * ```
 */
export const ifFunction: FormulaFunction = {
  name: 'IF',
  description: 'Returns one value if condition is true, another if false',
  params: [
    {
      name: 'condition',
      type: 'boolean.boolean',
      description: 'The condition to evaluate',
    },
    {
      name: 'then_value',
      type: 'any',
      description: 'Value to return if condition is true',
    },
    {
      name: 'else_value',
      type: 'any',
      description: 'Value to return if condition is false',
    },
  ],
  returnType: 'string.text', // Return type depends on branch values, using string.text as placeholder
  isAggregation: false,
  category: 'logical',

  async evaluate(args: readonly Value[]): Promise<Value | null> {
    const condition = args[0] ?? null;
    const thenValue = args[1] ?? null;
    const elseValue = args[2] ?? null;

    return evaluateIf(condition, thenValue, elseValue);
  },
};

/**
 * AND function - Logical AND (variadic).
 *
 * Returns true if ALL values are true.
 * Returns false if ANY value is false (short-circuits on first false).
 * Returns null if null is encountered and no false was found.
 *
 * @example
 * ```
 * AND(true, true)        // Returns true
 * AND(true, false, true) // Returns false (short-circuits at second argument)
 * AND(true, null)        // Returns null
 * AND(false, null)       // Returns false (short-circuits before null)
 * ```
 */
export const andFunction: FormulaFunction = {
  name: 'AND',
  description: 'Returns true if all arguments are true',
  params: [
    {
      name: 'value1',
      type: 'boolean.boolean',
      description: 'First boolean value',
    },
    {
      name: 'value2',
      type: 'boolean.boolean',
      description: 'Second boolean value',
    },
  ],
  returnType: 'boolean.boolean',
  isAggregation: false,
  isVariadic: true,
  minArgs: 2,
  category: 'logical',

  async evaluate(args: readonly Value[]): Promise<Value | null> {
    const result = evaluateAnd(args);

    if (result.result === null) {
      return { type: 'boolean.boolean', value: null };
    }

    return { type: 'boolean.boolean', value: result.result };
  },
};

/**
 * OR function - Logical OR (variadic).
 *
 * Returns true if ANY value is true (short-circuits on first true).
 * Returns false if ALL values are false.
 * Returns null if null is encountered and no true was found.
 *
 * @example
 * ```
 * OR(false, true)         // Returns true (short-circuits at second argument)
 * OR(false, false)        // Returns false
 * OR(false, null)         // Returns null
 * OR(true, null)          // Returns true (short-circuits before null)
 * ```
 */
export const orFunction: FormulaFunction = {
  name: 'OR',
  description: 'Returns true if any argument is true',
  params: [
    {
      name: 'value1',
      type: 'boolean.boolean',
      description: 'First boolean value',
    },
    {
      name: 'value2',
      type: 'boolean.boolean',
      description: 'Second boolean value',
    },
  ],
  returnType: 'boolean.boolean',
  isAggregation: false,
  isVariadic: true,
  minArgs: 2,
  category: 'logical',

  async evaluate(args: readonly Value[]): Promise<Value | null> {
    const result = evaluateOr(args);

    if (result.result === null) {
      return { type: 'boolean.boolean', value: null };
    }

    return { type: 'boolean.boolean', value: result.result };
  },
};

/**
 * NOT function - Logical NOT.
 *
 * Inverts a boolean value. Returns null if input is null.
 *
 * @example
 * ```
 * NOT(true)  // Returns false
 * NOT(false) // Returns true
 * NOT(null)  // Returns null
 * ```
 */
export const notFunction: FormulaFunction = {
  name: 'NOT',
  description: 'Returns the logical negation of a boolean value',
  params: [
    {
      name: 'value',
      type: 'boolean.boolean',
      description: 'Boolean value to negate',
    },
  ],
  returnType: 'boolean.boolean',
  isAggregation: false,
  category: 'logical',

  async evaluate(args: readonly Value[]): Promise<Value | null> {
    const value = args[0] ?? null;
    const result = evaluateNot(value);

    return { type: 'boolean.boolean', value: result };
  },
};

/**
 * IFNULL function - Null coalescing.
 *
 * Returns the value if it is not null, otherwise returns the default value.
 *
 * @example
 * ```
 * IFNULL(5, 0)     // Returns 5
 * IFNULL(null, 0)  // Returns 0
 * IFNULL("", "n/a") // Returns "" (empty string is not null)
 * ```
 */
export const ifNullFunction: FormulaFunction = {
  name: 'IFNULL',
  description: 'Returns the value if not null, otherwise returns the default value',
  params: [
    {
      name: 'value',
      type: 'any',
      description: 'Value to check for null',
    },
    {
      name: 'default_value',
      type: 'any',
      description: 'Value to return if first argument is null',
    },
  ],
  returnType: 'string.text', // Return type depends on input values, using string.text as placeholder
  isAggregation: false,
  category: 'logical',

  async evaluate(args: readonly Value[]): Promise<Value | null> {
    const value = args[0] ?? null;
    const defaultValue = args[1] ?? null;

    return evaluateIfNull(value, defaultValue);
  },
};

/**
 * Registers all logical functions in the provided registry.
 *
 * @param registry - The function registry to register functions in
 *
 * @example
 * ```typescript
 * const registry = createFunctionRegistry();
 * registerLogicalFunctions(registry);
 *
 * const ifFn = registry.getFunction('IF');
 * const andFn = registry.getFunction('AND');
 * ```
 */
export function registerLogicalFunctions(registry: FunctionRegistryImpl): void {
  registry.register(ifFunction);
  registry.register(andFunction);
  registry.register(orFunction);
  registry.register(notFunction);
  registry.register(ifNullFunction);
}
