/**
 * Types for the ResultsPanel component.
 *
 * @module
 */

import type { Value } from '../../core/types/values';
import type { FormulaRuntimeError } from '../../core/types/errors';

/**
 * Statistics calculated from evaluation results.
 *
 * Provides summary information about the result set including
 * count, min/max for numeric data, null count, and error count.
 */
export interface ResultsStatistics {
  /**
   * Total number of rows in the result set.
   */
  readonly count: number;

  /**
   * Minimum numeric value, or null if no valid numeric values.
   * Only applicable when results contain numeric types.
   */
  readonly min: number | null;

  /**
   * Maximum numeric value, or null if no valid numeric values.
   * Only applicable when results contain numeric types.
   */
  readonly max: number | null;

  /**
   * Count of null values in the result set.
   * Does not include values that are null due to errors.
   */
  readonly nullCount: number;

  /**
   * Count of errors that occurred during evaluation.
   */
  readonly errorCount: number;
}

/**
 * Formatted result for display in the table.
 *
 * Contains the display string and styling information
 * for rendering a single result value.
 */
export interface FormattedResult {
  /**
   * The formatted display string.
   */
  readonly display: string;

  /**
   * Whether this value is null.
   */
  readonly isNull: boolean;

  /**
   * Whether this row had an error.
   */
  readonly isError: boolean;
}

/**
 * Props for the ResultsPanel component.
 *
 * Displays evaluation results in a table format with statistics.
 */
export interface ResultsPanelProps {
  /**
   * Evaluation results, one value per row.
   *
   * Each Value contains the type and computed value.
   * Values may be null due to null propagation or errors.
   */
  readonly results: readonly Value[];

  /**
   * Runtime errors that occurred during evaluation.
   *
   * Each error includes the row index where it occurred.
   * Used to display error indicators and calculate error statistics.
   */
  readonly errors?: readonly FormulaRuntimeError[] | undefined;

  /**
   * Whether evaluation is currently in progress.
   *
   * When true, displays a loading skeleton or spinner
   * instead of the results table.
   */
  readonly isEvaluating?: boolean | undefined;

  /**
   * Custom message to display when there are no results.
   *
   * Defaults to "No results to display".
   */
  readonly emptyMessage?: string | undefined;
}
