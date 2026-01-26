/**
 * Pure value conversion logic for GridEvaluationContext.
 *
 * This module contains functions for converting DataGrid row data
 * to FormulaQ Value arrays for use in formula evaluation.
 *
 * @module
 */

import type { Value, ValueType } from '../../core/types/values.ts';

/**
 * Checks if a cell value represents a null/missing value.
 *
 * The following are considered null:
 * - `null`
 * - `undefined`
 * - Empty string `""`
 *
 * @param cellValue - The raw cell value from the DataGrid row
 * @returns True if the value should be treated as null
 *
 * @example
 * ```typescript
 * handleNullCell(null);      // true
 * handleNullCell(undefined); // true
 * handleNullCell("");        // true
 * handleNullCell(0);         // false
 * handleNullCell("hello");   // false
 * handleNullCell(false);     // false
 * ```
 */
export function handleNullCell(cellValue: unknown): boolean {
  if (cellValue === null) {
    return true;
  }
  if (cellValue === undefined) {
    return true;
  }
  if (cellValue === '') {
    return true;
  }
  return false;
}

/**
 * Infers the FormulaQ ValueType from a JavaScript value.
 *
 * Type inference follows these rules:
 * - Numbers (including NaN, Infinity) -> 'number.float'
 * - Strings -> 'string.text'
 * - Booleans -> 'boolean.boolean'
 * - Other types (objects, arrays, etc.) -> 'string.text' (default)
 *
 * Note: null/undefined should be checked with handleNullCell first.
 *
 * @param cellValue - The raw cell value to infer type from
 * @returns The inferred FormulaQ ValueType
 *
 * @example
 * ```typescript
 * inferValueType(42);        // 'number.float'
 * inferValueType(3.14);      // 'number.float'
 * inferValueType("hello");   // 'string.text'
 * inferValueType(true);      // 'boolean.boolean'
 * inferValueType({});        // 'string.text' (default)
 * ```
 */
export function inferValueType(cellValue: unknown): ValueType {
  if (typeof cellValue === 'number') {
    return 'number.float';
  }
  if (typeof cellValue === 'boolean') {
    return 'boolean.boolean';
  }
  // Default to string for strings, objects, arrays, etc.
  return 'string.text';
}

/**
 * Converts a raw cell value to a FormulaQ Value.
 *
 * Conversion rules:
 * - `null`, `undefined`, `""` -> `{ type, value: null }`
 * - Numbers -> `{ type: 'number.float', value: number }`
 * - Strings -> `{ type: 'string.text', value: string }`
 * - Booleans -> `{ type: 'boolean.boolean', value: boolean }`
 * - Other types -> `{ type: 'string.text', value: String(value) }`
 *
 * @param cellValue - The raw cell value from the DataGrid row
 * @param type - The expected ValueType for this column
 * @returns The converted FormulaQ Value
 *
 * @example
 * ```typescript
 * convertCellValue(42, 'number.float');
 * // { type: 'number.float', value: 42 }
 *
 * convertCellValue(null, 'number.float');
 * // { type: 'number.float', value: null }
 *
 * convertCellValue("hello", 'string.text');
 * // { type: 'string.text', value: 'hello' }
 *
 * convertCellValue(true, 'boolean.boolean');
 * // { type: 'boolean.boolean', value: true }
 * ```
 */
export function convertCellValue(cellValue: unknown, type: ValueType): Value {
  // Handle null/missing values
  if (handleNullCell(cellValue)) {
    return { type: type, value: null };
  }

  // Convert based on the expected type
  if (type === 'number.float' || type === 'number.integer') {
    if (typeof cellValue === 'number') {
      return { type: type, value: cellValue };
    }
    // Try to parse as number
    const parsed = Number(cellValue);
    if (!Number.isNaN(parsed)) {
      return { type: type, value: parsed };
    }
    // Cannot convert to number, return null
    return { type: type, value: null };
  }

  if (type === 'boolean.boolean') {
    if (typeof cellValue === 'boolean') {
      return { type: type, value: cellValue };
    }
    // Try to interpret as boolean
    if (cellValue === 'true' || cellValue === 1) {
      return { type: type, value: true };
    }
    if (cellValue === 'false' || cellValue === 0) {
      return { type: type, value: false };
    }
    // Cannot convert to boolean, return null
    return { type: type, value: null };
  }

  // Default: string.text
  if (typeof cellValue === 'string') {
    return { type: type, value: cellValue };
  }
  // Convert to string
  return { type: type, value: String(cellValue) };
}

/**
 * Extracts all values for a single column from an array of rows.
 *
 * This function iterates through all rows and extracts the value
 * for the specified field, converting each to a FormulaQ Value.
 *
 * @param rows - Array of row objects (each row is a record with field keys)
 * @param field - The field name to extract values for
 * @param type - The expected ValueType for this column
 * @returns Array of Values, one per row
 *
 * @example
 * ```typescript
 * const rows = [
 *   { id: 1, price: 10.5 },
 *   { id: 2, price: null },
 *   { id: 3, price: 25.0 },
 * ];
 *
 * extractColumnValues(rows, 'price', 'number.float');
 * // [
 * //   { type: 'number.float', value: 10.5 },
 * //   { type: 'number.float', value: null },
 * //   { type: 'number.float', value: 25.0 },
 * // ]
 * ```
 */
export function extractColumnValues(
  rows: readonly Record<string, unknown>[],
  field: string,
  type: ValueType,
): Value[] {
  const values: Value[] = [];
  for (const row of rows) {
    const cellValue = row[field];
    const convertedValue = convertCellValue(cellValue, type);
    values.push(convertedValue);
  }
  return values;
}

/**
 * Infers the ValueType for a column by sampling the first non-null value.
 *
 * This is used when no explicit type information is available.
 * If all values are null, defaults to 'string.text'.
 *
 * @param rows - Array of row objects
 * @param field - The field name to infer type for
 * @returns The inferred ValueType
 *
 * @example
 * ```typescript
 * const rows = [
 *   { id: 1, price: null },
 *   { id: 2, price: 10.5 },
 * ];
 *
 * inferColumnType(rows, 'price'); // 'number.float'
 * inferColumnType(rows, 'id');    // 'number.float'
 * ```
 */
export function inferColumnType(
  rows: readonly Record<string, unknown>[],
  field: string,
): ValueType {
  for (const row of rows) {
    const cellValue = row[field];
    if (!handleNullCell(cellValue)) {
      return inferValueType(cellValue);
    }
  }
  // Default if all values are null
  return 'string.text';
}

/**
 * Represents a column with its field name and type.
 */
export interface ColumnInfo {
  /**
   * The field name (column identifier).
   */
  readonly field: string;

  /**
   * The data type of the column.
   */
  readonly type: ValueType;
}

/**
 * Builds the variables record from rows and column information.
 *
 * This function extracts values for each column and organizes them
 * into the format required by EvaluationContext.
 *
 * @param rows - Array of row objects
 * @param columns - Array of column info objects
 * @returns Record mapping field names to Value arrays
 *
 * @example
 * ```typescript
 * const rows = [
 *   { price: 10.5, name: 'A' },
 *   { price: 20.0, name: 'B' },
 * ];
 * const columns = [
 *   { field: 'price', type: 'number.float' },
 *   { field: 'name', type: 'string.text' },
 * ];
 *
 * buildVariablesRecord(rows, columns);
 * // {
 * //   price: [{ type: 'number.float', value: 10.5 }, { type: 'number.float', value: 20.0 }],
 * //   name: [{ type: 'string.text', value: 'A' }, { type: 'string.text', value: 'B' }],
 * // }
 * ```
 */
export function buildVariablesRecord(
  rows: readonly Record<string, unknown>[],
  columns: readonly ColumnInfo[],
): Record<string, Value[]> {
  const variables: Record<string, Value[]> = {};

  for (const column of columns) {
    const columnValues = extractColumnValues(rows, column.field, column.type);
    variables[column.field] = columnValues;
  }

  return variables;
}

/**
 * Merges formula results into the variables record.
 *
 * Formula results are pre-computed values from already-evaluated formula columns.
 * This allows formulas to reference other formula columns.
 *
 * @param variables - The base variables record
 * @param formulaResults - Map of field names to Value arrays from formula evaluation
 * @returns New record with formula results merged in
 *
 * @example
 * ```typescript
 * const variables = {
 *   price: [{ type: 'number.float', value: 10.5 }],
 * };
 * const formulaResults = new Map([
 *   ['total', [{ type: 'number.float', value: 21.0 }]],
 * ]);
 *
 * mergeFormulaResults(variables, formulaResults);
 * // {
 * //   price: [{ type: 'number.float', value: 10.5 }],
 * //   total: [{ type: 'number.float', value: 21.0 }],
 * // }
 * ```
 */
export function mergeFormulaResults(
  variables: Readonly<Record<string, readonly Value[]>>,
  formulaResults: ReadonlyMap<string, readonly Value[]>,
): Record<string, Value[]> {
  const merged: Record<string, Value[]> = {};

  // Copy base variables
  for (const key of Object.keys(variables)) {
    merged[key] = variables[key]!.slice();
  }

  // Merge formula results
  for (const [field, values] of formulaResults) {
    merged[field] = values.slice();
  }

  return merged;
}
