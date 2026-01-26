/**
 * Storybook stories for the VariableCard component.
 *
 * Demonstrates various states and configurations of the VariableCard:
 * - Different variable types (number, string, boolean)
 * - Variables with null values
 * - Value truncation for long arrays
 * - Long string values
 * - Action button interactions
 *
 * @module
 */

import type { Meta, StoryObj } from '@storybook/react';
import { Box } from '@mui/material';
import React from 'react';
import { fn } from '@storybook/test';

import { VariableCard } from './variable-card.tsx';
import type { PlaygroundVariable } from './variable-card.types.ts';

/**
 * Decorator that provides a container for the card.
 *
 * @param Story - The story component to wrap
 * @returns The wrapped story with container
 */
function CardContainerDecorator(Story: React.ComponentType): React.ReactElement {
  return (
    <Box sx={{ width: 320 }}>
      <Story />
    </Box>
  );
}

const meta: Meta<typeof VariableCard> = {
  title: 'Playground/variable-card',
  component: VariableCard,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'A compact card component for displaying a single test variable in the Playground. ' +
          'Shows the variable name, type badge, value preview, and edit/delete actions.',
      },
    },
  },
  decorators: [CardContainerDecorator],
  argTypes: {
    variable: {
      description: 'The variable to display',
      control: 'object',
    },
    onEdit: {
      description: 'Callback when edit button is clicked',
    },
    onDelete: {
      description: 'Callback when delete is confirmed',
    },
  },
  args: {
    onEdit: fn(),
    onDelete: fn(),
  },
};

export default meta;

type Story = StoryObj<typeof VariableCard>;

/**
 * Number variable with several values.
 * Shows the primary use case with numeric data.
 */
export const NumberVariable: Story = {
  args: {
    variable: {
      name: 'score',
      type: 'number.float',
      values: [85, 92, 78, 95, 88],
    } as PlaygroundVariable,
  },
  parameters: {
    docs: {
      description: {
        story:
          'A number variable showing test scores. The type badge displays "number" ' +
          'and values are shown as a comma-separated list.',
      },
    },
  },
};

/**
 * Integer variable to show the integer type label.
 */
export const IntegerVariable: Story = {
  args: {
    variable: {
      name: 'count',
      type: 'number.integer',
      values: [1, 2, 3, 4, 5],
    } as PlaygroundVariable,
  },
  parameters: {
    docs: {
      description: {
        story: 'An integer variable. The type badge displays "integer" to distinguish from floats.',
      },
    },
  },
};

/**
 * String variable with text values.
 */
export const StringVariable: Story = {
  args: {
    variable: {
      name: 'name',
      type: 'string.text',
      values: ['Alice', 'Bob', 'Charlie'],
    } as PlaygroundVariable,
  },
  parameters: {
    docs: {
      description: {
        story: 'A string variable with name values. Strings are displayed with quotes.',
      },
    },
  },
};

/**
 * Boolean variable with true/false values.
 */
export const BooleanVariable: Story = {
  args: {
    variable: {
      name: 'isActive',
      type: 'boolean.boolean',
      values: [true, false, true, true],
    } as PlaygroundVariable,
  },
  parameters: {
    docs: {
      description: {
        story: 'A boolean variable. Values are displayed as "true" or "false".',
      },
    },
  },
};

/**
 * Variable with null values included.
 */
export const WithNullValues: Story = {
  args: {
    variable: {
      name: 'score',
      type: 'number.float',
      values: [85, null, 78, null, 95],
    } as PlaygroundVariable,
  },
  parameters: {
    docs: {
      description: {
        story:
          'A variable containing null values. Nulls are displayed in gray italic text ' +
          'to clearly distinguish them from actual values.',
      },
    },
  },
};

/**
 * Variable with many values to test truncation.
 */
export const ManyValues: Story = {
  args: {
    variable: {
      name: 'measurements',
      type: 'number.float',
      values: [1.5, 2.3, 3.7, 4.2, 5.1, 6.8, 7.4, 8.9, 9.0, 10.5],
    } as PlaygroundVariable,
  },
  parameters: {
    docs: {
      description: {
        story:
          'A variable with many values shows the first few values followed by "..." ' +
          'Hovering reveals the full list in a tooltip.',
      },
    },
  },
};

/**
 * Variable with long string values to test string truncation.
 */
export const LongStrings: Story = {
  args: {
    variable: {
      name: 'description',
      type: 'string.text',
      values: [
        'This is a very long description that should be truncated',
        'Another lengthy string value for testing',
        'Short',
      ],
    } as PlaygroundVariable,
  },
  parameters: {
    docs: {
      description: {
        story:
          'Long string values are truncated with "..." to keep the card compact. ' +
          'The full values are visible in the tooltip.',
      },
    },
  },
};

/**
 * Variable with empty values array.
 */
export const EmptyValues: Story = {
  args: {
    variable: {
      name: 'empty',
      type: 'number.float',
      values: [],
    } as PlaygroundVariable,
  },
  parameters: {
    docs: {
      description: {
        story: 'A variable with no values displays an empty array "[]".',
      },
    },
  },
};

/**
 * Variable with a long name.
 */
export const LongVariableName: Story = {
  args: {
    variable: {
      name: 'veryLongVariableNameForTesting',
      type: 'number.float',
      values: [1, 2, 3],
    } as PlaygroundVariable,
  },
  parameters: {
    docs: {
      description: {
        story: 'Long variable names are truncated with ellipsis to fit within the card.',
      },
    },
  },
};

/**
 * All null values.
 */
export const AllNullValues: Story = {
  args: {
    variable: {
      name: 'missing',
      type: 'number.float',
      values: [null, null, null],
    } as PlaygroundVariable,
  },
  parameters: {
    docs: {
      description: {
        story: 'A variable where all values are null.',
      },
    },
  },
};

/**
 * Mixed type values (for string type).
 */
export const MixedStringValues: Story = {
  args: {
    variable: {
      name: 'status',
      type: 'string.text',
      values: ['active', 'pending', null, 'completed', 'cancelled'],
    } as PlaygroundVariable,
  },
  parameters: {
    docs: {
      description: {
        story: 'String variable with a mix of values and nulls, common in real data.',
      },
    },
  },
};

/**
 * Narrow container to test responsive behavior.
 */
export const NarrowContainer: Story = {
  args: {
    variable: {
      name: 'price',
      type: 'number.float',
      values: [19.99, 24.5, 15.0, null],
    } as PlaygroundVariable,
  },
  decorators: [
    function NarrowDecorator(Story: React.ComponentType): React.ReactElement {
      return (
        <Box sx={{ width: 200 }}>
          <Story />
        </Box>
      );
    },
  ],
  parameters: {
    docs: {
      description: {
        story: 'In narrow containers, content is truncated appropriately with ellipsis.',
      },
    },
  },
};

/**
 * Multiple cards stacked to show list appearance.
 */
export const MultipleCards: Story = {
  args: {
    variable: {
      name: 'score',
      type: 'number.float',
      values: [85, 92, 78],
    } as PlaygroundVariable,
  },
  decorators: [
    function MultipleCardsDecorator(): React.ReactElement {
      const variables: PlaygroundVariable[] = [
        { name: 'score', type: 'number.float', values: [85, 92, 78] },
        { name: 'name', type: 'string.text', values: ['Alice', 'Bob', 'Charlie'] },
        { name: 'passed', type: 'boolean.boolean', values: [true, true, false] },
      ];

      return (
        <Box sx={{ width: 320, display: 'flex', flexDirection: 'column', gap: 1 }}>
          {variables.map(function renderCard(variable) {
            return (
              <VariableCard key={variable.name} variable={variable} onEdit={fn()} onDelete={fn()} />
            );
          })}
        </Box>
      );
    },
  ],
  parameters: {
    docs: {
      description: {
        story: 'Multiple cards stacked together show how they appear in the VariablePanel.',
      },
    },
  },
};
