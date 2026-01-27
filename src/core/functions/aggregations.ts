/**
 * Aggregation functions for FormulaQ.
 *
 * Provides SUM, AVG, MIN, MAX, COUNT, and PERCENTILE functions.
 * All aggregation functions operate on arrays of values and are
 * computed once before row-level evaluation.
 *
 * @module
 */

import type { FormulaFunction } from '../types/functions.ts';
import type { Value } from '../types/values.ts';
import type { FunctionRegistryImpl } from './function-registry.ts';
import {
  computeSum,
  computeAvg,
  computeMin,
  computeMax,
  computeCount,
  computePercentile,
} from './aggregations.view-model.ts';

/**
 * Category identifier for aggregation functions.
 */
const AGGREGATION_CATEGORY = 'Aggregation';

/**
 * Extracts numeric values from a Value array.
 *
 * Converts Value objects to their raw number values,
 * preserving nulls for proper aggregation handling.
 *
 * @param values - Array of Value objects
 * @returns Array of nullable numbers
 */
function extractNumericValues(values: readonly Value[]): Array<number | null> {
  const result: Array<number | null> = [];

  for (let i = 0; i < values.length; i++) {
    const value = values[i]!;
    if (value.value === null) {
      result.push(null);
    } else if (typeof value.value === 'number') {
      result.push(value.value);
    } else {
      // Non-numeric values are treated as null for aggregation
      result.push(null);
    }
  }

  return result;
}

/**
 * Extracts raw values from a Value array for counting.
 *
 * Returns the raw value from each Value object, preserving nulls.
 *
 * @param values - Array of Value objects
 * @returns Array of raw values (any type)
 */
function extractRawValues(values: readonly Value[]): Array<unknown> {
  const result: Array<unknown> = [];

  for (let i = 0; i < values.length; i++) {
    result.push(values[i]!.value);
  }

  return result;
}

/**
 * SUM function - calculates the sum of all numeric values.
 *
 * Null values are skipped. Returns null if all values are null.
 *
 * @example
 * ```
 * SUM(@sales) // Sum of all sales values
 * ```
 */
export const SUM: FormulaFunction = {
  name: 'SUM',
  description: 'Calculates the sum of all numeric values',
  params: [
    {
      name: 'values',
      type: ['number.integer', 'number.float'],
      description: 'Numeric values to sum',
    },
  ],
  returnType: 'number.float',
  isAggregation: true,
  category: AGGREGATION_CATEGORY,
  examples: [
    { formula: 'SUM(@sales)', description: 'Total of all sales values' },
    { formula: 'SUM(@quantity) * @unitPrice', description: 'Combined with arithmetic' },
    { formula: 'SUM(@revenue) - SUM(@costs)', description: 'Calculate profit' },
  ],

  async evaluate(args: readonly Value[]): Promise<Value | null> {
    // For aggregation functions, args contains the full array of values
    const numericValues = extractNumericValues(args);
    const result = computeSum(numericValues);

    return {
      type: 'number.float',
      value: result,
    };
  },
};

/**
 * AVG function - calculates the arithmetic mean of values.
 *
 * Null values are skipped in both the sum and the count.
 * Returns null if all values are null.
 *
 * @example
 * ```
 * AVG(@score) // Average of all scores
 * ```
 */
export const AVG: FormulaFunction = {
  name: 'AVG',
  description: 'Calculates the arithmetic mean of numeric values',
  params: [
    {
      name: 'values',
      type: ['number.integer', 'number.float'],
      description: 'Numeric values to average',
    },
  ],
  returnType: 'number.float',
  isAggregation: true,
  category: AGGREGATION_CATEGORY,
  examples: [
    { formula: 'AVG(@score)', description: 'Average of all scores' },
    { formula: 'AVG(@price) * 1.1', description: 'Average price plus 10%' },
    { formula: '@value - AVG(@value)', description: 'Deviation from mean' },
  ],

  async evaluate(args: readonly Value[]): Promise<Value | null> {
    const numericValues = extractNumericValues(args);
    const result = computeAvg(numericValues);

    return {
      type: 'number.float',
      value: result,
    };
  },
};

/**
 * MIN function - finds the minimum value.
 *
 * Null values are skipped. Returns null if all values are null.
 *
 * @example
 * ```
 * MIN(@price) // Minimum price
 * ```
 */
export const MIN: FormulaFunction = {
  name: 'MIN',
  description: 'Finds the minimum numeric value',
  params: [
    {
      name: 'values',
      type: ['number.integer', 'number.float'],
      description: 'Numeric values to find minimum from',
    },
  ],
  returnType: 'number.float',
  isAggregation: true,
  category: AGGREGATION_CATEGORY,
  examples: [
    { formula: 'MIN(@price)', description: 'Lowest price in the data' },
    { formula: '@price - MIN(@price)', description: 'Difference from minimum price' },
    { formula: 'IF(@value = MIN(@value), "Lowest", "")', description: 'Mark minimum values' },
  ],

  async evaluate(args: readonly Value[]): Promise<Value | null> {
    const numericValues = extractNumericValues(args);
    const result = computeMin(numericValues);

    return {
      type: 'number.float',
      value: result,
    };
  },
};

/**
 * MAX function - finds the maximum value.
 *
 * Null values are skipped. Returns null if all values are null.
 *
 * @example
 * ```
 * MAX(@score) // Maximum score
 * ```
 */
export const MAX: FormulaFunction = {
  name: 'MAX',
  description: 'Finds the maximum numeric value',
  params: [
    {
      name: 'values',
      type: ['number.integer', 'number.float'],
      description: 'Numeric values to find maximum from',
    },
  ],
  returnType: 'number.float',
  isAggregation: true,
  category: AGGREGATION_CATEGORY,
  examples: [
    { formula: 'MAX(@score)', description: 'Highest score in the data' },
    { formula: 'MAX(@price) - @price', description: 'Difference from maximum price' },
    { formula: '@value / MAX(@value) * 100', description: 'Percentage of maximum' },
  ],

  async evaluate(args: readonly Value[]): Promise<Value | null> {
    const numericValues = extractNumericValues(args);
    const result = computeMax(numericValues);

    return {
      type: 'number.float',
      value: result,
    };
  },
};

/**
 * COUNT function - counts non-null values.
 *
 * Unlike other aggregations, COUNT returns 0 (not null)
 * when all values are null or the array is empty.
 *
 * @example
 * ```
 * COUNT(@responses) // Number of non-null responses
 * ```
 */
export const COUNT: FormulaFunction = {
  name: 'COUNT',
  description: 'Counts the number of non-null values',
  params: [
    {
      name: 'values',
      type: 'any',
      description: 'Values to count (any type)',
    },
  ],
  returnType: 'number.float',
  isAggregation: true,
  category: AGGREGATION_CATEGORY,
  examples: [
    { formula: 'COUNT(@responses)', description: 'Number of non-null responses' },
    { formula: 'SUM(@sales) / COUNT(@sales)', description: 'Manual average calculation' },
    { formula: 'IF(COUNT(@values) > 0, AVG(@values), 0)', description: 'Safe average' },
  ],

  async evaluate(args: readonly Value[]): Promise<Value | null> {
    const rawValues = extractRawValues(args);
    const result = computeCount(rawValues);

    return {
      type: 'number.float',
      value: result,
    };
  },
};

/**
 * PERCENTILE function - calculates the k-th percentile.
 *
 * Uses linear interpolation (R-7/Excel PERCENTILE.INC method).
 * - k=0 returns the minimum
 * - k=100 returns the maximum
 * - k=50 returns the median
 *
 * Null values are skipped. Returns null if all values are null.
 *
 * @example
 * ```
 * PERCENTILE(@score, 50)  // Median score
 * PERCENTILE(@salary, 90) // 90th percentile salary
 * ```
 */
export const PERCENTILE: FormulaFunction = {
  name: 'PERCENTILE',
  description: 'Calculates the k-th percentile (0-100)',
  params: [
    {
      name: 'values',
      type: ['number.integer', 'number.float'],
      description: 'Numeric values to analyze',
    },
    {
      name: 'k',
      type: 'number.float',
      description: 'Percentile to calculate (0-100)',
    },
  ],
  returnType: 'number.float',
  isAggregation: true,
  minArgs: 2,
  maxArgs: 2,
  category: AGGREGATION_CATEGORY,
  examples: [
    { formula: 'PERCENTILE(@score, 50)', description: 'Median score' },
    { formula: 'PERCENTILE(@salary, 90)', description: '90th percentile salary' },
    { formula: '@value - PERCENTILE(@value, 50)', description: 'Deviation from median' },
  ],

  async evaluate(args: readonly Value[]): Promise<Value | null> {
    // PERCENTILE receives: [values_array_as_single_arg, k_value]
    // However, for aggregation functions receiving variable references,
    // the evaluator provides all values from the variable, and k separately.
    //
    // The actual call pattern depends on the evaluator implementation.
    // For now, we assume args is the array of values for the variable,
    // and k is passed as a property or extracted differently.
    //
    // Based on spec, PERCENTILE(values, k) where values is a variable ref
    // and k is a scalar. The evaluator should handle this specially.
    //
    // For a simpler implementation compatible with direct evaluation:
    // We check if we have at least one arg for values.

    if (args.length === 0) {
      return { type: 'number.float', value: null };
    }

    // Check if the last argument is the k value
    // This handles the case where args = [...values, k]
    const lastArg = args[args.length - 1];
    if (lastArg === undefined) {
      return { type: 'number.float', value: null };
    }

    // If we have more than 1 arg, assume last is k and rest are values
    // If we have exactly 1 arg, we cannot compute (missing k)
    if (args.length < 2) {
      return { type: 'number.float', value: null };
    }

    const kValue = lastArg.value;
    if (typeof kValue !== 'number') {
      return { type: 'number.float', value: null };
    }

    // Validate k range
    if (kValue < 0 || kValue > 100) {
      return { type: 'number.float', value: null };
    }

    // Extract values (all args except the last one which is k)
    const valueArgs = args.slice(0, -1);
    const numericValues = extractNumericValues(valueArgs);

    try {
      const result = computePercentile(numericValues, kValue);
      return { type: 'number.float', value: result };
    } catch {
      // Handle any computation errors (e.g., invalid k)
      return { type: 'number.float', value: null };
    }
  },
};

/**
 * Array of all aggregation functions for registration.
 */
export const AGGREGATION_FUNCTIONS: readonly FormulaFunction[] = [
  SUM,
  AVG,
  MIN,
  MAX,
  COUNT,
  PERCENTILE,
];

/**
 * Registers all aggregation functions with a FunctionRegistry.
 *
 * @param registry - The function registry to register with
 *
 * @example
 * ```typescript
 * const registry = createFunctionRegistry();
 * registerAggregationFunctions(registry);
 * ```
 */
export function registerAggregationFunctions(registry: FunctionRegistryImpl): void {
  for (let i = 0; i < AGGREGATION_FUNCTIONS.length; i++) {
    registry.register(AGGREGATION_FUNCTIONS[i]!);
  }
}
