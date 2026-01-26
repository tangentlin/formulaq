/**
 * FormulaShowcase component demonstrating end-to-end FormulaQ functionality.
 *
 * This showcase demonstrates:
 * - DataGrid with editable price and taxRate columns
 * - Adding formula columns via "Add Column" button
 * - Formula columns with a small formula icon in the header
 * - Context menu (column menu) with Edit/Delete for formula columns
 * - Immediate recalculation when cells are edited
 *
 * @module
 */

import { Box, Button } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import FunctionsIcon from '@mui/icons-material/Functions';
import { DataGrid, type GridColDef, type GridRowModel } from '@mui/x-data-grid';
import React, { useCallback, useMemo, useRef, useState } from 'react';

import { FormulaColumnDialog } from '../formula-column-dialog/formula-column-dialog.tsx';
import { DeleteColumnDialog } from '../delete-column-dialog/delete-column-dialog.tsx';
import { ProgressOverlay } from '../progress-overlay/progress-overlay.tsx';
import { useFormulaColumns } from '../hooks/use-formula-columns.ts';
import type { PreviewData } from '../formula-column-dialog/formula-column-dialog.types.ts';
import { createFormulaEngine, type FormulaQEngine } from '../../core/engine.ts';
import type { Value } from '../../core/types/values.ts';
import { createGridVariableProvider } from '../adapters/grid-variable-provider.ts';
import { createGridEvaluationContext } from '../adapters/grid-evaluation-context.ts';

import {
  type FormulaShowcaseProps,
  type FormulaDialogState,
  type DeleteDialogState,
  type ShowcaseProductRow,
  INITIAL_FORMULA_DIALOG_STATE,
  INITIAL_DELETE_DIALOG_STATE,
  isFormulaColumn,
  extractFormulaFromColumn,
} from './formula-showcase.types.ts';
import { SHOWCASE_COLUMNS, SHOWCASE_PRODUCTS_50 } from './showcase-data.ts';
import { CustomColumnMenu, type CustomColumnMenuProps } from './custom-column-menu.tsx';

/**
 * Module augmentation for column menu slot props.
 */
declare module '@mui/x-data-grid' {
  interface ColumnMenuPropsOverrides {
    onEditFormula?: ((field: string) => void) | undefined;
    onDeleteColumn?: ((field: string) => void) | undefined;
    formulaColumnFields?: ReadonlySet<string> | undefined;
  }
}

/**
 * FormulaShowcase component demonstrating end-to-end FormulaQ functionality.
 *
 * Features:
 * - DataGrid with editable price and taxRate columns
 * - "Add Column" button to create formula columns
 * - Formula columns display a small formula icon in the header
 * - Context menu with Edit Formula / Delete Column for formula columns
 * - Immediate recalculation when cells are edited
 *
 * @param props - Component props
 * @returns The rendered FormulaShowcase component
 *
 * @example
 * ```tsx
 * // Basic usage
 * <FormulaShowcase />
 *
 * // With initial data
 * <FormulaShowcase initialRows={myProducts} />
 *
 * // With initial formula columns
 * <FormulaShowcase
 *   initialFormulaColumns={[
 *     { field: 'total', formula: '@price * @quantity' }
 *   ]}
 * />
 * ```
 */
export function FormulaShowcase(props: FormulaShowcaseProps): React.ReactElement {
  const initialRows = props.initialRows ?? SHOWCASE_PRODUCTS_50;
  const initialFormulaColumns = props.initialFormulaColumns;
  const height = props.height ?? 600;
  const disablePagination = props.disablePagination ?? false;

  // Mutable rows state for editing
  const [rows, setRows] = useState<ShowcaseProductRow[]>(function initRows() {
    return initialRows.map(function copyRow(row) {
      return { ...row };
    });
  });

  // Create a shared engine for formula evaluation
  const engineRef = useRef<FormulaQEngine>(createFormulaEngine());

  // Dialog states
  const [formulaDialog, setFormulaDialog] = useState<FormulaDialogState>(
    INITIAL_FORMULA_DIALOG_STATE,
  );
  const [deleteDialog, setDeleteDialog] = useState<DeleteDialogState>(INITIAL_DELETE_DIALOG_STATE);

  // Handler for opening the add formula dialog
  const handleAddFormula = useCallback(function handleAddFormula(): void {
    setFormulaDialog({
      open: true,
      mode: 'create',
      columnName: '',
      formula: '',
    });
  }, []);

  // Handler for opening the edit formula dialog (called from context menu)
  const handleEditFormula = useCallback(function handleEditFormula(field: string): void {
    setFormulaDialog(function updateDialogState(prevState) {
      return {
        ...prevState,
        open: true,
        mode: 'edit' as const,
        columnName: field,
        // Formula will be set after we have access to columns
      };
    });
  }, []);

  // Handler for opening the delete formula dialog (called from context menu)
  const handleDeleteFormula = useCallback(function handleDeleteFormula(field: string): void {
    setDeleteDialog({
      open: true,
      columnName: field,
    });
  }, []);

  // Formula columns hook
  const {
    columns: rawColumns,
    addFormula,
    editFormula,
    removeFormula,
    isEvaluating,
    progress,
    cancelEvaluation,
    getBlockingColumns,
    getVariableProvider,
    rowsWithFormulas,
  } = useFormulaColumns({
    baseColumns: SHOWCASE_COLUMNS,
    rows: rows as readonly GridRowModel[],
    initialFormulaColumns,
  });

  // Get formula column field names for the context menu
  const formulaColumnFields = useMemo(
    function computeFormulaFields(): ReadonlySet<string> {
      const fields = new Set<string>();
      for (const col of rawColumns) {
        if (isFormulaColumn(col)) {
          fields.add(col.field);
        }
      }
      return fields;
    },
    [rawColumns],
  );

  // Enhance columns with custom headers for formula columns
  const columns = useMemo(
    function enhanceColumns(): readonly GridColDef[] {
      return rawColumns.map(function enhanceColumn(col): GridColDef {
        if (!isFormulaColumn(col)) {
          return col;
        }

        // Add custom header with formula icon (no action buttons)
        const headerName = col.headerName ?? col.field;
        return {
          ...col,
          minWidth: 120,
          renderHeader: function renderFormulaHeader(): React.ReactElement {
            return (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <FunctionsIcon
                  sx={{
                    fontSize: 14,
                    color: 'text.secondary',
                    flexShrink: 0,
                  }}
                />
                <Box
                  sx={{
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {headerName}
                </Box>
              </Box>
            );
          },
        };
      });
    },
    [rawColumns],
  );

  // Update formula dialog state when we have access to columns
  React.useEffect(
    function syncFormulaDialogState(): void {
      if (formulaDialog.open && formulaDialog.mode === 'edit' && formulaDialog.formula === '') {
        const column = rawColumns.find(function findColumn(col): boolean {
          return col.field === formulaDialog.columnName;
        });

        if (column !== undefined) {
          const formula = extractFormulaFromColumn(column);
          setFormulaDialog(function updateState(prevState): FormulaDialogState {
            return {
              ...prevState,
              formula,
            };
          });
        }
      }
    },
    [
      formulaDialog.open,
      formulaDialog.mode,
      formulaDialog.columnName,
      formulaDialog.formula,
      rawColumns,
    ],
  );

  // Get existing column names for uniqueness validation
  const existingColumnNames = useMemo(
    function computeExistingNames(): readonly string[] {
      return columns.map(function getField(col): string {
        return col.field;
      });
    },
    [columns],
  );

  // Handle cell edit - update row data for immediate recalculation
  const processRowUpdate = useCallback(function handleProcessRowUpdate(
    newRow: GridRowModel,
  ): GridRowModel {
    // Update the rows state with the new values
    setRows(function updateRows(prevRows): ShowcaseProductRow[] {
      return prevRows.map(function mapRow(row): ShowcaseProductRow {
        if (row.id === newRow.id) {
          return {
            ...row,
            price: newRow.price as number,
            taxRate: newRow.taxRate as number,
          };
        }
        return row;
      });
    });

    return newRow;
  }, []);

  // Handler for saving the formula
  const handleSaveFormula = useCallback(
    function handleSaveFormula(columnName: string, formula: string): void {
      if (formulaDialog.mode === 'create') {
        addFormula(columnName, formula, columnName);
      } else {
        // Edit mode - if name changed, we need to remove old and add new
        if (columnName !== formulaDialog.columnName) {
          removeFormula(formulaDialog.columnName);
          addFormula(columnName, formula, columnName);
        } else {
          editFormula(columnName, formula);
        }
      }

      setFormulaDialog(INITIAL_FORMULA_DIALOG_STATE);
    },
    [formulaDialog, addFormula, editFormula, removeFormula],
  );

  // Handler for canceling the formula dialog
  const handleCancelFormula = useCallback(function handleCancelFormula(): void {
    setFormulaDialog(INITIAL_FORMULA_DIALOG_STATE);
  }, []);

  // Handler for confirming deletion
  const handleConfirmDelete = useCallback(
    function handleConfirmDelete(): void {
      removeFormula(deleteDialog.columnName);
      setDeleteDialog(INITIAL_DELETE_DIALOG_STATE);
    },
    [deleteDialog.columnName, removeFormula],
  );

  // Handler for canceling deletion
  const handleCancelDelete = useCallback(function handleCancelDelete(): void {
    setDeleteDialog(INITIAL_DELETE_DIALOG_STATE);
  }, []);

  // Get dependent columns for deletion blocking
  const dependentColumns = useMemo(
    function computeDependentColumns(): readonly string[] {
      if (!deleteDialog.open) {
        return [];
      }
      return getBlockingColumns(deleteDialog.columnName);
    },
    [deleteDialog.open, deleteDialog.columnName, getBlockingColumns],
  );

  // Get preview data for the formula dialog
  const previewData = useMemo(
    function computePreviewData(): PreviewData | undefined {
      if (!formulaDialog.open) {
        return undefined;
      }

      // Build simple preview data from rows
      const previewRows = rows.slice(0, 10).map(function mapRow(row, index): {
        id: number;
        [key: string]: number | string | boolean | null | undefined;
      } {
        return {
          id: index,
          name: row.name,
          category: row.category,
          price: row.price,
          quantity: row.quantity,
          taxRate: row.taxRate,
          inStock: row.inStock,
          result: null,
        };
      });

      return {
        columns: [],
        rows: previewRows,
      };
    },
    [formulaDialog.open, rows],
  );

  // Get variable provider for the formula editor
  const variableProvider = useMemo(
    function computeVariableProvider() {
      return getVariableProvider();
    },
    [getVariableProvider],
  );

  // Callback to evaluate preview results for the formula dialog
  const evaluatePreview = useCallback(
    async function handleEvaluatePreview(formula: string): Promise<readonly Value[]> {
      const engine = engineRef.current;

      // Get preview rows (first 10)
      const previewRows = rows.slice(0, 10);

      if (previewRows.length === 0) {
        return [];
      }

      try {
        // Create variable provider for validation
        const provider = createGridVariableProvider({
          columns: SHOWCASE_COLUMNS,
        });

        // Validate the formula
        const validated = engine.validate(formula, provider);

        // Create evaluation context for preview rows
        const evalContext = createGridEvaluationContext({
          columns: SHOWCASE_COLUMNS,
          rows: previewRows as unknown as readonly Record<string, unknown>[],
        });

        // Evaluate the formula
        const result = await engine.evaluateBatch(validated, evalContext);

        return result.values;
      } catch {
        // If validation or evaluation fails, return empty results
        return [];
      }
    },
    [rows],
  );

  // Create slots for custom column menu
  const slots = useMemo(function computeSlots() {
    return {
      columnMenu: CustomColumnMenu,
    };
  }, []);

  // Slot props for the column menu
  const slotProps = useMemo(
    function computeSlotProps() {
      return {
        columnMenu: {
          onEditFormula: handleEditFormula,
          onDeleteColumn: handleDeleteFormula,
          formulaColumnFields: formulaColumnFields,
        } as CustomColumnMenuProps,
      };
    },
    [handleEditFormula, handleDeleteFormula, formulaColumnFields],
  );

  // Show progress overlay when evaluating large datasets
  const showProgress = isEvaluating && progress !== null && progress.total > 1000;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, height: '100%' }}>
      {/* Header with Add Column button */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', px: 1 }}>
        <Button variant="outlined" startIcon={<AddIcon />} onClick={handleAddFormula} size="small">
          Add Column
        </Button>
      </Box>

      {/* DataGrid */}
      <Box
        sx={{
          flex: 1,
          height: typeof height === 'string' ? height : height - 48,
          position: 'relative',
          minHeight: 0,
        }}
      >
        <DataGrid
          rows={rowsWithFormulas as GridRowModel[]}
          columns={columns as GridColDef[]}
          slots={slots}
          slotProps={slotProps}
          hideFooter={disablePagination}
          processRowUpdate={processRowUpdate}
          disableRowSelectionOnClick
          {...(disablePagination
            ? {}
            : {
                pageSizeOptions: [10, 25, 50],
                initialState: {
                  pagination: {
                    paginationModel: { pageSize: 25 },
                  },
                },
              })}
        />

        {/* Progress Overlay */}
        <ProgressOverlay
          visible={showProgress}
          completed={progress?.completed ?? 0}
          total={progress?.total ?? 0}
          onCancel={cancelEvaluation}
        />
      </Box>

      {/* Formula Column Dialog */}
      <FormulaColumnDialog
        open={formulaDialog.open}
        mode={formulaDialog.mode}
        columnName={formulaDialog.columnName}
        formula={formulaDialog.formula}
        variableProvider={variableProvider}
        previewData={previewData}
        existingColumnNames={existingColumnNames}
        onSave={handleSaveFormula}
        onCancel={handleCancelFormula}
        evaluatePreview={evaluatePreview}
      />

      {/* Delete Column Dialog */}
      <DeleteColumnDialog
        open={deleteDialog.open}
        columnName={deleteDialog.columnName}
        dependentColumns={dependentColumns}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
      />
    </Box>
  );
}
