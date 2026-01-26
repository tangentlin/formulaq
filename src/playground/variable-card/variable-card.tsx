/**
 * VariableCard component for displaying a single test variable.
 *
 * Displays variable information in a compact card format with:
 * - Variable name with @ prefix
 * - Type badge/chip
 * - Preview of values (truncated if long)
 * - Edit and delete action buttons
 *
 * @module
 */

import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Chip,
  IconButton,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  Tooltip,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

import type { VariableCardProps } from './variable-card.types.ts';
import type { ValueType } from '../../core/types/values.ts';

/**
 * Maximum number of values to show in the preview.
 */
const MAX_PREVIEW_VALUES = 4;

/**
 * Maximum length for a single string value before truncation.
 */
const MAX_STRING_LENGTH = 15;

/**
 * Maps a ValueType to a display-friendly short label.
 *
 * @param type - The value type
 * @returns The display label for the type
 */
function getTypeLabel(type: ValueType): string {
  switch (type) {
    case 'number.integer':
      return 'integer';
    case 'number.float':
      return 'number';
    case 'string.text':
      return 'string';
    case 'boolean.boolean':
      return 'boolean';
    default:
      return 'unknown';
  }
}

/**
 * Gets the color for a type chip.
 *
 * @param type - The value type
 * @returns The MUI color name for the chip
 */
function getTypeColor(type: ValueType): 'primary' | 'secondary' | 'success' | 'info' {
  switch (type) {
    case 'number.integer':
    case 'number.float':
      return 'primary';
    case 'string.text':
      return 'secondary';
    case 'boolean.boolean':
      return 'success';
    default:
      return 'info';
  }
}

/**
 * Formats a single value for display in the preview.
 *
 * @param value - The value to format
 * @returns The formatted string representation
 */
function formatValue(value: number | string | boolean | null): string {
  if (value === null) {
    return 'null';
  }

  if (typeof value === 'string') {
    const displayValue =
      value.length > MAX_STRING_LENGTH ? value.slice(0, MAX_STRING_LENGTH) + '...' : value;
    return `"${displayValue}"`;
  }

  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }

  return String(value);
}

/**
 * Formats an array of values as a preview string.
 *
 * Shows the first few values with an ellipsis if there are more.
 *
 * @param values - The array of values to format
 * @returns The formatted preview string
 */
function formatValuesPreview(values: readonly (number | string | boolean | null)[]): string {
  if (values.length === 0) {
    return '[]';
  }

  const previewValues = values.slice(0, MAX_PREVIEW_VALUES);
  const formattedValues = previewValues.map(formatValue);

  if (values.length > MAX_PREVIEW_VALUES) {
    formattedValues.push('...');
  }

  return '[' + formattedValues.join(', ') + ']';
}

/**
 * Generates the full values string for tooltip display.
 *
 * @param values - The array of values
 * @returns The complete values representation
 */
function formatFullValues(values: readonly (number | string | boolean | null)[]): string {
  if (values.length === 0) {
    return '[]';
  }

  const formattedValues = values.map(formatValue);
  return '[' + formattedValues.join(', ') + ']';
}

/**
 * Props for the DeleteConfirmationDialog component.
 */
interface DeleteConfirmationDialogProps {
  readonly open: boolean;
  readonly variableName: string;
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
}

/**
 * Dialog for confirming variable deletion.
 *
 * @param props - The component props
 * @returns The rendered dialog component
 */
function DeleteConfirmationDialog(props: DeleteConfirmationDialogProps): React.ReactElement {
  return (
    <Dialog
      open={props.open}
      onClose={props.onCancel}
      aria-labelledby="delete-variable-dialog-title"
      aria-describedby="delete-variable-dialog-description"
    >
      <DialogTitle id="delete-variable-dialog-title">Delete Variable</DialogTitle>
      <DialogContent>
        <DialogContentText id="delete-variable-dialog-description">
          Are you sure you want to delete the variable <strong>@{props.variableName}</strong>? This
          action cannot be undone.
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={props.onCancel} color="inherit">
          Cancel
        </Button>
        <Button onClick={props.onConfirm} color="error" variant="contained">
          Delete
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/**
 * Props for the ActionButtons component.
 */
interface ActionButtonsProps {
  readonly onEditClick: () => void;
  readonly onDeleteClick: () => void;
  readonly isHovered: boolean;
}

/**
 * Edit and delete action buttons for the card.
 *
 * @param props - The component props
 * @returns The rendered action buttons
 */
function ActionButtons(props: ActionButtonsProps): React.ReactElement {
  return (
    <Box
      sx={{
        display: 'flex',
        gap: 0.5,
        opacity: props.isHovered ? 1 : 0,
        transition: 'opacity 0.2s ease-in-out',
      }}
    >
      <Tooltip title="Edit variable">
        <IconButton
          size="small"
          onClick={props.onEditClick}
          aria-label="Edit variable"
          sx={{
            color: 'action.active',
            '&:hover': {
              color: 'primary.main',
              backgroundColor: 'action.hover',
            },
          }}
        >
          <EditIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Tooltip title="Delete variable">
        <IconButton
          size="small"
          onClick={props.onDeleteClick}
          aria-label="Delete variable"
          sx={{
            color: 'action.active',
            '&:hover': {
              color: 'error.main',
              backgroundColor: 'action.hover',
            },
          }}
        >
          <DeleteIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    </Box>
  );
}

/**
 * Props for the ValuesPreview component.
 */
interface ValuesPreviewProps {
  readonly values: readonly (number | string | boolean | null)[];
}

/**
 * Displays a preview of variable values.
 *
 * @param props - The component props
 * @returns The rendered values preview
 */
function ValuesPreview(props: ValuesPreviewProps): React.ReactElement {
  const preview = formatValuesPreview(props.values);
  const fullValues =
    props.values.length > MAX_PREVIEW_VALUES ? formatFullValues(props.values) : preview;

  return (
    <Tooltip title={fullValues} placement="bottom-start">
      <Typography
        variant="body2"
        sx={{
          color: 'text.secondary',
          fontFamily: '"Roboto Mono", "Consolas", "Monaco", monospace',
          fontSize: '0.75rem',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          '& .null-value': {
            color: 'text.disabled',
            fontStyle: 'italic',
          },
        }}
      >
        {preview}
      </Typography>
    </Tooltip>
  );
}

/**
 * VariableCard displays a single test variable in a compact card format.
 *
 * The card shows:
 * - Variable name with @ prefix (e.g., "@score")
 * - Type badge (e.g., "number")
 * - Preview of values (truncated if long)
 * - Edit button (opens VariableEditor)
 * - Delete button (with confirmation dialog)
 *
 * @param props - The component props
 * @returns The rendered VariableCard component
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const variable: PlaygroundVariable = {
 *     name: 'score',
 *     type: 'number.float',
 *     values: [85, 92, 78, null, 95],
 *   };
 *
 *   function handleEdit(variable: PlaygroundVariable) {
 *     console.log('Edit', variable.name);
 *   }
 *
 *   function handleDelete(name: string) {
 *     console.log('Delete', name);
 *   }
 *
 *   return (
 *     <VariableCard
 *       variable={variable}
 *       onEdit={handleEdit}
 *       onDelete={handleDelete}
 *     />
 *   );
 * }
 * ```
 */
export function VariableCard(props: VariableCardProps): React.ReactElement {
  const [isHovered, setIsHovered] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const variable = props.variable;
  const typeLabel = getTypeLabel(variable.type);
  const typeColor = getTypeColor(variable.type);

  function handleMouseEnter(): void {
    setIsHovered(true);
  }

  function handleMouseLeave(): void {
    setIsHovered(false);
  }

  function handleEditClick(): void {
    props.onEdit(variable);
  }

  function handleDeleteClick(): void {
    setIsDeleteDialogOpen(true);
  }

  function handleDeleteConfirm(): void {
    setIsDeleteDialogOpen(false);
    props.onDelete(variable.name);
  }

  function handleDeleteCancel(): void {
    setIsDeleteDialogOpen(false);
  }

  return (
    <>
      <Card
        variant="outlined"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        sx={{
          backgroundColor: isHovered ? 'action.hover' : 'background.paper',
          transition: 'background-color 0.2s ease-in-out',
        }}
      >
        <CardContent
          sx={{
            py: 1.5,
            px: 2,
            '&:last-child': {
              pb: 1.5,
            },
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              mb: 0.5,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0, flex: 1 }}>
              <Typography
                variant="subtitle2"
                sx={{
                  fontWeight: 600,
                  color: 'primary.main',
                  fontFamily: '"Roboto Mono", "Consolas", "Monaco", monospace',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                @{variable.name}
              </Typography>
              <Chip label={typeLabel} size="small" color={typeColor} variant="outlined" />
            </Box>
            <ActionButtons
              onEditClick={handleEditClick}
              onDeleteClick={handleDeleteClick}
              isHovered={isHovered}
            />
          </Box>
          <ValuesPreview values={variable.values} />
        </CardContent>
      </Card>
      <DeleteConfirmationDialog
        open={isDeleteDialogOpen}
        variableName={variable.name}
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
      />
    </>
  );
}
