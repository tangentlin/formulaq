/**
 * Storybook stories for the ValidationStatus component.
 *
 * Demonstrates all visual states of the validation status bar:
 * - Idle (initial state)
 * - Validating (loading)
 * - Valid (success)
 * - Invalid with various error scenarios
 *
 * @module
 */

import type { Meta, StoryObj } from '@storybook/react';
import { Box } from '@mui/material';
import React from 'react';
import { ValidationStatus } from './validation-status';

/**
 * Decorator that provides a container simulating the editor context.
 * Shows the status bar below a mock editor area.
 *
 * @param Story - The story component to wrap
 * @returns The wrapped story with editor-like container
 */
function EditorContextDecorator(Story: React.ComponentType): React.ReactElement {
  return (
    <Box
      sx={{
        width: 400,
        border: 1,
        borderColor: 'divider',
        borderRadius: 1,
        overflow: 'hidden',
      }}
    >
      <Box
        sx={{
          height: 100,
          backgroundColor: 'grey.100',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'text.secondary',
          fontSize: 14,
        }}
      >
        Editor Area (simulated)
      </Box>
      <Story />
    </Box>
  );
}

/**
 * Wide container decorator for testing text truncation.
 * Uses a narrower width to demonstrate ellipsis behavior.
 *
 * @param Story - The story component to wrap
 * @returns The wrapped story with narrow container
 */
function NarrowContainerDecorator(Story: React.ComponentType): React.ReactElement {
  return (
    <Box
      sx={{
        width: 250,
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

const meta: Meta<typeof ValidationStatus> = {
  title: 'Editor/ValidationStatus',
  component: ValidationStatus,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'A compact status bar component that displays the validation state of a formula. ' +
          'Designed to be placed below the formula editor (~32-40px height). ' +
          'Shows different visual states: idle, validating, valid, or invalid with error details.',
      },
    },
  },
  decorators: [EditorContextDecorator],
  argTypes: {
    status: {
      control: 'select',
      options: ['idle', 'validating', 'valid', 'invalid'],
      description: 'The current validation status',
    },
    errorMessage: {
      control: 'text',
      description: 'Error message to display when status is invalid',
    },
    errorPosition: {
      control: 'object',
      description: 'Position information for the error (line and column)',
    },
  },
};

export default meta;

type Story = StoryObj<typeof ValidationStatus>;

/**
 * Default story showing the idle state.
 * This is the initial state before any validation has been performed.
 */
export const Default: Story = {
  args: {
    status: 'idle',
  },
  parameters: {
    docs: {
      description: {
        story:
          'The idle state is shown when no formula has been entered or validation has not yet been triggered. ' +
          'Displays a grayed-out placeholder message.',
      },
    },
  },
};

/**
 * Story showing the validating state.
 * Displays a spinner and "Validating..." text.
 */
export const Validating: Story = {
  args: {
    status: 'validating',
  },
  parameters: {
    docs: {
      description: {
        story:
          'The validating state shows a loading spinner while the formula is being checked. ' +
          'This state should be brief for most formulas.',
      },
    },
  },
};

/**
 * Story showing the valid state.
 * Displays a green checkmark and "Formula is valid" text.
 */
export const Valid: Story = {
  args: {
    status: 'valid',
  },
  parameters: {
    docs: {
      description: {
        story:
          'The valid state confirms the formula passed all validation checks. ' +
          'Displays a green checkmark icon with success message.',
      },
    },
  },
};

/**
 * Story showing the invalid state with a short error message.
 * Displays a red X icon with the error message.
 */
export const InvalidShortError: Story = {
  args: {
    status: 'invalid',
    errorMessage: 'Unknown variable @foo',
  },
  parameters: {
    docs: {
      description: {
        story:
          'The invalid state displays the error message from validation. ' +
          'Short messages are displayed in full.',
      },
    },
  },
};

/**
 * Story showing the invalid state with a long error message.
 * Demonstrates text truncation with ellipsis.
 */
export const InvalidLongError: Story = {
  args: {
    status: 'invalid',
    errorMessage:
      'Type mismatch: Cannot apply arithmetic operator "+" to operands of type "string" and "number". ' +
      'Expected both operands to be numeric types.',
  },
  parameters: {
    docs: {
      description: {
        story:
          'Long error messages are truncated with an ellipsis. ' +
          'The full message is available as a tooltip on hover.',
      },
    },
  },
};

/**
 * Story showing the invalid state with position information.
 * Displays line and column numbers along with the error message.
 */
export const InvalidWithPosition: Story = {
  args: {
    status: 'invalid',
    errorMessage: 'Unknown variable @foo',
    errorPosition: {
      line: 1,
      column: 5,
    },
  },
  parameters: {
    docs: {
      description: {
        story:
          'When position information is available, it is displayed before the error message. ' +
          'This helps users locate the exact position of the error in the formula.',
      },
    },
  },
};

/**
 * Story showing position info with line 2.
 * Demonstrates multi-line formula error positioning.
 */
export const InvalidMultilineFormula: Story = {
  args: {
    status: 'invalid',
    errorMessage: 'Expected closing parenthesis',
    errorPosition: {
      line: 2,
      column: 12,
    },
  },
  parameters: {
    docs: {
      description: {
        story:
          'For multi-line formulas, the position shows which line the error occurred on. ' +
          'This helps users navigate to the correct location.',
      },
    },
  },
};

/**
 * Story demonstrating text truncation in a narrow container.
 * Uses a narrower container to force ellipsis behavior.
 */
export const TruncatedError: Story = {
  args: {
    status: 'invalid',
    errorMessage:
      'Function IF requires exactly 3 arguments but received 2. ' +
      'Usage: IF(condition, value_if_true, value_if_false)',
    errorPosition: {
      line: 1,
      column: 1,
    },
  },
  decorators: [NarrowContainerDecorator],
  parameters: {
    docs: {
      description: {
        story:
          'In narrow containers, error messages are truncated with an ellipsis. ' +
          'The full error text is available via tooltip on hover.',
      },
    },
  },
};

/**
 * Story showing invalid state without an error message.
 * Demonstrates fallback behavior.
 */
export const InvalidNoMessage: Story = {
  args: {
    status: 'invalid',
    errorMessage: undefined,
  },
  parameters: {
    docs: {
      description: {
        story:
          'When no error message is provided, a generic "Validation error" message is displayed. ' +
          'This is a fallback for edge cases.',
      },
    },
  },
};
