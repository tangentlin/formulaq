/**
 * Storybook stories for the DeleteColumnDialog component.
 *
 * Demonstrates all visual states of the delete column dialog:
 * - No dependents (can delete)
 * - Single dependent (blocked)
 * - Multiple dependents (blocked)
 * - Long column name
 *
 * @module
 */

import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { DeleteColumnDialog } from './delete-column-dialog';

const meta: Meta<typeof DeleteColumnDialog> = {
  title: 'DataGrid/DeleteColumnDialog',
  component: DeleteColumnDialog,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'A confirmation dialog for deleting formula columns. ' +
          'When the column has dependents (other columns that reference it), ' +
          'deletion is blocked and the dependent columns are listed. ' +
          'When there are no dependents, a simple confirmation is shown.',
      },
    },
  },
  argTypes: {
    open: {
      control: 'boolean',
      description: 'Whether the dialog is open',
    },
    columnName: {
      control: 'text',
      description: 'The name of the column being deleted',
    },
    dependentColumns: {
      control: 'object',
      description: 'Columns that depend on this one',
    },
    onConfirm: {
      action: 'confirmed',
      description: 'Callback when deletion is confirmed',
    },
    onCancel: {
      action: 'cancelled',
      description: 'Callback when dialog is cancelled',
    },
  },
};

export default meta;

type Story = StoryObj<typeof DeleteColumnDialog>;

/**
 * Default story showing a deletable column with no dependents.
 * The user can confirm or cancel the deletion.
 */
export const Default: Story = {
  args: {
    open: true,
    columnName: 'total_price',
    dependentColumns: [],
    onConfirm: fn(),
    onCancel: fn(),
  },
  parameters: {
    docs: {
      description: {
        story:
          'Default state when the column has no dependents. ' +
          'The Delete button is enabled and the user can proceed with deletion.',
      },
    },
  },
};

/**
 * Story showing a column with no dependents that can be deleted.
 */
export const NoDependents: Story = {
  args: {
    open: true,
    columnName: 'discount',
    dependentColumns: [],
    onConfirm: fn(),
    onCancel: fn(),
  },
  parameters: {
    docs: {
      description: {
        story:
          'A column with no dependents. Shows a simple confirmation dialog ' +
          'with Cancel and Delete buttons.',
      },
    },
  },
};

/**
 * Story showing a column blocked by a single dependent.
 */
export const SingleDependent: Story = {
  args: {
    open: true,
    columnName: 'price',
    dependentColumns: ['total_price'],
    onConfirm: fn(),
    onCancel: fn(),
  },
  parameters: {
    docs: {
      description: {
        story:
          'A column that cannot be deleted because one other column depends on it. ' +
          'The dialog shows the dependent column and only provides an OK button.',
      },
    },
  },
};

/**
 * Story showing a column blocked by multiple dependents.
 */
export const MultipleDependents: Story = {
  args: {
    open: true,
    columnName: 'price',
    dependentColumns: ['total_price', 'discount_amount', 'tax_amount'],
    onConfirm: fn(),
    onCancel: fn(),
  },
  parameters: {
    docs: {
      description: {
        story:
          'A column that cannot be deleted because multiple columns depend on it. ' +
          'All dependent columns are listed.',
      },
    },
  },
};

/**
 * Story showing a column with many dependents (scrollable list).
 */
export const ManyDependents: Story = {
  args: {
    open: true,
    columnName: 'base_value',
    dependentColumns: [
      'calculated_a',
      'calculated_b',
      'calculated_c',
      'calculated_d',
      'calculated_e',
      'summary_total',
      'variance',
      'percentage',
    ],
    onConfirm: fn(),
    onCancel: fn(),
  },
  parameters: {
    docs: {
      description: {
        story:
          'A column with many dependents. The list may become scrollable ' +
          'when there are too many items to display.',
      },
    },
  },
};

/**
 * Story showing a long column name.
 */
export const LongColumnName: Story = {
  args: {
    open: true,
    columnName: 'very_long_column_name_that_might_wrap_to_multiple_lines',
    dependentColumns: [],
    onConfirm: fn(),
    onCancel: fn(),
  },
  parameters: {
    docs: {
      description: {
        story:
          'A column with a very long name. The dialog handles long names ' +
          'gracefully by wrapping or truncating as needed.',
      },
    },
  },
};

/**
 * Story showing a long column name with dependents.
 */
export const LongColumnNameBlocked: Story = {
  args: {
    open: true,
    columnName: 'very_long_base_column_name_example',
    dependentColumns: ['another_very_long_dependent_column_name', 'short', 'medium_length_column'],
    onConfirm: fn(),
    onCancel: fn(),
  },
  parameters: {
    docs: {
      description: {
        story:
          'A blocked column with long names for both the target and dependents. ' +
          'Tests layout with various name lengths.',
      },
    },
  },
};

/**
 * Story showing the dialog in closed state.
 */
export const Closed: Story = {
  args: {
    open: false,
    columnName: 'total_price',
    dependentColumns: [],
    onConfirm: fn(),
    onCancel: fn(),
  },
  parameters: {
    docs: {
      description: {
        story: 'When open is false, the dialog is not rendered.',
      },
    },
  },
};

/**
 * Interactive story with controls for all props.
 */
export const Interactive: Story = {
  args: {
    open: true,
    columnName: 'example_column',
    dependentColumns: ['dependent_a', 'dependent_b'],
    onConfirm: fn(),
    onCancel: fn(),
  },
  parameters: {
    docs: {
      description: {
        story:
          'Interactive story with controls. Use the controls panel to ' +
          'adjust all props and see the effect.',
      },
    },
  },
};
