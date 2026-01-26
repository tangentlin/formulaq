/**
 * Custom column menu component for the FormulaShowcase.
 *
 * Extends the default DataGrid column menu with additional options
 * for formula columns:
 * - "Edit Formula" menu item
 * - "Delete Column" menu item
 *
 * Regular columns display the standard column menu.
 *
 * @module
 */

import { GridColumnMenu, GridColumnMenuProps, GridColumnMenuItemProps } from '@mui/x-data-grid';
import { Divider, ListItemIcon, ListItemText, MenuItem } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import React from 'react';

/**
 * Props for the EditFormulaMenuItem component.
 */
interface EditFormulaMenuItemProps extends GridColumnMenuItemProps {
  /**
   * Callback when edit formula is clicked.
   */
  readonly onEditFormula?: ((field: string) => void) | undefined;
}

/**
 * Props for the DeleteColumnMenuItem component.
 */
interface DeleteColumnMenuItemProps extends GridColumnMenuItemProps {
  /**
   * Callback when delete column is clicked.
   */
  readonly onDeleteColumn?: ((field: string) => void) | undefined;
}

/**
 * Props for the CustomColumnMenu component.
 */
export interface CustomColumnMenuProps extends GridColumnMenuProps {
  /**
   * Callback when edit formula is clicked.
   */
  readonly onEditFormula?: ((field: string) => void) | undefined;

  /**
   * Callback when delete column is clicked.
   */
  readonly onDeleteColumn?: ((field: string) => void) | undefined;

  /**
   * Set of formula column field names.
   */
  readonly formulaColumnFields?: ReadonlySet<string> | undefined;
}

/**
 * Edit Formula menu item component.
 */
function EditFormulaMenuItem(props: EditFormulaMenuItemProps): React.ReactElement | null {
  const colDef = props.colDef;
  const onClick = props.onClick;
  const onEditFormula = props.onEditFormula;

  const handleClick = React.useCallback(
    function handleEditClick(event: React.MouseEvent<HTMLElement>): void {
      if (onEditFormula !== undefined) {
        onEditFormula(colDef.field);
      }
      if (onClick !== undefined) {
        onClick(event);
      }
    },
    [colDef.field, onEditFormula, onClick],
  );

  return (
    <MenuItem onClick={handleClick}>
      <ListItemIcon>
        <EditIcon fontSize="small" />
      </ListItemIcon>
      <ListItemText>Edit Formula</ListItemText>
    </MenuItem>
  );
}

/**
 * Delete Column menu item component.
 */
function DeleteColumnMenuItem(props: DeleteColumnMenuItemProps): React.ReactElement | null {
  const colDef = props.colDef;
  const onClick = props.onClick;
  const onDeleteColumn = props.onDeleteColumn;

  const handleClick = React.useCallback(
    function handleDeleteClick(event: React.MouseEvent<HTMLElement>): void {
      if (onDeleteColumn !== undefined) {
        onDeleteColumn(colDef.field);
      }
      if (onClick !== undefined) {
        onClick(event);
      }
    },
    [colDef.field, onDeleteColumn, onClick],
  );

  return (
    <MenuItem onClick={handleClick}>
      <ListItemIcon>
        <DeleteIcon fontSize="small" color="error" />
      </ListItemIcon>
      <ListItemText primaryTypographyProps={{ color: 'error' }}>Delete Column</ListItemText>
    </MenuItem>
  );
}

/**
 * Custom column menu that adds Edit/Delete options for formula columns.
 *
 * For non-formula columns, displays the standard column menu.
 * For formula columns, adds:
 * - Edit Formula
 * - Delete Column
 *
 * @param props - Component props
 * @returns The rendered column menu
 *
 * @example
 * ```tsx
 * <DataGrid
 *   slots={{
 *     columnMenu: CustomColumnMenu,
 *   }}
 *   slotProps={{
 *     columnMenu: {
 *       onEditFormula: handleEditFormula,
 *       onDeleteColumn: handleDeleteColumn,
 *       formulaColumnFields: new Set(['total', 'taxAmount']),
 *     },
 *   }}
 * />
 * ```
 */
export function CustomColumnMenu(props: CustomColumnMenuProps): React.ReactElement {
  const colDef = props.colDef;
  const onEditFormula = props.onEditFormula;
  const onDeleteColumn = props.onDeleteColumn;
  const formulaColumnFields = props.formulaColumnFields;

  // Check if this is a formula column
  const isFormula = formulaColumnFields !== undefined && formulaColumnFields.has(colDef.field);

  // For formula columns, we want to add custom menu items
  if (isFormula) {
    return (
      <GridColumnMenu
        {...props}
        slots={{
          columnMenuUserItem: function renderFormulaItems(
            itemProps: GridColumnMenuItemProps,
          ): React.ReactElement {
            return (
              <React.Fragment>
                <Divider />
                <EditFormulaMenuItem {...itemProps} onEditFormula={onEditFormula} />
                <DeleteColumnMenuItem {...itemProps} onDeleteColumn={onDeleteColumn} />
              </React.Fragment>
            );
          },
        }}
      />
    );
  }

  // For regular columns, use the default column menu
  return <GridColumnMenu {...props} />;
}
