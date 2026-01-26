/**
 * DeleteColumnDialog component for confirming formula column deletion.
 *
 * A modal dialog that prompts the user to confirm deletion of a formula
 * column. If other columns depend on the column being deleted, the dialog
 * shows a list of dependent columns and disables the Delete button.
 *
 * Features:
 * - Shows column name with @ prefix
 * - Lists dependent columns that block deletion
 * - Disables Delete button when dependents exist
 * - Simple confirmation when no dependents
 * - Cancel and Delete/OK buttons
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
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import CircleIcon from '@mui/icons-material/Circle';
import React from 'react';
import type { DeleteColumnDialogProps } from './delete-column-dialog.types';

/**
 * Size of the bullet icon for dependent column list items.
 */
const BULLET_ICON_SIZE = 8;

/**
 * Checks if the column has any dependents.
 *
 * @param dependentColumns - Array of dependent column names
 * @returns True if there are any dependent columns
 */
function hasDependents(dependentColumns: readonly string[]): boolean {
  return dependentColumns.length > 0;
}

/**
 * Formats a column name with the @ prefix.
 *
 * @param columnName - The column name
 * @returns The formatted column name
 */
function formatColumnName(columnName: string): string {
  return `@${columnName}`;
}

/**
 * Renders the close button in the dialog title.
 *
 * @param props - The component props
 * @returns The close button element
 */
function CloseButton(props: { readonly onClose: () => void }): React.ReactElement {
  return (
    <IconButton
      aria-label="close"
      onClick={props.onClose}
      sx={{
        position: 'absolute',
        right: 8,
        top: 8,
        color: 'grey.500',
      }}
    >
      <CloseIcon />
    </IconButton>
  );
}

/**
 * Renders the dialog content when deletion is blocked by dependents.
 *
 * @param props - The component props
 * @returns The blocked content element
 */
function BlockedContent(props: {
  readonly columnName: string;
  readonly dependentColumns: readonly string[];
}): React.ReactElement {
  return (
    <Box>
      <Typography variant="body1" sx={{ mb: 2 }}>
        Cannot delete '{formatColumnName(props.columnName)}' because other columns depend on it:
      </Typography>
      <List dense disablePadding>
        {props.dependentColumns.map(function renderDependentItem(
          dependentName: string,
        ): React.ReactElement {
          return (
            <ListItem key={dependentName} sx={{ py: 0.5 }}>
              <ListItemIcon sx={{ minWidth: 28 }}>
                <CircleIcon sx={{ fontSize: BULLET_ICON_SIZE, color: 'text.secondary' }} />
              </ListItemIcon>
              <ListItemText
                primary={formatColumnName(dependentName)}
                primaryTypographyProps={{
                  fontFamily: 'monospace',
                  color: 'text.primary',
                }}
              />
            </ListItem>
          );
        })}
      </List>
    </Box>
  );
}

/**
 * Renders the dialog content when deletion is allowed (no dependents).
 *
 * @param props - The component props
 * @returns The confirmation content element
 */
function ConfirmationContent(props: { readonly columnName: string }): React.ReactElement {
  return (
    <Box>
      <Typography variant="body1" sx={{ mb: 2 }}>
        Are you sure you want to delete the column '{formatColumnName(props.columnName)}'?
      </Typography>
      <Typography variant="body2" color="text.secondary">
        This action cannot be undone.
      </Typography>
    </Box>
  );
}

/**
 * Renders the dialog action buttons.
 *
 * @param props - The component props
 * @returns The action buttons element
 */
function DialogButtons(props: {
  readonly isBlocked: boolean;
  readonly onCancel: () => void;
  readonly onConfirm: () => void;
}): React.ReactElement {
  const confirmButtonLabel = props.isBlocked ? 'OK' : 'Delete';
  const confirmButtonColor = props.isBlocked ? 'primary' : 'error';
  const onConfirmClick = props.isBlocked ? props.onCancel : props.onConfirm;

  return (
    <DialogActions sx={{ px: 3, pb: 2 }}>
      {!props.isBlocked && (
        <Button onClick={props.onCancel} color="inherit">
          Cancel
        </Button>
      )}
      <Button
        onClick={onConfirmClick}
        color={confirmButtonColor}
        variant={props.isBlocked ? 'outlined' : 'contained'}
        autoFocus={props.isBlocked}
      >
        {confirmButtonLabel}
      </Button>
    </DialogActions>
  );
}

/**
 * DeleteColumnDialog component displays a confirmation dialog for column deletion.
 *
 * This component handles two distinct states:
 *
 * 1. **No dependents**: Shows a simple confirmation with Cancel/Delete buttons.
 *    The user can proceed with deletion.
 *
 * 2. **Has dependents**: Shows a warning with a list of dependent columns and
 *    only an OK button. Deletion is blocked until dependents are resolved.
 *
 * @param props - The component props
 * @returns The rendered DeleteColumnDialog component
 *
 * @example
 * ```tsx
 * // No dependents - can delete
 * <DeleteColumnDialog
 *   open={true}
 *   columnName="total_price"
 *   dependentColumns={[]}
 *   onConfirm={() => deleteColumn('total_price')}
 *   onCancel={() => setDialogOpen(false)}
 * />
 *
 * // With dependents - blocked
 * <DeleteColumnDialog
 *   open={true}
 *   columnName="price"
 *   dependentColumns={['total_price', 'discount_amount']}
 *   onConfirm={() => {}}
 *   onCancel={() => setDialogOpen(false)}
 * />
 * ```
 */
export function DeleteColumnDialog(props: DeleteColumnDialogProps): React.ReactElement {
  const isBlocked = hasDependents(props.dependentColumns);

  return (
    <Dialog
      open={props.open}
      onClose={props.onCancel}
      maxWidth="sm"
      fullWidth
      aria-labelledby="delete-column-dialog-title"
    >
      <DialogTitle id="delete-column-dialog-title" sx={{ pr: 6 }}>
        Delete Column
        <CloseButton onClose={props.onCancel} />
      </DialogTitle>
      <DialogContent>
        {isBlocked ? (
          <BlockedContent columnName={props.columnName} dependentColumns={props.dependentColumns} />
        ) : (
          <ConfirmationContent columnName={props.columnName} />
        )}
      </DialogContent>
      <DialogButtons isBlocked={isBlocked} onCancel={props.onCancel} onConfirm={props.onConfirm} />
    </Dialog>
  );
}
