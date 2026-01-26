/**
 * Pure type mapping logic for GridVariableProvider.
 *
 * This module contains functions for converting MUI DataGrid column types
 * to FormulaQ ValueTypes and creating VariableInfo from column definitions.
 *
 * @module
 */

import type { ValueType, VariableInfo } from '../../core/types/values.ts';

/**
 * MUI DataGrid column type as defined in GridColDef.
 * These are the standard types supported by MUI X Data Grid.
 */
export type GridColumnType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'date'
  | 'dateTime'
  | 'singleSelect'
  | 'actions';

/**
 * Minimal interface for GridColDef to avoid direct MUI dependency.
 * Only includes the properties needed for variable provider functionality.
 */
export interface GridColumnDefinition {
  /**
   * The field name (column identifier).
   */
  readonly field: string;

  /**
   * The column data type.
   */
  readonly type?: GridColumnType | string | undefined;

  /**
   * Human-readable header text.
   */
  readonly headerName?: string | undefined;

  /**
   * Optional description for the column.
   */
  readonly description?: string | undefined;
}

/**
 * Definition for a formula column that should be included as a variable.
 */
export interface FormulaColumnDefinition {
  /**
   * The field name (column identifier).
   */
  readonly field: string;

  /**
   * The formula expression.
   */
  readonly formula: string;

  /**
   * The computed result type of the formula.
   */
  readonly resultType: ValueType;

  /**
   * Optional human-readable header text.
   */
  readonly headerName?: string | undefined;

  /**
   * Optional description for the column.
   */
  readonly description?: string | undefined;
}

/**
 * Maps a MUI DataGrid column type to a FormulaQ ValueType.
 *
 * All numeric types map to 'number.float' as per the implementation plan
 * (all numbers treated as floats for consistency).
 *
 * Date and dateTime types are treated as strings for the MVP.
 *
 * @param gridType - The DataGrid column type (from GridColDef.type)
 * @returns The corresponding FormulaQ ValueType
 *
 * @example
 * ```typescript
 * gridTypeToValueType('number');     // 'number.float'
 * gridTypeToValueType('string');     // 'string.text'
 * gridTypeToValueType('boolean');    // 'boolean.boolean'
 * gridTypeToValueType('date');       // 'string.text' (MVP)
 * gridTypeToValueType(undefined);    // 'string.text' (default)
 * ```
 */
export function gridTypeToValueType(gridType: string | undefined): ValueType {
  if (gridType === undefined || gridType === null) {
    return 'string.text';
  }

  switch (gridType) {
    case 'number':
      return 'number.float';

    case 'boolean':
      return 'boolean.boolean';

    case 'string':
    case 'singleSelect':
    case 'date':
    case 'dateTime':
      return 'string.text';

    default:
      // Unknown types default to string
      return 'string.text';
  }
}

/**
 * Converts a DataGrid column definition to a VariableInfo.
 *
 * The variable name is taken from the column's field property.
 * The type is inferred from the column's type property using gridTypeToValueType.
 * All grid columns are assumed to be nullable.
 *
 * @param column - The DataGrid column definition
 * @returns The corresponding VariableInfo for use in formulas
 *
 * @example
 * ```typescript
 * const column = { field: 'price', type: 'number', headerName: 'Price' };
 * const variable = columnToVariableInfo(column);
 * // { name: 'price', type: 'number.float', nullable: true, description: undefined, group: 'Columns' }
 * ```
 */
export function columnToVariableInfo(column: GridColumnDefinition): VariableInfo {
  const valueType = gridTypeToValueType(column.type);
  const description = column.description ?? column.headerName;

  return {
    name: column.field,
    type: valueType,
    nullable: true,
    description: description,
    group: 'Columns',
  };
}

/**
 * Converts a formula column definition to a VariableInfo.
 *
 * Formula columns already have a known result type, so no inference is needed.
 * The description includes the formula expression for clarity.
 *
 * @param column - The formula column definition
 * @returns The corresponding VariableInfo for use in formulas
 *
 * @example
 * ```typescript
 * const formulaColumn = { field: 'total', formula: '@price * @quantity', resultType: 'number.float' };
 * const variable = formulaColumnToVariableInfo(formulaColumn);
 * // { name: 'total', type: 'number.float', nullable: true, description: 'Formula: @price * @quantity', group: 'Formula Columns' }
 * ```
 */
export function formulaColumnToVariableInfo(column: FormulaColumnDefinition): VariableInfo {
  const baseDescription = column.description ?? column.headerName;
  const formulaHint = 'Formula: ' + column.formula;
  const description = baseDescription ? baseDescription + ' (' + formulaHint + ')' : formulaHint;

  return {
    name: column.field,
    type: column.resultType,
    nullable: true,
    description: description,
    group: 'Formula Columns',
  };
}

/**
 * Creates a lookup map from field name to VariableInfo.
 *
 * This is used for efficient O(1) lookups in getVariableType and hasVariable.
 *
 * @param variables - Array of VariableInfo objects
 * @returns A Map from variable name to VariableInfo
 */
export function createVariableLookup(
  variables: readonly VariableInfo[],
): Map<string, VariableInfo> {
  const lookup = new Map<string, VariableInfo>();
  for (const variable of variables) {
    lookup.set(variable.name, variable);
  }
  return lookup;
}

/**
 * Filters out action columns and other non-data columns.
 *
 * Action columns (type: 'actions') don't contain data and should not
 * be available as variables in formulas.
 *
 * @param column - The column to check
 * @returns True if the column should be included as a variable
 */
export function isDataColumn(column: GridColumnDefinition): boolean {
  if (column.type === 'actions') {
    return false;
  }
  return true;
}

/**
 * Processes an array of grid columns into VariableInfo objects.
 *
 * Filters out non-data columns and converts each remaining column.
 *
 * @param columns - Array of grid column definitions
 * @returns Array of VariableInfo objects
 */
export function processGridColumns(columns: readonly GridColumnDefinition[]): VariableInfo[] {
  const result: VariableInfo[] = [];
  for (const column of columns) {
    if (isDataColumn(column)) {
      result.push(columnToVariableInfo(column));
    }
  }
  return result;
}

/**
 * Processes an array of formula columns into VariableInfo objects.
 *
 * @param formulaColumns - Array of formula column definitions
 * @returns Array of VariableInfo objects
 */
export function processFormulaColumns(
  formulaColumns: readonly FormulaColumnDefinition[],
): VariableInfo[] {
  const result: VariableInfo[] = [];
  for (const column of formulaColumns) {
    result.push(formulaColumnToVariableInfo(column));
  }
  return result;
}
