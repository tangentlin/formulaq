/**
 * Storybook stories for the Error Marker CodeMirror extension.
 *
 * Demonstrates the error underline functionality with various scenarios:
 * - Clean editor with no errors
 * - Single error
 * - Multiple errors
 * - Errors at different positions
 * - Tooltip display on hover
 *
 * @module
 */

import type { Meta, StoryObj } from '@storybook/react';
import { Box, Typography, Paper, Stack, Button } from '@mui/material';
import React from 'react';
import { EditorView, keymap, drawSelection, highlightActiveLine } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { syntaxHighlighting, defaultHighlightStyle, bracketMatching } from '@codemirror/language';
import { formula } from './formula-language';
import {
  errorMarkerExtension,
  updateErrors,
  clearErrors,
  type ErrorPosition,
} from './error-marker';

/**
 * A minimal set of extensions for the story demos.
 * This is a simplified version of codemirror's minimalSetup.
 */
const minimalSetup = [
  history(),
  drawSelection(),
  syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
  bracketMatching(),
  keymap.of([...defaultKeymap, ...historyKeymap]),
  highlightActiveLine(),
];

/**
 * Props for the ErrorMarkerDemo component.
 */
interface ErrorMarkerDemoProps {
  /**
   * Initial formula text to display in the editor.
   */
  initialFormula: string;

  /**
   * Initial list of errors to display.
   */
  initialErrors: ErrorPosition[];

  /**
   * Description of what this demo shows.
   */
  description: string;
}

/**
 * Demo component that creates a CodeMirror editor with the error marker extension.
 *
 * @param props - Component props
 * @returns React element with the editor demo
 */
function ErrorMarkerDemo(props: ErrorMarkerDemoProps): React.ReactElement {
  const editorRef = React.useRef<HTMLDivElement>(null);
  const viewRef = React.useRef<EditorView | null>(null);
  const [hasErrors, setHasErrors] = React.useState(props.initialErrors.length > 0);

  React.useEffect(
    function initializeEditor() {
      if (editorRef.current === null) {
        return;
      }

      const view = new EditorView({
        doc: props.initialFormula,
        extensions: [minimalSetup, formula(), errorMarkerExtension()],
        parent: editorRef.current,
      });

      viewRef.current = view;

      // Apply initial errors
      if (props.initialErrors.length > 0) {
        updateErrors(view, props.initialErrors);
      }

      return function cleanup() {
        view.destroy();
        viewRef.current = null;
      };
    },
    [props.initialFormula, props.initialErrors],
  );

  function handleToggleErrors(): void {
    const view = viewRef.current;
    if (view === null) {
      return;
    }

    if (hasErrors) {
      clearErrors(view);
      setHasErrors(false);
    } else {
      updateErrors(view, props.initialErrors);
      setHasErrors(true);
    }
  }

  return (
    <Paper elevation={2} sx={{ p: 2, maxWidth: 600 }}>
      <Stack spacing={2}>
        <Typography variant="subtitle1" fontWeight="medium">
          {props.description}
        </Typography>

        <Box
          ref={editorRef}
          sx={{
            border: 1,
            borderColor: 'divider',
            borderRadius: 1,
            overflow: 'hidden',
            '& .cm-editor': {
              minHeight: 80,
              fontSize: 14,
            },
            '& .cm-scroller': {
              fontFamily: 'monospace',
            },
          }}
        />

        {props.initialErrors.length > 0 && (
          <Stack spacing={1}>
            <Typography variant="body2" color="text.secondary">
              Errors in this formula:
            </Typography>
            {props.initialErrors.map(function renderError(error, index) {
              return (
                <Typography
                  key={index}
                  variant="body2"
                  sx={{
                    fontFamily: 'monospace',
                    fontSize: 12,
                    color: 'error.main',
                    pl: 2,
                  }}
                >
                  [{error.start}-{error.end}]: {error.message}
                </Typography>
              );
            })}

            <Box sx={{ mt: 1 }}>
              <Button variant="outlined" size="small" onClick={handleToggleErrors}>
                {hasErrors ? 'Clear Errors' : 'Show Errors'}
              </Button>
            </Box>

            <Typography variant="caption" color="text.secondary">
              Hover over the underlined text to see the error tooltip.
            </Typography>
          </Stack>
        )}
      </Stack>
    </Paper>
  );
}

const meta: Meta<typeof ErrorMarkerDemo> = {
  title: 'Editor/CodeMirror/ErrorMarker',
  component: ErrorMarkerDemo,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'CodeMirror extension that displays red wavy underlines for formula errors. ' +
          'Hovering over underlined text shows a tooltip with the error message.',
      },
    },
  },
};

export default meta;

type Story = StoryObj<typeof ErrorMarkerDemo>;

/**
 * Clean editor with no errors.
 * Shows a valid formula without any error markers.
 */
export const NoErrors: Story = {
  args: {
    initialFormula: '@price * @quantity',
    initialErrors: [],
    description: 'Clean editor with no errors',
  },
  parameters: {
    docs: {
      description: {
        story:
          'A formula editor without any errors. ' +
          'The formula is valid and displays with syntax highlighting only.',
      },
    },
  },
};

/**
 * Editor with a single error.
 * Shows an unknown variable error with red wavy underline.
 */
export const SingleError: Story = {
  args: {
    initialFormula: '@price * @unknownVar',
    initialErrors: [{ start: 9, end: 20, message: 'Unknown variable @unknownVar' }],
    description: 'Single error: Unknown variable',
  },
  parameters: {
    docs: {
      description: {
        story:
          'A formula with a single error. ' +
          'The unknown variable @unknownVar is underlined with a red wavy line. ' +
          'Hover over the underline to see the error message.',
      },
    },
  },
};

/**
 * Editor with multiple errors.
 * Shows multiple error markers in the same formula.
 */
export const MultipleErrors: Story = {
  args: {
    initialFormula: '@foo + @bar * @baz',
    initialErrors: [
      { start: 0, end: 4, message: 'Unknown variable @foo' },
      { start: 7, end: 11, message: 'Unknown variable @bar' },
      { start: 14, end: 18, message: 'Unknown variable @baz' },
    ],
    description: 'Multiple errors: Several unknown variables',
  },
  parameters: {
    docs: {
      description: {
        story:
          'A formula with multiple errors. ' +
          'Each unknown variable is independently underlined. ' +
          'Hover over each underline to see its specific error message.',
      },
    },
  },
};

/**
 * Error at the beginning of the formula.
 * Tests decoration at position 0.
 */
export const ErrorAtStart: Story = {
  args: {
    initialFormula: 'UNKNOWNFN(@price)',
    initialErrors: [{ start: 0, end: 9, message: 'Unknown function UNKNOWNFN' }],
    description: 'Error at the beginning: Unknown function',
  },
  parameters: {
    docs: {
      description: {
        story:
          'An error at the very beginning of the formula. ' +
          'Tests that decorations work correctly at position 0.',
      },
    },
  },
};

/**
 * Error at the end of the formula.
 * Tests decoration at the last position.
 */
export const ErrorAtEnd: Story = {
  args: {
    initialFormula: '@price * @qty',
    initialErrors: [{ start: 9, end: 13, message: 'Unknown variable @qty' }],
    description: 'Error at the end: Unknown variable',
  },
  parameters: {
    docs: {
      description: {
        story:
          'An error at the end of the formula. ' +
          'Tests that decorations work correctly at the last position.',
      },
    },
  },
};

/**
 * Error spanning the entire formula.
 * Tests decoration covering all content.
 */
export const ErrorSpanningAll: Story = {
  args: {
    initialFormula: '+ +',
    initialErrors: [{ start: 0, end: 3, message: 'Unexpected token: expected expression' }],
    description: 'Error spanning entire formula: Syntax error',
  },
  parameters: {
    docs: {
      description: {
        story:
          'An error that spans the entire formula. ' +
          'This can happen with syntax errors that affect the whole expression.',
      },
    },
  },
};

/**
 * Type mismatch error.
 * Shows a semantic error with detailed message.
 */
export const TypeMismatchError: Story = {
  args: {
    initialFormula: '"hello" + 42',
    initialErrors: [
      {
        start: 0,
        end: 12,
        message: 'Type mismatch: Cannot apply operator "+" to string and number',
      },
    ],
    description: 'Type mismatch error',
  },
  parameters: {
    docs: {
      description: {
        story:
          'A semantic error showing a type mismatch. ' +
          'The tooltip shows a detailed error message explaining the issue.',
      },
    },
  },
};

/**
 * Overlapping error positions.
 * Tests how the extension handles overlapping error ranges.
 */
export const OverlappingErrors: Story = {
  args: {
    initialFormula: 'IF(@a > @b, @c)',
    initialErrors: [
      { start: 0, end: 15, message: 'IF requires 3 arguments, got 2' },
      { start: 3, end: 5, message: 'Unknown variable @a' },
    ],
    description: 'Overlapping errors: Function and variable errors',
  },
  parameters: {
    docs: {
      description: {
        story:
          'Multiple errors with overlapping positions. ' +
          'The outer error covers the entire IF call, while an inner error marks a specific variable.',
      },
    },
  },
};

/**
 * Multi-line formula with error.
 * Tests error marking in multi-line formulas.
 */
export const MultiLineFormula: Story = {
  args: {
    initialFormula: 'IF(\n  @price > 100,\n  @price * 0.9,\n  @unknown\n)',
    initialErrors: [{ start: 40, end: 48, message: 'Unknown variable @unknown' }],
    description: 'Multi-line formula with error',
  },
  parameters: {
    docs: {
      description: {
        story:
          'A multi-line formula with an error on one of the lines. ' +
          'Error marking works correctly across line boundaries.',
      },
    },
  },
};

/**
 * Long error message.
 * Tests tooltip display with verbose error messages.
 */
export const LongErrorMessage: Story = {
  args: {
    initialFormula: 'PERCENTILE(@values, 150)',
    initialErrors: [
      {
        start: 20,
        end: 23,
        message:
          'Invalid percentile value: 150. The percentile argument must be a number between 0 and 100 (inclusive). ' +
          'For example, use 50 for the median, 25 for the first quartile, or 75 for the third quartile.',
      },
    ],
    description: 'Long error message in tooltip',
  },
  parameters: {
    docs: {
      description: {
        story:
          'An error with a long, detailed message. ' +
          'The tooltip wraps text appropriately and has a maximum width to remain readable.',
      },
    },
  },
};
