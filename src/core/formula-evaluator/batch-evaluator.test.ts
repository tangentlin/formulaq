/**
 * Tests for the batch evaluator module.
 *
 * @module
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { LiteralNode, VariableRefNode, BinaryOpNode, FunctionCallNode } from '../types/ast.ts';
import type { Value } from '../types/values.ts';
import type { EvaluationContext } from '../types/context.ts';
import { createFunctionRegistry, FunctionRegistryImpl } from '../functions/function-registry.ts';
import {
  evaluateBatch,
  createBatchEvaluator,
  DEFAULT_CHUNK_SIZE,
  DEFAULT_DELAY_MS,
} from './batch-evaluator.ts';
import {
  createRowIndices,
  countNullValues,
  countSuccessfulValues,
  computeNonErrorNullCount,
  createNullValue,
  assembleBatchResult,
  createEmptyBatchResult,
  validateBatchOptions,
  sortErrorsByRowIndex,
  type RowResult,
} from './batch-evaluator.view-model.ts';

// ============================================================================
// batchEvaluator.viewModel Tests
// ============================================================================

describe('batchEvaluator.viewModel', () => {
  describe('createRowIndices', () => {
    it('should create array from 0 to n-1', () => {
      const indices = createRowIndices(5);
      expect(indices).toEqual([0, 1, 2, 3, 4]);
    });

    it('should return empty array for 0 rows', () => {
      const indices = createRowIndices(0);
      expect(indices).toEqual([]);
    });

    it('should create single element for 1 row', () => {
      const indices = createRowIndices(1);
      expect(indices).toEqual([0]);
    });

    it('should handle large row counts', () => {
      const indices = createRowIndices(1000);
      expect(indices).toHaveLength(1000);
      expect(indices[0]).toBe(0);
      expect(indices[999]).toBe(999);
    });
  });

  describe('countNullValues', () => {
    it('should count null values', () => {
      const values: Value[] = [
        { type: 'number.float', value: 1 },
        { type: 'number.float', value: null },
        { type: 'number.float', value: 2 },
        { type: 'number.float', value: null },
        { type: 'number.float', value: 3 },
      ];

      expect(countNullValues(values)).toBe(2);
    });

    it('should return 0 for no null values', () => {
      const values: Value[] = [
        { type: 'number.float', value: 1 },
        { type: 'number.float', value: 2 },
      ];

      expect(countNullValues(values)).toBe(0);
    });

    it('should return 0 for empty array', () => {
      expect(countNullValues([])).toBe(0);
    });

    it('should handle all null values', () => {
      const values: Value[] = [
        { type: 'number.float', value: null },
        { type: 'number.float', value: null },
      ];

      expect(countNullValues(values)).toBe(2);
    });
  });

  describe('countSuccessfulValues', () => {
    it('should count non-null values', () => {
      const values: Value[] = [
        { type: 'number.float', value: 1 },
        { type: 'number.float', value: null },
        { type: 'number.float', value: 2 },
      ];

      expect(countSuccessfulValues(values)).toBe(2);
    });

    it('should return 0 for all null values', () => {
      const values: Value[] = [
        { type: 'number.float', value: null },
        { type: 'number.float', value: null },
      ];

      expect(countSuccessfulValues(values)).toBe(0);
    });
  });

  describe('computeNonErrorNullCount', () => {
    it('should subtract error count from total nulls', () => {
      const values: Value[] = [
        { type: 'number.float', value: null },
        { type: 'number.float', value: null },
        { type: 'number.float', value: null },
        { type: 'number.float', value: 1 },
      ];

      // 3 nulls, 1 is from error
      expect(computeNonErrorNullCount(values, 1)).toBe(2);
    });

    it('should return 0 when all nulls are errors', () => {
      const values: Value[] = [
        { type: 'number.float', value: null },
        { type: 'number.float', value: null },
      ];

      expect(computeNonErrorNullCount(values, 2)).toBe(0);
    });
  });

  describe('createNullValue', () => {
    it('should create null value with number.float type', () => {
      const value = createNullValue('number.float');
      expect(value.type).toBe('number.float');
      expect(value.value).toBeNull();
    });

    it('should create null value with string.text type', () => {
      const value = createNullValue('string.text');
      expect(value.type).toBe('string.text');
      expect(value.value).toBeNull();
    });

    it('should create null value with boolean.boolean type', () => {
      const value = createNullValue('boolean.boolean');
      expect(value.type).toBe('boolean.boolean');
      expect(value.value).toBeNull();
    });
  });

  describe('assembleBatchResult', () => {
    it('should assemble result from row results', () => {
      const rowResults: RowResult[] = [
        { value: { type: 'number.float', value: 1 } },
        { value: { type: 'number.float', value: 2 } },
        { value: { type: 'number.float', value: 3 } },
      ];

      const result = assembleBatchResult(rowResults);

      expect(result.values).toHaveLength(3);
      expect(result.values[0]?.value).toBe(1);
      expect(result.values[1]?.value).toBe(2);
      expect(result.values[2]?.value).toBe(3);
      expect(result.errors).toHaveLength(0);
      expect(result.hasErrors).toBe(false);
      expect(result.successCount).toBe(3);
      expect(result.errorCount).toBe(0);
    });

    it('should include errors in result', () => {
      const rowResults: RowResult[] = [
        { value: { type: 'number.float', value: 1 } },
        {
          value: { type: 'number.float', value: null },
          error: { rowIndex: 1, code: 'DIV_BY_ZERO', message: 'Division by zero' },
        },
        { value: { type: 'number.float', value: 3 } },
      ];

      const result = assembleBatchResult(rowResults);

      expect(result.values).toHaveLength(3);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]?.rowIndex).toBe(1);
      expect(result.hasErrors).toBe(true);
      expect(result.successCount).toBe(2);
      expect(result.errorCount).toBe(1);
    });

    it('should handle empty row results', () => {
      const result = assembleBatchResult([]);

      expect(result.values).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
      expect(result.hasErrors).toBe(false);
      expect(result.successCount).toBe(0);
      expect(result.errorCount).toBe(0);
    });

    it('should handle all errors', () => {
      const rowResults: RowResult[] = [
        {
          value: { type: 'number.float', value: null },
          error: { rowIndex: 0, code: 'DIV_BY_ZERO', message: 'Error 1' },
        },
        {
          value: { type: 'number.float', value: null },
          error: { rowIndex: 1, code: 'DOMAIN_ERROR', message: 'Error 2' },
        },
      ];

      const result = assembleBatchResult(rowResults);

      expect(result.errors).toHaveLength(2);
      expect(result.hasErrors).toBe(true);
      expect(result.successCount).toBe(0);
      expect(result.errorCount).toBe(2);
    });
  });

  describe('createEmptyBatchResult', () => {
    it('should create empty result', () => {
      const result = createEmptyBatchResult();

      expect(result.values).toEqual([]);
      expect(result.errors).toEqual([]);
      expect(result.hasErrors).toBe(false);
      expect(result.successCount).toBe(0);
      expect(result.errorCount).toBe(0);
    });
  });

  describe('validateBatchOptions', () => {
    it('should use defaults when options are undefined', () => {
      const validated = validateBatchOptions(undefined, undefined);

      expect(validated.chunkSize).toBe(DEFAULT_CHUNK_SIZE);
      expect(validated.delayMs).toBe(DEFAULT_DELAY_MS);
    });

    it('should use provided values', () => {
      const validated = validateBatchOptions(500, 16);

      expect(validated.chunkSize).toBe(500);
      expect(validated.delayMs).toBe(16);
    });

    it('should use default for invalid chunk size', () => {
      const validated = validateBatchOptions(0, 10);
      expect(validated.chunkSize).toBe(DEFAULT_CHUNK_SIZE);

      const validated2 = validateBatchOptions(-1, 10);
      expect(validated2.chunkSize).toBe(DEFAULT_CHUNK_SIZE);
    });

    it('should use default for invalid delay', () => {
      const validated = validateBatchOptions(100, -1);
      expect(validated.delayMs).toBe(DEFAULT_DELAY_MS);
    });

    it('should accept 0 as valid delay', () => {
      const validated = validateBatchOptions(100, 0);
      expect(validated.delayMs).toBe(0);
    });
  });

  describe('sortErrorsByRowIndex', () => {
    it('should sort errors by row index ascending', () => {
      const errors = [
        { rowIndex: 5, code: 'DIV_BY_ZERO' as const, message: 'Error 1' },
        { rowIndex: 2, code: 'DIV_BY_ZERO' as const, message: 'Error 2' },
        { rowIndex: 8, code: 'DIV_BY_ZERO' as const, message: 'Error 3' },
        { rowIndex: 1, code: 'DIV_BY_ZERO' as const, message: 'Error 4' },
      ];

      const sorted = sortErrorsByRowIndex(errors);

      expect(sorted.map((e) => e.rowIndex)).toEqual([1, 2, 5, 8]);
    });

    it('should handle empty array', () => {
      const sorted = sortErrorsByRowIndex([]);
      expect(sorted).toEqual([]);
    });

    it('should handle single error', () => {
      const errors = [{ rowIndex: 5, code: 'DIV_BY_ZERO' as const, message: 'Error' }];
      const sorted = sortErrorsByRowIndex(errors);
      expect(sorted).toHaveLength(1);
      expect(sorted[0]?.rowIndex).toBe(5);
    });

    it('should not modify original array', () => {
      const errors = [
        { rowIndex: 3, code: 'DIV_BY_ZERO' as const, message: 'Error 1' },
        { rowIndex: 1, code: 'DIV_BY_ZERO' as const, message: 'Error 2' },
      ];

      sortErrorsByRowIndex(errors);

      expect(errors[0]?.rowIndex).toBe(3);
      expect(errors[1]?.rowIndex).toBe(1);
    });
  });
});

// ============================================================================
// batchEvaluator Tests
// ============================================================================

describe('batchEvaluator', () => {
  let registry: FunctionRegistryImpl;

  beforeEach(() => {
    vi.useFakeTimers();
    registry = createFunctionRegistry({ includeDefaults: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('evaluateBatch', () => {
    describe('basic evaluation', () => {
      it('should evaluate simple addition for all rows', async () => {
        // @x + @y
        const node: BinaryOpNode = {
          type: 'BinaryOp',
          operator: '+',
          left: { type: 'VariableRef', name: 'x' },
          right: { type: 'VariableRef', name: 'y' },
        };

        const context: EvaluationContext = {
          variables: {
            x: [
              { type: 'number.float', value: 1 },
              { type: 'number.float', value: 2 },
              { type: 'number.float', value: 3 },
            ],
            y: [
              { type: 'number.float', value: 10 },
              { type: 'number.float', value: 20 },
              { type: 'number.float', value: 30 },
            ],
          },
          rowCount: 3,
        };

        const resultPromise = evaluateBatch(node, context, registry);
        await vi.runAllTimersAsync();
        const result = await resultPromise;

        expect(result.values).toHaveLength(3);
        expect(result.values[0]?.value).toBe(11);
        expect(result.values[1]?.value).toBe(22);
        expect(result.values[2]?.value).toBe(33);
        expect(result.hasErrors).toBe(false);
        expect(result.successCount).toBe(3);
        expect(result.errorCount).toBe(0);
      });

      it('should evaluate literal expression', async () => {
        const node: LiteralNode = {
          type: 'Literal',
          valueType: 'number.float',
          value: 42,
        };

        const context: EvaluationContext = {
          variables: {},
          rowCount: 3,
        };

        const resultPromise = evaluateBatch(node, context, registry);
        await vi.runAllTimersAsync();
        const result = await resultPromise;

        expect(result.values).toHaveLength(3);
        expect(result.values[0]?.value).toBe(42);
        expect(result.values[1]?.value).toBe(42);
        expect(result.values[2]?.value).toBe(42);
      });

      it('should handle empty context', async () => {
        const node: LiteralNode = {
          type: 'Literal',
          valueType: 'number.float',
          value: 1,
        };

        const context: EvaluationContext = {
          variables: {},
          rowCount: 0,
        };

        const result = await evaluateBatch(node, context, registry);

        expect(result.values).toHaveLength(0);
        expect(result.errors).toHaveLength(0);
        expect(result.hasErrors).toBe(false);
      });
    });

    describe('null propagation', () => {
      it('should propagate null values', async () => {
        // @x * 2
        const node: BinaryOpNode = {
          type: 'BinaryOp',
          operator: '*',
          left: { type: 'VariableRef', name: 'x' },
          right: { type: 'Literal', valueType: 'number.float', value: 2 },
        };

        const context: EvaluationContext = {
          variables: {
            x: [
              { type: 'number.float', value: 10 },
              { type: 'number.float', value: null },
              { type: 'number.float', value: 30 },
            ],
          },
          rowCount: 3,
        };

        const resultPromise = evaluateBatch(node, context, registry);
        await vi.runAllTimersAsync();
        const result = await resultPromise;

        expect(result.values[0]?.value).toBe(20);
        expect(result.values[1]?.value).toBeNull();
        expect(result.values[2]?.value).toBe(60);
        expect(result.hasErrors).toBe(false);
      });
    });

    describe('aggregation handling', () => {
      it('should pre-compute aggregations and use cached values', async () => {
        // @x - AVG(@x)
        const node: BinaryOpNode = {
          type: 'BinaryOp',
          operator: '-',
          left: { type: 'VariableRef', name: 'x' },
          right: {
            type: 'FunctionCall',
            name: 'AVG',
            args: [{ type: 'VariableRef', name: 'x' }],
          },
        };

        const context: EvaluationContext = {
          variables: {
            x: [
              { type: 'number.float', value: 10 },
              { type: 'number.float', value: 20 },
              { type: 'number.float', value: 30 },
            ],
          },
          rowCount: 3,
        };

        const resultPromise = evaluateBatch(node, context, registry);
        await vi.runAllTimersAsync();
        const result = await resultPromise;

        // AVG([10, 20, 30]) = 20
        // Results: [10-20, 20-20, 30-20] = [-10, 0, 10]
        expect(result.values[0]?.value).toBe(-10);
        expect(result.values[1]?.value).toBe(0);
        expect(result.values[2]?.value).toBe(10);
      });

      it('should handle multiple aggregations', async () => {
        // (@x - MIN(@x)) / (MAX(@x) - MIN(@x))
        const node: BinaryOpNode = {
          type: 'BinaryOp',
          operator: '/',
          left: {
            type: 'BinaryOp',
            operator: '-',
            left: { type: 'VariableRef', name: 'x' },
            right: {
              type: 'FunctionCall',
              name: 'MIN',
              args: [{ type: 'VariableRef', name: 'x' }],
            },
          },
          right: {
            type: 'BinaryOp',
            operator: '-',
            left: {
              type: 'FunctionCall',
              name: 'MAX',
              args: [{ type: 'VariableRef', name: 'x' }],
            },
            right: {
              type: 'FunctionCall',
              name: 'MIN',
              args: [{ type: 'VariableRef', name: 'x' }],
            },
          },
        };

        const context: EvaluationContext = {
          variables: {
            x: [
              { type: 'number.float', value: 0 },
              { type: 'number.float', value: 50 },
              { type: 'number.float', value: 100 },
            ],
          },
          rowCount: 3,
        };

        const resultPromise = evaluateBatch(node, context, registry);
        await vi.runAllTimersAsync();
        const result = await resultPromise;

        // MIN=0, MAX=100
        // Results: [(0-0)/(100-0), (50-0)/(100-0), (100-0)/(100-0)] = [0, 0.5, 1]
        expect(result.values[0]?.value).toBe(0);
        expect(result.values[1]?.value).toBe(0.5);
        expect(result.values[2]?.value).toBe(1);
      });

      it('should handle SUM aggregation', async () => {
        // @x / SUM(@x)
        const node: BinaryOpNode = {
          type: 'BinaryOp',
          operator: '/',
          left: { type: 'VariableRef', name: 'x' },
          right: {
            type: 'FunctionCall',
            name: 'SUM',
            args: [{ type: 'VariableRef', name: 'x' }],
          },
        };

        const context: EvaluationContext = {
          variables: {
            x: [
              { type: 'number.float', value: 10 },
              { type: 'number.float', value: 20 },
              { type: 'number.float', value: 30 },
              { type: 'number.float', value: 40 },
            ],
          },
          rowCount: 4,
        };

        const resultPromise = evaluateBatch(node, context, registry);
        await vi.runAllTimersAsync();
        const result = await resultPromise;

        // SUM = 100
        expect(result.values[0]?.value).toBe(0.1);
        expect(result.values[1]?.value).toBe(0.2);
        expect(result.values[2]?.value).toBe(0.3);
        expect(result.values[3]?.value).toBe(0.4);
      });
    });

    describe('chunking behavior', () => {
      it('should respect chunk size', async () => {
        const node: VariableRefNode = {
          type: 'VariableRef',
          name: 'x',
        };

        const values: Value[] = [];
        for (let i = 0; i < 100; i++) {
          values.push({ type: 'number.float', value: i });
        }

        const context: EvaluationContext = {
          variables: { x: values },
          rowCount: 100,
        };

        const progressCalls: Array<{ completed: number; total: number }> = [];

        const resultPromise = evaluateBatch(node, context, registry, {
          chunkSize: 30,
          onProgress: function trackProgress(completed, total) {
            progressCalls.push({ completed, total });
          },
        });

        await vi.runAllTimersAsync();
        const result = await resultPromise;

        expect(result.values).toHaveLength(100);
        // 100 / 30 = 4 chunks (30, 30, 30, 10)
        expect(progressCalls).toHaveLength(4);
        expect(progressCalls[0]).toEqual({ completed: 30, total: 100 });
        expect(progressCalls[1]).toEqual({ completed: 60, total: 100 });
        expect(progressCalls[2]).toEqual({ completed: 90, total: 100 });
        expect(progressCalls[3]).toEqual({ completed: 100, total: 100 });
      });

      it('should use default chunk size', async () => {
        const node: LiteralNode = {
          type: 'Literal',
          valueType: 'number.float',
          value: 1,
        };

        const context: EvaluationContext = {
          variables: {},
          rowCount: 2500,
        };

        let chunkCount = 0;

        const resultPromise = evaluateBatch(node, context, registry, {
          onProgress: function countChunks() {
            chunkCount++;
          },
        });

        await vi.runAllTimersAsync();
        await resultPromise;

        // 2500 / 1000 = 3 chunks
        expect(chunkCount).toBe(3);
      });
    });

    describe('progress reporting', () => {
      it('should call onProgress after each chunk', async () => {
        const node: LiteralNode = {
          type: 'Literal',
          valueType: 'number.float',
          value: 1,
        };

        const context: EvaluationContext = {
          variables: {},
          rowCount: 10,
        };

        const progressCalls: number[] = [];

        const resultPromise = evaluateBatch(node, context, registry, {
          chunkSize: 3,
          onProgress: function trackProgress(completed) {
            progressCalls.push(completed);
          },
        });

        await vi.runAllTimersAsync();
        await resultPromise;

        expect(progressCalls).toEqual([3, 6, 9, 10]);
      });

      it('should work without onProgress callback', async () => {
        const node: LiteralNode = {
          type: 'Literal',
          valueType: 'number.float',
          value: 1,
        };

        const context: EvaluationContext = {
          variables: {},
          rowCount: 10,
        };

        const resultPromise = evaluateBatch(node, context, registry, {
          chunkSize: 3,
        });

        await vi.runAllTimersAsync();
        const result = await resultPromise;

        expect(result.values).toHaveLength(10);
      });
    });

    describe('cancellation support', () => {
      it('should stop when aborted', async () => {
        const node: LiteralNode = {
          type: 'Literal',
          valueType: 'number.float',
          value: 1,
        };

        const context: EvaluationContext = {
          variables: {},
          rowCount: 100,
        };

        const controller = new AbortController();
        let chunksProcessed = 0;

        const resultPromise = evaluateBatch(node, context, registry, {
          chunkSize: 20,
          signal: controller.signal,
          onProgress: function trackAndAbort() {
            chunksProcessed++;
            if (chunksProcessed >= 2) {
              controller.abort();
            }
          },
        });

        await vi.runAllTimersAsync();
        const result = await resultPromise;

        // Should have partial results (2 chunks = 40 rows)
        expect(result.values.length).toBeLessThan(100);
        expect(result.values.length).toBeGreaterThanOrEqual(40);
      });

      it('should return empty result when aborted before start', async () => {
        const node: LiteralNode = {
          type: 'Literal',
          valueType: 'number.float',
          value: 1,
        };

        const context: EvaluationContext = {
          variables: {},
          rowCount: 10,
        };

        const controller = new AbortController();
        controller.abort();

        const result = await evaluateBatch(node, context, registry, {
          signal: controller.signal,
        });

        expect(result.values).toHaveLength(0);
      });
    });

    describe('error handling', () => {
      it('should collect division by zero errors', async () => {
        // @x / @y
        const node: BinaryOpNode = {
          type: 'BinaryOp',
          operator: '/',
          left: { type: 'VariableRef', name: 'x' },
          right: { type: 'VariableRef', name: 'y' },
        };

        const context: EvaluationContext = {
          variables: {
            x: [
              { type: 'number.float', value: 10 },
              { type: 'number.float', value: 20 },
              { type: 'number.float', value: 30 },
            ],
            y: [
              { type: 'number.float', value: 2 },
              { type: 'number.float', value: 0 },
              { type: 'number.float', value: 5 },
            ],
          },
          rowCount: 3,
        };

        const resultPromise = evaluateBatch(node, context, registry);
        await vi.runAllTimersAsync();
        const result = await resultPromise;

        expect(result.values[0]?.value).toBe(5);
        expect(result.values[1]?.value).toBeNull();
        expect(result.values[2]?.value).toBe(6);

        expect(result.hasErrors).toBe(true);
        expect(result.errorCount).toBe(1);
        expect(result.errors[0]?.rowIndex).toBe(1);
        expect(result.errors[0]?.code).toBe('DIV_BY_ZERO');
      });

      it('should continue evaluation after errors', async () => {
        // @x / @y
        const node: BinaryOpNode = {
          type: 'BinaryOp',
          operator: '/',
          left: { type: 'VariableRef', name: 'x' },
          right: { type: 'VariableRef', name: 'y' },
        };

        const context: EvaluationContext = {
          variables: {
            x: [
              { type: 'number.float', value: 10 },
              { type: 'number.float', value: 20 },
              { type: 'number.float', value: 30 },
              { type: 'number.float', value: 40 },
              { type: 'number.float', value: 50 },
            ],
            y: [
              { type: 'number.float', value: 0 },
              { type: 'number.float', value: 2 },
              { type: 'number.float', value: 0 },
              { type: 'number.float', value: 4 },
              { type: 'number.float', value: 0 },
            ],
          },
          rowCount: 5,
        };

        const resultPromise = evaluateBatch(node, context, registry);
        await vi.runAllTimersAsync();
        const result = await resultPromise;

        // All rows should be evaluated
        expect(result.values).toHaveLength(5);

        // Check correct results
        expect(result.values[1]?.value).toBe(10); // 20/2
        expect(result.values[3]?.value).toBe(10); // 40/4

        // Check errors
        expect(result.errorCount).toBe(3);
        expect(result.successCount).toBe(2);
      });
    });

    describe('function calls', () => {
      it('should handle IF function', async () => {
        // IF(@x > 5, @x, 0)
        const node: FunctionCallNode = {
          type: 'FunctionCall',
          name: 'IF',
          args: [
            {
              type: 'BinaryOp',
              operator: '>',
              left: { type: 'VariableRef', name: 'x' },
              right: { type: 'Literal', valueType: 'number.float', value: 5 },
            },
            { type: 'VariableRef', name: 'x' },
            { type: 'Literal', valueType: 'number.float', value: 0 },
          ],
        };

        const context: EvaluationContext = {
          variables: {
            x: [
              { type: 'number.float', value: 3 },
              { type: 'number.float', value: 7 },
              { type: 'number.float', value: 5 },
              { type: 'number.float', value: 10 },
            ],
          },
          rowCount: 4,
        };

        const resultPromise = evaluateBatch(node, context, registry);
        await vi.runAllTimersAsync();
        const result = await resultPromise;

        expect(result.values[0]?.value).toBe(0); // 3 <= 5
        expect(result.values[1]?.value).toBe(7); // 7 > 5
        expect(result.values[2]?.value).toBe(0); // 5 <= 5
        expect(result.values[3]?.value).toBe(10); // 10 > 5
      });

      it('should handle POWER function', async () => {
        // POWER(@x, 2)
        const node: FunctionCallNode = {
          type: 'FunctionCall',
          name: 'POWER',
          args: [
            { type: 'VariableRef', name: 'x' },
            { type: 'Literal', valueType: 'number.float', value: 2 },
          ],
        };

        const context: EvaluationContext = {
          variables: {
            x: [
              { type: 'number.float', value: 2 },
              { type: 'number.float', value: 3 },
              { type: 'number.float', value: 4 },
            ],
          },
          rowCount: 3,
        };

        const resultPromise = evaluateBatch(node, context, registry);
        await vi.runAllTimersAsync();
        const result = await resultPromise;

        expect(result.values[0]?.value).toBe(4);
        expect(result.values[1]?.value).toBe(9);
        expect(result.values[2]?.value).toBe(16);
      });
    });
  });

  describe('createBatchEvaluator', () => {
    it('should create bound evaluator function', async () => {
      const evaluate = createBatchEvaluator(registry);

      const node: LiteralNode = {
        type: 'Literal',
        valueType: 'number.float',
        value: 42,
      };

      const context: EvaluationContext = {
        variables: {},
        rowCount: 3,
      };

      const resultPromise = evaluate(node, context);
      await vi.runAllTimersAsync();
      const result = await resultPromise;

      expect(result.values).toHaveLength(3);
      expect(result.values[0]?.value).toBe(42);
    });

    it('should accept options', async () => {
      const evaluate = createBatchEvaluator(registry);

      const node: LiteralNode = {
        type: 'Literal',
        valueType: 'number.float',
        value: 1,
      };

      const context: EvaluationContext = {
        variables: {},
        rowCount: 10,
      };

      const progressCalls: number[] = [];

      const resultPromise = evaluate(node, context, {
        chunkSize: 3,
        onProgress: function track(completed) {
          progressCalls.push(completed);
        },
      });

      await vi.runAllTimersAsync();
      await resultPromise;

      expect(progressCalls).toHaveLength(4);
    });
  });

  describe('constants', () => {
    it('should export default chunk size', () => {
      expect(DEFAULT_CHUNK_SIZE).toBe(1000);
    });

    it('should export default delay', () => {
      expect(DEFAULT_DELAY_MS).toBe(0);
    });
  });
});

// ============================================================================
// Integration Tests
// ============================================================================

describe('batchEvaluator integration', () => {
  let registry: FunctionRegistryImpl;

  beforeEach(() => {
    vi.useFakeTimers();
    registry = createFunctionRegistry({ includeDefaults: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should handle realistic formula with mixed operations', async () => {
    // (@price * @quantity) - (AVG(@discount) * @price * @quantity)
    const node: BinaryOpNode = {
      type: 'BinaryOp',
      operator: '-',
      left: {
        type: 'BinaryOp',
        operator: '*',
        left: { type: 'VariableRef', name: 'price' },
        right: { type: 'VariableRef', name: 'quantity' },
      },
      right: {
        type: 'BinaryOp',
        operator: '*',
        left: {
          type: 'BinaryOp',
          operator: '*',
          left: {
            type: 'FunctionCall',
            name: 'AVG',
            args: [{ type: 'VariableRef', name: 'discount' }],
          },
          right: { type: 'VariableRef', name: 'price' },
        },
        right: { type: 'VariableRef', name: 'quantity' },
      },
    };

    const context: EvaluationContext = {
      variables: {
        price: [
          { type: 'number.float', value: 100 },
          { type: 'number.float', value: 200 },
          { type: 'number.float', value: 150 },
        ],
        quantity: [
          { type: 'number.float', value: 2 },
          { type: 'number.float', value: 1 },
          { type: 'number.float', value: 3 },
        ],
        discount: [
          { type: 'number.float', value: 0.1 },
          { type: 'number.float', value: 0.2 },
          { type: 'number.float', value: 0.15 },
        ],
      },
      rowCount: 3,
    };

    const resultPromise = evaluateBatch(node, context, registry);
    await vi.runAllTimersAsync();
    const result = await resultPromise;

    // AVG(discount) = (0.1 + 0.2 + 0.15) / 3 = 0.15
    // Row 0: (100 * 2) - (0.15 * 100 * 2) = 200 - 30 = 170
    // Row 1: (200 * 1) - (0.15 * 200 * 1) = 200 - 30 = 170
    // Row 2: (150 * 3) - (0.15 * 150 * 3) = 450 - 67.5 = 382.5
    expect(result.values[0]?.value).toBe(170);
    expect(result.values[1]?.value).toBe(170);
    expect(result.values[2]?.value).toBe(382.5);
  });

  it('should handle large dataset efficiently', async () => {
    const node: BinaryOpNode = {
      type: 'BinaryOp',
      operator: '+',
      left: { type: 'VariableRef', name: 'a' },
      right: { type: 'VariableRef', name: 'b' },
    };

    const rowCount = 10000;
    const aValues: Value[] = [];
    const bValues: Value[] = [];

    for (let i = 0; i < rowCount; i++) {
      aValues.push({ type: 'number.float', value: i });
      bValues.push({ type: 'number.float', value: i * 2 });
    }

    const context: EvaluationContext = {
      variables: { a: aValues, b: bValues },
      rowCount,
    };

    const resultPromise = evaluateBatch(node, context, registry, {
      chunkSize: 1000,
    });

    await vi.runAllTimersAsync();
    const result = await resultPromise;

    expect(result.values).toHaveLength(rowCount);
    expect(result.values[0]?.value).toBe(0); // 0 + 0
    expect(result.values[5000]?.value).toBe(15000); // 5000 + 10000
    expect(result.values[9999]?.value).toBe(29997); // 9999 + 19998
    expect(result.hasErrors).toBe(false);
  });

  it('should handle ValidatedAST input', async () => {
    const validatedAst = {
      root: {
        type: 'BinaryOp' as const,
        operator: '+' as const,
        left: { type: 'VariableRef' as const, name: 'x' },
        right: { type: 'Literal' as const, valueType: 'number.float' as const, value: 1 },
      },
      resultType: 'number.float' as const,
      dependencies: ['x'],
      hasAggregations: false,
      aggregations: [],
    };

    const context: EvaluationContext = {
      variables: {
        x: [
          { type: 'number.float', value: 5 },
          { type: 'number.float', value: 10 },
        ],
      },
      rowCount: 2,
    };

    const resultPromise = evaluateBatch(validatedAst, context, registry);
    await vi.runAllTimersAsync();
    const result = await resultPromise;

    expect(result.values[0]?.value).toBe(6);
    expect(result.values[1]?.value).toBe(11);
  });
});
