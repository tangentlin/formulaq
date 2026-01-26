/**
 * Storybook stories for the DataGridDemo component.
 *
 * Demonstrates all demo scenarios:
 * - Default (100 rows)
 * - With initial formula columns
 * - Large dataset (10,000 rows for progress demo)
 * - Empty data
 * - Interactive with various formulas
 *
 * @module
 */

import type { Meta, StoryObj } from '@storybook/react';
import { Box, Typography, Paper, List, ListItem, ListItemText } from '@mui/material';
import React from 'react';

import { DataGridDemo } from './data-grid-demo.tsx';
import type { FormulaColumn } from '../hooks/use-formula-columns.ts';
import {
  generateSampleProducts,
  SAMPLE_PRODUCTS_100,
  SAMPLE_PRODUCTS_10000,
  type ProductRow,
} from './sample-data.ts';

const meta: Meta<typeof DataGridDemo> = {
  title: 'DataGrid/DataGridDemo',
  component: DataGridDemo,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Complete DataGrid integration demo with formula columns. ' +
          'Demonstrates adding, editing, and deleting formula columns, ' +
          'with support for progress overlay on large datasets.',
      },
    },
  },
  argTypes: {
    rows: {
      description: 'Product data rows',
      control: false,
    },
    initialFormulaColumns: {
      description: 'Initial formula columns to display',
      control: false,
    },
    height: {
      description: 'Height of the DataGrid',
      control: { type: 'number' },
    },
  },
};

export default meta;

type Story = StoryObj<typeof DataGridDemo>;

/**
 * Default demo with 100 rows of product data.
 *
 * Use the "+ Formula Column" button in the toolbar to add formulas.
 * Right-click on a formula column header to edit or delete.
 */
export const Default: Story = {
  args: {
    rows: SAMPLE_PRODUCTS_100,
    height: 600,
  },
  parameters: {
    docs: {
      description: {
        story:
          'Default demo with 100 rows of product data. ' +
          'Click the "+ Formula Column" button to add a new formula column. ' +
          'Try creating `@price * @quantity` for a total calculation.',
      },
    },
  },
};

/**
 * Demo with pre-configured formula columns.
 *
 * Shows multiple formula columns including one that references another.
 */
export const WithInitialFormulas: Story = {
  args: {
    rows: SAMPLE_PRODUCTS_100,
    height: 600,
    initialFormulaColumns: [
      { field: 'subtotal', formula: '@price * @quantity', headerName: 'Subtotal' },
      { field: 'taxAmount', formula: '@price * @quantity * @taxRate', headerName: 'Tax Amount' },
    ] as FormulaColumn[],
  },
  parameters: {
    docs: {
      description: {
        story:
          'Demo with pre-configured formula columns: Subtotal and Tax Amount. ' +
          'These formulas are evaluated automatically when the data loads. ' +
          'You can edit or delete these columns via the column menu.',
      },
    },
  },
};

/**
 * Large dataset demo for testing progress overlay.
 *
 * Uses 10,000 rows to demonstrate the progress overlay during evaluation.
 */
export const LargeDataset: Story = {
  args: {
    rows: SAMPLE_PRODUCTS_10000,
    height: 600,
  },
  parameters: {
    docs: {
      description: {
        story:
          'Large dataset with 10,000 rows for testing the progress overlay. ' +
          'When you add a formula column, you should see a progress indicator ' +
          'showing the evaluation progress. You can cancel the evaluation.',
      },
    },
  },
};

/**
 * Empty data demo showing the DataGrid with no rows.
 */
export const EmptyData: Story = {
  args: {
    rows: [],
    height: 600,
  },
  parameters: {
    docs: {
      description: {
        story:
          'Empty data demo showing the DataGrid with no rows. ' +
          'You can still add formula columns, but they will not have any data to evaluate.',
      },
    },
  },
};

/**
 * Demo with formula using aggregation.
 *
 * Shows how to use AVG in a formula for deviation from average.
 */
export const WithAggregation: Story = {
  args: {
    rows: SAMPLE_PRODUCTS_100,
    height: 600,
    initialFormulaColumns: [
      { field: 'priceDeviation', formula: '@price - AVG(@price)', headerName: 'Price Deviation' },
    ] as FormulaColumn[],
  },
  parameters: {
    docs: {
      description: {
        story:
          'Demo showing a formula that uses the AVG aggregation function. ' +
          'The "Price Deviation" column shows how each price differs from the average price. ' +
          'Positive values are above average, negative values are below.',
      },
    },
  },
};

/**
 * Interactive story with usage instructions.
 */
export const Interactive: Story = {
  render: function RenderInteractive() {
    return (
      <Box sx={{ p: 2 }}>
        <Paper sx={{ p: 2, mb: 2 }}>
          <Typography variant="h6" gutterBottom>
            DataGrid Formula Columns Demo
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            This demo showcases the full DataGrid integration with formula columns. Try the
            following scenarios:
          </Typography>
          <List dense>
            <ListItem>
              <ListItemText
                primary="1. Create a simple formula"
                secondary="Click '+ Formula Column', name it 'total', enter '@price * @quantity'"
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="2. Create a formula with aggregation"
                secondary="Create a column with formula '@price - AVG(@price)' to see deviation from average"
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="3. Edit a formula"
                secondary="Right-click on a formula column header and select 'Edit Formula'"
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="4. Delete a formula"
                secondary="Right-click on a formula column header and select 'Delete Column'"
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="5. Create dependent formulas"
                secondary="Create 'subtotal' = '@price * @quantity', then 'total' = '@subtotal * (1 + @taxRate)'"
              />
            </ListItem>
          </List>
        </Paper>
        <DataGridDemo rows={SAMPLE_PRODUCTS_100} height={500} />
      </Box>
    );
  },
  parameters: {
    docs: {
      description: {
        story:
          'Interactive demo with usage instructions. ' +
          'Follow the steps to explore all formula column features.',
      },
    },
  },
};

/**
 * Demo with small dataset for quick testing.
 */
export const SmallDataset: Story = {
  args: {
    rows: generateSampleProducts(10),
    height: 400,
  },
  parameters: {
    docs: {
      description: {
        story:
          'Small dataset with 10 rows for quick testing. ' +
          'Useful for testing formula column creation and editing without waiting for large evaluations.',
      },
    },
  },
};

/**
 * Demo with complex formula referencing multiple columns.
 */
export const ComplexFormula: Story = {
  args: {
    rows: SAMPLE_PRODUCTS_100,
    height: 600,
    initialFormulaColumns: [
      {
        field: 'totalWithTax',
        formula: '(@price * @quantity) * (1 + @taxRate)',
        headerName: 'Total with Tax',
      },
    ] as FormulaColumn[],
  },
  parameters: {
    docs: {
      description: {
        story:
          'Demo with a complex formula that calculates the total price including tax. ' +
          'Formula: `(@price * @quantity) * (1 + @taxRate)`',
      },
    },
  },
};

/**
 * Demo showing formula with conditional logic.
 */
export const ConditionalFormula: Story = {
  args: {
    rows: SAMPLE_PRODUCTS_100,
    height: 600,
    initialFormulaColumns: [
      {
        field: 'stockStatus',
        formula: 'IF(@inStock, @quantity, 0)',
        headerName: 'Available Qty',
      },
    ] as FormulaColumn[],
  },
  parameters: {
    docs: {
      description: {
        story:
          'Demo with a conditional formula using IF function. ' +
          'The "Available Qty" column shows the quantity if in stock, otherwise 0. ' +
          'Formula: `IF(@inStock, @quantity, 0)`',
      },
    },
  },
};

/**
 * Demo with multiple dependent formula columns.
 */
export const DependentFormulas: Story = {
  args: {
    rows: SAMPLE_PRODUCTS_100,
    height: 600,
    initialFormulaColumns: [
      { field: 'subtotal', formula: '@price * @quantity', headerName: 'Subtotal' },
      { field: 'taxAmount', formula: '@subtotal * @taxRate', headerName: 'Tax Amount' },
      { field: 'total', formula: '@subtotal + @taxAmount', headerName: 'Total' },
    ] as FormulaColumn[],
  },
  parameters: {
    docs: {
      description: {
        story:
          'Demo with three dependent formula columns: ' +
          'Subtotal depends on base columns, Tax Amount depends on Subtotal, ' +
          'and Total depends on both Subtotal and Tax Amount. ' +
          'Try deleting Subtotal to see the dependency blocking.',
      },
    },
  },
};

/**
 * Custom height demo.
 */
export const CustomHeight: Story = {
  args: {
    rows: SAMPLE_PRODUCTS_100,
    height: 800,
  },
  parameters: {
    docs: {
      description: {
        story: 'Demo with custom height of 800px for larger displays.',
      },
    },
  },
};

/**
 * Controlled demo for testing data changes.
 */
export const DataChanges: Story = {
  render: function RenderDataChanges() {
    const [rowCount, setRowCount] = React.useState(100);
    const rows = React.useMemo(
      function generateRows(): ProductRow[] {
        return generateSampleProducts(rowCount);
      },
      [rowCount],
    );

    const handleChangeRowCount = React.useCallback(function handleChange(count: number): void {
      setRowCount(count);
    }, []);

    return (
      <Box sx={{ p: 2 }}>
        <Paper sx={{ p: 2, mb: 2 }}>
          <Typography variant="h6" gutterBottom>
            Data Changes Demo
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Test how formula columns update when source data changes. First add a formula column,
            then change the row count.
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
            <button
              onClick={function onClick() {
                handleChangeRowCount(10);
              }}
            >
              10 rows
            </button>
            <button
              onClick={function onClick() {
                handleChangeRowCount(50);
              }}
            >
              50 rows
            </button>
            <button
              onClick={function onClick() {
                handleChangeRowCount(100);
              }}
            >
              100 rows
            </button>
            <button
              onClick={function onClick() {
                handleChangeRowCount(500);
              }}
            >
              500 rows
            </button>
          </Box>
          <Typography variant="caption" color="text.secondary">
            Current row count: {rowCount}
          </Typography>
        </Paper>
        <DataGridDemo rows={rows} height={500} />
      </Box>
    );
  },
  parameters: {
    docs: {
      description: {
        story:
          'Demo for testing how formula columns respond to data changes. ' +
          'Add a formula column first, then change the row count to see it re-evaluate.',
      },
    },
  },
};
