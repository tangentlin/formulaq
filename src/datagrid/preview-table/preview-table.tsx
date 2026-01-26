/**
 * PreviewTable component for displaying formula preview results.
 *
 * Shows a compact table with referenced variable columns and
 * the formula result column for the first 10 rows.
 *
 * Features:
 * - Highlighted result column with distinct background
 * - Null values shown in gray italic
 * - Error values shown in red with tooltip
 * - Empty state for no data
 * - Compact styling for dialogs
 *
 * @module
 */

import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import React from 'react';
import type { PreviewColumn, PreviewRow, PreviewTableProps } from './preview-table.types';

/**
 * Maximum character length before truncating cell values.
 */
const MAX_VALUE_LENGTH = 50;

/**
 * Default empty message shown when no data is available.
 */
const DEFAULT_EMPTY_MESSAGE = 'No data to preview';

/**
 * Background color for the result column.
 */
const RESULT_COLUMN_BACKGROUND = 'rgba(25, 118, 210, 0.08)';

/**
 * Background color for the result column header.
 */
const RESULT_COLUMN_HEADER_BACKGROUND = 'rgba(25, 118, 210, 0.12)';

/**
 * Formats a cell value for display.
 *
 * Handles different types and truncates long values.
 *
 * @param value - The raw cell value
 * @returns The formatted display string
 */
function formatCellValue(value: unknown): string {
  if (value === null || value === undefined) {
    return 'null';
  }

  if (typeof value === 'boolean') {
    return value ? 'TRUE' : 'FALSE';
  }

  if (typeof value === 'number') {
    // Handle special numeric values
    if (Number.isNaN(value)) {
      return 'NaN';
    }
    if (!Number.isFinite(value)) {
      return value > 0 ? 'Infinity' : '-Infinity';
    }
    // Format numbers with reasonable precision
    return String(value);
  }

  if (typeof value === 'string') {
    if (value.length > MAX_VALUE_LENGTH) {
      return value.substring(0, MAX_VALUE_LENGTH - 3) + '...';
    }
    return value;
  }

  return String(value);
}

/**
 * Checks if a value is null or undefined.
 *
 * @param value - The value to check
 * @returns True if the value is null or undefined
 */
function isNullValue(value: unknown): boolean {
  return value === null || value === undefined;
}

/**
 * Determines if a column is the result column.
 *
 * Checks both the column's isResult property and the deprecated
 * resultColumn prop for backwards compatibility.
 *
 * @param column - The column to check
 * @param resultColumn - The deprecated resultColumn prop
 * @returns True if this is the result column
 */
function isResultColumn(column: PreviewColumn, resultColumn: string | undefined): boolean {
  if (column.isResult === true) {
    return true;
  }
  if (resultColumn !== undefined && column.field === resultColumn) {
    return true;
  }
  return false;
}

/**
 * Props for the EmptyContent sub-component.
 */
interface EmptyContentProps {
  readonly message: string;
}

/**
 * Renders the empty state when no data is available.
 *
 * @param props - The component props
 * @returns The empty state element
 */
function EmptyContent(props: EmptyContentProps): React.ReactElement {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: 120,
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
 * Props for the HeaderCell sub-component.
 */
interface HeaderCellProps {
  readonly column: PreviewColumn;
  readonly isResult: boolean;
}

/**
 * Renders a table header cell.
 *
 * @param props - The component props
 * @returns The header cell element
 */
function HeaderCell(props: HeaderCellProps): React.ReactElement {
  const backgroundColor = props.isResult ? RESULT_COLUMN_HEADER_BACKGROUND : undefined;

  return (
    <TableCell
      sx={{
        fontWeight: 600,
        fontSize: '0.75rem',
        backgroundColor,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        maxWidth: 150,
      }}
    >
      {props.column.headerName}
    </TableCell>
  );
}

/**
 * Props for the DataCell sub-component.
 */
interface DataCellProps {
  readonly value: unknown;
  readonly isResult: boolean;
  readonly error?: string | undefined;
}

/**
 * Renders a table data cell.
 *
 * @param props - The component props
 * @returns The data cell element
 */
function DataCell(props: DataCellProps): React.ReactElement {
  const isNull = isNullValue(props.value);
  const hasError = props.error !== undefined;
  const displayValue = formatCellValue(props.value);

  // Determine cell background
  const backgroundColor = props.isResult ? RESULT_COLUMN_BACKGROUND : undefined;

  // Build value styles
  function getValueStyles(): Record<string, unknown> {
    if (hasError) {
      return {
        color: 'error.main',
        display: 'flex',
        alignItems: 'center',
        gap: 0.5,
      };
    }
    if (isNull) {
      return {
        color: 'text.disabled',
        fontStyle: 'italic',
      };
    }
    return {};
  }

  // Render cell content
  function renderContent(): React.ReactNode {
    if (hasError) {
      return (
        <Tooltip title={props.error} arrow placement="top">
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, cursor: 'help' }}>
            <ErrorOutlineIcon sx={{ fontSize: 14, color: 'error.main' }} />
            <Typography variant="body2" component="span" sx={{ color: 'error.main' }}>
              Error
            </Typography>
          </Box>
        </Tooltip>
      );
    }
    return displayValue;
  }

  return (
    <TableCell
      sx={{
        fontSize: '0.75rem',
        backgroundColor,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        maxWidth: 150,
        py: 0.5,
      }}
    >
      <Box sx={getValueStyles()}>{renderContent()}</Box>
    </TableCell>
  );
}

/**
 * Props for the DataRow sub-component.
 */
interface DataRowProps {
  readonly row: PreviewRow;
  readonly columns: readonly PreviewColumn[];
  readonly resultColumn: string | undefined;
  readonly error?: string | undefined;
}

/**
 * Renders a single data row in the table.
 *
 * @param props - The component props
 * @returns The table row element
 */
function DataRow(props: DataRowProps): React.ReactElement {
  const cells: React.ReactElement[] = [];

  for (let i = 0; i < props.columns.length; i++) {
    const column = props.columns[i];
    if (column === undefined) {
      continue;
    }

    const isResult = isResultColumn(column, props.resultColumn);
    const value = props.row[column.field];

    // Only show error on the result column
    const cellError = isResult ? props.error : undefined;

    cells.push(<DataCell key={column.field} value={value} isResult={isResult} error={cellError} />);
  }

  return <TableRow hover>{cells}</TableRow>;
}

/**
 * PreviewTable component displays a preview of formula evaluation.
 *
 * Shows a compact table with referenced variable columns alongside
 * the formula result column. The result column is highlighted with
 * a distinct background color. Null values are shown in gray italic,
 * and errors are shown in red with a tooltip.
 *
 * @param props - The component props
 * @returns The rendered PreviewTable component
 *
 * @example
 * ```tsx
 * // Basic usage
 * <PreviewTable
 *   columns={[
 *     { field: 'price', headerName: '@price' },
 *     { field: 'tax_rate', headerName: '@tax_rate' },
 *     { field: 'result', headerName: 'Result', isResult: true },
 *   ]}
 *   rows={[
 *     { id: 0, price: 100, tax_rate: 0.10, result: 110 },
 *     { id: 1, price: 200, tax_rate: 0.10, result: 220 },
 *   ]}
 * />
 *
 * // With errors
 * <PreviewTable
 *   columns={columns}
 *   rows={rows}
 *   errors={new Map([[2, 'Division by zero']])}
 * />
 * ```
 */
export function PreviewTable(props: PreviewTableProps): React.ReactElement {
  const columns = props.columns;
  const rows = props.rows;
  const resultColumn = props.resultColumn;
  const errors = props.errors;

  // Handle empty state
  if (rows.length === 0 || columns.length === 0) {
    return (
      <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
        <EmptyContent message={DEFAULT_EMPTY_MESSAGE} />
      </Paper>
    );
  }

  // Build header cells
  const headerCells: React.ReactElement[] = [];
  for (let i = 0; i < columns.length; i++) {
    const column = columns[i];
    if (column === undefined) {
      continue;
    }
    const isResult = isResultColumn(column, resultColumn);
    headerCells.push(<HeaderCell key={column.field} column={column} isResult={isResult} />);
  }

  // Build data rows
  const dataRows: React.ReactElement[] = [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (row === undefined) {
      continue;
    }
    const rowError = errors?.get(row.id);
    dataRows.push(
      <DataRow
        key={row.id}
        row={row}
        columns={columns}
        resultColumn={resultColumn}
        error={rowError}
      />,
    );
  }

  return (
    <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
      <TableContainer sx={{ maxHeight: 300 }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>{headerCells}</TableRow>
          </TableHead>
          <TableBody>{dataRows}</TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
}
