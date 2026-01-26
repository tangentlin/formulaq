/**
 * Storybook stories for the FormulaShowcase component.
 *
 * Demonstrates end-to-end FormulaQ functionality with:
 * - Editable price and taxRate columns
 * - Adding formula columns via button
 * - Context menu with Edit/Delete for formula columns
 * - Immediate recalculation on cell edit
 *
 * @module
 */

import type { Meta, StoryObj } from '@storybook/react';
import { Box, Typography, Paper, List, ListItem, ListItemText } from '@mui/material';

import { FormulaShowcase } from './formula-showcase.tsx';
import type { FormulaColumn } from '../hooks/use-formula-columns.ts';
import { generateShowcaseProducts } from './showcase-data.ts';

const meta: Meta<typeof FormulaShowcase> = {
  title: 'DataGrid/FormulaShowcase',
  component: FormulaShowcase,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'End-to-end showcase of FormulaQ with DataGrid. ' +
          'Features editable columns, formula columns with icons, ' +
          'and context menu for editing/deleting formulas.',
      },
    },
  },
  argTypes: {
    initialRows: {
      description: 'Initial product data rows',
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

type Story = StoryObj<typeof FormulaShowcase>;

/**
 * Default showcase with 50 rows of product data.
 *
 * Features:
 * - Price and Tax Rate columns are editable (double-click to edit)
 * - Click "Add Column" to create a formula column
 * - Right-click on formula column headers for Edit/Delete options
 * - Formula columns show a small formula icon
 */
export const Default: Story = {
  args: {
    height: 600,
  },
  parameters: {
    docs: {
      description: {
        story:
          'Default showcase with 50 rows. ' +
          'Try editing Price or Tax Rate values, then add a formula column ' +
          'like `@price * @quantity` to see immediate recalculation.',
      },
    },
  },
};

/**
 * Showcase with pre-configured formula columns.
 *
 * Includes:
 * - Subtotal: @price * @quantity
 * - Tax Amount: @price * @quantity * @taxRate
 */
export const WithFormulas: Story = {
  args: {
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
          'Showcase with pre-configured formula columns. ' +
          'Edit Price or Tax Rate values to see the formulas recalculate immediately. ' +
          'Right-click on formula column headers to access Edit/Delete options.',
      },
    },
  },
};

/**
 * Interactive showcase with usage instructions.
 */
export const Interactive: Story = {
  render: function RenderInteractive() {
    return (
      <Box sx={{ p: 2, height: '100vh', display: 'flex', flexDirection: 'column' }}>
        <Paper sx={{ p: 2, mb: 2 }}>
          <Typography variant="h6" gutterBottom>
            FormulaQ Showcase
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            This showcase demonstrates end-to-end FormulaQ functionality. Try the following:
          </Typography>
          <List dense>
            <ListItem>
              <ListItemText
                primary="1. Edit a cell"
                secondary="Double-click on a Price or Tax Rate cell to edit it"
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="2. Add a formula column"
                secondary="Click 'Add Column' button, name it 'total', enter '@price * @quantity'"
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="3. See immediate recalculation"
                secondary="Edit a Price or Tax Rate and watch the formula column update"
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="4. Edit or delete a formula"
                secondary="Right-click on a formula column header and select 'Edit Formula' or 'Delete Column'"
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="5. Try aggregations"
                secondary="Create a formula like '@price - AVG(@price)' to see deviation from average"
              />
            </ListItem>
          </List>
        </Paper>
        <Box sx={{ flex: 1, minHeight: 0 }}>
          <FormulaShowcase height={500} />
        </Box>
      </Box>
    );
  },
  parameters: {
    docs: {
      description: {
        story:
          'Interactive showcase with usage instructions. ' +
          'Follow the steps to explore all features.',
      },
    },
  },
};

/**
 * Showcase with dependent formula columns.
 *
 * Includes:
 * - Subtotal: @price * @quantity
 * - Tax Amount: @subtotal * @taxRate
 * - Total: @subtotal + @taxAmount
 */
export const DependentFormulas: Story = {
  args: {
    height: 600,
    initialFormulaColumns: [
      { field: 'subtotal', formula: '@price * @quantity', headerName: 'Subtotal' },
      { field: 'taxAmount', formula: '@subtotal * @taxRate', headerName: 'Tax' },
      { field: 'total', formula: '@subtotal + @taxAmount', headerName: 'Total' },
    ] as FormulaColumn[],
  },
  parameters: {
    docs: {
      description: {
        story:
          'Showcase with dependent formula columns. ' +
          'Subtotal depends on base columns, Tax depends on Subtotal, ' +
          'and Total depends on both. Try deleting Subtotal to see the dependency blocking.',
      },
    },
  },
};

/**
 * Showcase with aggregation formulas.
 */
export const WithAggregation: Story = {
  args: {
    height: 600,
    initialFormulaColumns: [
      { field: 'priceDeviation', formula: '@price - AVG(@price)', headerName: 'Price Deviation' },
      { field: 'aboveAvg', formula: 'IF(@price > AVG(@price), 1, 0)', headerName: 'Above Avg' },
    ] as FormulaColumn[],
  },
  parameters: {
    docs: {
      description: {
        story:
          'Showcase with aggregation formulas. ' +
          'Price Deviation shows how each price differs from the average. ' +
          'Above Avg is 1 if the price is above average, 0 otherwise.',
      },
    },
  },
};

/**
 * Showcase with conditional formulas.
 */
export const ConditionalFormulas: Story = {
  args: {
    height: 600,
    initialFormulaColumns: [
      {
        field: 'availableQty',
        formula: 'IF(@inStock, @quantity, 0)',
        headerName: 'Available Qty',
      },
      {
        field: 'totalValue',
        formula: 'IF(@inStock, @price * @quantity, 0)',
        headerName: 'Total Value',
      },
    ] as FormulaColumn[],
  },
  parameters: {
    docs: {
      description: {
        story:
          'Showcase with conditional formulas using the IF function. ' +
          'Available Qty shows quantity only for in-stock items. ' +
          'Total Value is calculated only for in-stock items.',
      },
    },
  },
};

/**
 * Small dataset for quick testing.
 */
export const SmallDataset: Story = {
  args: {
    initialRows: generateShowcaseProducts(10),
    height: 400,
  },
  parameters: {
    docs: {
      description: {
        story:
          'Small dataset with 10 rows for quick testing. ' +
          'Useful for testing formula column creation and editing.',
      },
    },
  },
};

/**
 * Custom height showcase.
 */
export const CustomHeight: Story = {
  args: {
    height: 800,
    initialFormulaColumns: [
      { field: 'total', formula: '@price * @quantity', headerName: 'Total' },
    ] as FormulaColumn[],
  },
  parameters: {
    docs: {
      description: {
        story: 'Showcase with custom height of 800px for larger displays.',
      },
    },
  },
};

/**
 * Showcase demonstrating the cell editing workflow.
 */
export const CellEditingDemo: Story = {
  render: function RenderCellEditingDemo() {
    return (
      <Box sx={{ p: 2, height: '100vh', display: 'flex', flexDirection: 'column' }}>
        <Paper sx={{ p: 2, mb: 2, bgcolor: 'info.light' }}>
          <Typography variant="h6" gutterBottom>
            Cell Editing Demo
          </Typography>
          <Typography variant="body2" paragraph>
            This demo shows how formula columns recalculate when you edit cells:
          </Typography>
          <Typography variant="body2" component="div">
            <ol style={{ margin: 0, paddingLeft: 24 }}>
              <li>A formula column (Total = @price * @quantity) is already added</li>
              <li>Double-click on any Price cell to edit it</li>
              <li>Press Enter or click outside to commit the change</li>
              <li>Watch the Total column update immediately</li>
            </ol>
          </Typography>
        </Paper>
        <Box sx={{ flex: 1, minHeight: 0 }}>
          <FormulaShowcase
            initialRows={generateShowcaseProducts(15)}
            initialFormulaColumns={[
              { field: 'total', formula: '@price * @quantity', headerName: 'Total' },
            ]}
            height={450}
          />
        </Box>
      </Box>
    );
  },
  parameters: {
    docs: {
      description: {
        story:
          'Demo showing how formula columns recalculate when cells are edited. ' +
          'Edit a Price cell and watch the Total update immediately.',
      },
    },
  },
};

/**
 * Empty showcase with no initial data.
 */
export const EmptyData: Story = {
  args: {
    initialRows: [],
    height: 400,
  },
  parameters: {
    docs: {
      description: {
        story:
          'Empty showcase with no rows. ' +
          'You can still add formula columns, but they will not have any data to evaluate.',
      },
    },
  },
};
