/**
 * String functions for the FormulaQ function registry.
 *
 * This module provides string manipulation functions:
 * - CONCAT: Concatenate multiple strings together
 *
 * @module
 */

import type { FormulaFunction } from '../types/functions.ts';
import type { FunctionRegistryImpl } from './function-registry.ts';
import { concatenateStrings } from './string.view-model.ts';

/**
 * CONCAT function: Concatenates two or more strings together.
 *
 * Signature: CONCAT(s1, s2, ...) -> string.text
 *
 * Behavior:
 * - Joins all string arguments in order
 * - Variadic: accepts 2 or more arguments
 * - Null handling: if ANY argument is null, result is null
 * - Empty strings are preserved (not treated as null)
 *
 * @example
 * ```
 * CONCAT("Hello", " ", "World") -> "Hello World"
 * CONCAT("a", "b", "c", "d") -> "abcd"
 * CONCAT("test", null) -> null
 * CONCAT("", "x") -> "x"
 * ```
 */
export const concatFunction: FormulaFunction = {
  name: 'CONCAT',
  description: 'Concatenates two or more strings together',
  params: [
    {
      name: 's1',
      type: 'string.text',
      description: 'First string to concatenate',
    },
    {
      name: 's2',
      type: 'string.text',
      description: 'Second string to concatenate',
    },
  ],
  returnType: 'string.text',
  isAggregation: false,
  isVariadic: true,
  minArgs: 2,
  category: 'String',
  examples: [
    { formula: 'CONCAT(@firstName, " ", @lastName)', description: 'Combine first and last name' },
    { formula: 'CONCAT("$", @price)', description: 'Format price with currency symbol' },
    { formula: 'CONCAT(@city, ", ", @state, " ", @zip)', description: 'Build full address' },
  ],

  async evaluate(args) {
    const result = concatenateStrings(args);

    return {
      type: 'string.text',
      value: result,
    };
  },
};

/**
 * Registers all string functions in the provided registry.
 *
 * Currently registers:
 * - CONCAT
 *
 * @param registry - The function registry to populate
 *
 * @example
 * ```typescript
 * const registry = createFunctionRegistry();
 * registerStringFunctions(registry);
 *
 * const concat = registry.getFunction('CONCAT');
 * ```
 */
export function registerStringFunctions(registry: FunctionRegistryImpl): void {
  registry.register(concatFunction);
}
