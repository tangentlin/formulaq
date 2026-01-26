/**
 * Storybook stories for the Formula Autocomplete extension.
 *
 * Demonstrates the autocomplete functionality for:
 * - Variable references (triggered by @)
 * - Function names (triggered by typing letters)
 *
 * @module
 */

import type { Meta, StoryObj } from '@storybook/react';
import { Box, Typography, Paper, Divider, List, ListItem, ListItemText } from '@mui/material';
import React, { useEffect, useRef, useMemo } from 'react';
import { EditorView, keymap } from '@codemirror/view';
import { defaultKeymap } from '@codemirror/commands';
import { EditorState } from '@codemirror/state';
import { syntaxHighlighting, defaultHighlightStyle, bracketMatching } from '@codemirror/language';
import type { VariableProvider } from '../../core/types/context.ts';
import type { VariableInfo, ValueType } from '../../core/types/values.ts';
import type {
  FunctionRegistry,
  FunctionInfo,
  FormulaFunction,
} from '../../core/types/functions.ts';
import { formulaAutocomplete } from './autocomplete.ts';
import { formula } from './formula-language.ts';

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

/**
 * Sample functions for the demo.
 */
const sampleFunctions: FunctionInfo[] = [
  {
    name: 'SUM',
    description: 'Calculates the sum of all numeric values',
    params: [
      { name: 'values', type: ['number.integer', 'number.float'], description: 'Values to sum' },
    ],
    returnType: 'number.float',
    isAggregation: true,
    category: 'Aggregation',
  },
  {
    name: 'AVG',
    description: 'Calculates the arithmetic mean of numeric values',
    params: [
      {
        name: 'values',
        type: ['number.integer', 'number.float'],
        description: 'Values to average',
      },
    ],
    returnType: 'number.float',
    isAggregation: true,
    category: 'Aggregation',
  },
  {
    name: 'MIN',
    description: 'Finds the minimum numeric value',
    params: [
      { name: 'values', type: ['number.integer', 'number.float'], description: 'Values to search' },
    ],
    returnType: 'number.float',
    isAggregation: true,
    category: 'Aggregation',
  },
  {
    name: 'MAX',
    description: 'Finds the maximum numeric value',
    params: [
      { name: 'values', type: ['number.integer', 'number.float'], description: 'Values to search' },
    ],
    returnType: 'number.float',
    isAggregation: true,
    category: 'Aggregation',
  },
  {
    name: 'COUNT',
    description: 'Counts the number of non-null values',
    params: [{ name: 'values', type: 'any' as ValueType, description: 'Values to count' }],
    returnType: 'number.float',
    isAggregation: true,
    category: 'Aggregation',
  },
  {
    name: 'IF',
    description: 'Returns one value if condition is true, another if false',
    params: [
      { name: 'condition', type: 'boolean.boolean', description: 'Condition to test' },
      { name: 'then_value', type: 'any' as ValueType, description: 'Value if true' },
      { name: 'else_value', type: 'any' as ValueType, description: 'Value if false' },
    ],
    returnType: 'number.float',
    isAggregation: false,
    category: 'Logical',
  },
  {
    name: 'AND',
    description: 'Returns true if all arguments are true',
    params: [{ name: 'values', type: 'boolean.boolean', description: 'Boolean values' }],
    returnType: 'boolean.boolean',
    isAggregation: false,
    isVariadic: true,
    category: 'Logical',
  },
  {
    name: 'OR',
    description: 'Returns true if any argument is true',
    params: [{ name: 'values', type: 'boolean.boolean', description: 'Boolean values' }],
    returnType: 'boolean.boolean',
    isAggregation: false,
    isVariadic: true,
    category: 'Logical',
  },
  {
    name: 'NOT',
    description: 'Returns the logical inverse of a boolean',
    params: [{ name: 'value', type: 'boolean.boolean', description: 'Boolean to invert' }],
    returnType: 'boolean.boolean',
    isAggregation: false,
    category: 'Logical',
  },
  {
    name: 'CONCAT',
    description: 'Concatenates strings together',
    params: [{ name: 's1', type: 'string.text', description: 'First string' }],
    returnType: 'string.text',
    isAggregation: false,
    isVariadic: true,
    category: 'String',
  },
  {
    name: 'LOG',
    description: 'Returns the natural logarithm of a number',
    params: [{ name: 'x', type: 'number.float', description: 'Number' }],
    returnType: 'number.float',
    isAggregation: false,
    category: 'Math',
  },
  {
    name: 'POWER',
    description: 'Returns a number raised to a power',
    params: [
      { name: 'base', type: 'number.float', description: 'Base number' },
      { name: 'exponent', type: 'number.float', description: 'Exponent' },
    ],
    returnType: 'number.float',
    isAggregation: false,
    category: 'Math',
  },
];

/**
 * Creates a mock FunctionRegistry from sample functions.
 */
function createSampleFunctionRegistry(): FunctionRegistry {
  const functionMap = new Map<string, FunctionInfo>();
  for (const f of sampleFunctions) {
    functionMap.set(f.name, f);
  }

  return {
    register: function register() {
      // No-op for demo
    },
    get: function get(name: string) {
      const info = functionMap.get(name);
      if (!info) return undefined;
      return {
        ...info,
        evaluate: async function evaluate() {
          return null;
        },
      } as FormulaFunction;
    },
    has: function has(name: string) {
      return functionMap.has(name);
    },
    getAll: function getAll() {
      return sampleFunctions;
    },
    getByCategory: function getByCategory(category: string) {
      return sampleFunctions.filter(function filterByCategory(f) {
        return f.category === category;
      });
    },
  };
}

// =============================================================================
// Editor Component
// =============================================================================

interface FormulaEditorDemoProps {
  initialValue?: string;
  placeholder?: string;
}

/**
 * Demo component wrapping CodeMirror with autocomplete.
 */
function FormulaEditorDemo(props: FormulaEditorDemoProps): React.ReactElement {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);

  const variableProvider = useMemo(function createProvider() {
    return createSampleVariableProvider();
  }, []);

  const functionRegistry = useMemo(function createRegistry() {
    return createSampleFunctionRegistry();
  }, []);

  useEffect(
    function setupEditor() {
      if (!containerRef.current) return;

      // Clear any existing editor
      if (viewRef.current) {
        viewRef.current.destroy();
      }

      const startState = EditorState.create({
        doc: props.initialValue ?? '',
        extensions: [
          keymap.of(defaultKeymap),
          bracketMatching(),
          syntaxHighlighting(defaultHighlightStyle),
          formula(),
          formulaAutocomplete({
            variableProvider: variableProvider,
            functionRegistry: functionRegistry,
          }),
          EditorView.theme({
            '&': {
              fontSize: '14px',
              fontFamily: 'monospace',
            },
            '.cm-content': {
              padding: '10px',
            },
            '.cm-scroller': {
              minHeight: '100px',
            },
          }),
        ],
      });

      const view = new EditorView({
        state: startState,
        parent: containerRef.current,
      });

      viewRef.current = view;

      return function cleanup() {
        view.destroy();
      };
    },
    [variableProvider, functionRegistry, props.initialValue],
  );

  return (
    <Box
      ref={containerRef}
      sx={{
        border: 1,
        borderColor: 'divider',
        borderRadius: 1,
        overflow: 'hidden',
        backgroundColor: 'background.paper',
        '& .cm-editor': {
          outline: 'none',
        },
        '& .cm-focused': {
          outline: 'none',
        },
      }}
    />
  );
}

// =============================================================================
// Story Configuration
// =============================================================================

const meta: Meta<typeof FormulaEditorDemo> = {
  title: 'Editor/Autocomplete',
  component: FormulaEditorDemo,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Autocomplete extension for the FormulaQ editor. ' +
          'Type @ to see variable suggestions, or start typing a function name to see function suggestions.',
      },
    },
  },
  argTypes: {
    initialValue: {
      control: 'text',
      description: 'Initial formula content',
    },
  },
};

export default meta;

type Story = StoryObj<typeof FormulaEditorDemo>;

// =============================================================================
// Stories
// =============================================================================

/**
 * Default story with an empty editor.
 * Type @ to trigger variable autocomplete.
 * Type any letter to trigger function autocomplete.
 */
export const Default: Story = {
  args: {
    initialValue: '',
  },
  parameters: {
    docs: {
      description: {
        story:
          'Empty editor. Try typing:\n' +
          '- `@` to see all available variables\n' +
          '- `SU` to see functions starting with SU (SUM)\n' +
          '- `AVG(@` to combine function and variable autocomplete',
      },
    },
  },
  render: function DefaultRender(args) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Typography variant="h6">Formula Editor with Autocomplete</Typography>
        <Typography variant="body2" color="text.secondary">
          Type <code>@</code> to see variable suggestions, or start typing a function name.
        </Typography>
        <FormulaEditorDemo {...args} />
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
                    <ListItemText primary={'@' + v.name} secondary={v.description} />
                  </ListItem>
                );
              })}
              <ListItem sx={{ py: 0 }}>
                <ListItemText primary="..." secondary="and more" />
              </ListItem>
            </List>
          </Box>
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Available Functions:
            </Typography>
            <List dense>
              {sampleFunctions.slice(0, 5).map(function renderFunction(f) {
                return (
                  <ListItem key={f.name} sx={{ py: 0 }}>
                    <ListItemText primary={f.name} secondary={f.description} />
                  </ListItem>
                );
              })}
              <ListItem sx={{ py: 0 }}>
                <ListItemText primary="..." secondary="and more" />
              </ListItem>
            </List>
          </Box>
        </Box>
      </Box>
    );
  },
};

/**
 * Story demonstrating variable autocomplete.
 */
export const VariableAutocomplete: Story = {
  args: {
    initialValue: '@',
  },
  parameters: {
    docs: {
      description: {
        story:
          'Editor with @ already typed to show variable autocomplete. ' +
          'Use arrow keys to navigate and Tab/Enter to select.',
      },
    },
  },
  render: function VariableRender(args) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Typography variant="h6">Variable Autocomplete</Typography>
        <Paper variant="outlined" sx={{ p: 2, backgroundColor: 'info.light' }}>
          <Typography variant="body2">
            <strong>Instructions:</strong> Click in the editor and type more letters after @ to
            filter variables. For example, type <code>sco</code> after @ to filter to score-related
            variables.
          </Typography>
        </Paper>
        <FormulaEditorDemo {...args} />
      </Box>
    );
  },
};

/**
 * Story demonstrating function autocomplete.
 */
export const FunctionAutocomplete: Story = {
  args: {
    initialValue: 'S',
  },
  parameters: {
    docs: {
      description: {
        story:
          'Editor with a letter typed to show function autocomplete. ' +
          'Type more letters to filter the list.',
      },
    },
  },
  render: function FunctionRender(args) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Typography variant="h6">Function Autocomplete</Typography>
        <Paper variant="outlined" sx={{ p: 2, backgroundColor: 'info.light' }}>
          <Typography variant="body2">
            <strong>Instructions:</strong> Click in the editor. The current text is "S" which should
            show SUM. Type "U" to narrow down, or delete and type "A" to see AVG and AND.
          </Typography>
        </Paper>
        <FormulaEditorDemo {...args} />
      </Box>
    );
  },
};

/**
 * Story with a complete formula for reference.
 */
export const CompleteFormula: Story = {
  args: {
    initialValue: 'IF(@score > 50, "Pass", "Fail")',
  },
  parameters: {
    docs: {
      description: {
        story:
          'A complete formula for reference. Edit the formula and use autocomplete ' +
          'to modify it. Try adding another function or variable.',
      },
    },
  },
  render: function CompleteRender(args) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Typography variant="h6">Complete Formula Example</Typography>
        <Typography variant="body2" color="text.secondary">
          A formula that returns "Pass" if score is greater than 50, otherwise "Fail".
        </Typography>
        <FormulaEditorDemo {...args} />
      </Box>
    );
  },
};

/**
 * Story demonstrating complex nested formula.
 */
export const NestedFormula: Story = {
  args: {
    initialValue: 'IF(@score >= AVG(@score), "Above Average", "Below Average")',
  },
  parameters: {
    docs: {
      description: {
        story:
          'A complex formula combining variables and aggregation functions. ' +
          'Note that @score inside AVG is evaluated across all rows.',
      },
    },
  },
  render: function NestedRender(args) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Typography variant="h6">Nested Formula with Aggregation</Typography>
        <Typography variant="body2" color="text.secondary">
          This formula compares each row's score to the average score across all rows.
        </Typography>
        <FormulaEditorDemo {...args} />
      </Box>
    );
  },
};

/**
 * Story showing keyboard navigation hints.
 */
export const KeyboardNavigation: Story = {
  args: {
    initialValue: '',
  },
  parameters: {
    docs: {
      description: {
        story: 'Demonstrates keyboard navigation for autocomplete.',
      },
    },
  },
  render: function KeyboardRender(args) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Typography variant="h6">Keyboard Navigation</Typography>
        <FormulaEditorDemo {...args} />
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Keyboard Shortcuts:
          </Typography>
          <List dense>
            <ListItem>
              <ListItemText
                primary="Arrow Up / Arrow Down"
                secondary="Navigate through completion options"
              />
            </ListItem>
            <ListItem>
              <ListItemText primary="Tab / Enter" secondary="Accept the selected completion" />
            </ListItem>
            <ListItem>
              <ListItemText primary="Escape" secondary="Dismiss the completion popup" />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="Continue typing"
                secondary="Filter completions by what you type"
              />
            </ListItem>
          </List>
        </Paper>
      </Box>
    );
  },
};
