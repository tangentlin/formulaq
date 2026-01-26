/**
 * Evaluator-specific types for the FormulaQ evaluation engine.
 *
 * This module defines interfaces for row-level evaluation contexts
 * and evaluation results.
 *
 * @module
 */

import type { Value } from '../types/values.ts';
import type { FormulaRuntimeError } from '../types/errors.ts';
import type { CachedAggregation } from '../types/ast.ts';

/**
 * Context for evaluating a single row.
 *
 * Provides access to variable values for a specific row index,
 * along with pre-computed aggregation results.
 *
 * @example
 * ```typescript
 * const rowContext: RowContext = {
 *   rowIndex: 0,
 *   getVariable: (name) => variables[name]?.[0] ?? null,
 *   getCachedAggregation: (fnName, varName) => cachedAggregations.get(`${fnName}:${varName}`),
 * };
 * ```
 */
export interface RowContext {
  /**
   * The current row index (0-based).
   */
  readonly rowIndex: number;

  /**
   * Gets the value of a variable for this row.
   *
   * @param name - Variable name (without @ prefix)
   * @returns The Value for this row, or null if the variable doesn't exist
   */
  getVariable(name: string): Value | null;

  /**
   * Gets a pre-computed aggregation result.
   *
   * Aggregations are computed once before row-level evaluation begins
   * and their results are cached for efficiency.
   *
   * @param functionName - The aggregation function name (e.g., 'AVG', 'SUM')
   * @param variableName - The variable being aggregated
   * @returns The cached aggregation result, or undefined if not cached
   */
  getCachedAggregation?(functionName: string, variableName: string): Value | undefined;
}

/**
 * Result of evaluating a single row.
 *
 * Contains the computed value and any runtime error that occurred.
 * If an error occurred, the value will be null.
 */
export interface RowEvaluationResult {
  /**
   * The computed value for this row.
   *
   * Will be null if an error occurred or if the result is legitimately null.
   */
  readonly value: Value;

  /**
   * Runtime error that occurred during evaluation, if any.
   *
   * When an error occurs, evaluation returns null instead of throwing.
   * The error is captured here for reporting purposes.
   */
  readonly error?: FormulaRuntimeError | undefined;
}

/**
 * Configuration for the row evaluator.
 */
export interface RowEvaluatorConfig {
  /**
   * Whether to collect detailed error information.
   *
   * When true, runtime errors include additional context
   * about what operation failed and why.
   *
   * @defaultValue true
   */
  readonly collectErrors?: boolean | undefined;
}

/**
 * A map of cached aggregation results.
 *
 * Keys are formatted as "functionName:variableName".
 */
export type AggregationCache = ReadonlyMap<string, Value>;

/**
 * Creates a cache key for an aggregation result.
 *
 * @param functionName - The aggregation function name
 * @param variableName - The variable name being aggregated
 * @returns A unique cache key
 */
export function createAggregationCacheKey(functionName: string, variableName: string): string {
  return `${functionName}:${variableName}`;
}

/**
 * Creates a RowContext from an EvaluationContext for a specific row.
 *
 * @param variables - The variable data (arrays of values)
 * @param rowIndex - The row index to create context for
 * @param aggregationCache - Optional pre-computed aggregation cache
 * @returns A RowContext for the specified row
 */
export function createRowContext(
  variables: Readonly<Record<string, readonly Value[]>>,
  rowIndex: number,
  aggregationCache?: AggregationCache,
): RowContext {
  return {
    rowIndex,
    getVariable(name: string): Value | null {
      const values = variables[name];
      if (values === undefined) {
        return null;
      }
      const value = values[rowIndex];
      if (value === undefined) {
        return null;
      }
      return value;
    },
    getCachedAggregation(functionName: string, variableName: string): Value | undefined {
      if (aggregationCache === undefined) {
        return undefined;
      }
      const key = createAggregationCacheKey(functionName, variableName);
      return aggregationCache.get(key);
    },
  };
}

/**
 * Result type for binary operations that may produce runtime errors.
 */
export interface BinaryOperationResult {
  /**
   * The result value, or null if an error occurred.
   */
  readonly value: Value | null;

  /**
   * Runtime error that occurred during the operation, if any.
   */
  readonly error?: FormulaRuntimeError | undefined;
}

/**
 * Converts a CachedAggregation array to an AggregationCache map.
 *
 * @param aggregations - Array of cached aggregation results
 * @returns A map for efficient lookup
 */
export function createAggregationCacheFromArray(
  aggregations: readonly CachedAggregation[],
): AggregationCache {
  const cache = new Map<string, Value>();
  for (const agg of aggregations) {
    const key = createAggregationCacheKey(agg.functionName, agg.variableName);
    cache.set(key, agg.result);
  }
  return cache;
}
