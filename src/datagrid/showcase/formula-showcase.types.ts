/**
 * Type definitions for the FormulaShowcase component.
 *
 * Defines types for:
 * - Component props
 * - Product data rows with editable fields
 * - Dialog state management
 *
 * @module
 */

import type { GridColDef } from '@mui/x-data-grid';
import type { FormulaColumn } from '../hooks/use-formula-columns.ts';

/**
 * Product row data interface for the showcase.
 *
 * Extends the base product data with an id field.
 * The price and taxRate fields are editable.
 */
export interface ShowcaseProductRow {
  /**
   * Unique identifier for the row.
   */
  readonly id: number;

  /**
   * Product name.
   */
  readonly name: string;

  /**
   * Product category.
   */
  readonly category: string;

  /**
   * Unit price in dollars (editable).
   */
  price: number;

  /**
   * Tax rate as a decimal (e.g., 0.08 for 8%) (editable).
   */
  taxRate: number;

  /**
   * Quantity in stock or ordered.
   */
  readonly quantity: number;

  /**
   * Whether the product is currently in stock.
   */
  readonly inStock: boolean;
}

/**
 * Props for the FormulaShowcase component.
 */
export interface FormulaShowcaseProps {
  /**
   * Initial product data to display.
   * If not provided, sample data will be generated.
   */
  readonly initialRows?: readonly ShowcaseProductRow[] | undefined;

  /**
   * Initial formula columns to display.
   */
  readonly initialFormulaColumns?: readonly FormulaColumn[] | undefined;

  /**
   * Height of the DataGrid.
   * Can be a number (pixels) or a string (e.g., "100%").
   *
   * @defaultValue 600
   */
  readonly height?: number | string | undefined;

  /**
   * Whether to disable pagination and show all rows.
   *
   * @defaultValue false
   */
  readonly disablePagination?: boolean | undefined;
}

/**
 * State for the formula column dialog.
 */
export interface FormulaDialogState {
  /**
   * Whether the dialog is open.
   */
  readonly open: boolean;

  /**
   * Dialog mode: create or edit.
   */
  readonly mode: 'create' | 'edit';

  /**
   * Column name for edit mode.
   */
  readonly columnName: string;

  /**
   * Formula for edit mode.
   */
  readonly formula: string;
}

/**
 * State for the delete column dialog.
 */
export interface DeleteDialogState {
  /**
   * Whether the dialog is open.
   */
  readonly open: boolean;

  /**
   * Column name to delete.
   */
  readonly columnName: string;
}

/**
 * Initial state for the formula dialog.
 */
export const INITIAL_FORMULA_DIALOG_STATE: FormulaDialogState = {
  open: false,
  mode: 'create',
  columnName: '',
  formula: '',
};

/**
 * Initial state for the delete dialog.
 */
export const INITIAL_DELETE_DIALOG_STATE: DeleteDialogState = {
  open: false,
  columnName: '',
};

/**
 * Checks if a column is a formula column by its description.
 *
 * @param column - The column definition
 * @returns True if the column is a formula column
 */
export function isFormulaColumn(column: GridColDef): boolean {
  const description = column.description;
  if (description === undefined || description === null) {
    return false;
  }
  return description.startsWith('Formula:');
}

/**
 * Extracts the formula from a formula column's description.
 *
 * @param column - The column definition
 * @returns The formula string, or empty string if not a formula column
 */
export function extractFormulaFromColumn(column: GridColDef): string {
  const description = column.description;
  if (description === undefined || description === null) {
    return '';
  }
  if (!description.startsWith('Formula:')) {
    return '';
  }
  return description.slice('Formula:'.length).trim();
}
