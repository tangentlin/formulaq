/**
 * Storybook stories for the ProgressOverlay component.
 *
 * Demonstrates all visual states of the progress overlay:
 * - 0% progress (just started)
 * - 50% progress (halfway)
 * - 99% progress (almost complete)
 * - 100% complete
 * - With cancel button
 * - Without cancel button
 * - Large numbers (millions of rows)
 *
 * @module
 */

import type { Meta, StoryObj } from '@storybook/react';
import { Box } from '@mui/material';
import { fn } from '@storybook/test';
import React from 'react';
import { ProgressOverlay } from './progress-overlay';

/**
 * Decorator that provides a container simulating a DataGrid context.
 * Shows the overlay within a bounded area with relative positioning.
 *
 * @param Story - The story component to wrap
 * @returns The wrapped story with grid-like container
 */
function GridContextDecorator(Story: React.ComponentType): React.ReactElement {
  return (
    <Box
      sx={{
        position: 'relative',
        width: 600,
        height: 400,
        border: 1,
        borderColor: 'divider',
        borderRadius: 1,
        overflow: 'hidden',
        backgroundColor: 'grey.100',
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'text.secondary',
          fontSize: 14,
        }}
      >
        DataGrid Content (simulated)
      </Box>
      <Story />
    </Box>
  );
}

const meta: Meta<typeof ProgressOverlay> = {
  title: 'DataGrid/ProgressOverlay',
  component: ProgressOverlay,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'An inline overlay component that displays evaluation progress for large datasets. ' +
          'Shows a linear progress bar with percentage, row count display, and optional cancel button. ' +
          'Designed to overlay a DataGrid while formula evaluation is in progress.',
      },
    },
  },
  decorators: [GridContextDecorator],
  argTypes: {
    visible: {
      control: 'boolean',
      description: 'Whether the overlay is visible',
    },
    completed: {
      control: 'number',
      description: 'Number of rows completed',
    },
    total: {
      control: 'number',
      description: 'Total number of rows',
    },
    onCancel: {
      action: 'cancelled',
      description: 'Callback when cancel button is clicked',
    },
  },
};

export default meta;

type Story = StoryObj<typeof ProgressOverlay>;

/**
 * Default story showing 50% progress with cancel button.
 * This is the typical state during evaluation.
 */
export const Default: Story = {
  args: {
    visible: true,
    completed: 50000,
    total: 100000,
    onCancel: fn(),
  },
  parameters: {
    docs: {
      description: {
        story:
          'Default progress overlay at 50% completion. ' +
          'Shows the progress bar, row count, and cancel button.',
      },
    },
  },
};

/**
 * Story showing 0% progress (just started).
 */
export const ZeroPercent: Story = {
  args: {
    visible: true,
    completed: 0,
    total: 100000,
    onCancel: fn(),
  },
  parameters: {
    docs: {
      description: {
        story:
          'Progress at 0% - evaluation has just started. ' + 'The progress bar shows no fill yet.',
      },
    },
  },
};

/**
 * Story showing 50% progress.
 */
export const FiftyPercent: Story = {
  args: {
    visible: true,
    completed: 50000,
    total: 100000,
    onCancel: fn(),
  },
  parameters: {
    docs: {
      description: {
        story: 'Progress at exactly 50% completion.',
      },
    },
  },
};

/**
 * Story showing 99% progress (almost complete).
 */
export const NinetyNinePercent: Story = {
  args: {
    visible: true,
    completed: 99000,
    total: 100000,
    onCancel: fn(),
  },
  parameters: {
    docs: {
      description: {
        story:
          'Progress at 99% - evaluation is almost complete. ' +
          'Users can still cancel at this point if needed.',
      },
    },
  },
};

/**
 * Story showing 100% complete.
 */
export const Complete: Story = {
  args: {
    visible: true,
    completed: 100000,
    total: 100000,
    onCancel: fn(),
  },
  parameters: {
    docs: {
      description: {
        story:
          'Progress at 100% complete. ' +
          'The overlay would typically fade out shortly after this state.',
      },
    },
  },
};

/**
 * Story showing progress without cancel button.
 */
export const WithoutCancelButton: Story = {
  args: {
    visible: true,
    completed: 25000,
    total: 100000,
    onCancel: undefined,
  },
  parameters: {
    docs: {
      description: {
        story:
          'Progress overlay without a cancel button. ' +
          'Used when cancellation is not supported or desired.',
      },
    },
  },
};

/**
 * Story showing progress with cancel button.
 */
export const WithCancelButton: Story = {
  args: {
    visible: true,
    completed: 75000,
    total: 100000,
    onCancel: fn(),
  },
  parameters: {
    docs: {
      description: {
        story:
          'Progress overlay with a cancel button. ' +
          'Clicking the button triggers the onCancel callback.',
      },
    },
  },
};

/**
 * Story showing large numbers (millions of rows).
 */
export const LargeNumbers: Story = {
  args: {
    visible: true,
    completed: 5_432_100,
    total: 10_000_000,
    onCancel: fn(),
  },
  parameters: {
    docs: {
      description: {
        story:
          'Progress with large numbers (millions of rows). ' +
          'Numbers are formatted with thousand separators for readability.',
      },
    },
  },
};

/**
 * Story showing very large numbers (tens of millions).
 */
export const VeryLargeNumbers: Story = {
  args: {
    visible: true,
    completed: 87_654_321,
    total: 100_000_000,
    onCancel: fn(),
  },
  parameters: {
    docs: {
      description: {
        story:
          'Progress with very large numbers (100 million rows). ' +
          'Demonstrates number formatting at scale.',
      },
    },
  },
};

/**
 * Story showing hidden overlay.
 */
export const Hidden: Story = {
  args: {
    visible: false,
    completed: 50000,
    total: 100000,
    onCancel: fn(),
  },
  parameters: {
    docs: {
      description: {
        story:
          'When visible is false, the overlay is not rendered. ' +
          'Only the simulated DataGrid content is shown.',
      },
    },
  },
};

/**
 * Story showing small dataset.
 */
export const SmallDataset: Story = {
  args: {
    visible: true,
    completed: 50,
    total: 100,
    onCancel: fn(),
  },
  parameters: {
    docs: {
      description: {
        story:
          'Progress with a small dataset (100 rows). ' +
          'The overlay would typically not be shown for such small datasets.',
      },
    },
  },
};

/**
 * Interactive story with controls for all props.
 */
export const Interactive: Story = {
  args: {
    visible: true,
    completed: 35000,
    total: 100000,
    onCancel: fn(),
  },
  parameters: {
    docs: {
      description: {
        story:
          'Interactive story with controls. ' +
          'Use the controls panel to adjust all props and see the effect.',
      },
    },
  },
};
