/**
 * FormulaColumnDialog component for creating and editing formula columns.
 *
 * This modal dialog provides a form for:
 * - Entering a column name (with uniqueness validation)
 * - Editing the formula using FormulaEditor
 * - Previewing results in a PreviewTable
 *
 * Features:
 * - Create and edit modes
 * - Real-time formula validation
 * - Column name validation (uniqueness, valid identifier)
 * - Preview of formula evaluation on first 10 rows
 * - Keyboard shortcuts (Ctrl/Cmd+Enter to save, Escape to close)
 *
 * @module
 */

import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  TextField,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { FormulaEditor } from '../../editor/formula-editor/formula-editor.tsx';
import type { ValidationResult } from '../../editor/formula-editor/formula-editor.types.ts';
import { PreviewTable } from '../preview-table/preview-table.tsx';
import type { PreviewColumn, PreviewRow } from '../preview-table/preview-table.types.ts';
import type { Value } from '../../core/types/values.ts';

import type { FormulaColumnDialogProps } from './formula-column-dialog.types.ts';
import {
  validateColumnName,
  canSave,
  getDialogTitle,
  getSaveButtonText,
  extractVariableNames,
  buildPreviewColumns,
} from './formula-column-dialog.view-model.ts';

/**
 * FormulaColumnDialog component for creating and editing formula columns.
 *
 * Provides a modal dialog with:
 * - Column name input with validation
 * - FormulaEditor for entering the formula
 * - PreviewTable showing first 10 rows with computed results
 * - Create/Save and Cancel buttons
 *
 * @param props - Component props
 * @returns The rendered FormulaColumnDialog component
 *
 * @example
 * ```tsx
 * // Create mode
 * <FormulaColumnDialog
 *   open={isOpen}
 *   mode="create"
 *   variableProvider={variableProvider}
 *   existingColumnNames={['price', 'tax_rate']}
 *   previewData={previewData}
 *   onSave={handleSave}
 *   onCancel={handleCancel}
 * />
 *
 * // Edit mode
 * <FormulaColumnDialog
 *   open={isOpen}
 *   mode="edit"
 *   columnName="total"
 *   formula="@price * (1 + @tax_rate)"
 *   variableProvider={variableProvider}
 *   existingColumnNames={['price', 'tax_rate', 'total']}
 *   previewData={previewData}
 *   onSave={handleSave}
 *   onCancel={handleCancel}
 * />
 * ```
 */
export function FormulaColumnDialog(props: FormulaColumnDialogProps): React.ReactElement {
  const open = props.open;
  const mode = props.mode;
  const initialColumnName = props.columnName ?? '';
  const initialFormula = props.formula ?? '';
  const variableProvider = props.variableProvider;
  const previewData = props.previewData;
  const existingColumnNames = props.existingColumnNames;
  const onSave = props.onSave;
  const onCancel = props.onCancel;
  const evaluatePreview = props.evaluatePreview;

  // Local state for form inputs
  const [columnName, setColumnName] = useState(initialColumnName);
  const [formula, setFormula] = useState(initialFormula);
  const [isFormulaValid, setIsFormulaValid] = useState(false);
  const [columnNameTouched, setColumnNameTouched] = useState(false);

  // State for computed preview results
  const [previewResults, setPreviewResults] = useState<readonly Value[]>([]);
  const evaluationRequestRef = useRef(0);

  // Reset state when dialog opens/closes or mode changes
  useEffect(
    function resetState() {
      if (open) {
        setColumnName(initialColumnName);
        setFormula(initialFormula);
        setIsFormulaValid(initialFormula.trim() !== '');
        setColumnNameTouched(mode === 'edit');
        setPreviewResults([]);
        evaluationRequestRef.current += 1;
      }
    },
    [open, initialColumnName, initialFormula, mode],
  );

  // Evaluate preview when formula is valid
  useEffect(
    function evaluatePreviewEffect() {
      if (!open || !isFormulaValid || evaluatePreview === undefined || formula.trim() === '') {
        return;
      }

      // Track the request ID to handle race conditions
      const requestId = ++evaluationRequestRef.current;

      evaluatePreview(formula)
        .then(function handleResults(results) {
          // Only update if this is still the latest request
          if (requestId === evaluationRequestRef.current) {
            setPreviewResults(results);
          }
        })
        .catch(function handleError() {
          // On error, clear results
          if (requestId === evaluationRequestRef.current) {
            setPreviewResults([]);
          }
        });
    },
    [open, isFormulaValid, formula, evaluatePreview],
  );

  // Validate column name
  const columnNameError = useMemo(
    function computeColumnNameError(): string | null {
      if (!columnNameTouched && columnName === '') {
        return null;
      }
      const currentName = mode === 'edit' ? props.columnName : undefined;
      return validateColumnName(columnName, existingColumnNames, currentName);
    },
    [columnName, existingColumnNames, columnNameTouched, mode, props.columnName],
  );

  // Determine if save is allowed
  const isSaveEnabled = useMemo(
    function computeCanSave(): boolean {
      return canSave(columnName, isFormulaValid, columnNameError);
    },
    [columnName, isFormulaValid, columnNameError],
  );

  // Handle column name change
  const handleColumnNameChange = useCallback(
    function handleColumnNameChange(event: React.ChangeEvent<HTMLInputElement>): void {
      setColumnName(event.target.value);
      if (!columnNameTouched) {
        setColumnNameTouched(true);
      }
    },
    [columnNameTouched],
  );

  // Handle column name blur
  const handleColumnNameBlur = useCallback(function handleColumnNameBlur(): void {
    setColumnNameTouched(true);
  }, []);

  // Handle formula change
  const handleFormulaChange = useCallback(function handleFormulaChange(value: string): void {
    setFormula(value);
  }, []);

  // Handle validation result from FormulaEditor
  const handleValidation = useCallback(function handleValidation(result: ValidationResult): void {
    setIsFormulaValid(result.isValid);
  }, []);

  // Handle save button click
  const handleSave = useCallback(
    function handleSave(): void {
      if (isSaveEnabled) {
        onSave(columnName.trim(), formula);
      }
    },
    [isSaveEnabled, columnName, formula, onSave],
  );

  // Handle cancel button click
  const handleCancel = useCallback(
    function handleCancel(): void {
      onCancel();
    },
    [onCancel],
  );

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback(
    function handleKeyDown(event: React.KeyboardEvent): void {
      // Escape to close
      if (event.key === 'Escape') {
        onCancel();
        return;
      }

      // Ctrl/Cmd+Enter to save
      if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        if (isSaveEnabled) {
          onSave(columnName.trim(), formula);
        }
      }
    },
    [onCancel, onSave, isSaveEnabled, columnName, formula],
  );

  // Compute preview columns and rows
  const previewColumns = useMemo(
    function computePreviewColumns(): PreviewColumn[] {
      const variableNames = extractVariableNames(formula);
      return buildPreviewColumns(variableNames);
    },
    [formula],
  );

  // Build preview rows with results from preview data
  const previewRows = useMemo(
    function computePreviewRows(): PreviewRow[] {
      if (previewData === undefined || previewData.rows.length === 0) {
        return [];
      }

      // Extract variable names from formula
      const variableNames = extractVariableNames(formula);

      // Build rows with only the referenced variables plus result
      const rows: PreviewRow[] = [];
      for (let i = 0; i < previewData.rows.length && i < 10; i++) {
        const sourceRow = previewData.rows[i];
        if (sourceRow === undefined) {
          continue;
        }

        const row: { id: number; [key: string]: number | string | boolean | null | undefined } = {
          id: sourceRow.id,
        };

        // Copy referenced variable values
        for (const varName of variableNames) {
          row[varName] = sourceRow[varName];
        }

        // Use computed preview results if available, otherwise fall back to previewData
        const previewResult = previewResults[i];
        if (previewResult !== undefined) {
          row['result'] = previewResult.value as number | string | boolean | null;
        } else {
          row['result'] = sourceRow['result'] ?? null;
        }

        rows.push(row as PreviewRow);
      }

      return rows;
    },
    [previewData, formula, previewResults],
  );

  // Dialog title based on mode
  const dialogTitle = getDialogTitle(mode);
  const saveButtonText = getSaveButtonText(mode);

  return (
    <Dialog
      open={open}
      onClose={handleCancel}
      maxWidth="md"
      fullWidth
      onKeyDown={handleKeyDown}
      aria-labelledby="formula-column-dialog-title"
    >
      <DialogTitle id="formula-column-dialog-title" sx={{ pr: 6 }}>
        {dialogTitle}
        <IconButton
          aria-label="close"
          onClick={handleCancel}
          sx={{
            position: 'absolute',
            right: 8,
            top: 8,
            color: 'grey.500',
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* Column Name Input */}
          <Box>
            <TextField
              id="column-name-input"
              label="Column Name"
              value={columnName}
              onChange={handleColumnNameChange}
              onBlur={handleColumnNameBlur}
              error={columnNameError !== null}
              helperText={columnNameError ?? ' '}
              fullWidth
              autoFocus={mode === 'create'}
              placeholder="Enter column name"
              inputProps={{
                'aria-describedby': columnNameError ? 'column-name-error' : undefined,
              }}
            />
          </Box>

          {/* Formula Editor */}
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Formula
            </Typography>
            <FormulaEditor
              value={formula}
              onChange={handleFormulaChange}
              variableProvider={variableProvider}
              onValidation={handleValidation}
              placeholder="Enter formula, e.g., @price * (1 + @tax_rate)"
              height={120}
            />
          </Box>

          {/* Preview Table */}
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Preview
            </Typography>
            <PreviewTable columns={previewColumns} rows={previewRows} />
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={handleCancel} color="inherit">
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={!isSaveEnabled}
          aria-label={saveButtonText}
        >
          {saveButtonText}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
