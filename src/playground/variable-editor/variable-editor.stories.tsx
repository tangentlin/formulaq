/**
 * Storybook stories for the VariableEditor component.
 *
 * Demonstrates various states and configurations of the VariableEditor:
 * - Add mode (empty form)
 * - Edit mode (pre-populated)
 * - Validation errors (invalid name, duplicate name, type mismatch)
 * - Various value formats
 *
 * @module
 */

import type { Meta, StoryObj } from '@storybook/react';
import { Box } from '@mui/material';
import React, { useState } from 'react';
import { fn, userEvent, within, expect } from '@storybook/test';

import { VariableEditor } from './variable-editor.tsx';
import type { VariableEditorProps } from './variable-editor.types.ts';
import type { PlaygroundVariable } from '../variable-card/variable-card.types.ts';

/**
 * Decorator that provides a container for the editor.
 *
 * @param Story - The story component to wrap
 * @returns The wrapped story with container
 */
function EditorContainerDecorator(Story: React.ComponentType): React.ReactElement {
  return (
    <Box sx={{ width: 400, p: 2 }}>
      <Story />
    </Box>
  );
}

const meta: Meta<typeof VariableEditor> = {
  title: 'Playground/variable-editor',
  component: VariableEditor,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'A form component for adding or editing test variables in the Playground. ' +
          'Supports name validation, type selection, and value parsing from JSON or comma-separated format.',
      },
    },
  },
  decorators: [EditorContainerDecorator],
  argTypes: {
    mode: {
      description: 'Whether adding a new variable or editing an existing one',
      control: 'radio',
      options: ['add', 'edit'],
    },
    variable: {
      description: 'The variable to edit (only used in edit mode)',
      control: 'object',
    },
    existingNames: {
      description: 'List of existing variable names to check for duplicates',
      control: 'object',
    },
    onSave: {
      description: 'Callback when the user saves the variable',
    },
    onCancel: {
      description: 'Callback when the user cancels',
    },
  },
  args: {
    onSave: fn(),
    onCancel: fn(),
    existingNames: [],
  },
};

export default meta;

type Story = StoryObj<typeof VariableEditor>;

/**
 * Add mode with empty form.
 * The user can create a new variable from scratch.
 */
export const AddMode: Story = {
  args: {
    mode: 'add',
    existingNames: ['score', 'name'],
  },
  parameters: {
    docs: {
      description: {
        story:
          'Empty form for adding a new variable. The name field is focused by default. ' +
          'Existing variable names are passed to prevent duplicates.',
      },
    },
  },
};

/**
 * Edit mode with pre-populated number variable.
 */
export const EditModeNumber: Story = {
  args: {
    mode: 'edit',
    variable: {
      name: 'score',
      type: 'number.float',
      values: [85, 92, 78, null, 95],
    } as PlaygroundVariable,
    existingNames: ['score', 'name', 'age'],
  },
  parameters: {
    docs: {
      description: {
        story:
          'Edit mode with a number variable pre-populated. ' +
          'The form shows the current values and allows modification.',
      },
    },
  },
};

/**
 * Edit mode with pre-populated string variable.
 */
export const EditModeString: Story = {
  args: {
    mode: 'edit',
    variable: {
      name: 'status',
      type: 'string.text',
      values: ['active', 'pending', null, 'completed'],
    } as PlaygroundVariable,
    existingNames: ['status', 'category'],
  },
  parameters: {
    docs: {
      description: {
        story: 'Edit mode with a string variable. String values are displayed with quotes.',
      },
    },
  },
};

/**
 * Edit mode with pre-populated boolean variable.
 */
export const EditModeBoolean: Story = {
  args: {
    mode: 'edit',
    variable: {
      name: 'isActive',
      type: 'boolean.boolean',
      values: [true, false, true, null],
    } as PlaygroundVariable,
    existingNames: ['isActive', 'hasData'],
  },
  parameters: {
    docs: {
      description: {
        story: 'Edit mode with a boolean variable. Boolean values are shown as true/false.',
      },
    },
  },
};

/**
 * Shows validation error for invalid name.
 */
export const ValidationErrorInvalidName: Story = {
  args: {
    mode: 'add',
    existingNames: [],
  },
  play: async function simulateInvalidName(context) {
    const canvas = within(context.canvasElement);
    const nameInput = canvas.getByLabelText(/variable name/i);

    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, '123invalid');
    await userEvent.tab();

    await expect(canvas.getByText(/must start with a letter/i)).toBeInTheDocument();
  },
  parameters: {
    docs: {
      description: {
        story:
          'Demonstrates validation error when the name starts with a digit. ' +
          'Names must start with a letter.',
      },
    },
  },
};

/**
 * Shows validation error for duplicate name.
 */
export const ValidationErrorDuplicateName: Story = {
  args: {
    mode: 'add',
    existingNames: ['score', 'name', 'age'],
  },
  play: async function simulateDuplicateName(context) {
    const canvas = within(context.canvasElement);
    const nameInput = canvas.getByLabelText(/variable name/i);

    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, 'score');
    await userEvent.tab();

    await expect(canvas.getByText(/already exists/i)).toBeInTheDocument();
  },
  parameters: {
    docs: {
      description: {
        story:
          'Demonstrates validation error when entering a name that already exists. ' +
          'Variable names must be unique.',
      },
    },
  },
};

/**
 * Shows validation error for type mismatch in values.
 */
export const ValidationErrorTypeMismatch: Story = {
  args: {
    mode: 'add',
    existingNames: [],
  },
  play: async function simulateTypeMismatch(context) {
    const canvas = within(context.canvasElement);
    const nameInput = canvas.getByLabelText(/variable name/i);
    const valuesInput = canvas.getByLabelText(/values/i);

    await userEvent.type(nameInput, 'myVar');
    // Type is 'number' by default
    await userEvent.type(valuesInput, 'hello, world');
    await userEvent.tab();

    await expect(canvas.getByText(/not a valid number/i)).toBeInTheDocument();
  },
  parameters: {
    docs: {
      description: {
        story:
          'Demonstrates validation error when values do not match the selected type. ' +
          'Here, string values are entered but the type is set to number.',
      },
    },
  },
};

/**
 * Shows validation error for name with spaces.
 */
export const ValidationErrorSpacesInName: Story = {
  args: {
    mode: 'add',
    existingNames: [],
  },
  play: async function simulateSpacesInName(context) {
    const canvas = within(context.canvasElement);
    const nameInput = canvas.getByLabelText(/variable name/i);

    await userEvent.type(nameInput, 'my variable');
    await userEvent.tab();

    await expect(canvas.getByText(/cannot contain spaces/i)).toBeInTheDocument();
  },
  parameters: {
    docs: {
      description: {
        story: 'Demonstrates validation error when the name contains spaces.',
      },
    },
  },
};

/**
 * Demonstrates comma-separated number values.
 */
export const CommaSeparatedNumbers: Story = {
  args: {
    mode: 'add',
    existingNames: [],
  },
  play: async function enterCommaSeparatedNumbers(context) {
    const canvas = within(context.canvasElement);
    const nameInput = canvas.getByLabelText(/variable name/i);
    const valuesInput = canvas.getByLabelText(/values/i);

    await userEvent.type(nameInput, 'measurements');
    await userEvent.type(valuesInput, '1.5, 2.7, 3.14, null, 5.0');
  },
  parameters: {
    docs: {
      description: {
        story:
          'Entering values in comma-separated format. ' +
          'Use "null" for null values. Decimals are supported.',
      },
    },
  },
};

/**
 * Demonstrates JSON array format.
 */
export const JsonArrayFormat: Story = {
  args: {
    mode: 'add',
    existingNames: [],
  },
  play: async function enterJsonArray(context) {
    const canvas = within(context.canvasElement);
    const nameInput = canvas.getByLabelText(/variable name/i);
    const valuesInput = canvas.getByLabelText(/values/i);

    await userEvent.type(nameInput, 'data');
    await userEvent.type(valuesInput, '[1, 2, null, 4, 5]');
  },
  parameters: {
    docs: {
      description: {
        story:
          'Entering values in JSON array format. ' +
          'This format is useful for copying from other sources.',
      },
    },
  },
};

/**
 * Demonstrates string values with quotes.
 */
export const StringValuesWithQuotes: Story = {
  args: {
    mode: 'add',
    existingNames: [],
  },
  play: async function enterStringValues(context) {
    const canvas = within(context.canvasElement);
    const nameInput = canvas.getByLabelText(/variable name/i);
    const typeSelect = canvas.getByLabelText(/type/i);
    const valuesInput = canvas.getByLabelText(/values/i);

    await userEvent.type(nameInput, 'names');
    await userEvent.click(typeSelect);
    const stringOption = canvas.getByRole('option', { name: /string/i });
    await userEvent.click(stringOption);
    await userEvent.type(valuesInput, '"Alice", "Bob", null, "Charlie"');
  },
  parameters: {
    docs: {
      description: {
        story:
          'String values can be entered with or without quotes. ' +
          'Quotes help distinguish values that contain commas.',
      },
    },
  },
};

/**
 * Demonstrates boolean values.
 */
export const BooleanValues: Story = {
  args: {
    mode: 'add',
    existingNames: [],
  },
  play: async function enterBooleanValues(context) {
    const canvas = within(context.canvasElement);
    const nameInput = canvas.getByLabelText(/variable name/i);
    const typeSelect = canvas.getByLabelText(/type/i);
    const valuesInput = canvas.getByLabelText(/values/i);

    await userEvent.type(nameInput, 'flags');
    await userEvent.click(typeSelect);
    const boolOption = canvas.getByRole('option', { name: /boolean/i });
    await userEvent.click(boolOption);
    await userEvent.type(valuesInput, 'true, false, null, true');
  },
  parameters: {
    docs: {
      description: {
        story:
          'Boolean values are entered as true/false (case-insensitive). ' +
          'Use null for missing values.',
      },
    },
  },
};

/**
 * Interactive demo that logs the saved variable.
 */
export const InteractiveDemo: Story = {
  args: {
    mode: 'add',
    existingNames: ['existing1', 'existing2'],
  },
  render: function InteractiveDemoRenderer(args: VariableEditorProps) {
    const [lastSaved, setLastSaved] = useState<PlaygroundVariable | null>(null);

    function handleSave(variable: PlaygroundVariable): void {
      setLastSaved(variable);
      args.onSave(variable);
    }

    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <VariableEditor
          mode={args.mode}
          variable={args.variable}
          existingNames={args.existingNames}
          onSave={handleSave}
          onCancel={args.onCancel}
        />
        {lastSaved !== null && (
          <Box
            sx={{
              p: 2,
              bgcolor: 'success.light',
              borderRadius: 1,
              fontFamily: 'monospace',
              fontSize: '0.875rem',
              whiteSpace: 'pre-wrap',
            }}
          >
            <strong>Saved Variable:</strong>
            {'\n'}
            {JSON.stringify(lastSaved, null, 2)}
          </Box>
        )}
      </Box>
    );
  },
  parameters: {
    docs: {
      description: {
        story:
          'Interactive demo that shows the saved variable data. ' +
          'Fill in the form and click "Add Variable" to see the result.',
      },
    },
  },
};

/**
 * Narrow container to test responsive layout.
 */
export const NarrowContainer: Story = {
  args: {
    mode: 'add',
    existingNames: [],
  },
  decorators: [
    function NarrowDecorator(Story: React.ComponentType): React.ReactElement {
      return (
        <Box sx={{ width: 280, p: 2 }}>
          <Story />
        </Box>
      );
    },
  ],
  parameters: {
    docs: {
      description: {
        story: 'The form adapts to narrow containers while remaining usable.',
      },
    },
  },
};

/**
 * Wide container showing full layout.
 */
export const WideContainer: Story = {
  args: {
    mode: 'edit',
    variable: {
      name: 'longVariableName',
      type: 'number.float',
      values: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    } as PlaygroundVariable,
    existingNames: [],
  },
  decorators: [
    function WideDecorator(Story: React.ComponentType): React.ReactElement {
      return (
        <Box sx={{ width: 600, p: 2 }}>
          <Story />
        </Box>
      );
    },
  ],
  parameters: {
    docs: {
      description: {
        story: 'In wider containers, the form fills available space.',
      },
    },
  },
};

/**
 * Edit mode allowing same name (not flagged as duplicate).
 */
export const EditModeSameName: Story = {
  args: {
    mode: 'edit',
    variable: {
      name: 'score',
      type: 'number.float',
      values: [85, 92],
    } as PlaygroundVariable,
    existingNames: ['score', 'name', 'age'],
  },
  parameters: {
    docs: {
      description: {
        story:
          'In edit mode, keeping the same name is allowed. ' +
          'Only changing to another existing name triggers the duplicate error.',
      },
    },
  },
};

/**
 * Invalid JSON format error.
 */
export const InvalidJsonFormat: Story = {
  args: {
    mode: 'add',
    existingNames: [],
  },
  play: async function simulateInvalidJson(context) {
    const canvas = within(context.canvasElement);
    const nameInput = canvas.getByLabelText(/variable name/i);
    const valuesInput = canvas.getByLabelText(/values/i);

    await userEvent.type(nameInput, 'data');
    await userEvent.type(valuesInput, '[1, 2, 3'); // Missing closing bracket

    await expect(canvas.getByText(/invalid json/i)).toBeInTheDocument();
  },
  parameters: {
    docs: {
      description: {
        story: 'Shows error when JSON array syntax is invalid (e.g., missing closing bracket).',
      },
    },
  },
};

/**
 * Empty values error.
 */
export const EmptyValuesError: Story = {
  args: {
    mode: 'add',
    existingNames: [],
  },
  play: async function simulateEmptyValues(context) {
    const canvas = within(context.canvasElement);
    const nameInput = canvas.getByLabelText(/variable name/i);
    const valuesInput = canvas.getByLabelText(/values/i);

    await userEvent.type(nameInput, 'emptyVar');
    await userEvent.type(valuesInput, '[]');

    await expect(canvas.getByText(/at least one value/i)).toBeInTheDocument();
  },
  parameters: {
    docs: {
      description: {
        story: 'Variables must have at least one value. Empty arrays are not allowed.',
      },
    },
  },
};
