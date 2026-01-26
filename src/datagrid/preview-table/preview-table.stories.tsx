/**
 * Storybook stories for the PreviewTable component.
 *
 * Demonstrates all visual states and configurations:
 * - Normal case with data
 * - With null values
 * - With errors
 * - Empty state (no data)
 * - Many columns
 * - Long values (truncation test)
 * - Boolean values
 * - Mixed types
 *
 * @module
 */

import type { Meta, StoryObj } from '@storybook/react';
import { Box } from '@mui/material';
import React from 'react';
import { PreviewTable } from './preview-table';
import type { PreviewColumn, PreviewRow } from './preview-table.types';

/**
 * Creates a basic set of columns for testing.
 *
 * @returns Array of preview columns
 */
function createBasicColumns(): PreviewColumn[] {
  return [
    { field: 'price', headerName: '@price' },
    { field: 'tax_rate', headerName: '@tax_rate' },
    { field: 'result', headerName: 'Result', isResult: true },
  ];
}

/**
 * Creates basic row data for testing.
 *
 * @returns Array of preview rows
 */
function createBasicRows(): PreviewRow[] {
  return [
    { id: 0, price: 100, tax_rate: 0.1, result: 110 },
    { id: 1, price: 200, tax_rate: 0.1, result: 220 },
    { id: 2, price: 150, tax_rate: 0.08, result: 162 },
    { id: 3, price: 175, tax_rate: 0.08, result: 189 },
    { id: 4, price: 250, tax_rate: 0.15, result: 287.5 },
  ];
}

/**
 * Creates rows with null values for testing.
 *
 * @returns Array of preview rows with nulls
 */
function createRowsWithNulls(): PreviewRow[] {
  return [
    { id: 0, price: 100, tax_rate: 0.1, result: 110 },
    { id: 1, price: 200, tax_rate: 0.1, result: 220 },
    { id: 2, price: null, tax_rate: 0.1, result: null },
    { id: 3, price: 150, tax_rate: null, result: null },
    { id: 4, price: 175, tax_rate: 0.08, result: 189 },
  ];
}

/**
 * Creates rows with error placeholders for testing.
 *
 * @returns Array of preview rows with error indices
 */
function createRowsWithErrors(): PreviewRow[] {
  return [
    { id: 0, price: 100, tax_rate: 0.1, result: 110 },
    { id: 1, price: 200, tax_rate: 0, result: null },
    { id: 2, price: 150, tax_rate: 0.08, result: 162 },
    { id: 3, price: 175, tax_rate: -1, result: null },
    { id: 4, price: 250, tax_rate: 0.15, result: 287.5 },
  ];
}

/**
 * Creates an error map for testing.
 *
 * @returns Map of row indices to error messages
 */
function createErrorMap(): Map<number, string> {
  const errors = new Map<number, string>();
  errors.set(1, 'Division by zero: tax_rate cannot be 0');
  errors.set(3, 'Invalid value: tax_rate must be positive');
  return errors;
}

/**
 * Creates columns for a many-column test.
 *
 * @returns Array of many preview columns
 */
function createManyColumns(): PreviewColumn[] {
  return [
    { field: 'col_a', headerName: '@column_a' },
    { field: 'col_b', headerName: '@column_b' },
    { field: 'col_c', headerName: '@column_c' },
    { field: 'col_d', headerName: '@column_d' },
    { field: 'col_e', headerName: '@column_e' },
    { field: 'result', headerName: 'Result', isResult: true },
  ];
}

/**
 * Creates rows for a many-column test.
 *
 * @returns Array of preview rows with many columns
 */
function createManyColumnRows(): PreviewRow[] {
  const rows: PreviewRow[] = [];
  for (let i = 0; i < 10; i++) {
    rows.push({
      id: i,
      col_a: i * 10,
      col_b: i * 20,
      col_c: i * 30,
      col_d: i * 40,
      col_e: i * 50,
      result: i * 10 + i * 20 + i * 30 + i * 40 + i * 50,
    });
  }
  return rows;
}

/**
 * Creates rows with long string values for testing truncation.
 *
 * @returns Array of preview rows with long values
 */
function createLongValueRows(): PreviewRow[] {
  return [
    {
      id: 0,
      name: 'This is a very long product name that should be truncated in the display',
      category: 'Electronics',
      result: 'This is an extremely long result value that definitely needs to be truncated',
    },
    {
      id: 1,
      name: 'Short name',
      category: 'Category with a moderately long name that might get cut off',
      result: 42.5,
    },
    {
      id: 2,
      name: 'Another product with a really really long descriptive name here',
      category: 'Food',
      result: 'Normal result',
    },
  ];
}

/**
 * Creates columns for string data test.
 *
 * @returns Array of string columns
 */
function createStringColumns(): PreviewColumn[] {
  return [
    { field: 'name', headerName: '@name' },
    { field: 'category', headerName: '@category' },
    { field: 'result', headerName: 'Result', isResult: true },
  ];
}

/**
 * Creates rows with boolean values for testing.
 *
 * @returns Array of preview rows with booleans
 */
function createBooleanRows(): PreviewRow[] {
  return [
    { id: 0, is_active: true, is_premium: false, result: true },
    { id: 1, is_active: false, is_premium: true, result: false },
    { id: 2, is_active: true, is_premium: true, result: true },
    { id: 3, is_active: false, is_premium: false, result: false },
    { id: 4, is_active: null, is_premium: true, result: null },
  ];
}

/**
 * Creates columns for boolean data test.
 *
 * @returns Array of boolean columns
 */
function createBooleanColumns(): PreviewColumn[] {
  return [
    { field: 'is_active', headerName: '@is_active' },
    { field: 'is_premium', headerName: '@is_premium' },
    { field: 'result', headerName: 'Result', isResult: true },
  ];
}

/**
 * Container decorator for consistent story presentation.
 *
 * @param Story - The story component to wrap
 * @returns Wrapped story element
 */
function ContainerDecorator(Story: React.ComponentType): React.ReactElement {
  return (
    <Box sx={{ width: 500 }}>
      <Story />
    </Box>
  );
}

/**
 * Wide container for testing many columns.
 *
 * @param Story - The story component to wrap
 * @returns Wrapped story element
 */
function WideContainerDecorator(Story: React.ComponentType): React.ReactElement {
  return (
    <Box sx={{ width: 800 }}>
      <Story />
    </Box>
  );
}

const meta: Meta<typeof PreviewTable> = {
  title: 'DataGrid/PreviewTable',
  component: PreviewTable,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Displays a preview of formula evaluation results in a compact table. ' +
          'Shows referenced variable columns alongside the formula result column. ' +
          'The result column is highlighted with a distinct background. ' +
          'Supports null values (gray italic) and errors (red with tooltip).',
      },
    },
  },
  decorators: [ContainerDecorator],
  argTypes: {
    columns: {
      description: 'Column definitions for the table',
    },
    rows: {
      description: 'Row data to display (typically first 10 rows)',
    },
    resultColumn: {
      description: 'Field name of the result column (deprecated, use isResult on column)',
    },
    errors: {
      description: 'Map of row indices to error messages',
    },
  },
};

export default meta;

type Story = StoryObj<typeof PreviewTable>;

/**
 * Default story with normal data.
 */
export const Default: Story = {
  args: {
    columns: createBasicColumns(),
    rows: createBasicRows(),
  },
  parameters: {
    docs: {
      description: {
        story:
          'Basic usage with numeric data. The Result column is highlighted ' +
          'with a light blue background to distinguish it from input columns.',
      },
    },
  },
};

/**
 * Story with null values.
 */
export const WithNullValues: Story = {
  args: {
    columns: createBasicColumns(),
    rows: createRowsWithNulls(),
  },
  parameters: {
    docs: {
      description: {
        story:
          'Null values are displayed in gray italic text. ' +
          'When an input column is null, the result typically propagates null as well.',
      },
    },
  },
};

/**
 * Story with errors.
 */
export const WithErrors: Story = {
  args: {
    columns: createBasicColumns(),
    rows: createRowsWithErrors(),
    errors: createErrorMap(),
  },
  parameters: {
    docs: {
      description: {
        story:
          'Error rows display a red error icon in the Result column. ' +
          'Hovering over the error shows a tooltip with the error message.',
      },
    },
  },
};

/**
 * Story with empty state.
 */
export const EmptyState: Story = {
  args: {
    columns: createBasicColumns(),
    rows: [],
  },
  parameters: {
    docs: {
      description: {
        story:
          'When there are no rows to display, an empty state message is shown. ' +
          'This typically occurs when there is no data in the grid.',
      },
    },
  },
};

/**
 * Story with no columns.
 */
export const NoColumns: Story = {
  args: {
    columns: [],
    rows: createBasicRows(),
  },
  parameters: {
    docs: {
      description: {
        story:
          'When there are no columns defined, the empty state is shown. ' +
          'This can occur when no variables are referenced in the formula.',
      },
    },
  },
};

/**
 * Story with many columns.
 */
export const ManyColumns: Story = {
  args: {
    columns: createManyColumns(),
    rows: createManyColumnRows(),
  },
  decorators: [WideContainerDecorator],
  parameters: {
    docs: {
      description: {
        story:
          'Table with many columns. Column headers are truncated if they are too long. ' +
          'The table is horizontally scrollable within its container.',
      },
    },
  },
};

/**
 * Story with long values testing truncation.
 */
export const LongValues: Story = {
  args: {
    columns: createStringColumns(),
    rows: createLongValueRows(),
  },
  decorators: [WideContainerDecorator],
  parameters: {
    docs: {
      description: {
        story:
          'Long string values are truncated with ellipsis to prevent ' +
          'the table from becoming too wide. Values over 50 characters are truncated.',
      },
    },
  },
};

/**
 * Story with boolean values.
 */
export const BooleanValues: Story = {
  args: {
    columns: createBooleanColumns(),
    rows: createBooleanRows(),
  },
  parameters: {
    docs: {
      description: {
        story:
          'Boolean values are displayed as TRUE or FALSE (uppercase). ' +
          'Null booleans are shown in gray italic like other null values.',
      },
    },
  },
};

/**
 * Story with single row.
 */
export const SingleRow: Story = {
  args: {
    columns: createBasicColumns(),
    rows: [{ id: 0, price: 100, tax_rate: 0.1, result: 110 }],
  },
  parameters: {
    docs: {
      description: {
        story: 'Table with a single row. The full table structure is shown even for one row.',
      },
    },
  },
};

/**
 * Story with 10 rows (maximum preview).
 */
export const TenRows: Story = {
  args: {
    columns: createBasicColumns(),
    rows: Array.from({ length: 10 }, function createRow(_, index) {
      const price = (index + 1) * 100;
      const taxRate = 0.1;
      return {
        id: index,
        price,
        tax_rate: taxRate,
        result: price * (1 + taxRate),
      };
    }),
  },
  parameters: {
    docs: {
      description: {
        story:
          'Preview table showing 10 rows, which is the typical maximum. ' +
          'The table is scrollable if it exceeds the container height.',
      },
    },
  },
};

/**
 * Story with mixed null and error values.
 */
export const MixedNullsAndErrors: Story = {
  args: {
    columns: createBasicColumns(),
    rows: [
      { id: 0, price: 100, tax_rate: 0.1, result: 110 },
      { id: 1, price: null, tax_rate: 0.1, result: null },
      { id: 2, price: 150, tax_rate: 0, result: null },
      { id: 3, price: 175, tax_rate: null, result: null },
      { id: 4, price: 200, tax_rate: -1, result: null },
    ],
    errors: new Map([
      [2, 'Division by zero'],
      [4, 'Invalid negative tax rate'],
    ]),
  },
  parameters: {
    docs: {
      description: {
        story:
          'Demonstrates the visual distinction between null values and errors. ' +
          'Null values show in gray italic, while errors show a red error icon.',
      },
    },
  },
};

/**
 * Story with special numeric values.
 */
export const SpecialNumbers: Story = {
  args: {
    columns: [
      { field: 'value', headerName: '@value' },
      { field: 'result', headerName: 'Result', isResult: true },
    ],
    rows: [
      { id: 0, value: 0, result: 0 },
      { id: 1, value: -0, result: 0 },
      { id: 2, value: 3.14159265359, result: 3.14159265359 },
      { id: 3, value: 1e-10, result: 1e-10 },
      { id: 4, value: 1e10, result: 1e10 },
      { id: 5, value: Number.MAX_SAFE_INTEGER, result: Number.MAX_SAFE_INTEGER },
    ],
  },
  parameters: {
    docs: {
      description: {
        story:
          'Shows formatting of special numeric values including zero, ' +
          'decimals, scientific notation, and large integers.',
      },
    },
  },
};

/**
 * Story using deprecated resultColumn prop.
 */
export const DeprecatedResultColumnProp: Story = {
  args: {
    columns: [
      { field: 'price', headerName: '@price' },
      { field: 'tax_rate', headerName: '@tax_rate' },
      { field: 'total', headerName: 'Total' },
    ],
    rows: [
      { id: 0, price: 100, tax_rate: 0.1, total: 110 },
      { id: 1, price: 200, tax_rate: 0.1, total: 220 },
    ],
    resultColumn: 'total',
  },
  parameters: {
    docs: {
      description: {
        story:
          'Demonstrates backward compatibility with the deprecated resultColumn prop. ' +
          'The column matching the resultColumn field is highlighted.',
      },
    },
  },
};
