/**
 * View model for the FormulaColumnDialog component.
 *
 * This module contains pure functions for dialog state management,
 * column name validation, and preview result computation.
 *
 * @module
 */

import type { EvaluationContext } from '../../core/types/context.ts';
import type { Value } from '../../core/types/values.ts';
import type { FormulaQEngine } from '../../core/engine.ts';
import type { PreviewColumn, PreviewRow } from '../preview-table/preview-table.types.ts';
import type { PreviewData } from './formula-column-dialog.types.ts';

/**
 * Regular expression for valid column name identifiers.
 *
 * Column names must:
 * - Start with a letter or underscore
 * - Contain only letters, numbers, and underscores
 * - Not be empty
 */
const VALID_IDENTIFIER_PATTERN = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

/**
 * Reserved words that cannot be used as column names.
 */
const RESERVED_WORDS: ReadonlySet<string> = new Set([
  'true',
  'false',
  'null',
  'TRUE',
  'FALSE',
  'NULL',
  'AND',
  'OR',
  'NOT',
  'IF',
  'SUM',
  'AVG',
  'MIN',
  'MAX',
  'COUNT',
  'PERCENTILE',
  'LOG',
  'LOG10',
  'POWER',
  'CONCAT',
  'IFNULL',
]);

/**
 * Validates a column name for uniqueness and format.
 *
 * Returns an error message if the name is invalid, or null if valid.
 *
 * @param name - The column name to validate
 * @param existingNames - Array of existing column names
 * @param currentName - The current column name in edit mode (to allow same name)
 * @returns Error message string, or null if valid
 *
 * @example
 * ```typescript
 * const error = validateColumnName('total', ['price', 'tax'], undefined);
 * // error is null (valid)
 *
 * const error2 = validateColumnName('price', ['price', 'tax'], undefined);
 * // error2 is 'A column with this name already exists'
 * ```
 */
export function validateColumnName(
  name: string,
  existingNames: readonly string[],
  currentName: string | undefined,
): string | null {
  // Check if empty
  const trimmedName = name.trim();
  if (trimmedName === '') {
    return 'Column name is required';
  }

  // Check if valid identifier format
  if (!VALID_IDENTIFIER_PATTERN.test(trimmedName)) {
    return 'Column name must start with a letter or underscore and contain only letters, numbers, and underscores';
  }

  // Check if reserved word
  if (RESERVED_WORDS.has(trimmedName)) {
    return 'This name is reserved and cannot be used as a column name';
  }

  // Check for duplicates (but allow the current name in edit mode)
  const isDuplicate = existingNames.some(function checkDuplicate(existingName: string): boolean {
    // Case-insensitive comparison
    const normalizedExisting = existingName.toLowerCase();
    const normalizedNew = trimmedName.toLowerCase();

    // Skip if this is the current name we're editing
    if (currentName !== undefined && normalizedExisting === currentName.toLowerCase()) {
      return false;
    }

    return normalizedExisting === normalizedNew;
  });

  if (isDuplicate) {
    return 'A column with this name already exists';
  }

  return null;
}

/**
 * Determines if the dialog can be saved.
 *
 * The save button should be enabled when:
 * - Column name is not empty
 * - Column name has no validation errors
 * - Formula is valid
 *
 * @param columnName - The current column name input
 * @param isFormulaValid - Whether the formula passes validation
 * @param nameError - The column name validation error, or null
 * @returns True if the form can be saved
 *
 * @example
 * ```typescript
 * const canSave = canSave('total', true, null);
 * // canSave is true
 *
 * const canSave2 = canSave('', true, 'Column name is required');
 * // canSave2 is false
 * ```
 */
export function canSave(
  columnName: string,
  isFormulaValid: boolean,
  nameError: string | null,
): boolean {
  // Check if column name is provided
  if (columnName.trim() === '') {
    return false;
  }

  // Check if there's a name validation error
  if (nameError !== null) {
    return false;
  }

  // Check if formula is valid
  if (!isFormulaValid) {
    return false;
  }

  return true;
}

/**
 * Result of computing preview results.
 */
export interface ComputePreviewResult {
  /**
   * The preview rows with computed results.
   */
  readonly rows: readonly PreviewRow[];

  /**
   * Map of row IDs to error messages for evaluation errors.
   */
  readonly errors: ReadonlyMap<number, string>;

  /**
   * Whether the formula is valid.
   */
  readonly isValid: boolean;
}

/**
 * Computes preview results for a formula.
 *
 * Takes the formula, preview data, and engine, then evaluates
 * the formula for each row to produce preview results.
 *
 * @param formula - The formula string to evaluate
 * @param previewData - The preview data with columns and rows
 * @param engine - The FormulaQ engine for evaluation
 * @returns The computed preview result with rows, errors, and validity
 *
 * @example
 * ```typescript
 * const result = computePreviewResults(
 *   '@price * (1 + @tax_rate)',
 *   previewData,
 *   engine
 * );
 *
 * if (result.isValid) {
 *   console.log('Preview rows:', result.rows);
 * }
 * ```
 */
export function computePreviewResults(
  formula: string,
  previewData: PreviewData | undefined,
  engine: FormulaQEngine,
): ComputePreviewResult {
  // Handle empty formula
  if (formula.trim() === '') {
    return {
      rows: previewData?.rows ?? [],
      errors: new Map(),
      isValid: false,
    };
  }

  // Handle no preview data
  if (previewData === undefined || previewData.rows.length === 0) {
    return {
      rows: [],
      errors: new Map(),
      isValid: true,
    };
  }

  try {
    // Execute the formula
    // Use synchronous validation first to check if formula is valid
    const ast = engine.parse(formula);

    // Build a simple variable provider from the preview columns
    const variableProvider = buildVariableProviderFromPreview(previewData.columns);

    // Validate the formula
    const validatedAst = engine.validate(ast, variableProvider);

    // Evaluate for each row synchronously (small number of rows for preview)
    const resultRows: PreviewRow[] = [];
    const errors = new Map<number, string>();

    for (let i = 0; i < previewData.rows.length; i++) {
      const row = previewData.rows[i];
      if (row === undefined) {
        continue;
      }

      try {
        // Build row context
        const rowContext = buildRowContext(previewData, i);

        // Note: We need to use evaluateRow which returns a Promise
        // For preview, we'll do synchronous evaluation by extracting from the validated AST
        const resultValue = evaluateRowSync(validatedAst.root, rowContext, engine);

        // Create a new row with the result
        const newRow: PreviewRow = {
          ...row,
          result: formatValueForDisplay(resultValue),
        };
        resultRows.push(newRow);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        errors.set(row.id, errorMessage);

        // Still add the row but with null result
        const newRow: PreviewRow = {
          ...row,
          result: null,
        };
        resultRows.push(newRow);
      }
    }

    return {
      rows: resultRows,
      errors,
      isValid: true,
    };
  } catch {
    // Formula parsing or validation failed
    return {
      rows: previewData.rows,
      errors: new Map(),
      isValid: false,
    };
  }
}

/**
 * Builds an evaluation context from preview data.
 *
 * @param previewData - The preview data
 * @returns The evaluation context
 *
 * @example
 * ```typescript
 * const context = buildEvaluationContext(previewData);
 * const result = await engine.evaluateBatch(formula, context);
 * ```
 */
export function buildEvaluationContext(previewData: PreviewData): EvaluationContext {
  const variables: Record<string, Value[]> = {};

  // Extract variable columns (those that don't have isResult)
  for (const column of previewData.columns) {
    if (column.isResult === true) {
      continue;
    }

    const fieldValues: Value[] = [];
    for (const row of previewData.rows) {
      const rawValue = row[column.field];
      const value = rawValueToValue(rawValue);
      fieldValues.push(value);
    }

    // Use field name without @ prefix as the variable name
    const variableName = column.field;
    variables[variableName] = fieldValues;
  }

  return {
    variables,
    rowCount: previewData.rows.length,
  };
}

/**
 * Converts a raw value to a Value object.
 *
 * @param rawValue - The raw value from the row
 * @returns The Value object
 */
function rawValueToValue(rawValue: number | string | boolean | null | undefined): Value {
  if (rawValue === null || rawValue === undefined) {
    return { type: 'number.float', value: null };
  }

  if (typeof rawValue === 'number') {
    return { type: 'number.float', value: rawValue };
  }

  if (typeof rawValue === 'string') {
    return { type: 'string.text', value: rawValue };
  }

  if (typeof rawValue === 'boolean') {
    return { type: 'boolean.boolean', value: rawValue };
  }

  return { type: 'string.text', value: String(rawValue) };
}

/**
 * Builds a simple variable provider from preview columns.
 *
 * @param columns - The preview columns
 * @returns A VariableProvider implementation
 */
function buildVariableProviderFromPreview(
  columns: readonly PreviewColumn[],
): import('../../core/types/context.ts').VariableProvider {
  const variableMap = new Map<
    string,
    { name: string; type: import('../../core/types/values.ts').ValueType; nullable: boolean }
  >();

  for (const column of columns) {
    if (column.isResult === true) {
      continue;
    }

    variableMap.set(column.field, {
      name: column.field,
      type: 'number.float', // Default type, could be improved
      nullable: true,
    });
  }

  return {
    getVariables: function getVariables() {
      return Array.from(variableMap.values());
    },
    hasVariable: function hasVariable(name: string) {
      return variableMap.has(name);
    },
    getVariableType: function getVariableType(name: string) {
      const info = variableMap.get(name);
      return info?.type;
    },
    isNullable: function isNullable(name: string) {
      const info = variableMap.get(name);
      return info?.nullable ?? true;
    },
  };
}

/**
 * Row context for single row evaluation.
 */
interface RowContextForPreview {
  readonly variables: Readonly<Record<string, Value>>;
  readonly allVariables: Readonly<Record<string, readonly Value[]>>;
  readonly currentIndex: number;
  readonly rowCount: number;
}

/**
 * Builds a row context for a specific row.
 *
 * @param previewData - The preview data
 * @param rowIndex - The row index
 * @returns The row context
 */
function buildRowContext(previewData: PreviewData, rowIndex: number): RowContextForPreview {
  const variables: Record<string, Value> = {};
  const allVariables: Record<string, Value[]> = {};

  for (const column of previewData.columns) {
    if (column.isResult === true) {
      continue;
    }

    // Build single variable value for this row
    const row = previewData.rows[rowIndex];
    const rawValue = row?.[column.field];
    variables[column.field] = rawValueToValue(rawValue);

    // Also build all values for aggregations
    const allValues: Value[] = [];
    for (const r of previewData.rows) {
      allValues.push(rawValueToValue(r?.[column.field]));
    }
    allVariables[column.field] = allValues;
  }

  return {
    variables,
    allVariables,
    currentIndex: rowIndex,
    rowCount: previewData.rows.length,
  };
}

/**
 * Synchronously evaluates a row for preview purposes.
 *
 * This is a simplified evaluation that works for basic formulas.
 * For complex formulas with aggregations, the full engine should be used.
 *
 * @param _ast - The AST node to evaluate (currently unused, placeholder for async)
 * @param _context - The row context (currently unused, placeholder for async)
 * @param _engine - The FormulaQ engine (currently unused, placeholder for async)
 * @returns The computed value
 */
function evaluateRowSync(
  _ast: import('../../core/types/ast.ts').ASTNode,
  _context: RowContextForPreview,
  _engine: FormulaQEngine,
): Value {
  // For now, we'll use a simple approach by creating an evaluation context
  // and calling execute, which is async but for small datasets is essentially sync
  // In a real implementation, we'd have a sync evaluator for preview

  // Since we can't easily do truly sync evaluation here, we'll work with
  // what we have. For the initial implementation, we'll return null
  // and let the async version be used in the component.

  // This function is a placeholder - the actual preview computation
  // will be done asynchronously in the component.
  return { type: 'number.float', value: null };
}

/**
 * Formats a Value for display in the preview table.
 *
 * @param value - The Value to format
 * @returns The formatted value for display
 */
function formatValueForDisplay(value: Value): number | string | boolean | null {
  if (value.value === null) {
    return null;
  }

  return value.value as number | string | boolean;
}

/**
 * Gets the dialog title based on the mode.
 *
 * @param mode - The dialog mode ('create' or 'edit')
 * @returns The dialog title string
 */
export function getDialogTitle(mode: 'create' | 'edit'): string {
  if (mode === 'create') {
    return 'Create Formula Column';
  }
  return 'Edit Formula Column';
}

/**
 * Gets the save button text based on the mode.
 *
 * @param mode - The dialog mode ('create' or 'edit')
 * @returns The save button text
 */
export function getSaveButtonText(mode: 'create' | 'edit'): string {
  if (mode === 'create') {
    return 'Create';
  }
  return 'Save';
}

/**
 * Extracts variable names from a formula string.
 *
 * This is a simple extraction that finds all @variableName patterns.
 *
 * @param formula - The formula string
 * @returns Array of variable names (without @ prefix)
 */
export function extractVariableNames(formula: string): string[] {
  const pattern = /@([a-zA-Z_][a-zA-Z0-9_]*)/g;
  const matches: string[] = [];
  let match: RegExpExecArray | null = null;

  // Use exec in a loop to find all matches
  while (true) {
    match = pattern.exec(formula);
    if (match === null) {
      break;
    }
    const variableName = match[1];
    if (variableName !== undefined && !matches.includes(variableName)) {
      matches.push(variableName);
    }
  }

  return matches;
}

/**
 * Builds preview columns from variable names and adds the result column.
 *
 * @param variableNames - Array of variable names referenced in the formula
 * @returns Array of preview columns
 */
export function buildPreviewColumns(variableNames: readonly string[]): PreviewColumn[] {
  const columns: PreviewColumn[] = [];

  for (const name of variableNames) {
    columns.push({
      field: name,
      headerName: '@' + name,
      isResult: false,
    });
  }

  // Add the result column
  columns.push({
    field: 'result',
    headerName: 'Result',
    isResult: true,
  });

  return columns;
}
