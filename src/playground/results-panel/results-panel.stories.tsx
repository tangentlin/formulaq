/**
 * Storybook stories for the ResultsPanel component.
 *
 * Demonstrates all visual states and configurations:
 * - Numeric results
 * - String results
 * - Boolean results
 * - Null values
 * - Error values
 * - Empty state
 * - Loading state
 * - Many rows (scrolling test)
 * - Mixed types
 *
 * @module
 */

import type { Meta, StoryObj } from '@storybook/react';
import { Box } from '@mui/material';
import React from 'react';
import { ResultsPanel } from './results-panel';
import type { Value } from '../../core/types/values';
import type { FormulaRuntimeError } from '../../core/types/errors';

/**
 * Creates a numeric Value.
 *
 * @param value - The numeric value or null
 * @returns A Value object
 */
function numericValue(value: number | null): Value {
  return { type: 'number.float', value };
}

/**
 * Creates a string Value.
 *
 * @param value - The string value or null
 * @returns A Value object
 */
function stringValue(value: string | null): Value {
  return { type: 'string.text', value };
}

/**
 * Creates a boolean Value.
 *
 * @param value - The boolean value or null
 * @returns A Value object
 */
function booleanValue(value: boolean | null): Value {
  return { type: 'boolean.boolean', value };
}

/**
 * Creates an array of numeric values.
 *
 * @param values - Array of numbers or nulls
 * @returns Array of Value objects
 */
function numericValues(values: ReadonlyArray<number | null>): Value[] {
  return values.map(numericValue);
}

/**
 * Creates a runtime error for a specific row.
 *
 * @param rowIndex - The row index
 * @param message - Error message
 * @returns FormulaRuntimeError object
 */
function runtimeError(rowIndex: number, message: string): FormulaRuntimeError {
  return {
    rowIndex,
    code: 'DIV_BY_ZERO',
    message,
  };
}

/**
 * Container decorator for consistent story presentation.
 *
 * @param Story - The story component to wrap
 * @returns Wrapped story element
 */
function ContainerDecorator(Story: React.ComponentType): React.ReactElement {
  return (
    <Box sx={{ width: 400 }}>
      <Story />
    </Box>
  );
}

/**
 * Wide container for testing scrolling behavior.
 *
 * @param Story - The story component to wrap
 * @returns Wrapped story element
 */
function WideContainerDecorator(Story: React.ComponentType): React.ReactElement {
  return (
    <Box sx={{ width: 500 }}>
      <Story />
    </Box>
  );
}

const meta: Meta<typeof ResultsPanel> = {
  title: 'Playground/results-panel',
  component: ResultsPanel,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Displays formula evaluation results in a table format. ' +
          'Shows Index (1-based) and Result columns with statistics below. ' +
          'Supports special formatting for null values (gray italic) and errors (red with icon).',
      },
    },
  },
  decorators: [ContainerDecorator],
  argTypes: {
    results: {
      description: 'Array of evaluation result values',
    },
    errors: {
      description: 'Array of runtime errors',
    },
    isEvaluating: {
      control: 'boolean',
      description: 'Whether evaluation is in progress',
    },
    emptyMessage: {
      control: 'text',
      description: 'Custom empty state message',
    },
  },
};

export default meta;

type Story = StoryObj<typeof ResultsPanel>;

/**
 * Default story with numeric results.
 */
export const Default: Story = {
  args: {
    results: numericValues([42.5, 100, 73.25, 88.888, 55]),
  },
  parameters: {
    docs: {
      description: {
        story:
          'Basic display of numeric results. Shows 1-based index and formatted values. ' +
          'Statistics include count, min, max, nulls, and errors.',
      },
    },
  },
};

/**
 * Story with numeric results including various number formats.
 */
export const NumericResults: Story = {
  args: {
    results: numericValues([0, 1, -1, 3.14159265359, 1000000, 0.0001, 1.23e8, -42.5]),
  },
  parameters: {
    docs: {
      description: {
        story:
          'Shows various numeric formats including integers, decimals, ' +
          'large numbers, small numbers, and negative values.',
      },
    },
  },
};

/**
 * Story with string results.
 */
export const StringResults: Story = {
  args: {
    results: [
      stringValue('Hello'),
      stringValue('World'),
      stringValue('FormulaQ'),
      stringValue(''),
      stringValue('With "quotes"'),
    ],
  },
  parameters: {
    docs: {
      description: {
        story:
          'String values are displayed in double quotes. ' +
          'Empty strings are shown as empty quotes. ' +
          'Min/max statistics are hidden for non-numeric results.',
      },
    },
  },
};

/**
 * Story with boolean results.
 */
export const BooleanResults: Story = {
  args: {
    results: [
      booleanValue(true),
      booleanValue(false),
      booleanValue(true),
      booleanValue(false),
      booleanValue(true),
    ],
  },
  parameters: {
    docs: {
      description: {
        story:
          'Boolean values are displayed as TRUE or FALSE (uppercase). ' +
          'Min/max statistics are hidden for boolean results.',
      },
    },
  },
};

/**
 * Story with null values.
 */
export const WithNullValues: Story = {
  args: {
    results: numericValues([42.5, null, 100, null, 75.25, null]),
  },
  parameters: {
    docs: {
      description: {
        story:
          'Null values are displayed in gray italic text. ' +
          'The statistics section shows the count of null values. ' +
          'Min/max calculations exclude null values.',
      },
    },
  },
};

/**
 * Story with errors.
 */
export const WithErrors: Story = {
  args: {
    results: numericValues([42.5, null, 100, null, 75.25]),
    errors: [runtimeError(1, 'Division by zero'), runtimeError(3, 'Domain error in LOG')],
  },
  parameters: {
    docs: {
      description: {
        story:
          'Error rows are displayed with a red error icon and "Error" text. ' +
          'The statistics section shows the error count in red. ' +
          'Error rows are not counted as nulls.',
      },
    },
  },
};

/**
 * Story with empty state.
 */
export const EmptyState: Story = {
  args: {
    results: [],
  },
  parameters: {
    docs: {
      description: {
        story:
          'When there are no results, an empty state message is displayed. ' +
          'The default message is "No results to display".',
      },
    },
  },
};

/**
 * Story with custom empty message.
 */
export const CustomEmptyMessage: Story = {
  args: {
    results: [],
    emptyMessage: 'Enter a formula to see results',
  },
  parameters: {
    docs: {
      description: {
        story: 'The empty state message can be customized via the emptyMessage prop.',
      },
    },
  },
};

/**
 * Story with loading state.
 */
export const LoadingState: Story = {
  args: {
    results: [],
    isEvaluating: true,
  },
  parameters: {
    docs: {
      description: {
        story:
          'During evaluation, skeleton placeholders are shown instead of actual data. ' +
          'This provides visual feedback that processing is in progress.',
      },
    },
  },
};

/**
 * Story with many rows to test scrolling.
 */
export const ManyRows: Story = {
  args: {
    results: Array.from({ length: 100 }, function generateValue() {
      return numericValue(Math.random() * 1000);
    }),
  },
  decorators: [WideContainerDecorator],
  parameters: {
    docs: {
      description: {
        story:
          'With many rows, the table becomes scrollable while the header remains fixed. ' +
          'The statistics section remains visible below the table.',
      },
    },
  },
};

/**
 * Story with mixed null and error values.
 */
export const MixedNullsAndErrors: Story = {
  args: {
    results: numericValues([100, null, 200, null, 300, null, 400, null, 500]),
    errors: [runtimeError(1, 'Division by zero'), runtimeError(5, 'Overflow')],
  },
  parameters: {
    docs: {
      description: {
        story:
          'Demonstrates the distinction between null values and error values. ' +
          'Error rows show red styling, while regular nulls show gray italic.',
      },
    },
  },
};

/**
 * Story with all null values.
 */
export const AllNulls: Story = {
  args: {
    results: numericValues([null, null, null, null, null]),
  },
  parameters: {
    docs: {
      description: {
        story: 'When all values are null, min/max statistics show "-" to indicate no valid values.',
      },
    },
  },
};

/**
 * Story with special numeric values.
 */
export const SpecialNumbers: Story = {
  args: {
    results: numericValues([0, -0, 1e-10, 1e10, Number.MAX_SAFE_INTEGER, Number.MIN_SAFE_INTEGER]),
  },
  parameters: {
    docs: {
      description: {
        story:
          'Shows formatting of special numeric values including zero, ' +
          'very small/large numbers, and integer limits.',
      },
    },
  },
};

/**
 * Story with single result.
 */
export const SingleResult: Story = {
  args: {
    results: numericValues([42]),
  },
  parameters: {
    docs: {
      description: {
        story: 'Even with a single result, the full table structure and statistics are shown.',
      },
    },
  },
};
