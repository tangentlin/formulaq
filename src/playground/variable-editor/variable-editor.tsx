/**
 * VariableEditor component for adding and editing test variables.
 *
 * Provides a form with:
 * - Name input with validation
 * - Type selector dropdown
 * - Values text area (JSON array or comma-separated)
 * - Save and Cancel buttons
 *
 * @module
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Typography,
  Paper,
  FormHelperText,
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';

import type { VariableEditorProps } from './variable-editor.types.ts';
import type { PlaygroundVariable } from '../variable-card/variable-card.types.ts';
import {
  validateVariableName,
  parseValues,
  formatValuesForInput,
  simpleTypeToValueType,
  valueTypeToSimpleType,
  getValuesPlaceholder,
} from './variable-editor.view-model.ts';

/**
 * Simple type options for the dropdown.
 */
type SimpleType = 'number' | 'string' | 'boolean';

/**
 * Props for the NameInput component.
 */
interface NameInputProps {
  readonly value: string;
  readonly error: string | null;
  readonly disabled: boolean;
  readonly onChange: (value: string) => void;
}

/**
 * Name input field with validation error display.
 *
 * @param props - The component props
 * @returns The rendered input
 */
function NameInput(props: NameInputProps): React.ReactElement {
  function handleChange(event: React.ChangeEvent<HTMLInputElement>): void {
    props.onChange(event.target.value);
  }

  return (
    <TextField
      label="Variable Name"
      value={props.value}
      onChange={handleChange}
      error={props.error !== null}
      helperText={props.error ?? 'Use letters, digits, and underscores. Must start with a letter.'}
      fullWidth
      autoFocus={!props.disabled}
      disabled={props.disabled}
      placeholder="e.g., score, user_name, value1"
      slotProps={{
        input: {
          startAdornment: (
            <Typography
              component="span"
              sx={{
                color: 'primary.main',
                fontFamily: '"Roboto Mono", monospace',
                mr: 0.5,
              }}
            >
              @
            </Typography>
          ),
        },
      }}
    />
  );
}

/**
 * Props for the TypeSelector component.
 */
interface TypeSelectorProps {
  readonly value: SimpleType;
  readonly onChange: (value: SimpleType) => void;
}

/**
 * Type dropdown selector.
 *
 * @param props - The component props
 * @returns The rendered selector
 */
function TypeSelector(props: TypeSelectorProps): React.ReactElement {
  function handleChange(event: SelectChangeEvent<SimpleType>): void {
    props.onChange(event.target.value as SimpleType);
  }

  return (
    <FormControl fullWidth>
      <InputLabel id="variable-type-label">Type</InputLabel>
      <Select
        labelId="variable-type-label"
        id="variable-type-select"
        value={props.value}
        label="Type"
        onChange={handleChange}
      >
        <MenuItem value="number">Number</MenuItem>
        <MenuItem value="string">String</MenuItem>
        <MenuItem value="boolean">Boolean</MenuItem>
      </Select>
      <FormHelperText>The data type for all values in this variable</FormHelperText>
    </FormControl>
  );
}

/**
 * Props for the ValuesInput component.
 */
interface ValuesInputProps {
  readonly value: string;
  readonly error: string | null;
  readonly placeholder: string;
  readonly onChange: (value: string) => void;
}

/**
 * Values text area input with validation error display.
 *
 * @param props - The component props
 * @returns The rendered input
 */
function ValuesInput(props: ValuesInputProps): React.ReactElement {
  function handleChange(event: React.ChangeEvent<HTMLInputElement>): void {
    props.onChange(event.target.value);
  }

  return (
    <TextField
      label="Values"
      value={props.value}
      onChange={handleChange}
      error={props.error !== null}
      helperText={
        props.error ?? 'Enter comma-separated values or a JSON array. Use "null" for null values.'
      }
      fullWidth
      multiline
      minRows={2}
      maxRows={6}
      placeholder={props.placeholder}
    />
  );
}

/**
 * Props for the ActionButtons component.
 */
interface ActionButtonsProps {
  readonly mode: 'add' | 'edit';
  readonly canSave: boolean;
  readonly onSave: () => void;
  readonly onCancel: () => void;
}

/**
 * Save and Cancel buttons.
 *
 * @param props - The component props
 * @returns The rendered buttons
 */
function ActionButtons(props: ActionButtonsProps): React.ReactElement {
  const saveLabel = props.mode === 'add' ? 'Add Variable' : 'Save Changes';

  return (
    <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1.5, mt: 1 }}>
      <Button onClick={props.onCancel} color="inherit">
        Cancel
      </Button>
      <Button onClick={props.onSave} variant="contained" disabled={!props.canSave}>
        {saveLabel}
      </Button>
    </Box>
  );
}

/**
 * VariableEditor provides a form for creating or editing test variables.
 *
 * Features:
 * - Name validation (valid identifier, no duplicates)
 * - Type selection (number, string, boolean)
 * - Values input with parsing and type validation
 * - Supports both JSON array and comma-separated formats
 *
 * @param props - The component props
 * @returns The rendered VariableEditor component
 *
 * @example
 * ```tsx
 * // Add mode
 * function AddVariable() {
 *   function handleSave(variable: PlaygroundVariable) {
 *     console.log('Adding variable:', variable);
 *   }
 *
 *   function handleCancel() {
 *     console.log('Cancelled');
 *   }
 *
 *   return (
 *     <VariableEditor
 *       mode="add"
 *       existingNames={['score', 'name']}
 *       onSave={handleSave}
 *       onCancel={handleCancel}
 *     />
 *   );
 * }
 *
 * // Edit mode
 * function EditVariable() {
 *   const variable: PlaygroundVariable = {
 *     name: 'score',
 *     type: 'number.float',
 *     values: [85, 92, 78],
 *   };
 *
 *   return (
 *     <VariableEditor
 *       mode="edit"
 *       variable={variable}
 *       existingNames={['score', 'name']}
 *       onSave={handleSave}
 *       onCancel={handleCancel}
 *     />
 *   );
 * }
 * ```
 */
export function VariableEditor(props: VariableEditorProps): React.ReactElement {
  const initialVariable = props.variable;
  const isEditMode = props.mode === 'edit';

  // Initialize state from props for edit mode
  const [name, setName] = useState(function getInitialName() {
    return initialVariable?.name ?? '';
  });

  const [simpleType, setSimpleType] = useState<SimpleType>(function getInitialType() {
    if (initialVariable) {
      return valueTypeToSimpleType(initialVariable.type);
    }
    return 'number';
  });

  const [valuesInput, setValuesInput] = useState(function getInitialValues() {
    if (initialVariable) {
      return formatValuesForInput(initialVariable.values);
    }
    return '';
  });

  // Track if fields have been touched for validation
  const [nameTouched, setNameTouched] = useState(false);
  const [valuesTouched, setValuesTouched] = useState(false);

  // Reset state when variable prop changes (for reuse in edit mode)
  useEffect(
    function resetOnVariableChange() {
      if (initialVariable) {
        setName(initialVariable.name);
        setSimpleType(valueTypeToSimpleType(initialVariable.type));
        setValuesInput(formatValuesForInput(initialVariable.values));
        setNameTouched(false);
        setValuesTouched(false);
      } else {
        setName('');
        setSimpleType('number');
        setValuesInput('');
        setNameTouched(false);
        setValuesTouched(false);
      }
    },
    [initialVariable],
  );

  // Compute ValueType from simple type
  const valueType = useMemo(
    function computeValueType() {
      return simpleTypeToValueType(simpleType);
    },
    [simpleType],
  );

  // Validate name
  const nameError = useMemo(
    function computeNameError() {
      if (!nameTouched && !isEditMode) {
        return null;
      }
      const currentName = isEditMode ? initialVariable?.name : undefined;
      return validateVariableName(name, props.existingNames, currentName);
    },
    [name, props.existingNames, nameTouched, isEditMode, initialVariable],
  );

  // Parse and validate values
  const valuesResult = useMemo(
    function computeValuesResult() {
      if (!valuesTouched && valuesInput === '') {
        return { success: false, error: undefined };
      }
      return parseValues(valuesInput, valueType);
    },
    [valuesInput, valueType, valuesTouched],
  );

  const valuesError = useMemo(
    function computeValuesError() {
      if (!valuesTouched && valuesInput === '' && !isEditMode) {
        return null;
      }
      if (valuesResult.success) {
        return null;
      }
      return valuesResult.error ?? null;
    },
    [valuesResult, valuesTouched, valuesInput, isEditMode],
  );

  // Get placeholder for current type
  const valuesPlaceholder = useMemo(
    function computePlaceholder() {
      return getValuesPlaceholder(valueType);
    },
    [valueType],
  );

  // Check if form can be saved
  const canSave = useMemo(
    function computeCanSave() {
      const trimmedName = name.trim();
      if (trimmedName === '') {
        return false;
      }

      const currentName = isEditMode ? initialVariable?.name : undefined;
      const nameValidationError = validateVariableName(
        trimmedName,
        props.existingNames,
        currentName,
      );
      if (nameValidationError !== null) {
        return false;
      }

      if (!valuesResult.success) {
        return false;
      }

      return true;
    },
    [name, props.existingNames, valuesResult, isEditMode, initialVariable],
  );

  function handleNameChange(value: string): void {
    setName(value);
    if (!nameTouched) {
      setNameTouched(true);
    }
  }

  function handleTypeChange(value: SimpleType): void {
    setSimpleType(value);
    // Re-validate values when type changes
    if (valuesInput !== '' && !valuesTouched) {
      setValuesTouched(true);
    }
  }

  function handleValuesChange(value: string): void {
    setValuesInput(value);
    if (!valuesTouched) {
      setValuesTouched(true);
    }
  }

  function handleSave(): void {
    if (!canSave || !valuesResult.success || valuesResult.values === undefined) {
      return;
    }

    const variable: PlaygroundVariable = {
      name: name.trim(),
      type: valueType,
      values: valuesResult.values,
    };

    props.onSave(variable);
  }

  function handleCancel(): void {
    props.onCancel();
  }

  const title = isEditMode ? 'Edit Variable' : 'Add Variable';

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2.5,
        border: 1,
        borderColor: 'divider',
        borderRadius: 1,
      }}
    >
      <Typography variant="h6" sx={{ mb: 2.5 }}>
        {title}
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
        <NameInput value={name} error={nameError} disabled={false} onChange={handleNameChange} />

        <TypeSelector value={simpleType} onChange={handleTypeChange} />

        <ValuesInput
          value={valuesInput}
          error={valuesError}
          placeholder={valuesPlaceholder}
          onChange={handleValuesChange}
        />

        <ActionButtons
          mode={props.mode}
          canSave={canSave}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      </Box>
    </Paper>
  );
}
