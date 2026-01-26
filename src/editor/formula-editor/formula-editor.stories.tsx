/**
 * Storybook stories for the FormulaEditor component.
 *
 * Demonstrates the FormulaEditor with various configurations:
 * - Default empty editor
 * - With initial value
 * - With validation errors (syntax and semantic)
 * - Valid formula
 * - Custom placeholder
 * - Disabled state
 * - Different heights
 *
 * @module
 */

import type { Meta, StoryObj } from '@storybook/react';
import { Box, Typography, Paper, Divider, List, ListItem, ListItemText } from '@mui/material';
import React, { useState, useMemo, useCallback } from 'react';
import { expect, userEvent, within, waitFor } from '@storybook/test';

import type { VariableProvider } from '../../core/types/context.ts';
import type { VariableInfo } from '../../core/types/values.ts';

import { FormulaEditor } from './formula-editor.tsx';
import type { ValidationResult } from './formula-editor.types.ts';

// =============================================================================
// Mock Providers
// =============================================================================

/**
 * Sample variables for the demo.
 */
const sampleVariables: VariableInfo[] = [
  { name: 'score', type: 'number.float', nullable: true, description: 'Test score (0-100)' },
  { name: 'name', type: 'string.text', nullable: false, description: 'Student name' },
  {
    name: 'passed',
    type: 'boolean.boolean',
    nullable: false,
    description: 'Whether the student passed',
  },
  { name: 'grade', type: 'string.text', nullable: true, description: 'Letter grade (A-F)' },
  { name: 'score_avg', type: 'number.float', nullable: true, description: 'Average score' },
  { name: 'score_max', type: 'number.float', nullable: true, description: 'Maximum score' },
  { name: 'count', type: 'number.integer', nullable: false, description: 'Number of tests' },
  { name: 'data.value', type: 'number.float', nullable: true, description: 'Nested data value' },
];

/**
 * Creates a VariableProvider from sample variables.
 */
function createSampleVariableProvider(): VariableProvider {
  const variableMap = new Map<string, VariableInfo>();
  for (const v of sampleVariables) {
    variableMap.set(v.name, v);
  }

  return {
    getVariables: function getVariables() {
      return sampleVariables;
    },
    hasVariable: function hasVariable(name: string) {
      return variableMap.has(name);
    },
    getVariableType: function getVariableType(name: string) {
      const info = variableMap.get(name);
      return info?.type;
    },
    isNullable: function isNullable(name: string) {
      const info = variableMap.get(name);
      return info?.nullable ?? true;
    },
  };
}

// =============================================================================
// Controlled Editor Wrapper
// =============================================================================

/**
 * Props for the controlled editor wrapper.
 */
interface ControlledEditorProps {
  readonly initialValue?: string;
  readonly placeholder?: string;
  readonly disabled?: boolean;
  readonly height?: string | number;
  readonly validationDebounceMs?: number;
  readonly showValidationLog?: boolean;
}

/**
 * Wrapper component that manages controlled state for the FormulaEditor.
 */
function ControlledEditor(props: ControlledEditorProps): React.ReactElement {
  const [value, setValue] = useState(props.initialValue ?? '');
  const [lastValidation, setLastValidation] = useState<ValidationResult | null>(null);

  const variableProvider = useMemo(function createProvider() {
    return createSampleVariableProvider();
  }, []);

  const handleChange = useCallback(function handleChange(newValue: string) {
    setValue(newValue);
  }, []);

  const handleValidation = useCallback(function handleValidation(result: ValidationResult) {
    setLastValidation(result);
  }, []);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <FormulaEditor
        value={value}
        onChange={handleChange}
        variableProvider={variableProvider}
        onValidation={handleValidation}
        placeholder={props.placeholder}
        disabled={props.disabled}
        height={props.height}
        validationDebounceMs={props.validationDebounceMs}
      />
      {props.showValidationLog && lastValidation && (
        <Paper variant="outlined" sx={{ p: 2, backgroundColor: 'grey.50' }}>
          <Typography variant="caption" color="text.secondary">
            Last Validation Result:
          </Typography>
          <Typography
            variant="body2"
            sx={{
              fontFamily: 'monospace',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
            }}
          >
            {JSON.stringify(
              {
                isValid: lastValidation.isValid,
                hasAST: lastValidation.validatedAST !== undefined,
                errorCount: lastValidation.errors?.length ?? 0,
                firstError: lastValidation.errors?.[0]?.message,
              },
              null,
              2,
            )}
          </Typography>
        </Paper>
      )}
    </Box>
  );
}

// =============================================================================
// Story Configuration
// =============================================================================

const meta: Meta<typeof ControlledEditor> = {
  title: 'Editor/FormulaEditor',
  component: ControlledEditor,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'The FormulaEditor is the main component for editing formulas. ' +
          'It combines CodeMirror with formula language support, syntax highlighting, ' +
          'autocomplete for variables and functions, debounced validation, ' +
          'error markers, and a validation status bar.',
      },
    },
  },
  argTypes: {
    initialValue: {
      control: 'text',
      description: 'Initial formula value',
    },
    placeholder: {
      control: 'text',
      description: 'Placeholder text when editor is empty',
    },
    disabled: {
      control: 'boolean',
      description: 'Whether the editor is disabled',
    },
    height: {
      control: 'text',
      description: 'Editor height (CSS value or number)',
    },
    validationDebounceMs: {
      control: 'number',
      description: 'Debounce delay for validation in milliseconds',
    },
    showValidationLog: {
      control: 'boolean',
      description: 'Show validation result log (for debugging)',
    },
  },
};

export default meta;

type Story = StoryObj<typeof ControlledEditor>;

// =============================================================================
// Stories
// =============================================================================

/**
 * Default story with an empty editor.
 */
export const Default: Story = {
  args: {
    initialValue: '',
    showValidationLog: true,
  },
  parameters: {
    docs: {
      description: {
        story:
          'Empty editor ready for input. Type a formula to see validation in action. ' +
          'Use @ to trigger variable autocomplete, or start typing a function name.',
      },
    },
  },
  render: function DefaultRender(args) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Typography variant="h6">FormulaEditor</Typography>
        <Typography variant="body2" color="text.secondary">
          Type a formula using variables like @score, @name, or functions like SUM, AVG, IF.
        </Typography>
        <ControlledEditor {...args} />
        <Divider />
        <Box sx={{ display: 'flex', gap: 4 }}>
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Available Variables:
            </Typography>
            <List dense>
              {sampleVariables.slice(0, 5).map(function renderVariable(v) {
                return (
                  <ListItem key={v.name} sx={{ py: 0 }}>
                    <ListItemText primary={'@' + v.name} secondary={v.type} />
                  </ListItem>
                );
              })}
            </List>
          </Box>
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Try These Formulas:
            </Typography>
            <List dense>
              <ListItem sx={{ py: 0 }}>
                <ListItemText primary="@score * 2" secondary="Arithmetic" />
              </ListItem>
              <ListItem sx={{ py: 0 }}>
                <ListItemText primary='IF(@score > 50, "Pass", "Fail")' secondary="Conditional" />
              </ListItem>
              <ListItem sx={{ py: 0 }}>
                <ListItemText primary="AVG(@score)" secondary="Aggregation" />
              </ListItem>
              <ListItem sx={{ py: 0 }}>
                <ListItemText primary="@unknown" secondary="Error: Unknown variable" />
              </ListItem>
            </List>
          </Box>
        </Box>
      </Box>
    );
  },
};

/**
 * Story with an initial value.
 */
export const WithInitialValue: Story = {
  args: {
    initialValue: '@score * 2 + 10',
    showValidationLog: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Editor initialized with a formula that will be validated on mount.',
      },
    },
  },
  render: function WithInitialValueRender(args) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Typography variant="h6">Editor with Initial Value</Typography>
        <Typography variant="body2" color="text.secondary">
          The formula is validated automatically when the editor loads.
        </Typography>
        <ControlledEditor {...args} />
      </Box>
    );
  },
};

/**
 * Story with a syntax error.
 */
export const WithSyntaxError: Story = {
  args: {
    initialValue: '@score + + @name',
    showValidationLog: true,
  },
  parameters: {
    docs: {
      description: {
        story:
          'Editor with a syntax error (double plus operator). ' +
          'Shows error underline and validation status.',
      },
    },
  },
  render: function WithSyntaxErrorRender(args) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Typography variant="h6">Syntax Error Example</Typography>
        <Typography variant="body2" color="text.secondary">
          The formula has a syntax error (unexpected token). Notice the error underline and status.
        </Typography>
        <ControlledEditor {...args} />
      </Box>
    );
  },
};

/**
 * Story with a semantic error (unknown variable).
 */
export const WithSemanticError: Story = {
  args: {
    initialValue: '@score + @unknownVariable',
    showValidationLog: true,
  },
  parameters: {
    docs: {
      description: {
        story:
          'Editor with a semantic error (unknown variable @unknownVariable). ' +
          'The syntax is valid but the variable does not exist.',
      },
    },
  },
  render: function WithSemanticErrorRender(args) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Typography variant="h6">Semantic Error Example</Typography>
        <Typography variant="body2" color="text.secondary">
          The formula references @unknownVariable which is not in the variable provider.
        </Typography>
        <ControlledEditor {...args} />
      </Box>
    );
  },
};

/**
 * Story with a valid formula.
 */
export const ValidFormula: Story = {
  args: {
    initialValue: 'IF(@score > 50, "Pass", "Fail")',
    showValidationLog: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'A valid formula that passes all validation checks.',
      },
    },
  },
  render: function ValidFormulaRender(args) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Typography variant="h6">Valid Formula</Typography>
        <Typography variant="body2" color="text.secondary">
          This formula is valid and shows a green checkmark in the status bar.
        </Typography>
        <ControlledEditor {...args} />
      </Box>
    );
  },
};

/**
 * Story with a custom placeholder.
 */
export const WithCustomPlaceholder: Story = {
  args: {
    initialValue: '',
    placeholder: 'Enter a formula like @score * 2 or AVG(@score)',
    showValidationLog: false,
  },
  parameters: {
    docs: {
      description: {
        story: 'Editor with a custom placeholder that guides the user.',
      },
    },
  },
  render: function WithCustomPlaceholderRender(args) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Typography variant="h6">Custom Placeholder</Typography>
        <Typography variant="body2" color="text.secondary">
          The placeholder text provides hints about what to enter.
        </Typography>
        <ControlledEditor {...args} />
      </Box>
    );
  },
};

/**
 * Story showing the disabled state.
 */
export const DisabledState: Story = {
  args: {
    initialValue: '@score + @count',
    disabled: true,
    showValidationLog: false,
  },
  parameters: {
    docs: {
      description: {
        story:
          'Editor in disabled state. The content is visible but cannot be edited. ' +
          'Note the grayed-out appearance.',
      },
    },
  },
  render: function DisabledStateRender(args) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Typography variant="h6">Disabled Editor</Typography>
        <Typography variant="body2" color="text.secondary">
          The editor is read-only and appears grayed out.
        </Typography>
        <ControlledEditor {...args} />
      </Box>
    );
  },
};

/**
 * Story showing different heights.
 */
export const DifferentHeights: Story = {
  args: {},
  parameters: {
    docs: {
      description: {
        story: 'Editor can be configured with different heights for various use cases.',
      },
    },
  },
  render: function DifferentHeightsRender() {
    const variableProvider = useMemo(function createProvider() {
      return createSampleVariableProvider();
    }, []);

    const [small, setSmall] = useState('@score');
    const [medium, setMedium] = useState('@score + @count');
    const [large, setLarge] = useState(
      'IF(@score > AVG(@score),\n  "Above Average",\n  "Below Average"\n)',
    );

    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Typography variant="h6">Different Editor Heights</Typography>

        <Box>
          <Typography variant="subtitle2" gutterBottom>
            Small (60px):
          </Typography>
          <FormulaEditor
            value={small}
            onChange={setSmall}
            variableProvider={variableProvider}
            height={60}
          />
        </Box>

        <Box>
          <Typography variant="subtitle2" gutterBottom>
            Default (100px):
          </Typography>
          <FormulaEditor
            value={medium}
            onChange={setMedium}
            variableProvider={variableProvider}
            height="100px"
          />
        </Box>

        <Box>
          <Typography variant="subtitle2" gutterBottom>
            Large (200px):
          </Typography>
          <FormulaEditor
            value={large}
            onChange={setLarge}
            variableProvider={variableProvider}
            height="200px"
          />
        </Box>
      </Box>
    );
  },
};

/**
 * Story demonstrating validation debounce.
 */
export const ValidationDebounce: Story = {
  args: {
    initialValue: '',
    validationDebounceMs: 1000,
    showValidationLog: true,
  },
  parameters: {
    docs: {
      description: {
        story:
          'Editor with a longer validation debounce (1 second). ' +
          'Notice the "Validating..." state while typing quickly.',
      },
    },
  },
  render: function ValidationDebounceRender(args) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Typography variant="h6">Validation Debounce (1 second)</Typography>
        <Typography variant="body2" color="text.secondary">
          With a longer debounce, validation waits for you to stop typing. Try typing quickly and
          watch the "Validating..." state.
        </Typography>
        <ControlledEditor {...args} />
        <Paper variant="outlined" sx={{ p: 2, backgroundColor: 'info.light' }}>
          <Typography variant="body2">
            <strong>Note:</strong> The default debounce is 300ms. This example uses 1000ms to make
            the validating state more visible.
          </Typography>
        </Paper>
      </Box>
    );
  },
};

/**
 * Story showing complex formula with aggregations.
 */
export const ComplexFormula: Story = {
  args: {
    initialValue: 'IF(@score >= AVG(@score), MAX(@score) - @score, @score - MIN(@score))',
    showValidationLog: true,
  },
  parameters: {
    docs: {
      description: {
        story:
          'A complex formula using multiple aggregation functions. ' +
          'Demonstrates that the editor handles nested function calls correctly.',
      },
    },
  },
  render: function ComplexFormulaRender(args) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Typography variant="h6">Complex Formula with Aggregations</Typography>
        <Typography variant="body2" color="text.secondary">
          This formula calculates how far each score is from the max or min, depending on whether
          it's above or below average.
        </Typography>
        <ControlledEditor {...args} />
      </Box>
    );
  },
};

/**
 * Interactive story with all controls.
 */
export const Interactive: Story = {
  args: {
    initialValue: '@score * 2',
    placeholder: 'Enter formula...',
    disabled: false,
    height: '120px',
    validationDebounceMs: 300,
    showValidationLog: true,
  },
  parameters: {
    docs: {
      description: {
        story:
          'Fully interactive story with all controls exposed. ' +
          'Use the Storybook controls panel to experiment with different configurations.',
      },
    },
  },
};

// =============================================================================
// Play Function Stories (End-to-End Interaction Tests)
// =============================================================================

/**
 * Interactive test story: Type a formula and verify it appears in the editor.
 */
export const TypeFormula: Story = {
  args: {
    initialValue: '',
    showValidationLog: true,
    validationDebounceMs: 100,
  },
  parameters: {
    docs: {
      description: {
        story: 'Play function test: Types a formula and verifies it appears in the editor.',
      },
    },
  },
  play: async function playTypeFormula(context) {
    const canvas = within(context.canvasElement);

    // Wait for the editor to render
    await waitFor(
      function waitForEditor() {
        const editor = canvas.getByRole('textbox');
        expect(editor).toBeInTheDocument();
      },
      { timeout: 5000 },
    );

    // Find the editor textbox
    const editor = canvas.getByRole('textbox');

    // Click to focus
    await userEvent.click(editor);

    // Type a formula
    await userEvent.type(editor, '@score * 2 + 10');

    // Wait for validation to complete
    await waitFor(
      function checkFormulaTyped() {
        expect(canvas.getByText(/formula is valid/i)).toBeInTheDocument();
      },
      { timeout: 5000 },
    );
  },
};

/**
 * Interactive test story: Trigger variable autocomplete with @.
 */
export const AutocompleteVariable: Story = {
  args: {
    initialValue: '',
    showValidationLog: false,
    validationDebounceMs: 100,
  },
  parameters: {
    docs: {
      description: {
        story:
          'Play function test: Types @ to trigger variable autocomplete and verifies popup appears.',
      },
    },
  },
  play: async function playAutocompleteVariable(context) {
    const canvas = within(context.canvasElement);

    // Wait for the editor to render
    await waitFor(
      function waitForEditor() {
        const editor = canvas.getByRole('textbox');
        expect(editor).toBeInTheDocument();
      },
      { timeout: 5000 },
    );

    // Find the editor textbox
    const editor = canvas.getByRole('textbox');

    // Click to focus
    await userEvent.click(editor);

    // Type @ to trigger variable autocomplete
    await userEvent.type(editor, '@');

    // Wait for the autocomplete popup to appear
    // The autocomplete options should appear as a listbox or contain variable suggestions
    await waitFor(
      function checkAutocompletePopup() {
        // Check for the autocomplete tooltip/popup in the document body
        const autocompleteOptions = document.querySelectorAll('.cm-tooltip-autocomplete');
        expect(autocompleteOptions.length).toBeGreaterThan(0);
      },
      { timeout: 5000 },
    );
  },
};

/**
 * Interactive test story: Trigger function autocomplete.
 */
export const AutocompleteFunction: Story = {
  args: {
    initialValue: '',
    showValidationLog: false,
    validationDebounceMs: 100,
  },
  parameters: {
    docs: {
      description: {
        story:
          'Play function test: Types "AV" to trigger function autocomplete suggestions for AVG.',
      },
    },
  },
  play: async function playAutocompleteFunction(context) {
    const canvas = within(context.canvasElement);

    // Wait for the editor to render
    await waitFor(
      function waitForEditor() {
        const editor = canvas.getByRole('textbox');
        expect(editor).toBeInTheDocument();
      },
      { timeout: 5000 },
    );

    // Find the editor textbox
    const editor = canvas.getByRole('textbox');

    // Click to focus
    await userEvent.click(editor);

    // Type "AV" to trigger function autocomplete
    await userEvent.type(editor, 'AV');

    // Wait for the autocomplete popup to appear with function suggestions
    await waitFor(
      function checkFunctionAutocomplete() {
        // Check for the autocomplete tooltip/popup in the document body
        const autocompleteOptions = document.querySelectorAll('.cm-tooltip-autocomplete');
        expect(autocompleteOptions.length).toBeGreaterThan(0);
      },
      { timeout: 5000 },
    );
  },
};

/**
 * Interactive test story: Type invalid formula and verify error shown.
 */
export const ValidationErrorTest: Story = {
  args: {
    initialValue: '',
    showValidationLog: true,
    validationDebounceMs: 100,
  },
  parameters: {
    docs: {
      description: {
        story: 'Play function test: Types an invalid formula and verifies error is shown.',
      },
    },
  },
  play: async function playValidationError(context) {
    const canvas = within(context.canvasElement);

    // Wait for the editor to render
    await waitFor(
      function waitForEditor() {
        const editor = canvas.getByRole('textbox');
        expect(editor).toBeInTheDocument();
      },
      { timeout: 5000 },
    );

    // Find the editor textbox
    const editor = canvas.getByRole('textbox');

    // Click to focus
    await userEvent.click(editor);

    // Type an invalid formula (unknown variable)
    await userEvent.type(editor, '@unknownVariable + 5');

    // Wait for validation error to appear
    await waitFor(
      function checkValidationError() {
        // Should show an error in the validation status
        const errorElements = canvas.queryAllByText(/error|unknown|undefined/i);
        expect(errorElements.length).toBeGreaterThan(0);
      },
      { timeout: 5000 },
    );
  },
};

/**
 * Interactive test story: Type valid formula and verify validation success.
 */
export const ValidFormulaTest: Story = {
  args: {
    initialValue: '',
    showValidationLog: true,
    validationDebounceMs: 100,
  },
  parameters: {
    docs: {
      description: {
        story:
          'Play function test: Types a valid formula and verifies validation success is shown.',
      },
    },
  },
  play: async function playValidFormula(context) {
    const canvas = within(context.canvasElement);

    // Wait for the editor to render
    await waitFor(
      function waitForEditor() {
        const editor = canvas.getByRole('textbox');
        expect(editor).toBeInTheDocument();
      },
      { timeout: 5000 },
    );

    // Find the editor textbox
    const editor = canvas.getByRole('textbox');

    // Click to focus
    await userEvent.click(editor);

    // Type a valid formula
    await userEvent.type(editor, '@score + @count');

    // Wait for validation success
    await waitFor(
      function checkValidationSuccess() {
        expect(canvas.getByText(/formula is valid/i)).toBeInTheDocument();
      },
      { timeout: 5000 },
    );

    // Verify the validation log shows success
    await waitFor(
      function checkValidationLog() {
        expect(canvas.getByText(/"isValid": true/)).toBeInTheDocument();
      },
      { timeout: 5000 },
    );
  },
};
