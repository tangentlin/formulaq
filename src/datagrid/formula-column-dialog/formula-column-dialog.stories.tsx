/**
 * Storybook stories for the FormulaColumnDialog component.
 *
 * Demonstrates all dialog states and configurations:
 * - Create mode (empty)
 * - Edit mode (pre-populated)
 * - With validation errors
 * - Valid formula with preview
 * - No preview data
 *
 * @module
 */

import type { Meta, StoryObj } from '@storybook/react';
import { Box, Button } from '@mui/material';
import React, { useState, useCallback } from 'react';
import { expect, userEvent, within, waitFor } from '@storybook/test';
import { FormulaColumnDialog } from './formula-column-dialog';
import type { PreviewData, FormulaColumnDialogMode } from './formula-column-dialog.types';
import type { VariableProvider } from '../../core/types/context';
import type { VariableInfo, ValueType } from '../../core/types/values';

/**
 * Creates a mock VariableProvider for testing.
 *
 * @returns A VariableProvider with test variables
 */
function createMockVariableProvider(): VariableProvider {
  const variables: VariableInfo[] = [
    { name: 'price', type: 'number.float', nullable: false, description: 'Product price' },
    { name: 'tax_rate', type: 'number.float', nullable: false, description: 'Tax rate (decimal)' },
    { name: 'quantity', type: 'number.float', nullable: false, description: 'Quantity ordered' },
    { name: 'discount', type: 'number.float', nullable: true, description: 'Discount percentage' },
    { name: 'category', type: 'string.text', nullable: false, description: 'Product category' },
    {
      name: 'is_premium',
      type: 'boolean.boolean',
      nullable: false,
      description: 'Premium product',
    },
  ];

  const variableMap = new Map(
    variables.map(function mapVariable(v) {
      return [v.name, v];
    }),
  );

  return {
    getVariables: function getVariables(): VariableInfo[] {
      return variables;
    },
    hasVariable: function hasVariable(name: string): boolean {
      return variableMap.has(name);
    },
    getVariableType: function getVariableType(name: string): ValueType | undefined {
      const info = variableMap.get(name);
      return info?.type;
    },
    isNullable: function isNullable(name: string): boolean {
      const info = variableMap.get(name);
      return info?.nullable ?? true;
    },
  };
}

/**
 * Creates sample preview data for testing.
 *
 * @returns PreviewData with sample rows
 */
function createSamplePreviewData(): PreviewData {
  return {
    columns: [
      { field: 'price', headerName: '@price' },
      { field: 'tax_rate', headerName: '@tax_rate' },
      { field: 'result', headerName: 'Result', isResult: true },
    ],
    rows: [
      { id: 0, price: 100, tax_rate: 0.1, result: 110 },
      { id: 1, price: 200, tax_rate: 0.1, result: 220 },
      { id: 2, price: 150, tax_rate: 0.08, result: 162 },
      { id: 3, price: 175, tax_rate: 0.08, result: 189 },
      { id: 4, price: 250, tax_rate: 0.15, result: 287.5 },
      { id: 5, price: 300, tax_rate: 0.12, result: 336 },
      { id: 6, price: 125, tax_rate: 0.1, result: 137.5 },
      { id: 7, price: 450, tax_rate: 0.2, result: 540 },
      { id: 8, price: 80, tax_rate: 0.05, result: 84 },
      { id: 9, price: 220, tax_rate: 0.1, result: 242 },
    ],
  };
}

/**
 * Creates preview data with null values for testing.
 *
 * @returns PreviewData with null values
 */
function createPreviewDataWithNulls(): PreviewData {
  return {
    columns: [
      { field: 'price', headerName: '@price' },
      { field: 'discount', headerName: '@discount' },
      { field: 'result', headerName: 'Result', isResult: true },
    ],
    rows: [
      { id: 0, price: 100, discount: 0.1, result: 90 },
      { id: 1, price: 200, discount: null, result: null },
      { id: 2, price: 150, discount: 0.05, result: 142.5 },
      { id: 3, price: null, discount: 0.1, result: null },
      { id: 4, price: 250, discount: 0.15, result: 212.5 },
    ],
  };
}

/**
 * Interactive wrapper for the dialog that manages its open state.
 */
interface InteractiveWrapperProps {
  readonly mode: FormulaColumnDialogMode;
  readonly columnName?: string | undefined;
  readonly formula?: string | undefined;
  readonly variableProvider: VariableProvider;
  readonly previewData?: PreviewData | undefined;
  readonly existingColumnNames: readonly string[];
}

/**
 * Interactive wrapper component that manages dialog state.
 */
function InteractiveWrapper(props: InteractiveWrapperProps): React.ReactElement {
  const [open, setOpen] = useState(true);
  const [savedData, setSavedData] = useState<{ columnName: string; formula: string } | null>(null);

  const handleSave = useCallback(function handleSave(columnName: string, formula: string): void {
    setSavedData({ columnName, formula });
    setOpen(false);
  }, []);

  const handleCancel = useCallback(function handleCancel(): void {
    setOpen(false);
  }, []);

  const handleReopen = useCallback(function handleReopen(): void {
    setOpen(true);
    setSavedData(null);
  }, []);

  return (
    <Box sx={{ p: 2 }}>
      {!open && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'flex-start' }}>
          <Button variant="contained" onClick={handleReopen}>
            Open Dialog
          </Button>
          {savedData !== null && (
            <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
              <strong>Saved Data:</strong>
              <pre style={{ margin: 0, marginTop: 8 }}>{JSON.stringify(savedData, null, 2)}</pre>
            </Box>
          )}
        </Box>
      )}
      <FormulaColumnDialog
        open={open}
        mode={props.mode}
        columnName={props.columnName}
        formula={props.formula}
        variableProvider={props.variableProvider}
        previewData={props.previewData}
        existingColumnNames={props.existingColumnNames}
        onSave={handleSave}
        onCancel={handleCancel}
      />
    </Box>
  );
}

const meta: Meta<typeof FormulaColumnDialog> = {
  title: 'DataGrid/formula-column-dialog',
  component: FormulaColumnDialog,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Modal dialog for creating and editing formula columns in the DataGrid. ' +
          'Provides a column name input, formula editor with validation, and preview table. ' +
          'Supports keyboard shortcuts: Ctrl/Cmd+Enter to save, Escape to close.',
      },
    },
  },
  argTypes: {
    open: {
      description: 'Whether the dialog is open',
      control: { type: 'boolean' },
    },
    mode: {
      description: 'Dialog mode: create or edit',
      control: { type: 'select' },
      options: ['create', 'edit'],
    },
    columnName: {
      description: 'Column name for edit mode',
      control: { type: 'text' },
    },
    formula: {
      description: 'Formula string for edit mode',
      control: { type: 'text' },
    },
    existingColumnNames: {
      description: 'List of existing column names to prevent duplicates',
      control: { type: 'object' },
    },
    onSave: {
      description: 'Callback when saving the formula column',
      action: 'onSave',
    },
    onCancel: {
      description: 'Callback when canceling the dialog',
      action: 'onCancel',
    },
  },
};

export default meta;

type Story = StoryObj<typeof FormulaColumnDialog>;

/**
 * Create mode with empty inputs.
 */
export const CreateMode: Story = {
  render: function RenderCreateMode() {
    return (
      <InteractiveWrapper
        mode="create"
        variableProvider={createMockVariableProvider()}
        previewData={createSamplePreviewData()}
        existingColumnNames={['price', 'tax_rate', 'quantity']}
      />
    );
  },
  parameters: {
    docs: {
      description: {
        story:
          'Create mode for adding a new formula column. ' +
          'The dialog opens with empty inputs. The Create button is disabled ' +
          'until both a valid column name and formula are provided.',
      },
    },
  },
};

/**
 * Edit mode with pre-populated values.
 */
export const EditMode: Story = {
  render: function RenderEditMode() {
    return (
      <InteractiveWrapper
        mode="edit"
        columnName="total"
        formula="@price * (1 + @tax_rate)"
        variableProvider={createMockVariableProvider()}
        previewData={createSamplePreviewData()}
        existingColumnNames={['price', 'tax_rate', 'total', 'quantity']}
      />
    );
  },
  parameters: {
    docs: {
      description: {
        story:
          'Edit mode for modifying an existing formula column. ' +
          'The dialog opens with the column name and formula pre-populated. ' +
          'The column name can be changed as long as it does not conflict with other columns.',
      },
    },
  },
};

/**
 * No preview data available.
 */
export const NoPreviewData: Story = {
  render: function RenderNoPreviewData() {
    return (
      <InteractiveWrapper
        mode="create"
        variableProvider={createMockVariableProvider()}
        previewData={undefined}
        existingColumnNames={['price', 'tax_rate']}
      />
    );
  },
  parameters: {
    docs: {
      description: {
        story:
          'When no preview data is available, the preview table shows an empty state. ' +
          'This can occur when the grid has no data to preview.',
      },
    },
  },
};

/**
 * Preview data with null values.
 */
export const WithNullValues: Story = {
  render: function RenderWithNullValues() {
    return (
      <InteractiveWrapper
        mode="edit"
        columnName="discounted_price"
        formula="@price * (1 - @discount)"
        variableProvider={createMockVariableProvider()}
        previewData={createPreviewDataWithNulls()}
        existingColumnNames={['price', 'discount', 'discounted_price']}
      />
    );
  },
  parameters: {
    docs: {
      description: {
        story:
          'Preview data containing null values. Null values are displayed in ' +
          'gray italic text. When input values are null, the result typically propagates null.',
      },
    },
  },
};

/**
 * Existing column name conflict.
 */
export const ColumnNameConflict: Story = {
  render: function RenderColumnNameConflict() {
    const [open, setOpen] = useState(true);

    const handleSave = useCallback(function handleSave(): void {
      setOpen(false);
    }, []);

    const handleCancel = useCallback(function handleCancel(): void {
      setOpen(false);
    }, []);

    const handleReopen = useCallback(function handleReopen(): void {
      setOpen(true);
    }, []);

    return (
      <Box sx={{ p: 2 }}>
        {!open && (
          <Button variant="contained" onClick={handleReopen}>
            Open Dialog
          </Button>
        )}
        <FormulaColumnDialog
          open={open}
          mode="create"
          variableProvider={createMockVariableProvider()}
          previewData={createSamplePreviewData()}
          existingColumnNames={['price', 'tax_rate', 'total']}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      </Box>
    );
  },
  parameters: {
    docs: {
      description: {
        story:
          'Demonstrates column name validation. Try entering "price" or "total" ' +
          'to see the duplicate name error. The Create button remains disabled ' +
          'until a unique column name is provided.',
      },
    },
  },
};

/**
 * Complex formula with multiple variables.
 */
export const ComplexFormula: Story = {
  render: function RenderComplexFormula() {
    return (
      <InteractiveWrapper
        mode="edit"
        columnName="final_price"
        formula="(@price * @quantity) * (1 + @tax_rate) * (1 - @discount)"
        variableProvider={createMockVariableProvider()}
        previewData={{
          columns: [
            { field: 'price', headerName: '@price' },
            { field: 'quantity', headerName: '@quantity' },
            { field: 'tax_rate', headerName: '@tax_rate' },
            { field: 'discount', headerName: '@discount' },
            { field: 'result', headerName: 'Result', isResult: true },
          ],
          rows: [
            { id: 0, price: 100, quantity: 2, tax_rate: 0.1, discount: 0.05, result: 209 },
            { id: 1, price: 50, quantity: 5, tax_rate: 0.1, discount: 0.1, result: 247.5 },
            { id: 2, price: 75, quantity: 3, tax_rate: 0.08, discount: 0, result: 243 },
          ],
        }}
        existingColumnNames={['price', 'quantity', 'tax_rate', 'discount', 'final_price']}
      />
    );
  },
  parameters: {
    docs: {
      description: {
        story:
          'A complex formula referencing multiple variables. The preview table ' +
          'shows all referenced variables alongside the computed result.',
      },
    },
  },
};

/**
 * Direct dialog render without wrapper (controlled by args).
 */
export const DirectRender: Story = {
  args: {
    open: true,
    mode: 'create',
    columnName: '',
    formula: '',
    variableProvider: createMockVariableProvider(),
    previewData: createSamplePreviewData(),
    existingColumnNames: ['price', 'tax_rate'],
  },
  parameters: {
    docs: {
      description: {
        story:
          'Direct render of the dialog controlled by Storybook args. ' +
          'Use the Controls panel to modify props and see the dialog update.',
      },
    },
  },
};

/**
 * Empty existing columns (first formula column).
 */
export const FirstFormulaColumn: Story = {
  render: function RenderFirstFormulaColumn() {
    return (
      <InteractiveWrapper
        mode="create"
        variableProvider={createMockVariableProvider()}
        previewData={createSamplePreviewData()}
        existingColumnNames={[]}
      />
    );
  },
  parameters: {
    docs: {
      description: {
        story:
          'Creating the first formula column when no columns exist yet. ' +
          'Any valid column name can be used without uniqueness conflicts.',
      },
    },
  },
};

/**
 * Many existing columns.
 */
export const ManyExistingColumns: Story = {
  render: function RenderManyExistingColumns() {
    const existingColumns = [
      'price',
      'tax_rate',
      'quantity',
      'discount',
      'category',
      'is_premium',
      'subtotal',
      'tax_amount',
      'discount_amount',
      'total',
      'margin',
      'profit',
    ];

    return (
      <InteractiveWrapper
        mode="create"
        variableProvider={createMockVariableProvider()}
        previewData={createSamplePreviewData()}
        existingColumnNames={existingColumns}
      />
    );
  },
  parameters: {
    docs: {
      description: {
        story:
          'Creating a formula column when many columns already exist. ' +
          'Column name validation checks against all existing names.',
      },
    },
  },
};

/**
 * Rename column in edit mode.
 */
export const RenameColumn: Story = {
  render: function RenderRenameColumn() {
    return (
      <InteractiveWrapper
        mode="edit"
        columnName="total_price"
        formula="@price * (1 + @tax_rate)"
        variableProvider={createMockVariableProvider()}
        previewData={createSamplePreviewData()}
        existingColumnNames={['price', 'tax_rate', 'total_price', 'quantity']}
      />
    );
  },
  parameters: {
    docs: {
      description: {
        story:
          'Renaming a column in edit mode. The current column name is allowed, ' +
          'but changing to another existing column name will show an error.',
      },
    },
  },
};

// =============================================================================
// Play Function Stories (End-to-End Interaction Tests)
// =============================================================================

/**
 * Interactive test: Create a column by filling name, entering formula, verifying preview, and clicking Create.
 */
export const CreateColumnTest: Story = {
  render: function RenderCreateColumnTest() {
    return (
      <InteractiveWrapper
        mode="create"
        variableProvider={createMockVariableProvider()}
        previewData={createSamplePreviewData()}
        existingColumnNames={['price', 'tax_rate']}
      />
    );
  },
  play: async function playCreateColumn(_context) {
    // Wait for the dialog to be in the DOM
    await waitFor(
      function waitForDialog() {
        const dialog = document.querySelector('[role="dialog"]');
        expect(dialog).toBeInTheDocument();
      },
      { timeout: 5000 },
    );

    const dialogContainer = within(document.body);

    // Find and fill the column name input
    const columnNameInput = dialogContainer.getByLabelText(/column name/i);
    await userEvent.clear(columnNameInput);
    await userEvent.type(columnNameInput, 'total');

    // Find the formula editor and enter a formula
    const formulaEditor = dialogContainer.getByRole('textbox');
    await userEvent.click(formulaEditor);
    await userEvent.type(formulaEditor, '@price * (1 + @tax_rate)');

    // Wait for validation to pass
    await waitFor(
      function checkValidation() {
        expect(dialogContainer.getByText(/formula is valid/i)).toBeInTheDocument();
      },
      { timeout: 5000 },
    );

    // Verify the Create button is enabled
    const createButton = dialogContainer.getByRole('button', { name: /create/i });
    expect(createButton).not.toBeDisabled();
  },
  parameters: {
    docs: {
      description: {
        story:
          'End-to-end test: Fills the column name, enters a valid formula, ' +
          'waits for validation, and verifies the Create button is enabled.',
      },
    },
  },
};

/**
 * Interactive test: Modify formula in edit mode and verify preview updates.
 */
export const EditColumnTest: Story = {
  render: function RenderEditColumnTest() {
    return (
      <InteractiveWrapper
        mode="edit"
        columnName="total"
        formula="@price"
        variableProvider={createMockVariableProvider()}
        previewData={createSamplePreviewData()}
        existingColumnNames={['price', 'tax_rate', 'total']}
      />
    );
  },
  play: async function playEditColumn(_context) {
    // Wait for the dialog to be in the DOM
    await waitFor(
      function waitForDialog() {
        const dialog = document.querySelector('[role="dialog"]');
        expect(dialog).toBeInTheDocument();
      },
      { timeout: 5000 },
    );

    const dialogContainer = within(document.body);

    // Wait for the formula editor to have the initial value
    await waitFor(
      function waitForEditor() {
        const formulaEditor = dialogContainer.getByRole('textbox');
        expect(formulaEditor).toBeInTheDocument();
      },
      { timeout: 5000 },
    );

    // Find the formula editor and modify the formula
    const formulaEditor = dialogContainer.getByRole('textbox');
    await userEvent.click(formulaEditor);

    // Clear and type new formula
    await userEvent.clear(formulaEditor);
    await userEvent.type(formulaEditor, '@price * @quantity');

    // Wait for validation to pass
    await waitFor(
      function checkValidation() {
        expect(dialogContainer.getByText(/formula is valid/i)).toBeInTheDocument();
      },
      { timeout: 5000 },
    );

    // Verify the Save button is enabled
    const saveButton = dialogContainer.getByRole('button', { name: /save/i });
    expect(saveButton).not.toBeDisabled();
  },
  parameters: {
    docs: {
      description: {
        story:
          'End-to-end test: In edit mode, modifies the formula and verifies ' +
          'that validation passes and the Save button is enabled.',
      },
    },
  },
};

/**
 * Interactive test: Enter a duplicate column name and verify error is shown.
 */
export const ValidationErrorTest: Story = {
  render: function RenderValidationErrorTest() {
    return (
      <InteractiveWrapper
        mode="create"
        variableProvider={createMockVariableProvider()}
        previewData={createSamplePreviewData()}
        existingColumnNames={['price', 'tax_rate', 'total']}
      />
    );
  },
  play: async function playValidationError(_context) {
    // Wait for the dialog to be in the DOM
    await waitFor(
      function waitForDialog() {
        const dialog = document.querySelector('[role="dialog"]');
        expect(dialog).toBeInTheDocument();
      },
      { timeout: 5000 },
    );

    const dialogContainer = within(document.body);

    // Find and fill the column name input with a duplicate name
    const columnNameInput = dialogContainer.getByLabelText(/column name/i);
    await userEvent.clear(columnNameInput);
    await userEvent.type(columnNameInput, 'price');

    // Click elsewhere to trigger validation (blur event)
    const dialogTitle = dialogContainer.getByText(/create formula column|edit formula column/i);
    await userEvent.click(dialogTitle);

    // Wait for the error message to appear
    await waitFor(
      function checkError() {
        expect(dialogContainer.getByText(/already exists|duplicate/i)).toBeInTheDocument();
      },
      { timeout: 5000 },
    );

    // Verify the Create button is disabled
    const createButton = dialogContainer.getByRole('button', { name: /create/i });
    expect(createButton).toBeDisabled();
  },
  parameters: {
    docs: {
      description: {
        story:
          'End-to-end test: Enters a duplicate column name and verifies ' +
          'that an error message is shown and the Create button is disabled.',
      },
    },
  },
};

/**
 * Interactive test: Use Ctrl+Enter keyboard shortcut to save.
 */
export const KeyboardSaveTest: Story = {
  render: function RenderKeyboardSaveTest() {
    const [saved, setSaved] = useState(false);
    const [open, setOpen] = useState(true);

    const handleSave = useCallback(function handleSave(): void {
      setSaved(true);
      setOpen(false);
    }, []);

    const handleCancel = useCallback(function handleCancel(): void {
      setOpen(false);
    }, []);

    const handleReopen = useCallback(function handleReopen(): void {
      setOpen(true);
      setSaved(false);
    }, []);

    return (
      <Box sx={{ p: 2 }}>
        {!open && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'flex-start' }}>
            <Button variant="contained" onClick={handleReopen}>
              Open Dialog
            </Button>
            {saved && (
              <Box
                sx={{ mt: 2, p: 2, bgcolor: 'success.light', borderRadius: 1 }}
                data-testid="save-success"
              >
                <strong>Saved successfully via Ctrl+Enter!</strong>
              </Box>
            )}
          </Box>
        )}
        <FormulaColumnDialog
          open={open}
          mode="create"
          variableProvider={createMockVariableProvider()}
          previewData={createSamplePreviewData()}
          existingColumnNames={['price', 'tax_rate']}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      </Box>
    );
  },
  play: async function playKeyboardSave(context) {
    // Wait for the dialog to be in the DOM
    await waitFor(
      function waitForDialog() {
        const dialog = document.querySelector('[role="dialog"]');
        expect(dialog).toBeInTheDocument();
      },
      { timeout: 5000 },
    );

    const dialogContainer = within(document.body);

    // Fill the column name
    const columnNameInput = dialogContainer.getByLabelText(/column name/i);
    await userEvent.clear(columnNameInput);
    await userEvent.type(columnNameInput, 'new_column');

    // Enter a valid formula
    const formulaEditor = dialogContainer.getByRole('textbox');
    await userEvent.click(formulaEditor);
    await userEvent.type(formulaEditor, '@price + @tax_rate');

    // Wait for validation to pass
    await waitFor(
      function checkValidation() {
        expect(dialogContainer.getByText(/formula is valid/i)).toBeInTheDocument();
      },
      { timeout: 5000 },
    );

    // Verify the Create button is enabled before using keyboard
    const createButton = dialogContainer.getByRole('button', { name: /create/i });
    expect(createButton).not.toBeDisabled();

    // Use Ctrl+Enter to save (simulate keyboard shortcut)
    await userEvent.keyboard('{Control>}{Enter}{/Control}');

    // Wait for the dialog to close and success message to appear
    const canvas = within(context.canvasElement);
    await waitFor(
      function checkSaveSuccess() {
        const successElement = canvas.queryByTestId('save-success');
        expect(successElement).toBeInTheDocument();
      },
      { timeout: 5000 },
    );
  },
  parameters: {
    docs: {
      description: {
        story:
          'End-to-end test: Fills in the form, then uses Ctrl+Enter ' +
          'keyboard shortcut to save and verifies the dialog closes.',
      },
    },
  },
};
