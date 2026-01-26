/**
 * DataGridDemo component demonstrating full DataGrid integration with formula columns.
 *
 * This demo showcases:
 * - DataGrid with sample product data
 * - Adding formula columns via toolbar button
 * - Editing formula columns via action buttons
 * - Deleting formula columns via action buttons
 * - Progress overlay for large dataset evaluation
 *
 * @module
 */

import { Box, Button, Divider, IconButton, Tooltip } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import FunctionsIcon from '@mui/icons-material/Functions';
import {
  DataGrid,
  GridToolbarContainer,
  GridToolbarColumnsButton,
  GridToolbarFilterButton,
  GridToolbarDensitySelector,
  type GridColDef,
  type GridRowModel,
} from '@mui/x-data-grid';
import React, { useCallback, useMemo, useRef, useState } from 'react';

import { FormulaColumnDialog } from '../formula-column-dialog/formula-column-dialog.tsx';
import { DeleteColumnDialog } from '../delete-column-dialog/delete-column-dialog.tsx';
import { ProgressOverlay } from '../progress-overlay/progress-overlay.tsx';
import { useFormulaColumns, type FormulaColumn } from '../hooks/use-formula-columns.ts';
import type {
  FormulaColumnDialogMode,
  PreviewData,
} from '../formula-column-dialog/formula-column-dialog.types.ts';
import { SAMPLE_COLUMNS, type ProductRow } from './sample-data.ts';
import { createFormulaEngine, type FormulaQEngine } from '../../core/engine.ts';
import type { Value } from '../../core/types/values.ts';
import { createGridVariableProvider } from '../adapters/grid-variable-provider.ts';
import { createGridEvaluationContext } from '../adapters/grid-evaluation-context.ts';

/**
 * Props for the DataGridDemo component.
 */
export interface DataGridDemoProps {
  /**
   * The product data to display.
   */
  readonly rows: readonly ProductRow[];

  /**
   * Initial formula columns to display.
   */
  readonly initialFormulaColumns?: readonly FormulaColumn[] | undefined;

  /**
   * Height of the DataGrid.
   *
   * @defaultValue 600
   */
  readonly height?: number | undefined;
}

/**
 * State for the formula column dialog.
 */
interface FormulaDialogState {
  /**
   * Whether the dialog is open.
   */
  readonly open: boolean;

  /**
   * Dialog mode: create or edit.
   */
  readonly mode: FormulaColumnDialogMode;

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
interface DeleteDialogState {
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
const INITIAL_FORMULA_DIALOG_STATE: FormulaDialogState = {
  open: false,
  mode: 'create',
  columnName: '',
  formula: '',
};

/**
 * Initial state for the delete dialog.
 */
const INITIAL_DELETE_DIALOG_STATE: DeleteDialogState = {
  open: false,
  columnName: '',
};

/**
 * Module augmentation to add custom props to toolbar slot.
 */
declare module '@mui/x-data-grid' {
  interface ToolbarPropsOverrides {
    onAddFormula?: (() => void) | undefined;
  }
}

/**
 * Custom toolbar with formula column button.
 *
 * The props are injected via slotProps.toolbar in DataGrid.
 */
function CustomToolbar(props: { onAddFormula?: (() => void) | undefined }): React.ReactElement {
  const onAddFormula = props.onAddFormula;

  return (
    <GridToolbarContainer>
      <GridToolbarColumnsButton />
      <GridToolbarFilterButton />
      <GridToolbarDensitySelector />
      <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />
      <Button
        size="small"
        startIcon={<AddIcon />}
        onClick={onAddFormula}
        disabled={onAddFormula === undefined}
        sx={{ textTransform: 'none' }}
      >
        Formula Column
      </Button>
    </GridToolbarContainer>
  );
}

/**
 * Props for the FormulaColumnHeader component.
 */
interface FormulaColumnHeaderProps {
  readonly field: string;
  readonly headerName: string;
  readonly onEdit: (field: string) => void;
  readonly onDelete: (field: string) => void;
}

/**
 * Custom header for formula columns with edit/delete buttons.
 */
function FormulaColumnHeader(props: FormulaColumnHeaderProps): React.ReactElement {
  const handleEdit = useCallback(
    function handleEditClick(event: React.MouseEvent): void {
      event.stopPropagation();
      props.onEdit(props.field);
    },
    [props],
  );

  const handleDelete = useCallback(
    function handleDeleteClick(event: React.MouseEvent): void {
      event.stopPropagation();
      props.onDelete(props.field);
    },
    [props],
  );

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', gap: 0.5 }}>
      <FunctionsIcon sx={{ fontSize: 16, color: 'primary.main', flexShrink: 0 }} />
      <Box
        sx={{
          flex: 1,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {props.headerName}
      </Box>
      <Tooltip title="Edit Formula">
        <IconButton size="small" onClick={handleEdit} sx={{ p: 0.25 }}>
          <EditIcon sx={{ fontSize: 14 }} />
        </IconButton>
      </Tooltip>
      <Tooltip title="Delete Column">
        <IconButton size="small" onClick={handleDelete} sx={{ p: 0.25 }}>
          <DeleteIcon sx={{ fontSize: 14 }} />
        </IconButton>
      </Tooltip>
    </Box>
  );
}

/**
 * Extracts the formula from a formula column's description.
 *
 * @param column - The column definition
 * @returns The formula string, or empty string if not a formula column
 */
function extractFormulaFromColumn(column: GridColDef): string {
  const description = column.description;
  if (description === undefined || description === null) {
    return '';
  }
  if (!description.startsWith('Formula:')) {
    return '';
  }
  return description.slice('Formula:'.length).trim();
}

/**
 * Checks if a column is a formula column by its description.
 *
 * @param column - The column definition
 * @returns True if the column is a formula column
 */
function isFormulaColumn(column: GridColDef): boolean {
  const description = column.description;
  if (description === undefined || description === null) {
    return false;
  }
  return description.startsWith('Formula:');
}

/**
 * DataGridDemo component showcasing full DataGrid integration with formula columns.
 *
 * Provides a complete demonstration of:
 * - Adding formula columns via toolbar button
 * - Editing formula columns via header action buttons
 * - Deleting formula columns via header action buttons
 * - Progress overlay for large dataset evaluation
 * - Formula column persistence across renders
 *
 * @param props - Component props
 * @returns The rendered DataGridDemo component
 *
 * @example
 * ```tsx
 * // Basic usage with 100 products
 * <DataGridDemo rows={generateSampleProducts(100)} />
 *
 * // With initial formula columns
 * <DataGridDemo
 *   rows={products}
 *   initialFormulaColumns={[
 *     { field: 'total', formula: '@price * @quantity' },
 *   ]}
 * />
 *
 * // Custom height
 * <DataGridDemo rows={products} height={800} />
 * ```
 */
export function DataGridDemo(props: DataGridDemoProps): React.ReactElement {
  const rows = props.rows;
  const initialFormulaColumns = props.initialFormulaColumns;
  const height = props.height ?? 600;

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

  // Handler for opening the edit formula dialog
  const handleEditFormula = useCallback(function handleEditFormula(field: string): void {
    // We need to get the formula from columns, but we don't have them yet
    // We'll set the field and get the formula from the column later
    setFormulaDialog(function updateDialogState(prevState) {
      return {
        ...prevState,
        open: true,
        mode: 'edit' as FormulaColumnDialogMode,
        columnName: field,
        // Formula will be set after we have access to columns
      };
    });
  }, []);

  // Handler for opening the delete formula dialog
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
    baseColumns: SAMPLE_COLUMNS,
    rows: rows as readonly GridRowModel[],
    initialFormulaColumns,
  });

  // Enhance formula columns with custom headers
  const columns = useMemo(
    function enhanceColumns(): readonly GridColDef[] {
      return rawColumns.map(function enhanceColumn(col): GridColDef {
        if (!isFormulaColumn(col)) {
          return col;
        }

        // Add custom header with edit/delete buttons
        return {
          ...col,
          minWidth: 150,
          renderHeader: function renderFormulaHeader(): React.ReactElement {
            return (
              <FormulaColumnHeader
                field={col.field}
                headerName={col.headerName ?? col.field}
                onEdit={handleEditFormula}
                onDelete={handleDeleteFormula}
              />
            );
          },
        };
      });
    },
    [rawColumns, handleEditFormula, handleDeleteFormula],
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
        // Create a new object to avoid id collision
        const result: { id: number; [key: string]: number | string | boolean | null | undefined } =
          {
            id: index,
            name: row.name,
            category: row.category,
            price: row.price,
            quantity: row.quantity,
            taxRate: row.taxRate,
            inStock: row.inStock,
            result: null, // Will be computed by the dialog
          };

        return result;
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
          columns: SAMPLE_COLUMNS,
        });

        // Validate the formula
        const validated = engine.validate(formula, provider);

        // Create evaluation context for preview rows
        const evalContext = createGridEvaluationContext({
          columns: SAMPLE_COLUMNS,
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

  // Create slots for custom toolbar
  const slots = useMemo(function computeSlots() {
    return {
      toolbar: CustomToolbar,
    };
  }, []);

  // Slot props for the toolbar
  const slotProps = useMemo(
    function computeSlotProps() {
      return {
        toolbar: {
          onAddFormula: handleAddFormula,
        },
      };
    },
    [handleAddFormula],
  );

  // Show progress overlay when evaluating
  const showProgress = isEvaluating && progress !== null && progress.total > 1000;

  return (
    <Box sx={{ height, width: '100%', position: 'relative' }}>
      <DataGrid
        rows={rowsWithFormulas as GridRowModel[]}
        columns={columns as GridColDef[]}
        slots={slots}
        slotProps={slotProps}
        pageSizeOptions={[10, 25, 50, 100]}
        initialState={{
          pagination: {
            paginationModel: { pageSize: 25 },
          },
        }}
        disableRowSelectionOnClick
      />

      {/* Progress Overlay */}
      <ProgressOverlay
        visible={showProgress}
        completed={progress?.completed ?? 0}
        total={progress?.total ?? 0}
        onCancel={cancelEvaluation}
      />

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
