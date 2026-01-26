/**
 * Result types for formula evaluation.
 *
 * These types define the output of batch evaluation operations,
 * including both successful values and collected runtime errors.
 *
 * @module
 */

import type { Value } from './values.ts';
import type { FormulaRuntimeError } from './errors.ts';

/**
 * Result of a batch evaluation operation.
 *
 * Contains all computed values and any runtime errors that occurred.
 * Errors are collected rather than thrown, allowing evaluation to
 * continue for all rows even when some rows fail.
 *
 * @example
 * ```typescript
 * const result = await engine.evaluateBatch(ast, context);
 *
 * if (result.hasErrors) {
 *   console.log(`${result.errorCount} errors occurred`);
 *   for (const error of result.errors) {
 *     console.log(`Row ${error.rowIndex}: ${error.message}`);
 *   }
 * }
 *
 * console.log(`Successfully evaluated ${result.successCount} rows`);
 * ```
 */
export interface BatchResult {
  /**
   * Result values, one per row.
   *
   * The array length equals the input row count.
   * Values at error indices will have `value: null`.
   */
  readonly values: readonly Value[];

  /**
   * Runtime errors collected during evaluation.
   *
   * Each error includes the row index where it occurred.
   * Sorted by row index ascending.
   */
  readonly errors: readonly FormulaRuntimeError[];

  /**
   * Whether any errors occurred during evaluation.
   *
   * Equivalent to `errors.length > 0`.
   */
  readonly hasErrors: boolean;

  /**
   * Count of rows that evaluated successfully.
   *
   * Rows with null values due to null propagation are counted
   * as successful, not as errors.
   */
  readonly successCount: number;

  /**
   * Count of rows that failed with runtime errors.
   *
   * Equals `errors.length`.
   */
  readonly errorCount: number;
}

/**
 * Creates an empty BatchResult for edge cases.
 *
 * @returns A BatchResult with no values and no errors
 */
export function createEmptyBatchResult(): BatchResult {
  return {
    values: [],
    errors: [],
    hasErrors: false,
    successCount: 0,
    errorCount: 0,
  };
}

/**
 * Creates a BatchResult from values and errors.
 *
 * @param values - The computed values
 * @param errors - The collected runtime errors
 * @returns A BatchResult object
 */
export function createBatchResult(
  values: readonly Value[],
  errors: readonly FormulaRuntimeError[],
): BatchResult {
  return {
    values,
    errors,
    hasErrors: errors.length > 0,
    successCount: values.length - errors.length,
    errorCount: errors.length,
  };
}

/**
 * Statistics about a batch evaluation result.
 *
 * Useful for displaying summary information in the UI.
 */
export interface BatchResultStats {
  /**
   * Total number of rows evaluated.
   */
  readonly totalRows: number;

  /**
   * Number of rows that succeeded.
   */
  readonly successCount: number;

  /**
   * Number of rows with errors.
   */
  readonly errorCount: number;

  /**
   * Number of rows with null results (not from errors).
   */
  readonly nullCount: number;

  /**
   * Minimum numeric value (if result type is numeric).
   */
  readonly minValue?: number | undefined;

  /**
   * Maximum numeric value (if result type is numeric).
   */
  readonly maxValue?: number | undefined;
}

/**
 * Computes statistics from a BatchResult.
 *
 * @param result - The batch result to analyze
 * @returns Statistics about the result
 */
export function computeBatchResultStats(result: BatchResult): BatchResultStats {
  let nullCount = 0;
  let minValue: number | undefined;
  let maxValue: number | undefined;

  for (const value of result.values) {
    if (value.value === null) {
      nullCount++;
    } else if (typeof value.value === 'number') {
      if (minValue === undefined || value.value < minValue) {
        minValue = value.value;
      }
      if (maxValue === undefined || value.value > maxValue) {
        maxValue = value.value;
      }
    }
  }

  // Adjust null count to exclude error rows
  // (error rows have null value but shouldn't be double-counted)
  const actualNullCount = nullCount - result.errorCount;

  return {
    totalRows: result.values.length,
    successCount: result.successCount,
    errorCount: result.errorCount,
    nullCount: actualNullCount,
    minValue,
    maxValue,
  };
}
