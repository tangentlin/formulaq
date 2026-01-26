/**
 * Main hook for managing formula columns in DataGrid.
 *
 * This hook provides:
 * - Formula column management (add, edit, remove)
 * - Automatic evaluation in dependency order
 * - Column rename propagation
 * - Progress reporting for large datasets
 * - Cancellation support
 *
 * @module
 */

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import type { GridColDef, GridRowModel } from '@mui/x-data-grid';
import type { Value } from '../../core/types/values.ts';
import type { VariableProvider } from '../../core/types/context.ts';
import type { FormulaQEngine } from '../../core/engine.ts';
import type { PreviewData } from '../formula-column-dialog/formula-column-dialog.types.ts';
import { createFormulaEngine } from '../../core/engine.ts';
import { createDependencyManager, DependencyManager } from '../dependency/dependency-manager.ts';
import {
  createGridVariableProvider,
  type FormulaColumnDefinition,
} from '../adapters/grid-variable-provider.ts';
import {
  createGridEvaluationContextWithOptions,
  type GridRowModel as GridContextRowModel,
} from '../adapters/grid-evaluation-context.ts';
import {
  type FormulaColumn,
  type FormulaColumnsState,
  createInitialState,
  createFormulaColumnDef,
  mergeColumnsWithFormulas,
  getEvaluationOrder,
  shouldReEvaluate,
  addFormulaToState,
  editFormulaInState,
  removeFormulaFromState,
  renameColumnInState,
  setProgressInState,
  setIsEvaluatingInState,
  setSingleFormulaResultInState,
  getBlockingColumns,
  buildPreviewData,
  createVariableProviderFromColumns,
} from './use-formula-columns.view-model.ts';

/**
 * Options for the useFormulaColumns hook.
 */
export interface UseFormulaColumnsOptions {
  /**
   * The original DataGrid column definitions.
   */
  readonly baseColumns: readonly GridColDef[];

  /**
   * The grid row data.
   */
  readonly rows: readonly GridRowModel[];

  /**
   * Optional pre-existing formula columns to initialize with.
   */
  readonly initialFormulaColumns?: readonly FormulaColumn[] | undefined;

  /**
   * Optional FormulaQ engine instance.
   * If not provided, a new engine will be created.
   */
  readonly engine?: FormulaQEngine | undefined;
}

/**
 * Result type for the useFormulaColumns hook.
 */
export interface UseFormulaColumnsResult {
  /**
   * The merged columns array including formula columns.
   *
   * Pass this to DataGrid's `columns` prop.
   */
  readonly columns: readonly GridColDef[];

  /**
   * Adds a new formula column.
   *
   * @param name - The column field name
   * @param formula - The formula string
   * @param headerName - Optional display name
   */
  readonly addFormula: (name: string, formula: string, headerName?: string) => void;

  /**
   * Updates an existing formula column.
   *
   * @param field - The column field to update
   * @param formula - The new formula string
   */
  readonly editFormula: (field: string, formula: string) => void;

  /**
   * Removes a formula column.
   *
   * @param field - The column field to remove
   */
  readonly removeFormula: (field: string) => void;

  /**
   * Propagates a column rename to dependent formulas.
   *
   * Silently updates all formulas that reference the old name.
   *
   * @param oldName - The old column name
   * @param newName - The new column name
   */
  readonly renameColumn: (oldName: string, newName: string) => void;

  /**
   * Whether evaluation is currently in progress.
   */
  readonly isEvaluating: boolean;

  /**
   * Current evaluation progress, or null if not evaluating.
   */
  readonly progress: { readonly completed: number; readonly total: number } | null;

  /**
   * Cancels the current evaluation.
   */
  readonly cancelEvaluation: () => void;

  /**
   * Gets the computed results for a formula column.
   *
   * @param field - The column field
   * @returns Array of computed values
   */
  readonly getFormulaResults: (field: string) => readonly Value[];

  /**
   * Gets columns that block deletion of the given column.
   *
   * @param field - The column field to check
   * @returns Array of field names that depend on this column
   */
  readonly getBlockingColumns: (field: string) => readonly string[];

  /**
   * Gets a VariableProvider for formula editing.
   *
   * Use this when opening the formula editor dialog.
   */
  readonly getVariableProvider: () => VariableProvider;

  /**
   * Gets preview data for a formula.
   *
   * @param formula - The formula string
   * @param limit - Maximum number of rows to preview (default 10)
   * @returns Preview data with columns and rows
   */
  readonly getPreviewData: (formula: string, limit?: number) => PreviewData;

  /**
   * The row data with formula results merged in.
   *
   * Use this when you need row data including computed formula values.
   */
  readonly rowsWithFormulas: readonly Record<string, unknown>[];
}

/**
 * Main hook for managing formula columns in DataGrid.
 *
 * Provides complete formula column management including evaluation,
 * dependency tracking, and progress reporting.
 *
 * @param options - The hook options
 * @returns The hook result with columns and management functions
 *
 * @example
 * ```tsx
 * function MyDataGrid() {
 *   const baseColumns: GridColDef[] = [
 *     { field: 'price', type: 'number' },
 *     { field: 'quantity', type: 'number' },
 *   ];
 *
 *   const [rows, setRows] = useState([
 *     { id: 1, price: 10, quantity: 2 },
 *     { id: 2, price: 25, quantity: 1 },
 *   ]);
 *
 *   const {
 *     columns,
 *     addFormula,
 *     isEvaluating,
 *     progress,
 *   } = useFormulaColumns({ baseColumns, rows });
 *
 *   // Add a formula column
 *   const handleAddColumn = () => {
 *     addFormula('total', '@price * @quantity', 'Total');
 *   };
 *
 *   return (
 *     <>
 *       <DataGrid rows={rows} columns={columns} />
 *       {isEvaluating && progress && (
 *         <LinearProgress value={(progress.completed / progress.total) * 100} />
 *       )}
 *     </>
 *   );
 * }
 * ```
 */
export function useFormulaColumns(options: UseFormulaColumnsOptions): UseFormulaColumnsResult {
  const baseColumns = options.baseColumns;
  const rows = options.rows;
  const initialFormulaColumns = options.initialFormulaColumns;

  // Create or use provided engine
  const engineRef = useRef<FormulaQEngine>(options.engine ?? createFormulaEngine());

  // Create dependency manager (stable reference)
  const dependencyManagerRef = useRef<DependencyManager>(createDependencyManager());

  // Abort controller for cancellation
  const abortControllerRef = useRef<AbortController | null>(null);

  // Track previous rows for re-evaluation check
  const previousRowsRef = useRef<readonly GridRowModel[]>(rows);

  // Initialize state
  const [state, setState] = useState<FormulaColumnsState>(function initState() {
    return createInitialState(initialFormulaColumns);
  });

  // Flag to trigger evaluation
  const shouldEvaluateRef = useRef(false);

  // Add formula action
  const addFormula = useCallback(function handleAddFormula(
    name: string,
    formula: string,
    headerName?: string,
  ): void {
    setState(function updateState(prevState) {
      return addFormulaToState(prevState, name, formula, headerName);
    });
    shouldEvaluateRef.current = true;
  }, []);

  // Edit formula action
  const editFormula = useCallback(function handleEditFormula(field: string, formula: string): void {
    setState(function updateState(prevState) {
      return editFormulaInState(prevState, field, formula);
    });
    shouldEvaluateRef.current = true;
  }, []);

  // Remove formula action
  const removeFormula = useCallback(function handleRemoveFormula(field: string): void {
    setState(function updateState(prevState) {
      return removeFormulaFromState(prevState, field);
    });
    dependencyManagerRef.current.removeFormulaColumn(field);
  }, []);

  // Rename column action
  const renameColumn = useCallback(function handleRenameColumn(
    oldName: string,
    newName: string,
  ): void {
    setState(function updateState(prevState) {
      return renameColumnInState(prevState, oldName, newName, dependencyManagerRef.current);
    });
    shouldEvaluateRef.current = true;
  }, []);

  // Cancel evaluation
  const cancelEvaluation = useCallback(function handleCancelEvaluation(): void {
    if (abortControllerRef.current !== null) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setState(function updateState(prevState) {
      return setIsEvaluatingInState(prevState, false);
    });
  }, []);

  // Get formula results
  const getFormulaResultsFn = useCallback(
    function handleGetFormulaResults(field: string): readonly Value[] {
      return state.formulaResults.get(field) ?? [];
    },
    [state.formulaResults],
  );

  // Get blocking columns
  const getBlockingColumnsFn = useCallback(function handleGetBlockingColumns(
    field: string,
  ): readonly string[] {
    return getBlockingColumns(field, dependencyManagerRef.current);
  }, []);

  // Get variable provider
  const getVariableProviderFn = useCallback(
    function handleGetVariableProvider(): VariableProvider {
      return createVariableProviderFromColumns(baseColumns, state.formulaColumns);
    },
    [baseColumns, state.formulaColumns],
  );

  // Get preview data
  const getPreviewDataFn = useCallback(
    function handleGetPreviewData(formula: string, limit?: number): PreviewData {
      // For preview, we need to evaluate the formula first
      // Use empty results initially
      const emptyResults: Value[] = [];
      return buildPreviewData(
        formula,
        rows as readonly Record<string, unknown>[],
        emptyResults,
        limit,
      );
    },
    [rows],
  );

  // Check if rows changed and trigger re-evaluation
  useEffect(
    function checkRowsChanged() {
      const prevRows = previousRowsRef.current;

      if (
        shouldReEvaluate(
          prevRows as readonly Record<string, unknown>[],
          rows as readonly Record<string, unknown>[],
        )
      ) {
        shouldEvaluateRef.current = true;
        previousRowsRef.current = rows;
      }
    },
    [rows],
  );

  // Evaluation effect
  useEffect(
    function evaluationEffect() {
      if (!shouldEvaluateRef.current) {
        return;
      }

      const formulaColumns = state.formulaColumns;
      if (formulaColumns.size === 0) {
        shouldEvaluateRef.current = false;
        return;
      }

      if (rows.length === 0) {
        shouldEvaluateRef.current = false;
        return;
      }

      // Clear the flag
      shouldEvaluateRef.current = false;

      // Start evaluation
      runEvaluation(
        engineRef.current,
        dependencyManagerRef.current,
        formulaColumns,
        baseColumns,
        rows as readonly GridContextRowModel[],
        setState,
        abortControllerRef,
      );
    },
    [state.formulaColumns, baseColumns, rows],
  );

  // Build formula column definitions
  const formulaColumnDefs = useMemo(
    function buildFormulaColumnDefs(): GridColDef[] {
      const defs: GridColDef[] = [];

      for (const [field, column] of state.formulaColumns) {
        const results = state.formulaResults.get(field) ?? [];
        const def = createFormulaColumnDef(column, results);
        defs.push(def);
      }

      return defs;
    },
    [state.formulaColumns, state.formulaResults],
  );

  // Merge columns
  const mergedColumns = useMemo(
    function mergeCols(): GridColDef[] {
      return mergeColumnsWithFormulas(baseColumns, formulaColumnDefs);
    },
    [baseColumns, formulaColumnDefs],
  );

  // Create rows with formula results
  const rowsWithFormulas = useMemo(
    function createRows(): readonly Record<string, unknown>[] {
      if (state.formulaResults.size === 0) {
        return rows as readonly Record<string, unknown>[];
      }

      const result: Record<string, unknown>[] = [];

      for (let i = 0; i < rows.length; i++) {
        const originalRow = rows[i];
        if (originalRow === undefined) {
          continue;
        }

        // Create a copy of the row
        const newRow: Record<string, unknown> = { ...(originalRow as Record<string, unknown>) };

        // Add formula values
        for (const [field, values] of state.formulaResults) {
          const value = values[i];
          if (value !== undefined) {
            newRow[field] = value.value;
          }
        }

        result.push(newRow);
      }

      return result;
    },
    [rows, state.formulaResults],
  );

  return {
    columns: mergedColumns,
    addFormula,
    editFormula,
    removeFormula,
    renameColumn,
    isEvaluating: state.isEvaluating,
    progress: state.progress,
    cancelEvaluation,
    getFormulaResults: getFormulaResultsFn,
    getBlockingColumns: getBlockingColumnsFn,
    getVariableProvider: getVariableProviderFn,
    getPreviewData: getPreviewDataFn,
    rowsWithFormulas,
  };
}

/**
 * Runs the evaluation for all formula columns in dependency order.
 */
async function runEvaluation(
  engine: FormulaQEngine,
  dependencyManager: DependencyManager,
  formulaColumns: ReadonlyMap<string, FormulaColumn>,
  baseColumns: readonly GridColDef[],
  rows: readonly GridContextRowModel[],
  setState: React.Dispatch<React.SetStateAction<FormulaColumnsState>>,
  abortControllerRef: React.MutableRefObject<AbortController | null>,
): Promise<void> {
  // Set evaluating flag
  setState(function updateState(prevState) {
    return setIsEvaluatingInState(prevState, true);
  });

  // Create new abort controller
  abortControllerRef.current = new AbortController();
  const signal = abortControllerRef.current.signal;

  try {
    // Get evaluation order
    const formulas = Array.from(formulaColumns.values());
    const evaluationOrder = getEvaluationOrder(formulas, dependencyManager);

    // Track computed results
    const computedResults = new Map<string, readonly Value[]>();

    // Total rows for progress
    const totalRows = rows.length;
    let overallCompleted = 0;

    // Evaluate each formula in order
    for (const field of evaluationOrder) {
      const formula = formulaColumns.get(field);
      if (formula === undefined) {
        continue;
      }

      // Check for cancellation
      if (signal.aborted) {
        break;
      }

      // Create formula column definitions for the variable provider
      const formulaColumnDefs: FormulaColumnDefinition[] = [];
      for (const [f, col] of formulaColumns) {
        formulaColumnDefs.push({
          field: f,
          formula: col.formula,
          resultType: 'number.float',
        });
        // Suppress unused variable warning
        void col;
      }

      // Create variable provider
      const variableProvider = createGridVariableProvider({
        columns: baseColumns,
        formulaColumns: formulaColumnDefs,
      });

      // Create evaluation context with previous results
      const evalContext = createGridEvaluationContextWithOptions(
        {
          columns: baseColumns,
          rows: rows,
          formulaResults: computedResults,
        },
        signal,
        function onProgress(completed: number, _total: number): void {
          setState(function updateState(prevState) {
            return setProgressInState(
              prevState,
              overallCompleted + completed,
              totalRows * evaluationOrder.length,
            );
          });
        },
      );

      // Validate and evaluate the formula
      try {
        const validated = engine.validate(formula.formula, variableProvider);
        const result = await engine.evaluateBatch(validated, evalContext);

        // Store results
        computedResults.set(field, result.values);

        // Update state with this result
        setState(function updateState(prevState) {
          return setSingleFormulaResultInState(prevState, field, result.values);
        });

        overallCompleted += totalRows;
      } catch (error) {
        // Validation or evaluation failed - create null results
        const nullResults: Value[] = [];
        for (let i = 0; i < rows.length; i++) {
          nullResults.push({ type: 'number.float', value: null });
        }
        computedResults.set(field, nullResults);

        setState(function updateState(prevState) {
          return setSingleFormulaResultInState(prevState, field, nullResults);
        });

        // Log error for debugging
        console.error(`Failed to evaluate formula column "${field}":`, error);
      }
    }
  } catch (error) {
    console.error('Evaluation error:', error);
  } finally {
    // Clear abort controller and evaluating flag
    abortControllerRef.current = null;

    setState(function updateState(prevState) {
      return setIsEvaluatingInState(prevState, false);
    });
  }
}

// Re-export types for convenience
export type { FormulaColumn } from './use-formula-columns.view-model.ts';
