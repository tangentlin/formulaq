/**
 * Large dataset demo stories for performance testing.
 *
 * Demonstrates FormulaQ performance with varying dataset sizes:
 * - 1,000 rows (small dataset, should complete instantly)
 * - 10,000 rows (medium dataset)
 * - 100,000 rows (large dataset with visible progress)
 * - 1,000,000 rows (very large dataset, tests chunking and cancellation)
 *
 * Performance Targets:
 * - 1,000 rows: < 100ms
 * - 100,000 rows: < 1s with progress updates
 * - 1,000,000 rows: Shows progress, can cancel, UI responsive
 *
 * @module
 */

import type { Meta, StoryObj } from '@storybook/react';
import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  Box,
  Button,
  Typography,
  Paper,
  Stack,
  Chip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import { DataGrid, type GridColDef, type GridRowModel } from '@mui/x-data-grid';
import { useFormulaColumns } from '../hooks/use-formula-columns.ts';
import { ProgressOverlay } from '../progress-overlay/progress-overlay.tsx';
import { generateSampleProducts, SAMPLE_COLUMNS, type ProductRow } from './sample-data.ts';

/**
 * Props for the LargeDataDemo component.
 */
interface LargeDataDemoProps {
  /**
   * Number of rows to generate for the demo.
   */
  readonly rowCount: number;

  /**
   * Formula to evaluate.
   *
   * @default '@price * @quantity'
   */
  readonly formula?: string | undefined;

  /**
   * Chunk size for evaluation.
   *
   * @default 1000
   */
  readonly chunkSize?: number | undefined;

  /**
   * Whether to show performance metrics.
   *
   * @default true
   */
  readonly showMetrics?: boolean | undefined;
}

/**
 * Row count options for the selector.
 */
const ROW_COUNT_OPTIONS = [
  { value: 1000, label: '1,000 rows' },
  { value: 10000, label: '10,000 rows' },
  { value: 100000, label: '100,000 rows' },
  { value: 1000000, label: '1,000,000 rows' },
] as const;

/**
 * Formula options for the selector.
 */
const FORMULA_OPTIONS = [
  { value: '@price * @quantity', label: 'Simple: @price * @quantity' },
  {
    value: '@price * POWER(1 + @taxRate, 2)',
    label: 'With Functions: @price * POWER(1 + @taxRate, 2)',
  },
  { value: '@price / AVG(@price) * 100', label: 'With Aggregation: @price / AVG(@price) * 100' },
  {
    value: 'IF(@inStock, @price * @quantity * (1 + @taxRate), 0)',
    label: 'Complex: IF(@inStock, ...)',
  },
] as const;

/**
 * Performance metrics display component.
 */
function PerformanceMetrics(props: {
  readonly generationTime: number | null;
  readonly evaluationTime: number | null;
  readonly rowCount: number;
  readonly formulaColumnCount: number;
}): React.ReactElement {
  const generationTime = props.generationTime;
  const evaluationTime = props.evaluationTime;
  const rowCount = props.rowCount;
  const formulaColumnCount = props.formulaColumnCount;

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        mb: 2,
        backgroundColor: 'grey.50',
        border: 1,
        borderColor: 'grey.200',
        borderRadius: 1,
      }}
    >
      <Typography variant="subtitle2" sx={{ mb: 1 }}>
        Performance Metrics
      </Typography>
      <Stack direction="row" spacing={2} flexWrap="wrap">
        <Chip label={`Rows: ${rowCount.toLocaleString()}`} size="small" variant="outlined" />
        <Chip label={`Formula Columns: ${formulaColumnCount}`} size="small" variant="outlined" />
        {generationTime !== null && (
          <Chip
            label={`Data Generation: ${generationTime.toFixed(0)}ms`}
            size="small"
            color={generationTime < 1000 ? 'success' : 'warning'}
          />
        )}
        {evaluationTime !== null && (
          <Chip
            label={`Evaluation: ${evaluationTime.toFixed(0)}ms`}
            size="small"
            color={evaluationTime < getExpectedTime(rowCount) ? 'success' : 'warning'}
          />
        )}
        {evaluationTime !== null && rowCount > 0 && (
          <Chip
            label={`Speed: ${((rowCount / evaluationTime) * 1000).toFixed(0)} rows/sec`}
            size="small"
            variant="outlined"
          />
        )}
      </Stack>
    </Paper>
  );
}

/**
 * Gets the expected evaluation time for a given row count.
 *
 * @param rowCount - Number of rows
 * @returns Expected time in milliseconds
 */
function getExpectedTime(rowCount: number): number {
  if (rowCount <= 1000) {
    return 100;
  }
  if (rowCount <= 100000) {
    return 1000;
  }
  return 10000;
}

/**
 * Main LargeDataDemo component.
 *
 * Demonstrates formula evaluation performance with large datasets.
 */
function LargeDataDemo(props: LargeDataDemoProps): React.ReactElement {
  const initialRowCount = props.rowCount;
  const initialFormula = props.formula ?? '@price * @quantity';
  const showMetrics = props.showMetrics ?? true;

  // State for dynamic configuration
  const [rowCount, setRowCount] = useState<number>(initialRowCount);
  const [selectedFormula, setSelectedFormula] = useState<string>(initialFormula);
  const [generationTime, setGenerationTime] = useState<number | null>(null);
  const [evaluationStartTime, setEvaluationStartTime] = useState<number | null>(null);
  const [evaluationTime, setEvaluationTime] = useState<number | null>(null);

  // Track if we need to add the formula
  const hasAddedFormulaRef = useRef(false);

  // Generate sample data
  const rows = useMemo(
    function generateData(): ProductRow[] {
      const startTime = performance.now();
      const data = generateSampleProducts(rowCount);
      const endTime = performance.now();
      setGenerationTime(endTime - startTime);
      return data;
    },
    [rowCount],
  );

  // Use formula columns hook
  const formulaColumnsResult = useFormulaColumns({
    baseColumns: SAMPLE_COLUMNS,
    rows,
  });

  const columns = formulaColumnsResult.columns;
  const addFormula = formulaColumnsResult.addFormula;
  const isEvaluating = formulaColumnsResult.isEvaluating;
  const progress = formulaColumnsResult.progress;
  const cancelEvaluation = formulaColumnsResult.cancelEvaluation;
  const rowsWithFormulas = formulaColumnsResult.rowsWithFormulas;

  // Track evaluation timing
  useEffect(
    function trackEvaluationTiming() {
      if (isEvaluating && evaluationStartTime === null) {
        setEvaluationStartTime(performance.now());
        setEvaluationTime(null);
      } else if (!isEvaluating && evaluationStartTime !== null) {
        const endTime = performance.now();
        setEvaluationTime(endTime - evaluationStartTime);
        setEvaluationStartTime(null);
      }
    },
    [isEvaluating, evaluationStartTime],
  );

  // Add formula when component mounts or formula changes
  useEffect(
    function addFormulaColumn() {
      if (!hasAddedFormulaRef.current) {
        hasAddedFormulaRef.current = true;
        addFormula('total', selectedFormula, 'Total');
      }
    },
    [addFormula, selectedFormula],
  );

  // Handle row count change
  const handleRowCountChange = useCallback(function onRowCountChange(event: {
    target: { value: unknown };
  }): void {
    const newCount = event.target.value as number;
    setRowCount(newCount);
    setEvaluationTime(null);
    hasAddedFormulaRef.current = false;
  }, []);

  // Handle formula change
  const handleFormulaChange = useCallback(function onFormulaChange(event: {
    target: { value: unknown };
  }): void {
    const newFormula = event.target.value as string;
    setSelectedFormula(newFormula);
    setEvaluationTime(null);
    hasAddedFormulaRef.current = false;
  }, []);

  // Handle refresh
  const handleRefresh = useCallback(function onRefresh(): void {
    setEvaluationTime(null);
    hasAddedFormulaRef.current = false;
    // Force re-render by changing a key (would need key prop on DataGrid)
  }, []);

  // Count formula columns
  const formulaColumnCount = columns.length - SAMPLE_COLUMNS.length;

  return (
    <Box sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Controls */}
      <Paper elevation={0} sx={{ p: 2, mb: 2, backgroundColor: 'grey.50' }}>
        <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel id="row-count-label">Row Count</InputLabel>
            <Select
              labelId="row-count-label"
              value={rowCount}
              label="Row Count"
              onChange={handleRowCountChange}
            >
              {ROW_COUNT_OPTIONS.map(function renderOption(option) {
                return (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                );
              })}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 300 }}>
            <InputLabel id="formula-label">Formula</InputLabel>
            <Select
              labelId="formula-label"
              value={selectedFormula}
              label="Formula"
              onChange={handleFormulaChange}
            >
              {FORMULA_OPTIONS.map(function renderOption(option) {
                return (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                );
              })}
            </Select>
          </FormControl>

          <Button variant="outlined" size="small" onClick={handleRefresh} disabled={isEvaluating}>
            Refresh
          </Button>

          {isEvaluating && (
            <Button variant="outlined" color="error" size="small" onClick={cancelEvaluation}>
              Cancel Evaluation
            </Button>
          )}
        </Stack>
      </Paper>

      {/* Performance Metrics */}
      {showMetrics && (
        <PerformanceMetrics
          generationTime={generationTime}
          evaluationTime={evaluationTime}
          rowCount={rowCount}
          formulaColumnCount={formulaColumnCount}
        />
      )}

      {/* DataGrid with Progress Overlay */}
      <Box sx={{ flex: 1, minHeight: 400, position: 'relative' }}>
        <DataGrid
          rows={rowsWithFormulas as GridRowModel[]}
          columns={columns as GridColDef[]}
          pageSizeOptions={[25, 50, 100]}
          initialState={{
            pagination: { paginationModel: { pageSize: 25 } },
          }}
          disableRowSelectionOnClick
          sx={{
            opacity: isEvaluating ? 0.5 : 1,
            transition: 'opacity 0.2s',
          }}
        />
        <ProgressOverlay
          visible={isEvaluating}
          completed={progress?.completed ?? 0}
          total={progress?.total ?? rowCount}
          onCancel={cancelEvaluation}
        />
      </Box>
    </Box>
  );
}

/**
 * Meta configuration for LargeDataDemo stories.
 */
const meta: Meta<typeof LargeDataDemo> = {
  title: 'DataGrid/LargeDataDemo',
  component: LargeDataDemo,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Demonstrates FormulaQ performance with varying dataset sizes. ' +
          'Test the evaluation speed, progress reporting, and cancellation ' +
          'with datasets ranging from 1,000 to 1,000,000 rows.\n\n' +
          '**Performance Targets:**\n' +
          '- 1,000 rows: < 100ms\n' +
          '- 100,000 rows: < 1s with progress updates\n' +
          '- 1,000,000 rows: Shows progress, can cancel, UI responsive',
      },
    },
  },
  decorators: [
    function FullHeightDecorator(Story) {
      return (
        <Box sx={{ height: '100vh', p: 2, boxSizing: 'border-box' }}>
          <Story />
        </Box>
      );
    },
  ],
  argTypes: {
    rowCount: {
      control: 'select',
      options: [1000, 10000, 100000, 1000000],
      description: 'Number of rows to generate',
    },
    formula: {
      control: 'select',
      options: FORMULA_OPTIONS.map(function getOptionValue(opt) {
        return opt.value;
      }),
      description: 'Formula to evaluate',
    },
    showMetrics: {
      control: 'boolean',
      description: 'Whether to show performance metrics',
    },
  },
};

export default meta;

type Story = StoryObj<typeof LargeDataDemo>;

/**
 * Default story with 1,000 rows.
 * This should complete evaluation almost instantly.
 */
export const Default: Story = {
  args: {
    rowCount: 1000,
    formula: '@price * @quantity',
    showMetrics: true,
  },
};

/**
 * 1,000 rows - Small dataset.
 * Performance target: < 100ms
 */
export const OneThousandRows: Story = {
  args: {
    rowCount: 1000,
    formula: '@price * @quantity',
    showMetrics: true,
  },
  parameters: {
    docs: {
      description: {
        story:
          'Small dataset with 1,000 rows. ' +
          'Evaluation should complete in less than 100ms. ' +
          'Progress overlay may not be visible due to fast completion.',
      },
    },
  },
};

/**
 * 10,000 rows - Medium dataset.
 */
export const TenThousandRows: Story = {
  args: {
    rowCount: 10000,
    formula: '@price * @quantity',
    showMetrics: true,
  },
  parameters: {
    docs: {
      description: {
        story:
          'Medium dataset with 10,000 rows. ' +
          'Progress overlay may briefly appear during evaluation.',
      },
    },
  },
};

/**
 * 100,000 rows - Large dataset.
 * Performance target: < 1s with progress updates
 */
export const HundredThousandRows: Story = {
  args: {
    rowCount: 100000,
    formula: '@price * @quantity',
    showMetrics: true,
  },
  parameters: {
    docs: {
      description: {
        story:
          'Large dataset with 100,000 rows. ' +
          'Performance target: < 1 second with progress updates. ' +
          'Progress overlay should be visible and show progress updates.',
      },
    },
  },
};

/**
 * 1,000,000 rows - Very large dataset.
 * Tests chunking, progress reporting, and cancellation.
 */
export const OneMillionRows: Story = {
  args: {
    rowCount: 1000000,
    formula: '@price * @quantity',
    showMetrics: true,
  },
  parameters: {
    docs: {
      description: {
        story:
          'Very large dataset with 1,000,000 rows. ' +
          'Tests chunked execution, progress reporting, and cancellation. ' +
          'UI should remain responsive during evaluation. ' +
          'Cancel button should stop evaluation when clicked.',
      },
    },
  },
};

/**
 * Complex formula with 100,000 rows.
 */
export const ComplexFormula: Story = {
  args: {
    rowCount: 100000,
    formula: 'IF(@inStock, @price * @quantity * (1 + @taxRate), 0)',
    showMetrics: true,
  },
  parameters: {
    docs: {
      description: {
        story:
          'Complex formula with conditional logic on 100,000 rows. ' +
          'Tests performance with more complex expressions.',
      },
    },
  },
};

/**
 * Aggregation formula with 100,000 rows.
 */
export const AggregationFormula: Story = {
  args: {
    rowCount: 100000,
    formula: '@price / AVG(@price) * 100',
    showMetrics: true,
  },
  parameters: {
    docs: {
      description: {
        story:
          'Formula with aggregation (AVG) on 100,000 rows. ' +
          'Tests aggregation computation before row-level evaluation.',
      },
    },
  },
};

/**
 * Interactive story with all controls.
 */
export const Interactive: Story = {
  args: {
    rowCount: 10000,
    formula: '@price * @quantity',
    showMetrics: true,
  },
  parameters: {
    docs: {
      description: {
        story:
          'Interactive demo with dropdown controls for row count and formula selection. ' +
          'Use this to explore different configurations and test performance.',
      },
    },
  },
};
