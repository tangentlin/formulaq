/**
 * Storybook stories for the AggregationDisplay component.
 *
 * Demonstrates all visual states of the aggregation display:
 * - Single aggregation (AVG)
 * - Multiple aggregations
 * - With null result
 * - Various aggregation types (SUM, MIN, MAX, COUNT, PERCENTILE)
 * - No aggregations (empty state)
 *
 * @module
 */

import type { Meta, StoryObj } from '@storybook/react';
import { Box } from '@mui/material';
import React from 'react';
import { AggregationDisplay } from './aggregation-display';

/**
 * Decorator that provides a results panel-like container.
 *
 * @param Story - The story component to wrap
 * @returns The wrapped story with panel-like container
 */
function ResultsPanelDecorator(Story: React.ComponentType): React.ReactElement {
  return (
    <Box
      sx={{
        width: 320,
        p: 2,
        backgroundColor: 'background.paper',
        border: 1,
        borderColor: 'divider',
        borderRadius: 1,
      }}
    >
      <Story />
    </Box>
  );
}

const meta: Meta<typeof AggregationDisplay> = {
  title: 'Playground/aggregation-display',
  component: AggregationDisplay,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'A compact component that displays computed aggregation values in the results panel. ' +
          'Each aggregation is shown as "expression = value" format. ' +
          'Numbers are formatted with reasonable precision (2-4 decimals). ' +
          'Returns null when there are no aggregations.',
      },
    },
  },
  decorators: [ResultsPanelDecorator],
  argTypes: {
    aggregations: {
      control: 'object',
      description: 'Array of aggregation results to display',
    },
  },
};

export default meta;

type Story = StoryObj<typeof AggregationDisplay>;

/**
 * Single AVG aggregation result.
 * The most common use case with a single aggregation function.
 */
export const SingleAggregation: Story = {
  args: {
    aggregations: [
      {
        expression: 'AVG(@score)',
        value: { type: 'number.float', value: 85.5 },
      },
    ],
  },
  parameters: {
    docs: {
      description: {
        story:
          'A single AVG aggregation showing the average value. ' +
          'This is the most common use case when a formula contains one aggregation function.',
      },
    },
  },
};

/**
 * Multiple aggregation results.
 * Demonstrates how multiple aggregations are displayed in a list.
 */
export const MultipleAggregations: Story = {
  args: {
    aggregations: [
      {
        expression: 'AVG(@score)',
        value: { type: 'number.float', value: 85.5 },
      },
      {
        expression: 'SUM(@amounts)',
        value: { type: 'number.float', value: 1250 },
      },
      {
        expression: 'MIN(@values)',
        value: { type: 'number.float', value: 10 },
      },
      {
        expression: 'MAX(@values)',
        value: { type: 'number.float', value: 100 },
      },
    ],
  },
  parameters: {
    docs: {
      description: {
        story:
          'Multiple aggregation functions displayed in a list. ' +
          'This occurs when a formula references multiple aggregation calls.',
      },
    },
  },
};

/**
 * Aggregation with null result.
 * Shows how null values are styled distinctly.
 */
export const WithNullResult: Story = {
  args: {
    aggregations: [
      {
        expression: 'AVG(@score)',
        value: { type: 'number.float', value: null },
      },
    ],
  },
  parameters: {
    docs: {
      description: {
        story:
          'When an aggregation results in null (e.g., all input values were null), ' +
          'the result is displayed in a distinct italic style.',
      },
    },
  },
};

/**
 * Mixed results with some null values.
 * Demonstrates multiple aggregations where some have null results.
 */
export const MixedResults: Story = {
  args: {
    aggregations: [
      {
        expression: 'AVG(@score)',
        value: { type: 'number.float', value: 85.5 },
      },
      {
        expression: 'SUM(@emptyColumn)',
        value: { type: 'number.float', value: null },
      },
      {
        expression: 'COUNT(@values)',
        value: { type: 'number.integer', value: 42 },
      },
    ],
  },
  parameters: {
    docs: {
      description: {
        story:
          'A mix of aggregations with both computed values and null results. ' +
          'Null results are visually distinct from computed values.',
      },
    },
  },
};

/**
 * All aggregation types.
 * Demonstrates SUM, AVG, MIN, MAX, COUNT, and PERCENTILE functions.
 */
export const AllAggregationTypes: Story = {
  args: {
    aggregations: [
      {
        expression: 'SUM(@amounts)',
        value: { type: 'number.float', value: 12500.75 },
      },
      {
        expression: 'AVG(@score)',
        value: { type: 'number.float', value: 82.3333 },
      },
      {
        expression: 'MIN(@values)',
        value: { type: 'number.float', value: 5 },
      },
      {
        expression: 'MAX(@values)',
        value: { type: 'number.float', value: 150 },
      },
      {
        expression: 'COUNT(@items)',
        value: { type: 'number.integer', value: 100 },
      },
      {
        expression: 'PERCENTILE(@values, 50)',
        value: { type: 'number.float', value: 75.5 },
      },
    ],
  },
  parameters: {
    docs: {
      description: {
        story:
          'All available aggregation functions: SUM, AVG, MIN, MAX, COUNT, and PERCENTILE. ' +
          'Each function type is displayed with its computed value.',
      },
    },
  },
};

/**
 * No aggregations (empty state).
 * The component returns null and renders nothing.
 */
export const Empty: Story = {
  args: {
    aggregations: [],
  },
  decorators: [
    function EmptyStateDecorator(Story: React.ComponentType): React.ReactElement {
      return (
        <Box
          sx={{
            width: 320,
            p: 2,
            backgroundColor: 'background.paper',
            border: 1,
            borderColor: 'divider',
            borderRadius: 1,
          }}
        >
          <Box
            sx={{
              color: 'text.secondary',
              fontSize: 14,
              textAlign: 'center',
              py: 2,
            }}
          >
            (Component renders nothing when empty)
          </Box>
          <Story />
          <Box
            sx={{
              color: 'text.secondary',
              fontSize: 14,
              textAlign: 'center',
              py: 2,
            }}
          >
            (End of component area)
          </Box>
        </Box>
      );
    },
  ],
  parameters: {
    docs: {
      description: {
        story:
          'When there are no aggregations, the component returns null and renders nothing. ' +
          'This is the expected behavior for formulas without aggregation functions.',
      },
    },
  },
};

/**
 * Precision formatting examples.
 * Shows how different numeric values are formatted.
 */
export const PrecisionFormatting: Story = {
  args: {
    aggregations: [
      {
        expression: 'AVG(@precise)',
        value: { type: 'number.float', value: 3.14159265359 },
      },
      {
        expression: 'AVG(@twoDecimals)',
        value: { type: 'number.float', value: 10.25 },
      },
      {
        expression: 'SUM(@integers)',
        value: { type: 'number.integer', value: 1000 },
      },
      {
        expression: 'AVG(@small)',
        value: { type: 'number.float', value: 0.000025 },
      },
      {
        expression: 'SUM(@large)',
        value: { type: 'number.float', value: 1500000000 },
      },
    ],
  },
  parameters: {
    docs: {
      description: {
        story:
          'Demonstrates the number formatting logic: ' +
          'values are shown with 2-4 decimal places for precision, ' +
          'integers are displayed without decimals, ' +
          'and very large/small numbers use exponential notation.',
      },
    },
  },
};

/**
 * Long expression names.
 * Tests how the component handles longer aggregation expressions.
 */
export const LongExpressions: Story = {
  args: {
    aggregations: [
      {
        expression: 'AVG(@very_long_variable_name_for_testing)',
        value: { type: 'number.float', value: 42.5 },
      },
      {
        expression: 'PERCENTILE(@another_long_column_name, 95)',
        value: { type: 'number.float', value: 98.75 },
      },
    ],
  },
  parameters: {
    docs: {
      description: {
        story:
          'Tests the layout with longer variable names in aggregation expressions. ' +
          'The component should handle these gracefully without breaking the layout.',
      },
    },
  },
};

/**
 * Interactive playground story.
 * Allows experimentation with different aggregation configurations.
 */
export const Interactive: Story = {
  args: {
    aggregations: [
      {
        expression: 'AVG(@score)',
        value: { type: 'number.float', value: 85.5 },
      },
      {
        expression: 'SUM(@amounts)',
        value: { type: 'number.float', value: 1250 },
      },
    ],
  },
  parameters: {
    docs: {
      description: {
        story:
          'Interactive story for experimenting with the AggregationDisplay component. ' +
          'Use the controls to modify the aggregations array.',
      },
    },
  },
};
