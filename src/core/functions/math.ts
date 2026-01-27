/**
 * Math functions for FormulaQ.
 *
 * Provides LOG, LOG10, and POWER functions for mathematical operations.
 * All functions return number.float and handle null propagation.
 *
 * @module
 */

import type { FormulaFunction } from '../types/functions.ts';
import type { Value } from '../types/values.ts';
import type { FunctionRegistryImpl } from './function-registry.ts';
import { computeNaturalLog, computeLog10, computePower } from './math.view-model.ts';

/**
 * Creates a float Value from a number or null.
 *
 * @param n - The number or null
 * @returns A Value with type 'number.float'
 */
function floatValue(n: number | null): Value {
  return { type: 'number.float', value: n };
}

/**
 * Extracts a numeric value from a Value.
 *
 * @param v - The Value to extract from
 * @returns The numeric value, or null if the value is null or not a number
 */
function extractNumber(v: Value | undefined): number | null {
  if (v === undefined) {
    return null;
  }

  if (v.value === null) {
    return null;
  }

  if (typeof v.value !== 'number') {
    return null;
  }

  return v.value;
}

/**
 * LOG function - Natural logarithm (base e).
 *
 * Computes the natural logarithm of a number.
 *
 * @example
 * ```
 * LOG(1) = 0
 * LOG(2.718281828) = 1
 * LOG(0) = null (domain error)
 * LOG(-1) = null (domain error)
 * ```
 */
export const LOG_FUNCTION: FormulaFunction = {
  name: 'LOG',
  description: 'Returns the natural logarithm (base e) of a number',
  params: [
    {
      name: 'x',
      type: ['number.integer', 'number.float'],
      description: 'The positive number to compute the natural log of',
    },
  ],
  returnType: 'number.float',
  isAggregation: false,
  category: 'Math',
  minArgs: 1,
  maxArgs: 1,
  examples: [
    { formula: 'LOG(@value)', description: 'Natural log of value' },
    { formula: 'LOG(@growth + 1)', description: 'Log-transform growth rate' },
    { formula: 'LOG(@population) / LOG(10)', description: 'Convert to log base 10' },
  ],

  async evaluate(args: readonly Value[]): Promise<Value | null> {
    const x = extractNumber(args[0]);
    const result = computeNaturalLog(x);
    return floatValue(result);
  },
};

/**
 * LOG10 function - Base-10 logarithm.
 *
 * Computes the base-10 logarithm of a number.
 *
 * @example
 * ```
 * LOG10(10) = 1
 * LOG10(100) = 2
 * LOG10(1) = 0
 * LOG10(0) = null (domain error)
 * LOG10(-1) = null (domain error)
 * ```
 */
export const LOG10_FUNCTION: FormulaFunction = {
  name: 'LOG10',
  description: 'Returns the base-10 logarithm of a number',
  params: [
    {
      name: 'x',
      type: ['number.integer', 'number.float'],
      description: 'The positive number to compute the base-10 log of',
    },
  ],
  returnType: 'number.float',
  isAggregation: false,
  category: 'Math',
  minArgs: 1,
  maxArgs: 1,
  examples: [
    { formula: 'LOG10(@concentration)', description: 'Log10 of concentration' },
    { formula: 'LOG10(@value) * 10', description: 'Decibel-like scale' },
    { formula: '-LOG10(@pH)', description: 'Convert pH to hydrogen ion concentration' },
  ],

  async evaluate(args: readonly Value[]): Promise<Value | null> {
    const x = extractNumber(args[0]);
    const result = computeLog10(x);
    return floatValue(result);
  },
};

/**
 * POWER function - Exponentiation.
 *
 * Computes base raised to the power of exponent.
 *
 * @example
 * ```
 * POWER(2, 3) = 8
 * POWER(10, 2) = 100
 * POWER(4, 0.5) = 2
 * POWER(5, 0) = 1
 * POWER(0, 0) = 1 (by convention)
 * POWER(0, -1) = null (domain error)
 * POWER(-2, 0.5) = null (complex result)
 * ```
 */
export const POWER_FUNCTION: FormulaFunction = {
  name: 'POWER',
  description: 'Returns base raised to the power of exponent',
  params: [
    {
      name: 'base',
      type: ['number.integer', 'number.float'],
      description: 'The base number',
    },
    {
      name: 'exponent',
      type: ['number.integer', 'number.float'],
      description: 'The exponent to raise the base to',
    },
  ],
  returnType: 'number.float',
  isAggregation: false,
  category: 'Math',
  minArgs: 2,
  maxArgs: 2,
  examples: [
    { formula: 'POWER(@base, 2)', description: 'Square of base' },
    { formula: 'POWER(@value, 0.5)', description: 'Square root of value' },
    { formula: 'POWER(1 + @rate, @years)', description: 'Compound interest factor' },
  ],

  async evaluate(args: readonly Value[]): Promise<Value | null> {
    const base = extractNumber(args[0]);
    const exponent = extractNumber(args[1]);
    const result = computePower(base, exponent);
    return floatValue(result);
  },
};

/**
 * All math functions as an array.
 *
 * Use this to iterate over all math functions or for bulk registration.
 */
export const MATH_FUNCTIONS: readonly FormulaFunction[] = [
  LOG_FUNCTION,
  LOG10_FUNCTION,
  POWER_FUNCTION,
];

/**
 * Registers all math functions in the given registry.
 *
 * @param registry - The function registry to register the math functions in
 *
 * @example
 * ```typescript
 * const registry = createFunctionRegistry();
 * registerMathFunctions(registry);
 *
 * // Now LOG, LOG10, and POWER are available
 * const logFn = registry.getFunction('LOG');
 * ```
 */
export function registerMathFunctions(registry: FunctionRegistryImpl): void {
  for (const fn of MATH_FUNCTIONS) {
    registry.register(fn);
  }
}
