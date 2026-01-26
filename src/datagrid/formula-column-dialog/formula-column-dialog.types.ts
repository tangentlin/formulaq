/**
 * Type definitions for the FormulaColumnDialog component.
 *
 * This module defines the props interface and related types for the
 * modal dialog used to create and edit formula columns in the DataGrid.
 *
 * @module
 */

import type { VariableProvider } from '../../core/types/context.ts';
import type { Value } from '../../core/types/values.ts';
import type { PreviewColumn, PreviewRow } from '../preview-table/preview-table.types.ts';

/**
 * Dialog mode indicating whether creating a new column or editing an existing one.
 */
export type FormulaColumnDialogMode = 'create' | 'edit';

/**
 * Preview data containing columns and rows for the preview table.
 *
 * This data represents the first 10 rows of the grid with the
 * formula evaluation results.
 */
export interface PreviewData {
  /**
   * Columns to display in the preview table.
   *
   * Includes referenced variable columns and the result column.
   */
  readonly columns: readonly PreviewColumn[];

  /**
   * Row data for the preview (typically first 10 rows).
   *
   * Each row contains values for each column field.
   */
  readonly rows: readonly PreviewRow[];
}

/**
 * Props for the FormulaColumnDialog component.
 *
 * The dialog provides a form for creating or editing formula columns,
 * with a formula editor, column name input, and preview table.
 */
export interface FormulaColumnDialogProps {
  /**
   * Whether the dialog is open.
   */
  readonly open: boolean;

  /**
   * The dialog mode: 'create' for new columns, 'edit' for existing.
   */
  readonly mode: FormulaColumnDialogMode;

  /**
   * The column name for edit mode.
   *
   * Pre-populates the column name input when editing.
   */
  readonly columnName?: string | undefined;

  /**
   * The formula string for edit mode.
   *
   * Pre-populates the formula editor when editing.
   */
  readonly formula?: string | undefined;

  /**
   * Provider for available variables.
   *
   * Used by the formula editor for autocomplete and validation.
   */
  readonly variableProvider: VariableProvider;

  /**
   * Preview data containing the first 10 rows for preview.
   *
   * If not provided, the preview table will show an empty state.
   */
  readonly previewData?: PreviewData | undefined;

  /**
   * List of existing column names to prevent duplicates.
   *
   * Used for column name validation to ensure uniqueness.
   */
  readonly existingColumnNames: readonly string[];

  /**
   * Callback invoked when the user saves the formula column.
   *
   * @param columnName - The name of the column
   * @param formula - The formula string
   */
  readonly onSave: (columnName: string, formula: string) => void;

  /**
   * Callback invoked when the user cancels the dialog.
   */
  readonly onCancel: () => void;

  /**
   * Optional callback to evaluate preview results for a formula.
   *
   * When provided, the dialog will call this function when the formula
   * changes and is valid, and display the computed results in the preview table.
   *
   * @param formula - The formula string to evaluate
   * @returns Promise resolving to an array of Values for the preview rows
   */
  readonly evaluatePreview?: ((formula: string) => Promise<readonly Value[]>) | undefined;
}

/**
 * Internal state for the FormulaColumnDialog component.
 *
 * Used by the view model to track dialog state.
 */
export interface FormulaColumnDialogState {
  /**
   * The current column name input value.
   */
  readonly columnName: string;

  /**
   * The current formula input value.
   */
  readonly formula: string;

  /**
   * Whether the formula is currently valid.
   */
  readonly isFormulaValid: boolean;

  /**
   * The column name validation error, or null if valid.
   */
  readonly columnNameError: string | null;
}
