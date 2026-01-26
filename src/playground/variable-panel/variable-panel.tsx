/**
 * VariablePanel component for displaying the list of test variables.
 *
 * Provides a left panel container with:
 * - Header with "Variables" title and "+ Add" button
 * - Scrollable list of VariableCards
 * - Empty state when no variables exist
 * - VariableEditor dialog for add/edit operations
 *
 * @module
 */

import React, { useState } from 'react';
import { Box, Button, Dialog, DialogContent, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';

import type { VariablePanelProps } from './variable-panel.types.ts';
import type { PlaygroundVariable } from '../variable-card/variable-card.types.ts';
import { VariableCard } from '../variable-card/variable-card.tsx';
import { VariableEditor } from '../variable-editor/variable-editor.tsx';

/**
 * Editor mode for the VariableEditor dialog.
 */
type EditorMode = 'add' | 'edit';

/**
 * Props for the PanelHeader component.
 */
interface PanelHeaderProps {
  readonly onAddClick: () => void;
}

/**
 * Header section with title and add button.
 *
 * @param props - The component props
 * @returns The rendered header
 */
function PanelHeader(props: PanelHeaderProps): React.ReactElement {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        pb: 2,
        borderBottom: 1,
        borderColor: 'divider',
      }}
    >
      <Typography
        variant="h6"
        sx={{
          fontWeight: 600,
          fontSize: '1rem',
        }}
      >
        Variables
      </Typography>
      <Button
        variant="outlined"
        size="small"
        startIcon={<AddIcon />}
        onClick={props.onAddClick}
        sx={{
          textTransform: 'none',
          fontWeight: 500,
        }}
      >
        Add
      </Button>
    </Box>
  );
}

/**
 * Props for the EmptyState component.
 */
interface EmptyStateProps {
  readonly onAddClick: () => void;
}

/**
 * Empty state message displayed when no variables exist.
 *
 * @param props - The component props
 * @returns The rendered empty state
 */
function EmptyState(props: EmptyStateProps): React.ReactElement {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        py: 6,
        px: 2,
        textAlign: 'center',
      }}
    >
      <Typography
        variant="body2"
        sx={{
          color: 'text.secondary',
          mb: 2,
        }}
      >
        No variables defined.
        <br />
        Add one to get started.
      </Typography>
      <Button
        variant="contained"
        size="small"
        startIcon={<AddIcon />}
        onClick={props.onAddClick}
        sx={{
          textTransform: 'none',
        }}
      >
        Add Variable
      </Button>
    </Box>
  );
}

/**
 * Props for the VariableList component.
 */
interface VariableListProps {
  readonly variables: readonly PlaygroundVariable[];
  readonly onEdit: (variable: PlaygroundVariable) => void;
  readonly onDelete: (variableName: string) => void;
}

/**
 * Scrollable list of variable cards.
 *
 * @param props - The component props
 * @returns The rendered variable list
 */
function VariableList(props: VariableListProps): React.ReactElement {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
        pt: 2,
        overflowY: 'auto',
        flex: 1,
      }}
    >
      {props.variables.map(function renderVariable(variable) {
        return (
          <VariableCard
            key={variable.name}
            variable={variable}
            onEdit={props.onEdit}
            onDelete={props.onDelete}
          />
        );
      })}
    </Box>
  );
}

/**
 * Props for the EditorDialog component.
 */
interface EditorDialogProps {
  readonly open: boolean;
  readonly mode: EditorMode;
  readonly variable: PlaygroundVariable | undefined;
  readonly existingNames: readonly string[];
  readonly onSave: (variable: PlaygroundVariable) => void;
  readonly onCancel: () => void;
}

/**
 * Dialog wrapper for the VariableEditor.
 *
 * @param props - The component props
 * @returns The rendered dialog
 */
function EditorDialog(props: EditorDialogProps): React.ReactElement {
  return (
    <Dialog
      open={props.open}
      onClose={props.onCancel}
      maxWidth="sm"
      fullWidth
      aria-labelledby="variable-editor-dialog-title"
    >
      <DialogContent sx={{ p: 0 }}>
        <VariableEditor
          mode={props.mode}
          variable={props.variable}
          existingNames={props.existingNames}
          onSave={props.onSave}
          onCancel={props.onCancel}
        />
      </DialogContent>
    </Dialog>
  );
}

/**
 * VariablePanel displays a list of test variables in a scrollable panel.
 *
 * The panel includes:
 * - A header with "Variables" title and "+ Add" button
 * - A scrollable list of VariableCards
 * - An empty state message when no variables exist
 * - A VariableEditor dialog for adding and editing variables
 *
 * @param props - The component props
 * @returns The rendered VariablePanel component
 *
 * @example
 * ```tsx
 * function MyPlayground() {
 *   const [variables, setVariables] = useState<PlaygroundVariable[]>([]);
 *
 *   function handleAddVariable(variable: PlaygroundVariable) {
 *     setVariables([...variables, variable]);
 *   }
 *
 *   function handleEditVariable(variable: PlaygroundVariable) {
 *     setVariables(variables.map(function updateVariable(v) {
 *       return v.name === variable.name ? variable : v;
 *     }));
 *   }
 *
 *   function handleDeleteVariable(name: string) {
 *     setVariables(variables.filter(function filterVariable(v) {
 *       return v.name !== name;
 *     }));
 *   }
 *
 *   return (
 *     <VariablePanel
 *       variables={variables}
 *       onAddVariable={handleAddVariable}
 *       onEditVariable={handleEditVariable}
 *       onDeleteVariable={handleDeleteVariable}
 *     />
 *   );
 * }
 * ```
 */
export function VariablePanel(props: VariablePanelProps): React.ReactElement {
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorMode, setEditorMode] = useState<EditorMode>('add');
  const [editingVariable, setEditingVariable] = useState<PlaygroundVariable | undefined>(undefined);

  const hasVariables = props.variables.length > 0;

  // Get list of existing variable names for duplicate checking
  const existingNames = props.variables.map(function getVariableName(variable) {
    return variable.name;
  });

  function handleAddClick(): void {
    setEditorMode('add');
    setEditingVariable(undefined);
    setEditorOpen(true);
  }

  function handleEditClick(variable: PlaygroundVariable): void {
    setEditorMode('edit');
    setEditingVariable(variable);
    setEditorOpen(true);
  }

  function handleEditorSave(variable: PlaygroundVariable): void {
    if (editorMode === 'add') {
      props.onAddVariable(variable);
    } else {
      props.onEditVariable(variable);
    }
    setEditorOpen(false);
    setEditingVariable(undefined);
  }

  function handleEditorCancel(): void {
    setEditorOpen(false);
    setEditingVariable(undefined);
  }

  function handleDelete(variableName: string): void {
    props.onDeleteVariable(variableName);
  }

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        p: 2,
        backgroundColor: 'background.paper',
        borderRight: 1,
        borderColor: 'divider',
      }}
    >
      <PanelHeader onAddClick={handleAddClick} />

      {hasVariables ? (
        <VariableList
          variables={props.variables}
          onEdit={handleEditClick}
          onDelete={handleDelete}
        />
      ) : (
        <EmptyState onAddClick={handleAddClick} />
      )}

      <EditorDialog
        open={editorOpen}
        mode={editorMode}
        variable={editingVariable}
        existingNames={existingNames}
        onSave={handleEditorSave}
        onCancel={handleEditorCancel}
      />
    </Box>
  );
}
