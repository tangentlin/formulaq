/**
 * Pure functions for managing formula columns state in DataGrid.
 *
 * This module contains all pure functions for:
 * - Creating formula column definitions for DataGrid
 * - Merging base columns with formula columns
 * - Computing evaluation order for dependent formulas
 * - Detecting when re-evaluation is needed
 * - Building preview data for formulas
 *
 * @module
 */

import type { GridColDef, GridColType } from '@mui/x-data-grid';
import type { Value, ValueType } from '../../core/types/values.ts';
import type { VariableProvider } from '../../core/types/context.ts';
import type { PreviewColumn, PreviewRow } from '../preview-table/preview-table.types.ts';
import type { PreviewData } from '../formula-column-dialog/formula-column-dialog.types.ts';
import type { DependencyManager, FormulaColumnInfo } from '../dependency/dependency-manager.ts';
import { extractDependenciesFromFormula } from '../dependency/dependency-manager.ts';

/**
 * Definition of a formula column stored in state.
 *
 * Represents a computed column with its formula and optional metadata.
 */
export interface FormulaColumn {
  /**
   * The field name (column identifier).
   */
  readonly field: string;

  /**
   * The formula expression string.
   */
  readonly formula: string;

  /**
   * Optional display name for the column header.
   */
  readonly headerName?: string | undefined;
}

/**
 * State for formula columns management.
 *
 * Contains all formula columns and their evaluation results.
 */
export interface FormulaColumnsState {
  /**
   * Map of field names to formula column definitions.
   */
  readonly formulaColumns: ReadonlyMap<string, FormulaColumn>;

  /**
   * Map of field names to computed values for each row.
   */
  readonly formulaResults: ReadonlyMap<string, readonly Value[]>;

  /**
   * Whether evaluation is currently in progress.
   */
  readonly isEvaluating: boolean;

  /**
   * Current evaluation progress, or null if not evaluating.
   */
  readonly progress: { readonly completed: number; readonly total: number } | null;
}

/**
 * Progress state during evaluation.
 */
export interface EvaluationProgress {
  /**
   * Number of rows completed.
   */
  readonly completed: number;

  /**
   * Total number of rows to process.
   */
  readonly total: number;
}

/**
 * Creates the initial state for formula columns.
 *
 * @param initialColumns - Optional array of initial formula columns
 * @returns The initial FormulaColumnsState
 */
export function createInitialState(
  initialColumns?: readonly FormulaColumn[] | undefined,
): FormulaColumnsState {
  const formulaColumns = new Map<string, FormulaColumn>();

  if (initialColumns !== undefined) {
    for (const column of initialColumns) {
      formulaColumns.set(column.field, column);
    }
  }

  return {
    formulaColumns,
    formulaResults: new Map(),
    isEvaluating: false,
    progress: null,
  };
}

/**
 * Creates a GridColDef for a formula column.
 *
 * The column displays computed values from the formula results.
 * Null values and errors are displayed distinctly.
 *
 * @param formula - The formula column definition
 * @param results - The computed values for this formula column
 * @returns A GridColDef suitable for use in DataGrid
 *
 * @example
 * ```typescript
 * const colDef = createFormulaColumnDef(
 *   { field: 'total', formula: '@price * @quantity', headerName: 'Total' },
 *   [{ type: 'number.float', value: 100 }, { type: 'number.float', value: 200 }]
 * );
 * ```
 */
export function createFormulaColumnDef(
  formula: FormulaColumn,
  results: readonly Value[],
): GridColDef {
  const headerName = formula.headerName ?? formula.field;

  // Determine the column type based on the result type
  const columnType = inferGridColumnType(results);

  return {
    field: formula.field,
    headerName: headerName,
    type: columnType,
    editable: false,
    // Use valueGetter to return the computed value for each row
    valueGetter: function getFormulaValue(_value: unknown, row: Record<string, unknown>): unknown {
      // The row should have the formula field set by the parent hook
      // If not, we return null
      if (row === undefined || row === null) {
        return null;
      }

      const fieldValue = row[formula.field];
      return fieldValue;
    },
    // Add description for identifying formula columns
    description: `Formula: ${formula.formula}`,
  };
}

/**
 * Infers the GridColDef type from computed values.
 *
 * @param results - The computed values
 * @returns The appropriate GridColDef type
 */
function inferGridColumnType(results: readonly Value[]): GridColType {
  if (results.length === 0) {
    return 'number';
  }

  // Find the first non-null value to determine the type
  for (const value of results) {
    if (value.value !== null) {
      const valueType = value.type;

      if (valueType === 'number.float' || valueType === 'number.integer') {
        return 'number';
      }

      if (valueType === 'boolean.boolean') {
        return 'boolean';
      }

      if (valueType === 'string.text') {
        return 'string';
      }
    }
  }

  // Default to number if all values are null
  return 'number';
}

/**
 * Merges base columns with formula columns.
 *
 * Formula columns are appended after the base columns.
 * The order of formula columns is determined by their field names.
 *
 * @param baseColumns - The original DataGrid columns
 * @param formulaColumnDefs - The formula column definitions to append
 * @returns The merged columns array
 *
 * @example
 * ```typescript
 * const baseColumns = [{ field: 'price' }, { field: 'quantity' }];
 * const formulaColumns = [{ field: 'total', ... }];
 *
 * const merged = mergeColumnsWithFormulas(baseColumns, formulaColumns);
 * // Result: [{ field: 'price' }, { field: 'quantity' }, { field: 'total' }]
 * ```
 */
export function mergeColumnsWithFormulas(
  baseColumns: readonly GridColDef[],
  formulaColumnDefs: readonly GridColDef[],
): GridColDef[] {
  const result: GridColDef[] = [];

  // Add all base columns
  for (const column of baseColumns) {
    result.push(column);
  }

  // Add formula columns in alphabetical order by field
  const sortedFormulas = formulaColumnDefs.slice().sort(function compareFields(a, b): number {
    return a.field.localeCompare(b.field);
  });

  for (const column of sortedFormulas) {
    result.push(column);
  }

  return result;
}

/**
 * Gets the evaluation order for formula columns.
 *
 * Returns field names in topological order: formulas with no formula
 * dependencies first, then formulas that depend only on already-computed
 * formulas.
 *
 * @param formulas - The formula columns to order
 * @param dependencyManager - The dependency manager for ordering
 * @returns Array of field names in evaluation order
 *
 * @example
 * ```typescript
 * const formulas = [
 *   { field: 'tax', formula: '@total * 0.1' },
 *   { field: 'total', formula: '@price * @quantity' },
 * ];
 *
 * const order = getEvaluationOrder(formulas, depManager);
 * // order = ['total', 'tax'] (total must be computed before tax)
 * ```
 */
export function getEvaluationOrder(
  formulas: readonly FormulaColumn[],
  dependencyManager: DependencyManager,
): readonly string[] {
  // Sync the dependency manager with the current formulas
  const currentFields = new Set<string>();

  for (const formula of formulas) {
    currentFields.add(formula.field);
    const dependencies = extractDependenciesFromFormula(formula.formula);

    const info: FormulaColumnInfo = {
      field: formula.field,
      formula: formula.formula,
      dependencies: dependencies,
    };

    // Add or update the formula in the dependency manager
    if (dependencyManager.hasColumn(formula.field)) {
      dependencyManager.updateFormulaColumn(formula.field, formula.formula);
    } else {
      dependencyManager.addFormulaColumn(info);
    }
  }

  // Remove any formulas that are no longer present
  const existingColumns = dependencyManager.getColumns();
  for (const field of existingColumns.keys()) {
    if (!currentFields.has(field)) {
      dependencyManager.removeFormulaColumn(field);
    }
  }

  // Get the evaluation order from the dependency manager
  const order = dependencyManager.getEvaluationOrder();

  // Filter to only include formula columns (not base columns)
  const formulaFields = new Set(
    formulas.map(function getField(f): string {
      return f.field;
    }),
  );
  const filteredOrder: string[] = [];

  for (const field of order) {
    if (formulaFields.has(field)) {
      filteredOrder.push(field);
    }
  }

  return filteredOrder;
}

/**
 * Determines if re-evaluation is needed based on row changes.
 *
 * Uses reference equality for quick check, then compares row counts.
 *
 * @param prevRows - The previous rows array
 * @param newRows - The new rows array
 * @returns True if re-evaluation is needed
 */
export function shouldReEvaluate(
  prevRows: readonly Record<string, unknown>[],
  newRows: readonly Record<string, unknown>[],
): boolean {
  // Quick reference check
  if (prevRows === newRows) {
    return false;
  }

  // Different lengths always require re-evaluation
  if (prevRows.length !== newRows.length) {
    return true;
  }

  // Check if any row references changed
  for (let i = 0; i < prevRows.length; i++) {
    if (prevRows[i] !== newRows[i]) {
      return true;
    }
  }

  return false;
}

/**
 * Adds a formula column to the state.
 *
 * @param state - The current state
 * @param name - The column name (field)
 * @param formula - The formula string
 * @param headerName - Optional display name
 * @returns The new state with the formula added
 */
export function addFormulaToState(
  state: FormulaColumnsState,
  name: string,
  formula: string,
  headerName?: string | undefined,
): FormulaColumnsState {
  const newColumn: FormulaColumn = {
    field: name,
    formula: formula,
    headerName: headerName,
  };

  const newFormulaColumns = new Map(state.formulaColumns);
  newFormulaColumns.set(name, newColumn);

  return {
    ...state,
    formulaColumns: newFormulaColumns,
    // Clear results for this column as it needs re-evaluation
    formulaResults: clearResultForColumn(state.formulaResults, name),
  };
}

/**
 * Updates a formula column in the state.
 *
 * @param state - The current state
 * @param field - The column field to update
 * @param formula - The new formula string
 * @returns The new state with the formula updated
 */
export function editFormulaInState(
  state: FormulaColumnsState,
  field: string,
  formula: string,
): FormulaColumnsState {
  const existing = state.formulaColumns.get(field);

  if (existing === undefined) {
    // Column not found, add it
    return addFormulaToState(state, field, formula);
  }

  const updatedColumn: FormulaColumn = {
    ...existing,
    formula: formula,
  };

  const newFormulaColumns = new Map(state.formulaColumns);
  newFormulaColumns.set(field, updatedColumn);

  return {
    ...state,
    formulaColumns: newFormulaColumns,
    formulaResults: clearResultForColumn(state.formulaResults, field),
  };
}

/**
 * Removes a formula column from the state.
 *
 * @param state - The current state
 * @param field - The column field to remove
 * @returns The new state with the formula removed
 */
export function removeFormulaFromState(
  state: FormulaColumnsState,
  field: string,
): FormulaColumnsState {
  const newFormulaColumns = new Map(state.formulaColumns);
  newFormulaColumns.delete(field);

  const newResults = new Map(state.formulaResults);
  newResults.delete(field);

  return {
    ...state,
    formulaColumns: newFormulaColumns,
    formulaResults: newResults,
  };
}

/**
 * Clears the result for a specific column.
 *
 * @param results - The current results map
 * @param field - The field to clear
 * @returns A new results map with the field cleared
 */
function clearResultForColumn(
  results: ReadonlyMap<string, readonly Value[]>,
  field: string,
): ReadonlyMap<string, readonly Value[]> {
  const newResults = new Map(results);
  newResults.delete(field);
  return newResults;
}

/**
 * Updates formula references when a column is renamed.
 *
 * Silently updates all formulas that reference the old column name
 * to use the new column name.
 *
 * @param state - The current state
 * @param oldName - The old column name
 * @param newName - The new column name
 * @param dependencyManager - The dependency manager for tracking dependencies
 * @returns The new state with updated formulas
 */
export function renameColumnInState(
  state: FormulaColumnsState,
  oldName: string,
  newName: string,
  dependencyManager: DependencyManager,
): FormulaColumnsState {
  // Get the formulas that need to be updated
  const updates = dependencyManager.updateReferences(oldName, newName);

  if (updates.size === 0) {
    return state;
  }

  // Update the formula columns with new formulas
  const newFormulaColumns = new Map(state.formulaColumns);

  for (const [field, newFormula] of updates) {
    const existing = state.formulaColumns.get(field);
    if (existing !== undefined) {
      const updated: FormulaColumn = {
        ...existing,
        formula: newFormula,
      };
      newFormulaColumns.set(field, updated);
    }
  }

  return {
    ...state,
    formulaColumns: newFormulaColumns,
  };
}

/**
 * Sets the evaluation progress in the state.
 *
 * @param state - The current state
 * @param completed - Number of rows completed
 * @param total - Total number of rows
 * @returns The new state with updated progress
 */
export function setProgressInState(
  state: FormulaColumnsState,
  completed: number,
  total: number,
): FormulaColumnsState {
  return {
    ...state,
    isEvaluating: true,
    progress: { completed, total },
  };
}

/**
 * Sets the evaluating flag in the state.
 *
 * @param state - The current state
 * @param isEvaluating - Whether evaluation is in progress
 * @returns The new state with updated flag
 */
export function setIsEvaluatingInState(
  state: FormulaColumnsState,
  isEvaluating: boolean,
): FormulaColumnsState {
  return {
    ...state,
    isEvaluating,
    progress: isEvaluating ? state.progress : null,
  };
}

/**
 * Sets the formula results in the state.
 *
 * @param state - The current state
 * @param results - Map of field names to values
 * @returns The new state with updated results
 */
export function setFormulaResultsInState(
  state: FormulaColumnsState,
  results: ReadonlyMap<string, readonly Value[]>,
): FormulaColumnsState {
  return {
    ...state,
    formulaResults: results,
    isEvaluating: false,
    progress: null,
  };
}

/**
 * Sets the result for a single formula column.
 *
 * @param state - The current state
 * @param field - The field name
 * @param values - The computed values
 * @returns The new state with the result set
 */
export function setSingleFormulaResultInState(
  state: FormulaColumnsState,
  field: string,
  values: readonly Value[],
): FormulaColumnsState {
  const newResults = new Map(state.formulaResults);
  newResults.set(field, values);

  return {
    ...state,
    formulaResults: newResults,
  };
}

/**
 * Gets the blocking columns for a given column.
 *
 * Returns the names of columns that would block deletion of the
 * given column because they depend on it.
 *
 * @param field - The field name to check
 * @param dependencyManager - The dependency manager
 * @returns Array of field names that block deletion
 */
export function getBlockingColumns(
  field: string,
  dependencyManager: DependencyManager,
): readonly string[] {
  return dependencyManager.getBlockers(field);
}

/**
 * Builds preview data for a formula.
 *
 * Creates preview columns and rows showing the referenced variables
 * and computed results for the first N rows.
 *
 * @param formula - The formula string
 * @param rows - The grid row data
 * @param results - The computed results for this formula
 * @param limit - Maximum number of rows to preview (default 10)
 * @returns The preview data with columns and rows
 */
export function buildPreviewData(
  formula: string,
  rows: readonly Record<string, unknown>[],
  results: readonly Value[],
  limit?: number | undefined,
): PreviewData {
  const maxRows = limit ?? 10;

  // Extract variable names from the formula
  const variableNames = extractDependenciesFromFormula(formula);

  // Build preview columns
  const columns: PreviewColumn[] = [];

  for (const name of variableNames) {
    columns.push({
      field: name,
      headerName: `@${name}`,
      isResult: false,
    });
  }

  // Add the result column
  columns.push({
    field: 'result',
    headerName: 'Result',
    isResult: true,
  });

  // Build preview rows
  const previewRows: PreviewRow[] = [];
  const rowCount = Math.min(rows.length, maxRows);

  for (let i = 0; i < rowCount; i++) {
    const row = rows[i];
    if (row === undefined) {
      continue;
    }

    // Build the preview row with variable values
    const previewRow: Record<string, number | string | boolean | null | undefined> = {
      id: i,
    };

    for (const varName of variableNames) {
      const value = row[varName];
      previewRow[varName] = normalizePreviewValue(value);
    }

    // Add the result
    const resultValue = results[i];
    previewRow['result'] =
      resultValue !== undefined ? (resultValue.value as number | string | boolean | null) : null;

    previewRows.push(previewRow as PreviewRow);
  }

  return {
    columns,
    rows: previewRows,
  };
}

/**
 * Normalizes a value for preview display.
 *
 * @param value - The raw value from the row
 * @returns The normalized value
 */
function normalizePreviewValue(value: unknown): number | string | boolean | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === 'number' || typeof value === 'string' || typeof value === 'boolean') {
    return value;
  }

  return String(value);
}

/**
 * Creates rows with formula results merged in.
 *
 * This is used to create row data that includes computed formula values.
 *
 * @param rows - The original grid rows
 * @param formulaResults - Map of field names to computed values
 * @returns Rows with formula values merged in
 */
export function createRowsWithFormulaResults(
  rows: readonly Record<string, unknown>[],
  formulaResults: ReadonlyMap<string, readonly Value[]>,
): Record<string, unknown>[] {
  const result: Record<string, unknown>[] = [];

  for (let i = 0; i < rows.length; i++) {
    const originalRow = rows[i];
    if (originalRow === undefined) {
      continue;
    }

    // Create a copy of the row
    const newRow: Record<string, unknown> = { ...originalRow };

    // Add formula values
    for (const [field, values] of formulaResults) {
      const value = values[i];
      if (value !== undefined) {
        newRow[field] = value.value;
      }
    }

    result.push(newRow);
  }

  return result;
}

/**
 * Creates a simple variable provider from formula columns and base columns.
 *
 * This is used to provide autocomplete data when editing formulas.
 *
 * @param baseColumns - The base grid columns
 * @param formulaColumns - The formula columns
 * @returns A VariableProvider for autocomplete
 */
export function createVariableProviderFromColumns(
  baseColumns: readonly GridColDef[],
  formulaColumns: ReadonlyMap<string, FormulaColumn>,
): VariableProvider {
  const variables = new Map<string, { name: string; type: ValueType; nullable: boolean }>();

  // Add base columns
  for (const column of baseColumns) {
    // Skip action columns
    if (column.type === 'actions') {
      continue;
    }

    const valueType = mapGridTypeToValueType(column.type);
    variables.set(column.field, {
      name: column.field,
      type: valueType,
      nullable: true,
    });
  }

  // Add formula columns
  for (const [field, formula] of formulaColumns) {
    // Skip if same name as base column (formula overrides)
    variables.set(field, {
      name: field,
      type: 'number.float', // Default type for formulas
      nullable: true,
    });
    // Suppress unused variable warning
    void formula;
  }

  return {
    getVariables: function getVariables() {
      return Array.from(variables.values());
    },
    hasVariable: function hasVariable(name: string) {
      return variables.has(name);
    },
    getVariableType: function getVariableType(name: string) {
      const info = variables.get(name);
      return info?.type;
    },
    isNullable: function isNullable(name: string) {
      const info = variables.get(name);
      return info?.nullable ?? true;
    },
  };
}

/**
 * Maps DataGrid column type to FormulaQ ValueType.
 *
 * @param gridType - The DataGrid column type
 * @returns The corresponding ValueType
 */
function mapGridTypeToValueType(gridType: string | undefined): ValueType {
  if (gridType === 'number') {
    return 'number.float';
  }

  if (gridType === 'boolean') {
    return 'boolean.boolean';
  }

  // All other types map to string
  return 'string.text';
}

/**
 * Gets all formula column field names from the state.
 *
 * @param state - The current state
 * @returns Array of formula column field names
 */
export function getFormulaColumnFields(state: FormulaColumnsState): readonly string[] {
  return Array.from(state.formulaColumns.keys());
}

/**
 * Gets a formula by field name.
 *
 * @param state - The current state
 * @param field - The field name to look up
 * @returns The formula column, or undefined if not found
 */
export function getFormula(state: FormulaColumnsState, field: string): FormulaColumn | undefined {
  return state.formulaColumns.get(field);
}

/**
 * Gets the results for a formula column.
 *
 * @param state - The current state
 * @param field - The field name
 * @returns The computed values, or an empty array if not found
 */
export function getFormulaResultsFromState(
  state: FormulaColumnsState,
  field: string,
): readonly Value[] {
  return state.formulaResults.get(field) ?? [];
}

/**
 * Checks if all formula columns have been evaluated.
 *
 * @param state - The current state
 * @returns True if all formulas have results
 */
export function allFormulasEvaluated(state: FormulaColumnsState): boolean {
  for (const field of state.formulaColumns.keys()) {
    if (!state.formulaResults.has(field)) {
      return false;
    }
  }
  return true;
}
