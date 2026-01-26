/**
 * ResultsPanel component for displaying formula evaluation results.
 *
 * Displays a table of results with Index and Result columns,
 * along with statistics (count, min/max, nulls, errors).
 *
 * Features:
 * - Scrollable table for many rows
 * - Distinct styling for null and error values
 * - Statistics section below the table
 * - Empty state when no results
 * - Loading state during evaluation
 *
 * @module
 */

import {
  Box,
  Paper,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import React from 'react';
import type { ResultsPanelProps } from './results-panel.types';
import {
  calculateStatistics,
  createErrorRowSet,
  createFormattedResult,
  formatStatisticValue,
  hasNumericResults,
} from './results-panel.view-model';

/**
 * Default empty message shown when no results are available.
 */
const DEFAULT_EMPTY_MESSAGE = 'No results to display';

/**
 * Maximum height for the scrollable table area.
 */
const TABLE_MAX_HEIGHT = 400;

/**
 * Number of skeleton rows to show during loading.
 */
const SKELETON_ROW_COUNT = 5;

/**
 * Renders a single skeleton row for the loading state.
 *
 * @returns The skeleton row element
 */
function SkeletonRow(): React.ReactElement {
  return (
    <TableRow>
      <TableCell>
        <Skeleton variant="text" width={40} />
      </TableCell>
      <TableCell>
        <Skeleton variant="text" width="80%" />
      </TableCell>
    </TableRow>
  );
}

/**
 * Renders the loading state with skeleton rows.
 *
 * @returns The loading skeleton element
 */
function LoadingContent(): React.ReactElement {
  const skeletonRows = [];
  for (let i = 0; i < SKELETON_ROW_COUNT; i++) {
    skeletonRows.push(<SkeletonRow key={i} />);
  }

  return (
    <Box>
      <TableContainer sx={{ maxHeight: TABLE_MAX_HEIGHT }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 600, width: 80 }}>Index</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Result</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>{skeletonRows}</TableBody>
        </Table>
      </TableContainer>
      <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
        <Skeleton variant="text" width="60%" />
      </Box>
    </Box>
  );
}

/**
 * Renders the empty state message.
 *
 * @param message - The message to display
 * @returns The empty state element
 */
function EmptyContent(props: { readonly message: string }): React.ReactElement {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: 200,
        color: 'text.secondary',
      }}
    >
      <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
        {props.message}
      </Typography>
    </Box>
  );
}

/**
 * Props for a single result row.
 */
interface ResultRowProps {
  readonly index: number;
  readonly display: string;
  readonly isNull: boolean;
  readonly isError: boolean;
}

/**
 * Renders a single result row in the table.
 *
 * @param props - The row props
 * @returns The table row element
 */
function ResultRow(props: ResultRowProps): React.ReactElement {
  const displayIndex = props.index + 1;

  function getValueStyles(): Record<string, unknown> {
    if (props.isError) {
      return {
        color: 'error.main',
        display: 'flex',
        alignItems: 'center',
        gap: 0.5,
      };
    }
    if (props.isNull) {
      return {
        color: 'text.disabled',
        fontStyle: 'italic',
      };
    }
    return {};
  }

  function renderValue(): React.ReactNode {
    if (props.isError) {
      return (
        <>
          <ErrorOutlineIcon sx={{ fontSize: 16 }} />
          <span>Error</span>
        </>
      );
    }
    return props.display;
  }

  return (
    <TableRow hover>
      <TableCell sx={{ color: 'text.secondary' }}>{displayIndex}</TableCell>
      <TableCell>
        <Box sx={getValueStyles()}>{renderValue()}</Box>
      </TableCell>
    </TableRow>
  );
}

/**
 * Props for the statistics section.
 */
interface StatisticsSectionProps {
  readonly count: number;
  readonly min: number | null;
  readonly max: number | null;
  readonly nullCount: number;
  readonly errorCount: number;
  readonly showMinMax: boolean;
}

/**
 * Renders a single statistic item.
 *
 * @param label - The statistic label
 * @param value - The statistic value
 * @param isError - Whether to style as error
 * @returns The statistic item element
 */
function StatisticItem(props: {
  readonly label: string;
  readonly value: string | number;
  readonly isError?: boolean;
}): React.ReactElement {
  return (
    <Box sx={{ display: 'flex', gap: 0.5 }}>
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        {props.label}:
      </Typography>
      <Typography
        variant="body2"
        sx={{
          fontWeight: 500,
          color: props.isError ? 'error.main' : 'text.primary',
        }}
      >
        {props.value}
      </Typography>
    </Box>
  );
}

/**
 * Renders the statistics section below the table.
 *
 * @param props - The statistics props
 * @returns The statistics section element
 */
function StatisticsSection(props: StatisticsSectionProps): React.ReactElement {
  return (
    <Box
      sx={{
        p: 1.5,
        borderTop: 1,
        borderColor: 'divider',
        display: 'flex',
        flexWrap: 'wrap',
        gap: 2,
        backgroundColor: 'grey.50',
      }}
    >
      <StatisticItem label="Count" value={props.count} />
      {props.showMinMax && (
        <>
          <StatisticItem label="Min" value={formatStatisticValue(props.min)} />
          <StatisticItem label="Max" value={formatStatisticValue(props.max)} />
        </>
      )}
      <StatisticItem label="Nulls" value={props.nullCount} />
      <StatisticItem label="Errors" value={props.errorCount} isError={props.errorCount > 0} />
    </Box>
  );
}

/**
 * ResultsPanel component displays formula evaluation results in a table.
 *
 * Shows a table with Index (1-based) and Result columns, with special
 * formatting for null values (gray italic) and errors (red with icon).
 * Includes a statistics section showing count, min/max, nulls, and errors.
 *
 * @param props - The component props
 * @returns The rendered ResultsPanel component
 *
 * @example
 * ```tsx
 * // With numeric results
 * <ResultsPanel
 *   results={[
 *     { type: 'number.float', value: 42.5 },
 *     { type: 'number.float', value: 100 },
 *     { type: 'number.float', value: null },
 *   ]}
 * />
 *
 * // Loading state
 * <ResultsPanel results={[]} isEvaluating={true} />
 *
 * // Empty state with custom message
 * <ResultsPanel results={[]} emptyMessage="Enter a formula to see results" />
 * ```
 */
export function ResultsPanel(props: ResultsPanelProps): React.ReactElement {
  const results = props.results;
  const errors = props.errors ?? [];
  const isEvaluating = props.isEvaluating ?? false;
  const emptyMessage = props.emptyMessage ?? DEFAULT_EMPTY_MESSAGE;

  // Handle loading state
  if (isEvaluating) {
    return (
      <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
        <LoadingContent />
      </Paper>
    );
  }

  // Handle empty state
  if (results.length === 0) {
    return (
      <Paper variant="outlined">
        <EmptyContent message={emptyMessage} />
      </Paper>
    );
  }

  // Prepare data for rendering
  const errorSet = createErrorRowSet(errors);
  const statistics = calculateStatistics(results, errors);
  const showMinMax = hasNumericResults(results);

  // Build result rows
  const rows: React.ReactElement[] = [];
  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    if (result === undefined) {
      continue;
    }
    const formatted = createFormattedResult(result, i, errorSet);
    rows.push(
      <ResultRow
        key={i}
        index={i}
        display={formatted.display}
        isNull={formatted.isNull}
        isError={formatted.isError}
      />,
    );
  }

  return (
    <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
      <TableContainer sx={{ maxHeight: TABLE_MAX_HEIGHT }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 600, width: 80 }}>Index</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Result</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>{rows}</TableBody>
        </Table>
      </TableContainer>
      <StatisticsSection
        count={statistics.count}
        min={statistics.min}
        max={statistics.max}
        nullCount={statistics.nullCount}
        errorCount={statistics.errorCount}
        showMinMax={showMinMax}
      />
    </Paper>
  );
}
