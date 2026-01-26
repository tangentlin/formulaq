/**
 * Storybook stories for the Playground component.
 *
 * Demonstrates the complete Playground component with various configurations:
 * - Default (empty)
 * - With initial variables
 * - With initial formula
 * - Complete example (variables + valid formula + results)
 * - Responsive preview
 *
 * @module
 */

import type { Meta, StoryObj } from '@storybook/react';
import { Box, Typography } from '@mui/material';
import React from 'react';
import { within, userEvent, expect, waitFor } from '@storybook/test';

import { Playground } from './playground.tsx';
import type { PlaygroundProps } from './playground.types.ts';
import type { PlaygroundVariable } from '../variable-card/variable-card.types.ts';

// =============================================================================
// Sample Data
// =============================================================================

/**
 * Sample variables for testing basic numeric calculations.
 */
const numericVariables: PlaygroundVariable[] = [
  {
    name: 'price',
    type: 'number.float',
    values: [100, 200, 300, 150, 250],
  },
  {
    name: 'tax_rate',
    type: 'number.float',
    values: [0.1, 0.1, 0.08, 0.12, 0.1],
  },
  {
    name: 'quantity',
    type: 'number.integer',
    values: [1, 2, 3, 4, 5],
  },
];

/**
 * Sample variables of various types.
 */
const mixedTypeVariables: PlaygroundVariable[] = [
  {
    name: 'score',
    type: 'number.float',
    values: [85, 92, 78, null, 95],
  },
  {
    name: 'name',
    type: 'string.text',
    values: ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve'],
  },
  {
    name: 'passed',
    type: 'boolean.boolean',
    values: [true, true, false, false, true],
  },
];

/**
 * Large set of variables for stress testing.
 */
const manyVariables: PlaygroundVariable[] = [
  { name: 'value_a', type: 'number.float', values: [1, 2, 3, 4, 5] },
  { name: 'value_b', type: 'number.float', values: [10, 20, 30, 40, 50] },
  { name: 'value_c', type: 'number.integer', values: [100, 200, 300, 400, 500] },
  { name: 'ratio', type: 'number.float', values: [0.1, 0.2, 0.3, 0.4, 0.5] },
  { name: 'label', type: 'string.text', values: ['A', 'B', 'C', 'D', 'E'] },
  { name: 'active', type: 'boolean.boolean', values: [true, false, true, false, true] },
];

// =============================================================================
// Decorators
// =============================================================================

/**
 * Decorator providing a full-height container for the playground.
 */
function FullHeightDecorator(Story: React.ComponentType): React.ReactElement {
  return (
    <Box
      sx={{
        width: '100%',
        height: 600,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Story />
    </Box>
  );
}

/**
 * Decorator for tablet viewport simulation.
 */
function TabletDecorator(Story: React.ComponentType): React.ReactElement {
  return (
    <Box
      sx={{
        width: 768,
        height: 700,
        margin: '0 auto',
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
 * Decorator for mobile viewport simulation.
 */
function MobileDecorator(Story: React.ComponentType): React.ReactElement {
  return (
    <Box
      sx={{
        width: 375,
        height: 800,
        margin: '0 auto',
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

// =============================================================================
// Story Configuration
// =============================================================================

const meta: Meta<typeof Playground> = {
  title: 'Playground/playground',
  component: Playground,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'The Playground component provides a complete formula testing environment. ' +
          'It combines three panels: Variables (left), Formula Editor (center), and ' +
          'Results (right). The layout is responsive and adapts to different screen sizes.',
      },
    },
  },
  decorators: [FullHeightDecorator],
  argTypes: {
    initialVariables: {
      description: 'Initial test variables to populate the playground',
      control: 'object',
    },
    initialFormula: {
      description: 'Initial formula string to populate the editor',
      control: 'text',
    },
    title: {
      description: 'Title displayed in the playground header',
      control: 'text',
    },
  },
};

export default meta;

type Story = StoryObj<typeof Playground>;

// =============================================================================
// Basic Stories
// =============================================================================

/**
 * Default empty playground.
 */
export const Default: Story = {
  args: {},
  parameters: {
    docs: {
      description: {
        story:
          'Empty playground ready for input. Add variables using the left panel, ' +
          'then write a formula to see results.',
      },
    },
  },
};

/**
 * Playground with initial variables only.
 */
export const WithInitialVariables: Story = {
  args: {
    initialVariables: numericVariables,
  },
  parameters: {
    docs: {
      description: {
        story:
          'Playground initialized with test variables. The variables are ready for ' +
          'use in the formula editor. Try typing @price to see autocomplete.',
      },
    },
  },
};

/**
 * Playground with initial formula only (will show validation error).
 */
export const WithInitialFormula: Story = {
  args: {
    initialFormula: '@score * 2',
  },
  parameters: {
    docs: {
      description: {
        story:
          'Playground with an initial formula but no variables. The formula will show ' +
          'a validation error because @score is not defined. Add the variable to fix it.',
      },
    },
  },
};

/**
 * Complete example with variables, formula, and results.
 */
export const CompleteExample: Story = {
  args: {
    initialVariables: numericVariables,
    initialFormula: '@price * (1 + @tax_rate)',
  },
  parameters: {
    docs: {
      description: {
        story:
          'A complete working example. The formula calculates price with tax. ' +
          'Results are shown in the right panel after validation.',
      },
    },
  },
};

/**
 * Playground with a custom title.
 */
export const WithCustomTitle: Story = {
  args: {
    title: 'Price Calculator',
    initialVariables: numericVariables,
    initialFormula: '@price * @quantity',
  },
  parameters: {
    docs: {
      description: {
        story: 'The playground header can be customized with a different title.',
      },
    },
  },
};

// =============================================================================
// Variable Type Stories
// =============================================================================

/**
 * Playground with mixed variable types.
 */
export const MixedTypes: Story = {
  args: {
    initialVariables: mixedTypeVariables,
    initialFormula: 'IF(@passed, @score, 0)',
  },
  parameters: {
    docs: {
      description: {
        story:
          'Demonstrates different variable types: number, string, and boolean. ' +
          'The formula uses a conditional to filter scores based on pass status.',
      },
    },
  },
};

/**
 * Playground with null values in variables.
 */
export const WithNullValues: Story = {
  args: {
    initialVariables: [
      {
        name: 'data',
        type: 'number.float',
        values: [10, null, 30, null, 50],
      },
    ],
    initialFormula: 'IFNULL(@data, 0)',
  },
  parameters: {
    docs: {
      description: {
        story:
          'Variables can contain null values. Use IFNULL to handle them gracefully. ' +
          'Null values propagate through most operations unless explicitly handled.',
      },
    },
  },
};

// =============================================================================
// Formula Type Stories
// =============================================================================

/**
 * Playground demonstrating aggregation functions.
 */
export const AggregationFunctions: Story = {
  args: {
    initialVariables: [
      {
        name: 'values',
        type: 'number.float',
        values: [10, 20, 30, 40, 50, 60, 70, 80, 90, 100],
      },
    ],
    initialFormula: '@values - AVG(@values)',
  },
  parameters: {
    docs: {
      description: {
        story:
          'Aggregation functions like AVG, SUM, MIN, MAX compute a single value from all rows. ' +
          'This formula shows the deviation from average for each value.',
      },
    },
  },
};

/**
 * Playground demonstrating logical functions.
 */
export const LogicalFunctions: Story = {
  args: {
    initialVariables: mixedTypeVariables,
    initialFormula: 'IF(@score >= 80, "A", IF(@score >= 60, "B", "C"))',
  },
  parameters: {
    docs: {
      description: {
        story:
          'Logical functions (IF, AND, OR, NOT) enable conditional logic. ' +
          'This example assigns letter grades based on numeric scores.',
      },
    },
  },
};

/**
 * Playground demonstrating complex formulas.
 */
export const ComplexFormula: Story = {
  args: {
    initialVariables: numericVariables,
    initialFormula:
      '(@price * @quantity * (1 + @tax_rate)) - (AVG(@price) * PERCENTILE(@quantity, 50))',
  },
  parameters: {
    docs: {
      description: {
        story:
          'Complex formulas can combine multiple operators, functions, and aggregations. ' +
          'This example calculates adjusted revenue relative to median quantity.',
      },
    },
  },
};

// =============================================================================
// Responsive Preview Stories
// =============================================================================

/**
 * Tablet viewport preview.
 */
export const TabletViewport: Story = {
  args: {
    initialVariables: numericVariables,
    initialFormula: '@price * @quantity',
  },
  decorators: [TabletDecorator],
  parameters: {
    docs: {
      description: {
        story:
          'On tablet-sized screens, the variables panel moves to the top and ' +
          'the editor + results split horizontally below.',
      },
    },
  },
};

/**
 * Mobile viewport preview.
 */
export const MobileViewport: Story = {
  args: {
    initialVariables: numericVariables,
    initialFormula: '@price * 2',
  },
  decorators: [MobileDecorator],
  parameters: {
    docs: {
      description: {
        story:
          'On mobile screens, all panels stack vertically. Each panel can be ' +
          'scrolled independently.',
      },
    },
  },
};

// =============================================================================
// Interactive Stories
// =============================================================================

/**
 * Interactive story demonstrating the add variable workflow.
 */
export const AddVariableWorkflow: Story = {
  args: {},
  play: async function addVariablePlay(context) {
    const canvas = within(context.canvasElement);

    // Wait for the playground to render
    await waitFor(
      function waitForPlayground() {
        expect(canvas.getByText('Variables')).toBeInTheDocument();
      },
      { timeout: 5000 },
    );

    // Click the Add button in the empty state
    const addButton = canvas.getByRole('button', { name: /add variable/i });
    await userEvent.click(addButton);

    // Wait for the dialog to open
    const dialog = await within(document.body).findByRole('dialog');
    expect(dialog).toBeInTheDocument();
  },
  parameters: {
    docs: {
      description: {
        story:
          'Demonstrates the workflow for adding a new variable. ' +
          'Click the Add button to open the variable editor dialog.',
      },
    },
  },
};

/**
 * Interactive story demonstrating formula validation.
 */
export const FormulaValidationWorkflow: Story = {
  args: {
    initialVariables: numericVariables,
  },
  play: async function validationPlay(context) {
    const canvas = within(context.canvasElement);

    // Wait for the editor to be ready
    await waitFor(
      function waitForEditor() {
        expect(canvas.getByText('Formula')).toBeInTheDocument();
      },
      { timeout: 5000 },
    );

    // Find the editor and type a formula
    const editorContent = canvas.getByRole('textbox');
    await userEvent.click(editorContent);
    await userEvent.type(editorContent, '@price * 2');

    // Wait for validation
    await waitFor(
      function waitForValidation() {
        expect(canvas.getByText(/formula is valid/i)).toBeInTheDocument();
      },
      { timeout: 5000 },
    );
  },
  parameters: {
    docs: {
      description: {
        story:
          'Demonstrates typing a formula and seeing validation results. ' +
          'The formula is validated automatically after a short debounce period.',
      },
    },
  },
};

/**
 * Interactive story demonstrating full workflow.
 */
export const FullWorkflow: Story = {
  args: {
    initialVariables: [
      {
        name: 'x',
        type: 'number.float',
        values: [1, 2, 3, 4, 5],
      },
    ],
  },
  play: async function fullWorkflowPlay(context) {
    const canvas = within(context.canvasElement);

    // Wait for the playground to render
    await waitFor(
      function waitForPlayground() {
        expect(canvas.getByText('Variables')).toBeInTheDocument();
      },
      { timeout: 5000 },
    );

    // Find and click on the editor
    const editorContent = canvas.getByRole('textbox');
    await userEvent.click(editorContent);

    // Type a formula
    await userEvent.type(editorContent, '@x * 10');

    // Wait for results to appear
    await waitFor(
      function waitForResults() {
        // Check that at least one result value is shown
        const resultCells = canvas.getAllByRole('cell');
        expect(resultCells.length).toBeGreaterThan(0);
      },
      { timeout: 5000 },
    );
  },
  parameters: {
    docs: {
      description: {
        story:
          'Complete end-to-end workflow: starting with a variable, ' +
          'entering a formula, and seeing computed results.',
      },
    },
  },
};

// =============================================================================
// Edge Case Stories
// =============================================================================

/**
 * Playground with many variables.
 */
export const ManyVariables: Story = {
  args: {
    initialVariables: manyVariables,
    initialFormula: '@value_a + @value_b',
  },
  parameters: {
    docs: {
      description: {
        story:
          'The variables panel scrolls when there are many variables. ' +
          'Performance remains good even with many variables.',
      },
    },
  },
};

/**
 * Playground with long variable names.
 */
export const LongVariableNames: Story = {
  args: {
    initialVariables: [
      {
        name: 'this_is_a_very_long_variable_name',
        type: 'number.float',
        values: [1, 2, 3],
      },
      {
        name: 'another_extremely_lengthy_name',
        type: 'string.text',
        values: ['a', 'b', 'c'],
      },
    ],
  },
  parameters: {
    docs: {
      description: {
        story: 'Long variable names are truncated appropriately in the UI.',
      },
    },
  },
};

/**
 * Playground with many rows of data.
 */
export const ManyRows: Story = {
  args: {
    initialVariables: [
      {
        name: 'index',
        type: 'number.integer',
        values: Array.from({ length: 100 }, function generateIndex(_, i) {
          return i + 1;
        }),
      },
    ],
    initialFormula: '@index * 2',
  },
  parameters: {
    docs: {
      description: {
        story:
          'The results panel scrolls when there are many result rows. ' +
          'Statistics are calculated across all rows.',
      },
    },
  },
};

// =============================================================================
// Customization Stories
// =============================================================================

/**
 * Playground showing all features together.
 */
export const AllFeatures: Story = {
  args: {
    title: 'Formula Workbench',
    initialVariables: [
      { name: 'revenue', type: 'number.float', values: [1000, 2000, 1500, 3000, 2500] },
      { name: 'cost', type: 'number.float', values: [400, 800, 600, 1200, 1000] },
      {
        name: 'region',
        type: 'string.text',
        values: ['North', 'South', 'East', 'West', 'Central'],
      },
      { name: 'active', type: 'boolean.boolean', values: [true, true, false, true, true] },
    ],
    initialFormula: 'IF(@active, @revenue - @cost, 0)',
  },
  render: function AllFeaturesRender(args: PlaygroundProps) {
    return (
      <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ p: 2, backgroundColor: 'grey.100', borderBottom: 1, borderColor: 'divider' }}>
          <Typography variant="body2" color="text.secondary">
            This example shows all Playground features: multiple variable types, a conditional
            formula with aggregations, and full results display.
          </Typography>
        </Box>
        <Box sx={{ flex: 1 }}>
          <Playground {...args} />
        </Box>
      </Box>
    );
  },
  parameters: {
    docs: {
      description: {
        story:
          'A comprehensive example showcasing multiple variable types, conditional logic, ' +
          'and the full result display with statistics.',
      },
    },
  },
};

/**
 * Playground in a constrained container.
 */
export const ConstrainedContainer: Story = {
  args: {
    initialVariables: numericVariables,
    initialFormula: '@price + @quantity',
  },
  render: function ConstrainedRender(args: PlaygroundProps) {
    return (
      <Box
        sx={{
          width: 900,
          height: 450,
          margin: '0 auto',
          border: 2,
          borderColor: 'primary.main',
          borderRadius: 2,
        }}
      >
        <Playground {...args} />
      </Box>
    );
  },
  parameters: {
    docs: {
      description: {
        story:
          'The Playground adapts to its container size. Here it is shown in a ' +
          'constrained 900x450 container.',
      },
    },
  },
};

// =============================================================================
// Play Function Stories (End-to-End Interaction Tests)
// =============================================================================

/**
 * Interactive test: Add a variable through the form, fill it, save it, and verify it appears.
 */
export const AddVariableComplete: Story = {
  args: {},
  play: async function playAddVariableComplete(context) {
    const canvas = within(context.canvasElement);

    // Wait for the playground to render
    await waitFor(
      function waitForPlayground() {
        expect(canvas.getByText('Variables')).toBeInTheDocument();
      },
      { timeout: 5000 },
    );

    // Click the Add button in the empty state
    const addButton = canvas.getByRole('button', { name: /add variable/i });
    await userEvent.click(addButton);

    // Wait for the dialog to open
    const dialogContainer = within(document.body);
    await waitFor(
      function waitForDialog() {
        expect(dialogContainer.getByRole('dialog')).toBeInTheDocument();
      },
      { timeout: 5000 },
    );

    // Fill in the variable name
    const nameInput = dialogContainer.getByLabelText(/name/i);
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, 'test_var');

    // Fill in the values
    const valuesInput = dialogContainer.getByLabelText(/values/i);
    await userEvent.clear(valuesInput);
    await userEvent.type(valuesInput, '1, 2, 3, 4, 5');

    // Click Save button
    const saveButton = dialogContainer.getByRole('button', { name: /save/i });
    await userEvent.click(saveButton);

    // Wait for the dialog to close and verify the variable card appears
    await waitFor(
      function checkVariableCardAppears() {
        expect(canvas.getByText('@test_var')).toBeInTheDocument();
      },
      { timeout: 5000 },
    );
  },
  parameters: {
    docs: {
      description: {
        story:
          'End-to-end test: Clicks Add, fills out the variable form, saves it, ' +
          'and verifies the variable card appears in the panel.',
      },
    },
  },
};

/**
 * Interactive test: Enter a formula and verify results appear.
 */
export const EnterFormulaTest: Story = {
  args: {
    initialVariables: numericVariables,
  },
  play: async function playEnterFormula(context) {
    const canvas = within(context.canvasElement);

    // Wait for the playground to render
    await waitFor(
      function waitForPlayground() {
        expect(canvas.getByText('Variables')).toBeInTheDocument();
      },
      { timeout: 5000 },
    );

    // Find the editor and type a formula
    const editorContent = canvas.getByRole('textbox');
    await userEvent.click(editorContent);
    await userEvent.type(editorContent, '@price * @quantity');

    // Wait for validation to pass
    await waitFor(
      function checkValidation() {
        expect(canvas.getByText(/formula is valid/i)).toBeInTheDocument();
      },
      { timeout: 5000 },
    );

    // Wait for results to appear in the results panel
    await waitFor(
      function checkResultsAppear() {
        // The results table should have cells with computed values
        const resultCells = canvas.getAllByRole('cell');
        expect(resultCells.length).toBeGreaterThan(0);
      },
      { timeout: 5000 },
    );
  },
  parameters: {
    docs: {
      description: {
        story:
          'End-to-end test: Types a formula in the editor and verifies ' +
          'that results appear in the results panel.',
      },
    },
  },
};

/**
 * Interactive test: Edit an existing variable.
 */
export const EditVariableTest: Story = {
  args: {
    initialVariables: [
      {
        name: 'original',
        type: 'number.float',
        values: [10, 20, 30],
      },
    ],
  },
  play: async function playEditVariable(context) {
    const canvas = within(context.canvasElement);

    // Wait for the playground to render
    await waitFor(
      function waitForPlayground() {
        expect(canvas.getByText('@original')).toBeInTheDocument();
      },
      { timeout: 5000 },
    );

    // Find and click the edit button on the variable card
    const editButtons = canvas.getAllByRole('button', { name: /edit/i });
    const editButton = editButtons[0];
    if (editButton === undefined) {
      throw new Error('Edit button not found');
    }
    await userEvent.click(editButton);

    // Wait for the dialog to open
    const dialogContainer = within(document.body);
    await waitFor(
      function waitForDialog() {
        expect(dialogContainer.getByRole('dialog')).toBeInTheDocument();
      },
      { timeout: 5000 },
    );

    // Modify the values
    const valuesInput = dialogContainer.getByLabelText(/values/i);
    await userEvent.clear(valuesInput);
    await userEvent.type(valuesInput, '100, 200, 300');

    // Click Save button
    const saveButton = dialogContainer.getByRole('button', { name: /save/i });
    await userEvent.click(saveButton);

    // Wait for the dialog to close
    await waitFor(
      function checkDialogClosed() {
        expect(dialogContainer.queryByRole('dialog')).not.toBeInTheDocument();
      },
      { timeout: 5000 },
    );

    // The variable card should still exist
    expect(canvas.getByText('@original')).toBeInTheDocument();
  },
  parameters: {
    docs: {
      description: {
        story:
          'End-to-end test: Clicks edit on a variable card, modifies the values, ' +
          'saves the changes, and verifies the dialog closes.',
      },
    },
  },
};

/**
 * Interactive test: Delete a variable.
 */
export const DeleteVariableTest: Story = {
  args: {
    initialVariables: [
      {
        name: 'to_delete',
        type: 'number.float',
        values: [1, 2, 3],
      },
      {
        name: 'to_keep',
        type: 'number.float',
        values: [4, 5, 6],
      },
    ],
  },
  play: async function playDeleteVariable(context) {
    const canvas = within(context.canvasElement);

    // Wait for both variables to appear
    await waitFor(
      function waitForVariables() {
        expect(canvas.getByText('@to_delete')).toBeInTheDocument();
        expect(canvas.getByText('@to_keep')).toBeInTheDocument();
      },
      { timeout: 5000 },
    );

    // Find the delete button for the first variable
    const deleteButtons = canvas.getAllByRole('button', { name: /delete/i });
    const deleteButton = deleteButtons[0];
    if (deleteButton === undefined) {
      throw new Error('Delete button not found');
    }
    await userEvent.click(deleteButton);

    // Wait for the confirmation dialog to appear (if there is one)
    // or wait for the variable to be removed
    await waitFor(
      function checkVariableRemoved() {
        expect(canvas.queryByText('@to_delete')).not.toBeInTheDocument();
      },
      { timeout: 5000 },
    );

    // The other variable should still exist
    expect(canvas.getByText('@to_keep')).toBeInTheDocument();
  },
  parameters: {
    docs: {
      description: {
        story:
          'End-to-end test: Clicks delete on a variable card and verifies ' +
          'the variable is removed from the panel.',
      },
    },
  },
};

/**
 * Interactive test: Complete workflow - add variable, enter formula, see results.
 */
export const FullWorkflowComplete: Story = {
  args: {},
  play: async function playFullWorkflowComplete(context) {
    const canvas = within(context.canvasElement);

    // Step 1: Wait for the playground to render
    await waitFor(
      function waitForPlayground() {
        expect(canvas.getByText('Variables')).toBeInTheDocument();
      },
      { timeout: 5000 },
    );

    // Step 2: Add a variable
    const addButton = canvas.getByRole('button', { name: /add variable/i });
    await userEvent.click(addButton);

    // Wait for the dialog to open
    const dialogContainer = within(document.body);
    await waitFor(
      function waitForDialog() {
        expect(dialogContainer.getByRole('dialog')).toBeInTheDocument();
      },
      { timeout: 5000 },
    );

    // Fill in the variable form
    const nameInput = dialogContainer.getByLabelText(/name/i);
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, 'numbers');

    const valuesInput = dialogContainer.getByLabelText(/values/i);
    await userEvent.clear(valuesInput);
    await userEvent.type(valuesInput, '10, 20, 30, 40, 50');

    // Save the variable
    const saveButton = dialogContainer.getByRole('button', { name: /save/i });
    await userEvent.click(saveButton);

    // Wait for the dialog to close
    await waitFor(
      function checkDialogClosed() {
        expect(dialogContainer.queryByRole('dialog')).not.toBeInTheDocument();
      },
      { timeout: 5000 },
    );

    // Step 3: Verify the variable card appears
    await waitFor(
      function checkVariableCard() {
        expect(canvas.getByText('@numbers')).toBeInTheDocument();
      },
      { timeout: 5000 },
    );

    // Step 4: Enter a formula
    const editorContent = canvas.getByRole('textbox');
    await userEvent.click(editorContent);
    await userEvent.type(editorContent, '@numbers * 2');

    // Step 5: Wait for validation to pass
    await waitFor(
      function checkValidation() {
        expect(canvas.getByText(/formula is valid/i)).toBeInTheDocument();
      },
      { timeout: 5000 },
    );

    // Step 6: Verify results appear
    await waitFor(
      function checkResults() {
        // Results should show computed values (20, 40, 60, 80, 100)
        const resultCells = canvas.getAllByRole('cell');
        expect(resultCells.length).toBeGreaterThan(0);
      },
      { timeout: 5000 },
    );
  },
  parameters: {
    docs: {
      description: {
        story:
          'Complete end-to-end workflow test: Adds a new variable through the form, ' +
          'enters a formula that uses it, and verifies the computed results appear.',
      },
    },
  },
};
