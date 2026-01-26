/**
 * Storybook stories for the VariablePanel component.
 *
 * Demonstrates various states and configurations of the VariablePanel:
 * - With variables (various types)
 * - Empty state
 * - Many variables (scrolling)
 * - With editor dialog open (add mode)
 * - With editor dialog open (edit mode)
 *
 * @module
 */

import type { Meta, StoryObj } from '@storybook/react';
import { Box } from '@mui/material';
import React, { useState } from 'react';
import { fn, userEvent, within, expect } from '@storybook/test';

import { VariablePanel } from './variable-panel.tsx';
import type { VariablePanelProps } from './variable-panel.types.ts';
import type { PlaygroundVariable } from '../variable-card/variable-card.types.ts';

/**
 * Decorator that provides a container with fixed height for the panel.
 *
 * @param Story - The story component to wrap
 * @returns The wrapped story with container
 */
function PanelContainerDecorator(Story: React.ComponentType): React.ReactElement {
  return (
    <Box
      sx={{
        width: 320,
        height: 500,
        border: 1,
        borderColor: 'divider',
        borderRadius: 1,
        overflow: 'hidden',
      }}
    >
      <Story />
    </Box>
  );
}

/**
 * Sample variables for stories.
 */
const sampleVariables: PlaygroundVariable[] = [
  {
    name: 'price',
    type: 'number.float',
    values: [10.5, 20.0, 30.75, null, 50.0],
  },
  {
    name: 'quantity',
    type: 'number.integer',
    values: [1, 2, 3, 4, 5],
  },
  {
    name: 'status',
    type: 'string.text',
    values: ['active', 'pending', 'completed'],
  },
];

/**
 * Many variables for scroll testing.
 */
const manyVariables: PlaygroundVariable[] = [
  { name: 'price', type: 'number.float', values: [10.5, 20.0, 30.75] },
  { name: 'quantity', type: 'number.integer', values: [1, 2, 3, 4, 5] },
  { name: 'status', type: 'string.text', values: ['active', 'pending'] },
  { name: 'isActive', type: 'boolean.boolean', values: [true, false, true] },
  { name: 'score', type: 'number.float', values: [85.5, 92.0, 78.25] },
  { name: 'category', type: 'string.text', values: ['A', 'B', 'C', 'D'] },
  { name: 'count', type: 'number.integer', values: [100, 200, 300] },
  { name: 'enabled', type: 'boolean.boolean', values: [true, true, false] },
  { name: 'rating', type: 'number.float', values: [4.5, 3.8, 4.9, 4.2] },
  { name: 'label', type: 'string.text', values: ['First', 'Second', 'Third'] },
];

const meta: Meta<typeof VariablePanel> = {
  title: 'Playground/variable-panel',
  component: VariablePanel,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'A panel component for displaying and managing test variables in the Playground. ' +
          'Shows a scrollable list of VariableCards with add, edit, and delete functionality.',
      },
    },
  },
  decorators: [PanelContainerDecorator],
  argTypes: {
    variables: {
      description: 'The list of variables to display',
      control: 'object',
    },
    onAddVariable: {
      description: 'Callback when a new variable is added',
    },
    onEditVariable: {
      description: 'Callback when an existing variable is edited',
    },
    onDeleteVariable: {
      description: 'Callback when a variable is deleted',
    },
  },
  args: {
    onAddVariable: fn(),
    onEditVariable: fn(),
    onDeleteVariable: fn(),
  },
};

export default meta;

type Story = StoryObj<typeof VariablePanel>;

/**
 * Panel with several variables of different types.
 */
export const WithVariables: Story = {
  args: {
    variables: sampleVariables,
  },
  parameters: {
    docs: {
      description: {
        story:
          'The panel displays a list of variables with different types. ' +
          'Each card shows the variable name, type badge, and value preview.',
      },
    },
  },
};

/**
 * Empty state when no variables are defined.
 */
export const EmptyState: Story = {
  args: {
    variables: [],
  },
  parameters: {
    docs: {
      description: {
        story:
          'When no variables are defined, the panel shows an empty state message ' +
          'with a button to add the first variable.',
      },
    },
  },
};

/**
 * Many variables to test scrolling behavior.
 */
export const ManyVariables: Story = {
  args: {
    variables: manyVariables,
  },
  parameters: {
    docs: {
      description: {
        story:
          'When there are many variables, the list becomes scrollable. ' +
          'The header with the add button remains fixed at the top.',
      },
    },
  },
};

/**
 * Opens the editor dialog in add mode.
 */
export const AddModeDialogOpen: Story = {
  args: {
    variables: sampleVariables,
  },
  play: async function openAddDialog(context) {
    const canvas = within(context.canvasElement);
    const addButton = canvas.getByRole('button', { name: /add/i });

    await userEvent.click(addButton);

    // Wait for dialog to open
    const dialog = await within(document.body).findByRole('dialog');
    await expect(dialog).toBeInTheDocument();
    await expect(within(dialog).getByText(/add variable/i)).toBeInTheDocument();
  },
  parameters: {
    docs: {
      description: {
        story:
          'Clicking the "+ Add" button opens the VariableEditor dialog in add mode. ' +
          'The form is empty and ready for input.',
      },
    },
  },
};

/**
 * Opens the editor dialog in edit mode.
 */
export const EditModeDialogOpen: Story = {
  args: {
    variables: sampleVariables,
  },
  play: async function openEditDialog(context) {
    const canvas = within(context.canvasElement);

    // Find and hover over the first variable card to reveal the edit button
    const firstCard = canvas.getByText(/@price/i).closest('[class*="MuiCard"]');
    if (firstCard) {
      await userEvent.hover(firstCard);
    }

    // Click the edit button
    const editButton = canvas.getByLabelText(/edit variable/i);
    await userEvent.click(editButton);

    // Wait for dialog to open
    const dialog = await within(document.body).findByRole('dialog');
    await expect(dialog).toBeInTheDocument();
    await expect(within(dialog).getByText(/edit variable/i)).toBeInTheDocument();
  },
  parameters: {
    docs: {
      description: {
        story:
          'Clicking the edit button on a variable card opens the VariableEditor dialog ' +
          'in edit mode with the variable data pre-populated.',
      },
    },
  },
};

/**
 * Interactive demo with state management.
 */
export const InteractiveDemo: Story = {
  args: {
    variables: [],
  },
  render: function InteractiveDemoRenderer(args: VariablePanelProps) {
    const [variables, setVariables] = useState<PlaygroundVariable[]>([
      { name: 'score', type: 'number.float', values: [85, 92, 78] },
      { name: 'name', type: 'string.text', values: ['Alice', 'Bob'] },
    ]);

    function handleAddVariable(variable: PlaygroundVariable): void {
      setVariables(function addVariable(prev) {
        return [...prev, variable];
      });
      args.onAddVariable(variable);
    }

    function handleEditVariable(variable: PlaygroundVariable): void {
      setVariables(function updateVariable(prev) {
        return prev.map(function mapVariable(v) {
          return v.name === variable.name ? variable : v;
        });
      });
      args.onEditVariable(variable);
    }

    function handleDeleteVariable(name: string): void {
      setVariables(function removeVariable(prev) {
        return prev.filter(function filterVariable(v) {
          return v.name !== name;
        });
      });
      args.onDeleteVariable(name);
    }

    return (
      <VariablePanel
        variables={variables}
        onAddVariable={handleAddVariable}
        onEditVariable={handleEditVariable}
        onDeleteVariable={handleDeleteVariable}
      />
    );
  },
  parameters: {
    docs: {
      description: {
        story:
          'Fully interactive demo where you can add, edit, and delete variables. ' +
          'Changes are reflected immediately in the panel.',
      },
    },
  },
};

/**
 * Add variable from empty state.
 */
export const AddFromEmptyState: Story = {
  args: {
    variables: [],
  },
  play: async function clickEmptyStateAdd(context) {
    const canvas = within(context.canvasElement);

    // Click the add button in the empty state
    const addButton = canvas.getByRole('button', { name: /add variable/i });
    await userEvent.click(addButton);

    // Verify dialog opened
    const dialog = await within(document.body).findByRole('dialog');
    await expect(dialog).toBeInTheDocument();
  },
  parameters: {
    docs: {
      description: {
        story:
          'The empty state includes a prominent "Add Variable" button that opens ' +
          'the editor dialog, same as the header button.',
      },
    },
  },
};

/**
 * Narrow panel to test responsive behavior.
 */
export const NarrowPanel: Story = {
  args: {
    variables: sampleVariables,
  },
  decorators: [
    function NarrowDecorator(Story: React.ComponentType): React.ReactElement {
      return (
        <Box
          sx={{
            width: 240,
            height: 400,
            border: 1,
            borderColor: 'divider',
            borderRadius: 1,
            overflow: 'hidden',
          }}
        >
          <Story />
        </Box>
      );
    },
  ],
  parameters: {
    docs: {
      description: {
        story: 'The panel adapts to narrow widths by truncating content appropriately.',
      },
    },
  },
};

/**
 * Tall panel with many variables.
 */
export const TallPanel: Story = {
  args: {
    variables: manyVariables,
  },
  decorators: [
    function TallDecorator(Story: React.ComponentType): React.ReactElement {
      return (
        <Box
          sx={{
            width: 320,
            height: 700,
            border: 1,
            borderColor: 'divider',
            borderRadius: 1,
            overflow: 'hidden',
          }}
        >
          <Story />
        </Box>
      );
    },
  ],
  parameters: {
    docs: {
      description: {
        story: 'In a taller container, more variables are visible without scrolling.',
      },
    },
  },
};

/**
 * Single variable in the list.
 */
export const SingleVariable: Story = {
  args: {
    variables: [
      {
        name: 'value',
        type: 'number.float',
        values: [1, 2, 3, 4, 5],
      },
    ],
  },
  parameters: {
    docs: {
      description: {
        story: 'Panel with just one variable, showing the minimal list state.',
      },
    },
  },
};

/**
 * Variables with all types represented.
 */
export const AllTypes: Story = {
  args: {
    variables: [
      { name: 'floatValue', type: 'number.float', values: [1.5, 2.7, 3.14] },
      { name: 'intValue', type: 'number.integer', values: [1, 2, 3] },
      { name: 'textValue', type: 'string.text', values: ['a', 'b', 'c'] },
      { name: 'boolValue', type: 'boolean.boolean', values: [true, false] },
    ],
  },
  parameters: {
    docs: {
      description: {
        story: 'Panel showing variables of all supported types with their respective type badges.',
      },
    },
  },
};

/**
 * Variables with null values.
 */
export const WithNullValues: Story = {
  args: {
    variables: [
      { name: 'data', type: 'number.float', values: [10, null, 30, null, 50] },
      { name: 'names', type: 'string.text', values: ['Alice', null, 'Charlie'] },
    ],
  },
  parameters: {
    docs: {
      description: {
        story: 'Variables containing null values are displayed with null indicators.',
      },
    },
  },
};
