/**
 * Pure batch evaluation logic for the FormulaQ engine.
 *
 * This module contains stateless utility functions for batch processing,
 * including row index generation, result statistics computation, and
 * chunk processing logic.
 *
 * @module
 */

import type { Value, ValueType } from '../types/values.ts';
import type { FormulaRuntimeError } from '../types/errors.ts';
import type { BatchResult } from '../types/results.ts';

/**
 * Default chunk size for batch processing.
 */
export const DEFAULT_CHUNK_SIZE = 1000;

/**
 * Default delay in milliseconds between chunks.
 */
export const DEFAULT_DELAY_MS = 0;

/**
 * Result of evaluating a single row within a batch.
 *
 * Used internally during batch processing to collect both
 * the value and any runtime error that occurred.
 */
export interface RowResult {
  /**
   * The computed value for this row.
   */
  readonly value: Value;

  /**
   * Runtime error that occurred during evaluation, if any.
   */
  readonly error?: FormulaRuntimeError | undefined;
}

/**
 * Creates an array of row indices for batch processing.
 *
 * @param rowCount - Total number of rows
 * @returns Array of row indices from 0 to rowCount - 1
 */
export function createRowIndices(rowCount: number): number[] {
  const indices: number[] = [];
  for (let i = 0; i < rowCount; i++) {
    indices.push(i);
  }
  return indices;
}

/**
 * Counts the number of null values in a result set.
 *
 * Null values can occur due to:
 * - Null propagation from input variables
 * - Runtime errors during evaluation
 *
 * @param values - The values to analyze
 * @returns Count of values with null content
 */
export function countNullValues(values: readonly Value[]): number {
  let count = 0;
  for (const value of values) {
    if (value.value === null) {
      count++;
    }
  }
  return count;
}

/**
 * Counts the number of successful (non-null) values in a result set.
 *
 * @param values - The values to analyze
 * @returns Count of values with non-null content
 */
export function countSuccessfulValues(values: readonly Value[]): number {
  let count = 0;
  for (const value of values) {
    if (value.value !== null) {
      count++;
    }
  }
  return count;
}

/**
 * Computes the null count that is not due to errors.
 *
 * Error rows have null values but should not be double-counted
 * as both errors and nulls.
 *
 * @param values - The values to analyze
 * @param errorCount - Number of error rows
 * @returns Count of null values excluding error rows
 */
export function computeNonErrorNullCount(values: readonly Value[], errorCount: number): number {
  const totalNulls = countNullValues(values);
  return totalNulls - errorCount;
}

/**
 * Creates a null value with the specified type.
 *
 * Used when an error occurs during row evaluation.
 *
 * @param valueType - The type of the value
 * @returns A Value with null content
 */
export function createNullValue(valueType: ValueType): Value {
  return {
    type: valueType,
    value: null,
  };
}

/**
 * Assembles a BatchResult from row results.
 *
 * Collects all values and errors into a single BatchResult object
 * with computed statistics.
 *
 * @param rowResults - Results from each row evaluation
 * @returns A complete BatchResult
 */
export function assembleBatchResult(rowResults: readonly RowResult[]): BatchResult {
  const values: Value[] = [];
  const errors: FormulaRuntimeError[] = [];

  for (const result of rowResults) {
    values.push(result.value);
    if (result.error !== undefined) {
      errors.push(result.error);
    }
  }

  const errorCount = errors.length;
  const successCount = values.length - errorCount;

  return {
    values,
    errors,
    hasErrors: errorCount > 0,
    successCount,
    errorCount,
  };
}

/**
 * Creates an empty BatchResult for edge cases.
 *
 * Used when there are no rows to evaluate.
 *
 * @returns A BatchResult with no values or errors
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
 * Computes the result type for a batch.
 *
 * All values in a batch should have the same type.
 * Returns a default type if the batch is empty.
 *
 * @param values - The values in the batch
 * @param defaultType - Default type to return for empty batch
 * @returns The ValueType of the values
 */
export function inferResultType(values: readonly Value[], defaultType: ValueType): ValueType {
  if (values.length === 0) {
    return defaultType;
  }
  const firstValue = values[0];
  if (firstValue === undefined) {
    return defaultType;
  }
  return firstValue.type;
}

/**
 * Validates batch evaluation options.
 *
 * Ensures chunk size and delay are valid positive numbers.
 *
 * @param chunkSize - Chunk size to validate
 * @param delayMs - Delay to validate
 * @returns Object with validated chunkSize and delayMs
 */
export function validateBatchOptions(
  chunkSize: number | undefined,
  delayMs: number | undefined,
): { chunkSize: number; delayMs: number } {
  const validatedChunkSize =
    chunkSize !== undefined && chunkSize > 0 ? chunkSize : DEFAULT_CHUNK_SIZE;
  const validatedDelayMs = delayMs !== undefined && delayMs >= 0 ? delayMs : DEFAULT_DELAY_MS;

  return {
    chunkSize: validatedChunkSize,
    delayMs: validatedDelayMs,
  };
}

/**
 * Merges partial results from an aborted batch evaluation.
 *
 * Creates a BatchResult that includes partial values and
 * indicates the evaluation was incomplete.
 *
 * @param partialRowResults - Results from rows evaluated before abort
 * @returns A BatchResult with partial data
 */
export function createPartialBatchResult(partialRowResults: readonly RowResult[]): BatchResult {
  const values: Value[] = [];
  const errors: FormulaRuntimeError[] = [];

  for (const result of partialRowResults) {
    values.push(result.value);
    if (result.error !== undefined) {
      errors.push(result.error);
    }
  }

  const errorCount = errors.length;
  const successCount = values.length - errorCount;

  return {
    values,
    errors,
    hasErrors: errorCount > 0,
    successCount,
    errorCount,
  };
}

/**
 * Sorts runtime errors by row index.
 *
 * Ensures errors are ordered consistently in the BatchResult.
 *
 * @param errors - The errors to sort
 * @returns Sorted array of errors
 */
export function sortErrorsByRowIndex(
  errors: readonly FormulaRuntimeError[],
): FormulaRuntimeError[] {
  return [...errors].sort(function compareRowIndex(a, b) {
    return a.rowIndex - b.rowIndex;
  });
}
