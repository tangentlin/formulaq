/**
 * Adapter for converting MUI DataGrid rows to an EvaluationContext.
 *
 * This adapter enables the FormulaQ engine to evaluate formulas against
 * DataGrid row data, supporting both regular data columns and computed
 * formula columns.
 *
 * @module
 */

import type { EvaluationContext } from '../../core/types/context.ts';
import type { Value } from '../../core/types/values.ts';
import type { GridColDef } from '@mui/x-data-grid';
import {
  gridTypeToValueType,
  type FormulaColumnDefinition,
} from './grid-variable-provider.view-model.ts';
import {
  buildVariablesRecord,
  mergeFormulaResults,
  type ColumnInfo,
} from './grid-evaluation-context.view-model.ts';

// Re-export viewModel functions for external use
export {
  extractColumnValues,
  convertCellValue,
  inferValueType,
  handleNullCell,
} from './grid-evaluation-context.view-model.ts';

/**
 * Row model type for DataGrid rows.
 * Each row is a record mapping field names to cell values.
 */
export type GridRowModel = Record<string, unknown>;

/**
 * Options for creating a GridEvaluationContext.
 */
export interface GridEvaluationContextOptions {
  /**
   * The DataGrid column definitions.
   * Used to determine the type of each column for value conversion.
   */
  readonly columns: readonly GridColDef[];

  /**
   * The DataGrid row data.
   * Each row is a record mapping field names to cell values.
   */
  readonly rows: readonly GridRowModel[];

  /**
   * Optional formula column definitions.
   * Used to determine the result type of formula columns.
   */
  readonly formulaColumns?: readonly FormulaColumnDefinition[] | undefined;

  /**
   * Optional pre-computed formula results.
   * Map of field names to Value arrays from already-evaluated formula columns.
   * This allows formulas to reference other formula columns.
   */
  readonly formulaResults?: ReadonlyMap<string, readonly Value[]> | undefined;
}

/**
 * Extracts column information from GridColDef array.
 *
 * Filters out action columns and maps each column's type to FormulaQ ValueType.
 *
 * @param columns - The DataGrid column definitions
 * @returns Array of ColumnInfo with field names and types
 */
function extractColumnsInfo(columns: readonly GridColDef[]): ColumnInfo[] {
  const result: ColumnInfo[] = [];

  for (const column of columns) {
    // Skip action columns
    if (column.type === 'actions') {
      continue;
    }

    const valueType = gridTypeToValueType(column.type);
    result.push({
      field: column.field,
      type: valueType,
    });
  }

  return result;
}

/**
 * Creates an EvaluationContext from DataGrid row data.
 *
 * This factory function is the primary API for creating evaluation contexts
 * from DataGrid data. It converts row data to the format required by the
 * FormulaQ evaluation engine.
 *
 * The context provides:
 * - `variables`: Record mapping field names to Value arrays
 * - `rowCount`: Number of rows in the dataset
 *
 * Value conversion follows these rules:
 * - `null`, `undefined`, `""` -> null value
 * - Numbers -> `{ type: 'number.float', value: number }`
 * - Strings -> `{ type: 'string.text', value: string }`
 * - Booleans -> `{ type: 'boolean.boolean', value: boolean }`
 *
 * @param options - Configuration options including columns, rows, and optional formula data
 * @returns An EvaluationContext ready for formula evaluation
 *
 * @example
 * ```typescript
 * const columns: GridColDef[] = [
 *   { field: 'price', type: 'number', headerName: 'Price' },
 *   { field: 'quantity', type: 'number', headerName: 'Quantity' },
 * ];
 *
 * const rows = [
 *   { id: 1, price: 10.5, quantity: 2 },
 *   { id: 2, price: 25.0, quantity: 1 },
 *   { id: 3, price: null, quantity: 5 },
 * ];
 *
 * const context = createGridEvaluationContext({ columns, rows });
 *
 * // context.variables:
 * // {
 * //   price: [
 * //     { type: 'number.float', value: 10.5 },
 * //     { type: 'number.float', value: 25.0 },
 * //     { type: 'number.float', value: null },
 * //   ],
 * //   quantity: [
 * //     { type: 'number.float', value: 2 },
 * //     { type: 'number.float', value: 1 },
 * //     { type: 'number.float', value: 5 },
 * //   ],
 * // }
 * // context.rowCount: 3
 * ```
 *
 * @example
 * ```typescript
 * // With formula results from previous evaluations
 * const formulaResults = new Map([
 *   ['total', [
 *     { type: 'number.float', value: 21.0 },
 *     { type: 'number.float', value: 25.0 },
 *     { type: 'number.float', value: null },
 *   ]],
 * ]);
 *
 * const context = createGridEvaluationContext({
 *   columns,
 *   rows,
 *   formulaResults,
 * });
 *
 * // context.variables now includes 'total'
 * ```
 */
export function createGridEvaluationContext(
  options: GridEvaluationContextOptions,
): EvaluationContext {
  const columns = options.columns;
  const rows = options.rows as readonly Record<string, unknown>[];
  const formulaResults = options.formulaResults;

  // Extract column type information
  const gridColumnsInfo = extractColumnsInfo(columns);

  // Build base variables from grid columns
  const baseVariables = buildVariablesRecord(rows, gridColumnsInfo);

  // Merge formula results if provided
  let variables: Record<string, Value[]>;
  if (formulaResults !== undefined && formulaResults.size > 0) {
    variables = mergeFormulaResults(baseVariables, formulaResults);
  } else {
    variables = baseVariables;
  }

  // Note: formulaColumns option is used for type information during evaluation.
  // The actual formula values are added via formulaResults as they are evaluated.

  const context: EvaluationContext = {
    variables: variables,
    rowCount: rows.length,
  };

  return context;
}

/**
 * Creates an EvaluationContext with additional options for batch evaluation.
 *
 * This extended version allows attaching an AbortSignal and progress callback
 * for use with the chunked batch evaluator.
 *
 * @param options - Configuration options including columns, rows, and optional formula data
 * @param signal - Optional AbortSignal for cancellation support
 * @param onProgress - Optional progress callback for long operations
 * @returns An EvaluationContext with signal and progress callback attached
 *
 * @example
 * ```typescript
 * const controller = new AbortController();
 *
 * const context = createGridEvaluationContextWithOptions(
 *   { columns, rows },
 *   controller.signal,
 *   (completed, total) => {
 *     console.log(`Progress: ${completed}/${total}`);
 *   }
 * );
 *
 * // Cancel if needed
 * controller.abort();
 * ```
 */
export function createGridEvaluationContextWithOptions(
  options: GridEvaluationContextOptions,
  signal?: AbortSignal | undefined,
  onProgress?: ((completed: number, total: number) => void) | undefined,
): EvaluationContext {
  const baseContext = createGridEvaluationContext(options);

  const context: EvaluationContext = {
    variables: baseContext.variables,
    rowCount: baseContext.rowCount,
    signal: signal,
    onProgress: onProgress,
  };

  return context;
}
