/**
 * AggregationDisplay component for showing computed aggregation values.
 *
 * Displays aggregation function calls and their computed values in a compact
 * list format suitable for the results panel. Each aggregation is shown as:
 * "AVG(@score) = 85.5"
 *
 * @module
 */

import { Box, Typography } from '@mui/material';
import React from 'react';
import type { AggregationDisplayProps, AggregationResult } from './aggregation-display.types';
import type { Value } from '../../core/types/values';

/**
 * Maximum number of decimal places for floating-point numbers.
 */
const MAX_DECIMAL_PLACES = 4;

/**
 * Minimum precision before switching to exponential notation.
 */
const EXPONENTIAL_THRESHOLD_SMALL = 0.0001;

/**
 * Maximum value before switching to exponential notation.
 */
const EXPONENTIAL_THRESHOLD_LARGE = 1e9;

/**
 * Formats a numeric value with reasonable precision.
 *
 * Numbers are formatted with 2-4 decimal places depending on significance.
 * Very large or very small numbers use exponential notation.
 *
 * @param num - The number to format
 * @returns The formatted number string
 */
function formatNumber(num: number): string {
  if (Number.isNaN(num)) {
    return 'NaN';
  }

  if (!Number.isFinite(num)) {
    return num > 0 ? 'Infinity' : '-Infinity';
  }

  const absNum = Math.abs(num);

  // Use exponential notation for very large or very small numbers
  if (
    absNum !== 0 &&
    (absNum < EXPONENTIAL_THRESHOLD_SMALL || absNum >= EXPONENTIAL_THRESHOLD_LARGE)
  ) {
    return num.toExponential(2);
  }

  // Check if it's an integer
  if (Number.isInteger(num)) {
    return num.toString();
  }

  // Format with reasonable precision, removing trailing zeros
  const formatted = num.toFixed(MAX_DECIMAL_PLACES);
  // Remove trailing zeros after decimal point, but keep at least one decimal
  const trimmed = formatted.replace(/\.?0+$/, '');

  // Ensure at least one decimal place for floats
  if (!trimmed.includes('.')) {
    return formatted.replace(/0+$/, '0');
  }

  return trimmed;
}

/**
 * Formats a Value for display in the aggregation result.
 *
 * @param value - The Value to format
 * @returns The formatted string representation
 */
function formatValue(value: Value): string {
  if (value.value === null) {
    return 'null';
  }

  switch (value.type) {
    case 'number.integer':
    case 'number.float':
      return formatNumber(value.value as number);
    case 'string.text':
      return `"${value.value}"`;
    case 'boolean.boolean':
      return String(value.value);
    default:
      return String(value.value);
  }
}

/**
 * Props for the AggregationRow component.
 */
interface AggregationRowProps {
  readonly result: AggregationResult;
}

/**
 * Renders a single aggregation result row.
 *
 * @param props - The component props
 * @returns The aggregation row JSX element
 */
function AggregationRow(props: AggregationRowProps): React.ReactElement {
  const formattedValue = formatValue(props.result.value);
  const isNullValue = props.result.value.value === null;

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'baseline',
        gap: 0.5,
        py: 0.25,
      }}
    >
      <Typography
        variant="body2"
        component="code"
        sx={{
          fontFamily: 'monospace',
          fontSize: '0.8125rem',
          color: 'text.primary',
        }}
      >
        {props.result.expression}
      </Typography>
      <Typography
        variant="body2"
        sx={{
          color: 'text.secondary',
          fontSize: '0.8125rem',
        }}
      >
        =
      </Typography>
      <Typography
        variant="body2"
        component="code"
        sx={{
          fontFamily: 'monospace',
          fontSize: '0.8125rem',
          color: isNullValue ? 'text.disabled' : 'success.dark',
          fontStyle: isNullValue ? 'italic' : 'normal',
        }}
      >
        {formattedValue}
      </Typography>
    </Box>
  );
}

/**
 * AggregationDisplay component displays computed aggregation values.
 *
 * This component renders a list of aggregation function calls and their
 * computed values in a format suitable for the results panel.
 *
 * Features:
 * - Displays each aggregation as "expression = value"
 * - Formats numbers with reasonable precision (2-4 decimals)
 * - Shows null values distinctly with styling
 * - Returns null when there are no aggregations (empty state)
 *
 * @param props - The component props
 * @returns The rendered AggregationDisplay component, or null if empty
 *
 * @example
 * ```tsx
 * // Single aggregation
 * <AggregationDisplay
 *   aggregations={[
 *     { expression: 'AVG(@score)', value: { type: 'number.float', value: 85.5 } }
 *   ]}
 * />
 *
 * // Multiple aggregations
 * <AggregationDisplay
 *   aggregations={[
 *     { expression: 'AVG(@score)', value: { type: 'number.float', value: 85.5 } },
 *     { expression: 'SUM(@amounts)', value: { type: 'number.float', value: 1250 } },
 *     { expression: 'MIN(@values)', value: { type: 'number.float', value: 10 } },
 *     { expression: 'MAX(@values)', value: { type: 'number.float', value: 100 } }
 *   ]}
 * />
 *
 * // With null result
 * <AggregationDisplay
 *   aggregations={[
 *     { expression: 'AVG(@score)', value: { type: 'number.float', value: null } }
 *   ]}
 * />
 * ```
 */
export function AggregationDisplay(props: AggregationDisplayProps): React.ReactElement | null {
  // Don't render anything if there are no aggregations
  if (props.aggregations.length === 0) {
    return null;
  }

  return (
    <Box
      sx={{
        backgroundColor: 'grey.50',
        borderRadius: 1,
        p: 1.5,
        mb: 1,
      }}
    >
      <Typography
        variant="subtitle2"
        sx={{
          color: 'text.secondary',
          fontSize: '0.75rem',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          mb: 0.5,
        }}
      >
        Aggregations
      </Typography>
      <Box sx={{ pl: 0.5 }}>
        {props.aggregations.map(function (result, index) {
          return <AggregationRow key={`${result.expression}-${index}`} result={result} />;
        })}
      </Box>
    </Box>
  );
}
