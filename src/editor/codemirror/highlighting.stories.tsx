/**
 * Storybook stories for FormulaQ syntax highlighting.
 *
 * These stories demonstrate the syntax highlighting colors applied
 * to various formula constructs in a CodeMirror editor.
 *
 * @module
 */

import type { Meta, StoryObj } from '@storybook/react';
import { EditorState } from '@codemirror/state';
import { EditorView, lineNumbers } from '@codemirror/view';
import { Box, Paper, Typography, Stack, Chip } from '@mui/material';
import { useEffect, useRef } from 'react';
import { formula } from './formula-language';
import { formulaHighlighting, HIGHLIGHT_COLORS } from './highlighting';

/**
 * Sample formulas that showcase all syntax highlighting features.
 */
const SAMPLE_FORMULAS = `@price * (1 + @tax_rate)
IF(@score >= 90, "A", IF(@score >= 80, "B", "C"))
AVG(@values) + SUM(@amounts)
"Hello" & " " & "World"
TRUE AND FALSE OR NOT(TRUE)
@quantity * @unit_price - @discount
POWER(@base, 2) + LOG10(@value)
IFNULL(@optional_field, 0)
PERCENTILE(@scores, 90)
(@a + @b) / 2 * 100`;

/**
 * Props for the HighlightingPreview component.
 */
interface HighlightingPreviewProps {
  /** Formula text to display with highlighting */
  formula: string;
  /** Whether to show line numbers */
  showLineNumbers: boolean;
}

/**
 * Component that renders a CodeMirror editor with FormulaQ highlighting.
 */
function HighlightingPreview(props: HighlightingPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);

  useEffect(
    function setupEditor() {
      if (containerRef.current === null) {
        return;
      }

      // Clean up previous editor if it exists
      if (viewRef.current !== null) {
        viewRef.current.destroy();
      }

      const extensions = [
        formula(),
        formulaHighlighting,
        EditorView.editable.of(false),
        EditorView.theme({
          '&': {
            fontSize: '14px',
            fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
          },
          '.cm-content': {
            padding: '12px 8px',
          },
          '.cm-line': {
            padding: '2px 0',
          },
          '.cm-gutters': {
            backgroundColor: '#f5f5f5',
            borderRight: '1px solid #e0e0e0',
          },
        }),
      ];

      if (props.showLineNumbers) {
        extensions.push(lineNumbers());
      }

      const state = EditorState.create({
        doc: props.formula,
        extensions: extensions,
      });

      viewRef.current = new EditorView({
        state: state,
        parent: containerRef.current,
      });

      return function cleanup() {
        if (viewRef.current !== null) {
          viewRef.current.destroy();
          viewRef.current = null;
        }
      };
    },
    [props.formula, props.showLineNumbers],
  );

  return (
    <Box
      ref={containerRef}
      sx={{
        border: '1px solid #e0e0e0',
        borderRadius: 1,
        overflow: 'hidden',
        backgroundColor: '#ffffff',
      }}
    />
  );
}

/**
 * Component that displays the color legend for syntax highlighting.
 */
function ColorLegend() {
  const items = [
    { label: 'Variables (@name)', color: HIGHLIGHT_COLORS.variableName },
    { label: 'Functions', color: HIGHLIGHT_COLORS.function },
    { label: 'Numbers', color: HIGHLIGHT_COLORS.number },
    { label: 'Strings', color: HIGHLIGHT_COLORS.string },
    { label: 'Booleans', color: HIGHLIGHT_COLORS.bool },
    { label: 'Operators', color: HIGHLIGHT_COLORS.operator },
    { label: 'Parentheses', color: HIGHLIGHT_COLORS.paren },
  ];

  return (
    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
      {items.map(function renderLegendItem(item) {
        return (
          <Chip
            key={item.label}
            label={item.label}
            size="small"
            sx={{
              backgroundColor: item.color,
              color: '#ffffff',
              fontWeight: 500,
              '& .MuiChip-label': {
                textShadow: '0 1px 2px rgba(0,0,0,0.3)',
              },
            }}
          />
        );
      })}
    </Stack>
  );
}

/**
 * Main story component that combines editor preview and legend.
 */
function HighlightingStory(props: HighlightingPreviewProps) {
  return (
    <Paper elevation={2} sx={{ p: 3, maxWidth: 700 }}>
      <Stack spacing={3}>
        <Box>
          <Typography variant="h6" gutterBottom>
            FormulaQ Syntax Highlighting
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Preview of syntax highlighting colors for formula elements.
          </Typography>
        </Box>

        <Box>
          <Typography variant="subtitle2" gutterBottom>
            Color Legend:
          </Typography>
          <ColorLegend />
        </Box>

        <Box>
          <Typography variant="subtitle2" gutterBottom>
            Formula Preview:
          </Typography>
          <HighlightingPreview formula={props.formula} showLineNumbers={props.showLineNumbers} />
        </Box>
      </Stack>
    </Paper>
  );
}

const meta: Meta<typeof HighlightingStory> = {
  title: 'Editor/Syntax Highlighting',
  component: HighlightingStory,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Syntax highlighting for the FormulaQ formula language. ' +
          'Provides distinct colors for variables, functions, literals, and operators.',
      },
    },
  },
  argTypes: {
    formula: {
      control: 'text',
      description: 'Formula text to display with highlighting',
    },
    showLineNumbers: {
      control: 'boolean',
      description: 'Whether to show line numbers in the editor',
    },
  },
};

export default meta;

type Story = StoryObj<typeof HighlightingStory>;

/**
 * Default story showing all syntax highlighting features.
 * Includes examples of variables, functions, numbers, strings, booleans, and operators.
 */
export const Default: Story = {
  args: {
    formula: SAMPLE_FORMULAS,
    showLineNumbers: true,
  },
};

/**
 * Story showing arithmetic expression highlighting.
 */
export const ArithmeticExpressions: Story = {
  args: {
    formula: `@price * @quantity
@subtotal + @tax
@total / @count
@value ^ 2
(@a + @b) * (@c - @d)
-@negative_value
100 + 50 - 25 * 2`,
    showLineNumbers: true,
  },
};

/**
 * Story showing function call highlighting.
 */
export const FunctionCalls: Story = {
  args: {
    formula: `SUM(@values)
AVG(@scores)
MIN(@prices)
MAX(@quantities)
COUNT(@items)
PERCENTILE(@data, 95)
IF(@condition, "yes", "no")
IFNULL(@optional, 0)
LOG(@value)
LOG10(@number)
POWER(@base, @exponent)
CONCAT(@first, " ", @last)`,
    showLineNumbers: true,
  },
};

/**
 * Story showing string operations highlighting.
 */
export const StringOperations: Story = {
  args: {
    formula: `"Hello, World!"
'Single quoted string'
@name & " - " & @title
CONCAT(@first_name, " ", @last_name)
"Result: " & @value`,
    showLineNumbers: true,
  },
};

/**
 * Story showing boolean expressions highlighting.
 */
export const BooleanExpressions: Story = {
  args: {
    formula: `TRUE
FALSE
TRUE AND FALSE
TRUE OR FALSE
NOT(TRUE)
@active AND @enabled
@score >= 90 AND @attendance > 80
IF(@is_valid, TRUE, FALSE)`,
    showLineNumbers: true,
  },
};

/**
 * Story showing comparison operators highlighting.
 */
export const ComparisonOperators: Story = {
  args: {
    formula: `@value > 100
@count < 10
@price >= 50
@quantity <= 100
@status == "active"
@type != "deleted"
@a <> @b`,
    showLineNumbers: true,
  },
};

/**
 * Story showing nested expressions highlighting.
 */
export const NestedExpressions: Story = {
  args: {
    formula: `IF(@score >= 90, "A", IF(@score >= 80, "B", IF(@score >= 70, "C", "D")))
((@a + @b) * (@c - @d)) / (@e ^ 2)
AVG(@values) + PERCENTILE(@scores, 75) - MIN(@prices)
IF(AND(@active, @verified), SUM(@amounts), 0)`,
    showLineNumbers: true,
  },
};

/**
 * Story without line numbers.
 */
export const WithoutLineNumbers: Story = {
  args: {
    formula: SAMPLE_FORMULAS,
    showLineNumbers: false,
  },
};

/**
 * Story showing a single line formula.
 */
export const SingleLine: Story = {
  args: {
    formula: '@price * @quantity * (1 + @tax_rate)',
    showLineNumbers: false,
  },
};
