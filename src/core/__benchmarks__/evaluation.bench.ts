/**
 * Performance benchmarks for FormulaQ evaluation.
 *
 * These benchmarks verify that performance requirements are met:
 * - 1,000 rows: < 100ms
 * - 100,000 rows: < 1s with progress updates
 * - 1,000,000 rows: Shows progress, can cancel, UI responsive
 *
 * Run with: pnpm test:bench
 *
 * @module
 */

import { bench, describe } from 'vitest';
import { createFormulaEngine } from '../engine.ts';
import type { EvaluationContext } from '../types/context.ts';
import type { Value } from '../types/values.ts';

/**
 * Default number of iterations for benchmarks.
 */
const BENCHMARK_ITERATIONS = 10;

/**
 * Creates an array of float values for testing.
 *
 * @param count - Number of values to generate
 * @param multiplier - Multiplier for value generation
 * @returns Array of Value objects
 */
function createFloatValues(count: number, multiplier: number): Value[] {
  const values: Value[] = [];
  for (let i = 0; i < count; i++) {
    const rawValue = (i % 100) * multiplier + Math.random() * 10;
    values.push({ type: 'number.float', value: rawValue });
  }
  return values;
}

/**
 * Creates a boolean value array for testing.
 *
 * @param count - Number of values to generate
 * @returns Array of boolean Value objects
 */
function createBooleanValues(count: number): Value[] {
  const values: Value[] = [];
  for (let i = 0; i < count; i++) {
    values.push({ type: 'boolean.boolean', value: i % 2 === 0 });
  }
  return values;
}

/**
 * Creates an evaluation context with test data.
 *
 * @param rowCount - Number of rows to generate
 * @returns An EvaluationContext with price, quantity, taxRate, and inStock variables
 */
function createTestContext(rowCount: number): EvaluationContext {
  const priceValues = createFloatValues(rowCount, 10);
  const quantityValues = createFloatValues(rowCount, 1);
  const taxRateValues = createFloatValues(rowCount, 0.01);
  const inStockValues = createBooleanValues(rowCount);

  return {
    variables: {
      price: priceValues,
      quantity: quantityValues,
      taxRate: taxRateValues,
      inStock: inStockValues,
    },
    rowCount,
  };
}

/**
 * Creates an evaluation context with progress tracking.
 *
 * @param rowCount - Number of rows to generate
 * @param onProgress - Progress callback
 * @param signal - Optional AbortSignal for cancellation
 * @returns An EvaluationContext with progress support
 */
function createTestContextWithProgress(
  rowCount: number,
  onProgress: (completed: number, total: number) => void,
  signal?: AbortSignal,
): EvaluationContext {
  const baseContext = createTestContext(rowCount);
  return {
    ...baseContext,
    onProgress,
    signal,
  };
}

describe('Evaluation Performance', function evaluationPerformanceSuite() {
  const engine = createFormulaEngine();

  describe('Simple formula: @price * @quantity', function simpleFormulaSuite() {
    const formula = '@price * @quantity';

    bench(
      '1,000 rows - simple formula',
      async function benchSimple1K() {
        const context = createTestContext(1000);
        await engine.execute(formula, context);
      },
      { iterations: BENCHMARK_ITERATIONS },
    );

    bench(
      '10,000 rows - simple formula',
      async function benchSimple10K() {
        const context = createTestContext(10000);
        await engine.execute(formula, context);
      },
      { iterations: BENCHMARK_ITERATIONS },
    );

    bench(
      '100,000 rows - simple formula',
      async function benchSimple100K() {
        const context = createTestContext(100000);
        await engine.execute(formula, context);
      },
      { iterations: BENCHMARK_ITERATIONS },
    );
  });

  describe('Formula with functions: @price * POWER(1 + @taxRate, 2)', function withFunctionsSuite() {
    const formula = '@price * POWER(1 + @taxRate, 2)';

    bench(
      '1,000 rows - with functions',
      async function benchFunctions1K() {
        const context = createTestContext(1000);
        await engine.execute(formula, context);
      },
      { iterations: BENCHMARK_ITERATIONS },
    );

    bench(
      '10,000 rows - with functions',
      async function benchFunctions10K() {
        const context = createTestContext(10000);
        await engine.execute(formula, context);
      },
      { iterations: BENCHMARK_ITERATIONS },
    );

    bench(
      '100,000 rows - with functions',
      async function benchFunctions100K() {
        const context = createTestContext(100000);
        await engine.execute(formula, context);
      },
      { iterations: BENCHMARK_ITERATIONS },
    );
  });

  describe('Formula with aggregation: @price / AVG(@price) * 100', function withAggregationSuite() {
    const formula = '@price / AVG(@price) * 100';

    bench(
      '1,000 rows - with aggregation',
      async function benchAggregation1K() {
        const context = createTestContext(1000);
        await engine.execute(formula, context);
      },
      { iterations: BENCHMARK_ITERATIONS },
    );

    bench(
      '10,000 rows - with aggregation',
      async function benchAggregation10K() {
        const context = createTestContext(10000);
        await engine.execute(formula, context);
      },
      { iterations: BENCHMARK_ITERATIONS },
    );

    bench(
      '100,000 rows - with aggregation',
      async function benchAggregation100K() {
        const context = createTestContext(100000);
        await engine.execute(formula, context);
      },
      { iterations: BENCHMARK_ITERATIONS },
    );
  });

  describe('Complex formula: IF(@inStock, @price * @quantity * (1 + @taxRate), 0)', function complexFormulaSuite() {
    const formula = 'IF(@inStock, @price * @quantity * (1 + @taxRate), 0)';

    bench(
      '1,000 rows - complex formula',
      async function benchComplex1K() {
        const context = createTestContext(1000);
        await engine.execute(formula, context);
      },
      { iterations: BENCHMARK_ITERATIONS },
    );

    bench(
      '10,000 rows - complex formula',
      async function benchComplex10K() {
        const context = createTestContext(10000);
        await engine.execute(formula, context);
      },
      { iterations: BENCHMARK_ITERATIONS },
    );

    bench(
      '100,000 rows - complex formula',
      async function benchComplex100K() {
        const context = createTestContext(100000);
        await engine.execute(formula, context);
      },
      { iterations: BENCHMARK_ITERATIONS },
    );
  });

  describe('Large dataset with progress', function largeDatasetSuite() {
    const formula = '@price * @quantity';

    bench(
      '100,000 rows - with progress updates',
      async function benchProgress100K() {
        let progressCount = 0;
        const onProgress = function handleProgress(_completed: number, _total: number): void {
          progressCount++;
        };
        const context = createTestContextWithProgress(100000, onProgress);
        await engine.execute(formula, context, { chunkSize: 1000, onProgress });
        // Verify progress was called
        if (progressCount === 0) {
          throw new Error('Progress callback was not called');
        }
      },
      { iterations: BENCHMARK_ITERATIONS },
    );

    bench(
      '1,000,000 rows - chunked with progress',
      async function benchProgress1M() {
        let progressCount = 0;
        const onProgress = function handleProgress(_completed: number, _total: number): void {
          progressCount++;
        };
        const context = createTestContextWithProgress(1000000, onProgress);
        await engine.execute(formula, context, { chunkSize: 10000, onProgress });
        // Verify progress was called multiple times
        if (progressCount < 10) {
          throw new Error('Progress callback should be called at least 10 times for 1M rows');
        }
      },
      { iterations: 3 }, // Fewer iterations for 1M rows
    );
  });

  describe('Cancellation support', function cancellationSuite() {
    const formula = '@price * @quantity';

    bench(
      '100,000 rows - with cancellation check',
      async function benchCancellation100K() {
        const controller = new AbortController();
        const context = createTestContext(100000);
        // Start evaluation but don't cancel - just verify it completes with signal attached
        await engine.execute(formula, context, {
          chunkSize: 1000,
          signal: controller.signal,
        });
      },
      { iterations: BENCHMARK_ITERATIONS },
    );
  });

  describe('Chunk size variations', function chunkSizeSuite() {
    const formula = '@price * @quantity';
    const rowCount = 100000;

    bench(
      '100,000 rows - chunk size 100',
      async function benchChunk100() {
        const context = createTestContext(rowCount);
        await engine.execute(formula, context, { chunkSize: 100 });
      },
      { iterations: BENCHMARK_ITERATIONS },
    );

    bench(
      '100,000 rows - chunk size 1,000',
      async function benchChunk1K() {
        const context = createTestContext(rowCount);
        await engine.execute(formula, context, { chunkSize: 1000 });
      },
      { iterations: BENCHMARK_ITERATIONS },
    );

    bench(
      '100,000 rows - chunk size 10,000',
      async function benchChunk10K() {
        const context = createTestContext(rowCount);
        await engine.execute(formula, context, { chunkSize: 10000 });
      },
      { iterations: BENCHMARK_ITERATIONS },
    );

    bench(
      '100,000 rows - chunk size 50,000',
      async function benchChunk50K() {
        const context = createTestContext(rowCount);
        await engine.execute(formula, context, { chunkSize: 50000 });
      },
      { iterations: BENCHMARK_ITERATIONS },
    );
  });
});

describe('Memory efficiency', function memoryEfficiencySuite() {
  const engine = createFormulaEngine();
  const formula = '@price * @quantity';

  bench(
    'Memory - 100,000 rows evaluation',
    async function benchMemory100K() {
      const context = createTestContext(100000);
      const result = await engine.execute(formula, context);
      // Verify result is correct
      if (result.values.length !== 100000) {
        throw new Error(`Expected 100000 results, got ${result.values.length}`);
      }
    },
    { iterations: BENCHMARK_ITERATIONS },
  );

  bench(
    'Memory - 500,000 rows evaluation',
    async function benchMemory500K() {
      const context = createTestContext(500000);
      const result = await engine.execute(formula, context);
      if (result.values.length !== 500000) {
        throw new Error(`Expected 500000 results, got ${result.values.length}`);
      }
    },
    { iterations: 5 },
  );
});
