/**
 * Types for the AggregationDisplay component.
 *
 * @module
 */

import type { Value } from '../../core/types/values';

/**
 * Represents a single aggregation result with its expression and computed value.
 *
 * @example
 * ```typescript
 * const avgResult: AggregationResult = {
 *   expression: 'AVG(@score)',
 *   value: { type: 'number.float', value: 85.5 }
 * };
 * ```
 */
export interface AggregationResult {
  /**
   * The aggregation expression as it appears in the formula.
   *
   * Examples: "AVG(@score)", "SUM(@amounts)", "PERCENTILE(@values, 50)"
   */
  readonly expression: string;

  /**
   * The computed value of the aggregation.
   *
   * This is a typed Value that can contain:
   * - A number for numeric aggregations
   * - null if the aggregation could not be computed or all values were null
   */
  readonly value: Value;
}

/**
 * Props for the AggregationDisplay component.
 *
 * This component displays a list of aggregation function calls and their
 * computed values in a compact format suitable for the results panel.
 *
 * @example
 * ```tsx
 * <AggregationDisplay
 *   aggregations={[
 *     { expression: 'AVG(@score)', value: { type: 'number.float', value: 85.5 } },
 *     { expression: 'SUM(@amounts)', value: { type: 'number.float', value: 1250 } }
 *   ]}
 * />
 * ```
 */
export interface AggregationDisplayProps {
  /**
   * Array of aggregation results to display.
   *
   * Each result contains the expression string and computed value.
   * An empty array will render nothing (empty state).
   */
  readonly aggregations: readonly AggregationResult[];
}
