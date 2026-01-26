/**
 * Pure view model logic for the ResultsPanel component.
 *
 * Contains stateless functions for:
 * - Formatting values for display
 * - Calculating result statistics
 * - Computing min/max for numeric results
 *
 * @module
 */

import type { Value } from '../../core/types/values';
import type { FormulaRuntimeError } from '../../core/types/errors';
import type { ResultsStatistics, FormattedResult } from './results-panel.types';

/**
 * Default precision for formatting floating point numbers.
 */
const DEFAULT_PRECISION = 6;

/**
 * Maximum number of significant digits to display.
 */
const MAX_SIGNIFICANT_DIGITS = 10;

/**
 * Threshold for using exponential notation.
 */
const EXPONENTIAL_THRESHOLD_UPPER = 1e10;
const EXPONENTIAL_THRESHOLD_LOWER = 1e-6;

/**
 * Formats a number for display with appropriate precision.
 *
 * Uses reasonable precision to avoid floating point noise while
 * maintaining accuracy for both small and large numbers.
 *
 * @param value - The number to format
 * @returns Formatted number string
 */
export function formatNumber(value: number): string {
  if (!Number.isFinite(value)) {
    if (Number.isNaN(value)) {
      return 'NaN';
    }
    return value > 0 ? 'Infinity' : '-Infinity';
  }

  const absValue = Math.abs(value);

  // Use exponential notation for very large or very small numbers
  if (
    absValue !== 0 &&
    (absValue >= EXPONENTIAL_THRESHOLD_UPPER || absValue < EXPONENTIAL_THRESHOLD_LOWER)
  ) {
    return value.toExponential(DEFAULT_PRECISION);
  }

  // For integers, return as-is
  if (Number.isInteger(value)) {
    return String(value);
  }

  // For decimals, use toPrecision and remove trailing zeros
  const formatted = value.toPrecision(MAX_SIGNIFICANT_DIGITS);
  const parsed = parseFloat(formatted);
  return String(parsed);
}

/**
 * Formats a string value for display with quotes.
 *
 * @param value - The string to format
 * @returns Quoted string
 */
export function formatString(value: string): string {
  return `"${value}"`;
}

/**
 * Formats a boolean value for display.
 *
 * @param value - The boolean to format
 * @returns "TRUE" or "FALSE"
 */
export function formatBoolean(value: boolean): string {
  return value ? 'TRUE' : 'FALSE';
}

/**
 * Formats a Value for display in the results table.
 *
 * Handles all value types and null values appropriately:
 * - Numbers: formatted with reasonable precision
 * - Strings: enclosed in quotes
 * - Booleans: TRUE/FALSE (uppercase)
 * - Null: "null"
 *
 * @param value - The Value to format
 * @returns Formatted display string
 */
export function formatValueForDisplay(value: Value): string {
  if (value.value === null) {
    return 'null';
  }

  const rawValue = value.value;

  switch (value.type) {
    case 'number.integer':
    case 'number.float':
      return formatNumber(rawValue as number);

    case 'string.text':
      return formatString(rawValue as string);

    case 'boolean.boolean':
      return formatBoolean(rawValue as boolean);

    default:
      return String(rawValue);
  }
}

/**
 * Creates a FormattedResult for a given value and row index.
 *
 * @param value - The value to format
 * @param rowIndex - The 0-based row index
 * @param errorSet - Set of row indices that had errors
 * @returns FormattedResult with display string and status flags
 */
export function createFormattedResult(
  value: Value,
  rowIndex: number,
  errorSet: ReadonlySet<number>,
): FormattedResult {
  const isError = errorSet.has(rowIndex);
  const isNull = value.value === null;

  return {
    display: formatValueForDisplay(value),
    isNull: isNull && !isError,
    isError,
  };
}

/**
 * Creates a set of row indices that had errors.
 *
 * @param errors - Array of runtime errors
 * @returns Set of row indices with errors
 */
export function createErrorRowSet(errors: readonly FormulaRuntimeError[]): Set<number> {
  const errorSet = new Set<number>();
  for (const error of errors) {
    errorSet.add(error.rowIndex);
  }
  return errorSet;
}

/**
 * Computes the min and max values from numeric results.
 *
 * Only considers non-null numeric values.
 * Returns null for min/max if no valid numeric values exist.
 *
 * @param results - Array of result values
 * @returns Object with min and max, or null if not applicable
 */
export function getMinMax(results: readonly Value[]): { min: number | null; max: number | null } {
  let min: number | null = null;
  let max: number | null = null;
  let hasNumericValue = false;

  for (const result of results) {
    if (result.value === null) {
      continue;
    }

    if (result.type !== 'number.integer' && result.type !== 'number.float') {
      continue;
    }

    const numValue = result.value as number;

    if (!Number.isFinite(numValue)) {
      continue;
    }

    if (!hasNumericValue) {
      min = numValue;
      max = numValue;
      hasNumericValue = true;
    } else {
      if (numValue < min!) {
        min = numValue;
      }
      if (numValue > max!) {
        max = numValue;
      }
    }
  }

  return { min, max };
}

/**
 * Counts the number of null values in results.
 *
 * @param results - Array of result values
 * @returns Count of null values
 */
export function countNulls(results: readonly Value[]): number {
  let count = 0;
  for (const result of results) {
    if (result.value === null) {
      count++;
    }
  }
  return count;
}

/**
 * Calculates comprehensive statistics from evaluation results.
 *
 * Computes:
 * - Total row count
 * - Min/max for numeric results
 * - Null count (excluding errors)
 * - Error count
 *
 * @param results - Array of evaluation result values
 * @param errors - Array of runtime errors (optional)
 * @returns ResultsStatistics object
 */
export function calculateStatistics(
  results: readonly Value[],
  errors?: readonly FormulaRuntimeError[] | undefined,
): ResultsStatistics {
  const errorCount = errors?.length ?? 0;
  const totalNulls = countNulls(results);

  // Null count excludes error rows (errors produce null but shouldn't be double-counted)
  const nullCount = Math.max(0, totalNulls - errorCount);

  const minMax = getMinMax(results);

  return {
    count: results.length,
    min: minMax.min,
    max: minMax.max,
    nullCount,
    errorCount,
  };
}

/**
 * Determines if results contain numeric data.
 *
 * Used to decide whether to show min/max statistics.
 *
 * @param results - Array of result values
 * @returns True if results contain numeric types
 */
export function hasNumericResults(results: readonly Value[]): boolean {
  if (results.length === 0) {
    return false;
  }

  const firstResult = results[0];
  if (firstResult === undefined) {
    return false;
  }

  return firstResult.type === 'number.integer' || firstResult.type === 'number.float';
}

/**
 * Formats a statistic value for display.
 *
 * Handles null values and numeric formatting.
 *
 * @param value - The statistic value (number or null)
 * @returns Formatted string
 */
export function formatStatisticValue(value: number | null): string {
  if (value === null) {
    return '-';
  }
  return formatNumber(value);
}
