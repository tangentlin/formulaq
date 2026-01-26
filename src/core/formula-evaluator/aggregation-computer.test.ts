/**
 * Tests for the aggregation pre-computation module.
 *
 * @module
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type {
  LiteralNode,
  VariableRefNode,
  BinaryOpNode,
  UnaryOpNode,
  FunctionCallNode,
} from '../types/ast.ts';
import type { Value } from '../types/values.ts';
import { createFunctionRegistry, FunctionRegistryImpl } from '../functions/function-registry.ts';
import {
  computeAggregations,
  createAggregationComputeContext,
  hasAggregations,
  getAggregationFunctionNames,
  type AggregationComputeContext,
} from './aggregation-computer.ts';
import {
  findAggregationCalls,
  deduplicateAggregationCalls,
  extractScalarArguments,
  prepareAggregationArgs,
  createAggregationCacheKey,
  extractAggregationCallInfo,
  isAggregationFunction,
  type AggregationCallInfo,
} from './aggregation-computer.view-model.ts';

describe('aggregationComputer.viewModel', () => {
  let registry: FunctionRegistryImpl;

  beforeEach(() => {
    registry = createFunctionRegistry({ includeDefaults: true });
  });

  describe('createAggregationCacheKey', () => {
    it('should create key in format FUNCTION_NAME:variableName', () => {
      const key = createAggregationCacheKey('AVG', 'score');
      expect(key).toBe('AVG:score');
    });

    it('should handle different function names', () => {
      expect(createAggregationCacheKey('SUM', 'price')).toBe('SUM:price');
      expect(createAggregationCacheKey('MAX', 'value')).toBe('MAX:value');
      expect(createAggregationCacheKey('COUNT', 'items')).toBe('COUNT:items');
    });

    it('should handle variable names with dots', () => {
      const key = createAggregationCacheKey('AVG', 'data.field');
      expect(key).toBe('AVG:data.field');
    });
  });

  describe('isAggregationFunction', () => {
    it('should return true for aggregation functions', () => {
      expect(isAggregationFunction('SUM', registry)).toBe(true);
      expect(isAggregationFunction('AVG', registry)).toBe(true);
      expect(isAggregationFunction('MIN', registry)).toBe(true);
      expect(isAggregationFunction('MAX', registry)).toBe(true);
      expect(isAggregationFunction('COUNT', registry)).toBe(true);
      expect(isAggregationFunction('PERCENTILE', registry)).toBe(true);
    });

    it('should return false for non-aggregation functions', () => {
      expect(isAggregationFunction('LOG', registry)).toBe(false);
      expect(isAggregationFunction('POWER', registry)).toBe(false);
      expect(isAggregationFunction('IF', registry)).toBe(false);
      expect(isAggregationFunction('CONCAT', registry)).toBe(false);
    });

    it('should return false for unknown functions', () => {
      expect(isAggregationFunction('UNKNOWN_FUNC', registry)).toBe(false);
    });
  });

  describe('extractAggregationCallInfo', () => {
    it('should extract info from AVG(@variable)', () => {
      const node: FunctionCallNode = {
        type: 'FunctionCall',
        name: 'AVG',
        args: [{ type: 'VariableRef', name: 'score' }],
      };

      const info = extractAggregationCallInfo(node);

      expect(info).not.toBeNull();
      expect(info?.functionName).toBe('AVG');
      expect(info?.variableName).toBe('score');
      expect(info?.node).toBe(node);
    });

    it('should return null for function with no arguments', () => {
      const node: FunctionCallNode = {
        type: 'FunctionCall',
        name: 'AVG',
        args: [],
      };

      const info = extractAggregationCallInfo(node);
      expect(info).toBeNull();
    });

    it('should return null when first argument is not a variable ref', () => {
      const node: FunctionCallNode = {
        type: 'FunctionCall',
        name: 'AVG',
        args: [{ type: 'Literal', valueType: 'number.float', value: 42 }],
      };

      const info = extractAggregationCallInfo(node);
      expect(info).toBeNull();
    });

    it('should handle PERCENTILE(@variable, k)', () => {
      const node: FunctionCallNode = {
        type: 'FunctionCall',
        name: 'PERCENTILE',
        args: [
          { type: 'VariableRef', name: 'salary' },
          { type: 'Literal', valueType: 'number.float', value: 90 },
        ],
      };

      const info = extractAggregationCallInfo(node);

      expect(info).not.toBeNull();
      expect(info?.functionName).toBe('PERCENTILE');
      expect(info?.variableName).toBe('salary');
    });
  });

  describe('findAggregationCalls', () => {
    it('should return empty array for literal node', () => {
      const node: LiteralNode = {
        type: 'Literal',
        valueType: 'number.float',
        value: 42,
      };

      const calls = findAggregationCalls(node, registry);
      expect(calls).toHaveLength(0);
    });

    it('should return empty array for variable ref node', () => {
      const node: VariableRefNode = {
        type: 'VariableRef',
        name: 'x',
      };

      const calls = findAggregationCalls(node, registry);
      expect(calls).toHaveLength(0);
    });

    it('should find single aggregation call', () => {
      const node: FunctionCallNode = {
        type: 'FunctionCall',
        name: 'AVG',
        args: [{ type: 'VariableRef', name: 'score' }],
      };

      const calls = findAggregationCalls(node, registry);

      expect(calls).toHaveLength(1);
      expect(calls[0]?.functionName).toBe('AVG');
      expect(calls[0]?.variableName).toBe('score');
    });

    it('should find aggregation in binary operation', () => {
      // @price * (1 - AVG(@discount))
      const node: BinaryOpNode = {
        type: 'BinaryOp',
        operator: '*',
        left: { type: 'VariableRef', name: 'price' },
        right: {
          type: 'BinaryOp',
          operator: '-',
          left: { type: 'Literal', valueType: 'number.float', value: 1 },
          right: {
            type: 'FunctionCall',
            name: 'AVG',
            args: [{ type: 'VariableRef', name: 'discount' }],
          },
        },
      };

      const calls = findAggregationCalls(node, registry);

      expect(calls).toHaveLength(1);
      expect(calls[0]?.functionName).toBe('AVG');
      expect(calls[0]?.variableName).toBe('discount');
    });

    it('should find aggregation in unary operation', () => {
      // -SUM(@values)
      const node: UnaryOpNode = {
        type: 'UnaryOp',
        operator: '-',
        operand: {
          type: 'FunctionCall',
          name: 'SUM',
          args: [{ type: 'VariableRef', name: 'values' }],
        },
      };

      const calls = findAggregationCalls(node, registry);

      expect(calls).toHaveLength(1);
      expect(calls[0]?.functionName).toBe('SUM');
      expect(calls[0]?.variableName).toBe('values');
    });

    it('should find multiple different aggregations', () => {
      // MAX(@x) - MIN(@y)
      const node: BinaryOpNode = {
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
          args: [{ type: 'VariableRef', name: 'y' }],
        },
      };

      const calls = findAggregationCalls(node, registry);

      expect(calls).toHaveLength(2);
      expect(calls.map((c) => c.functionName).sort()).toEqual(['MAX', 'MIN']);
    });

    it('should find nested aggregation inside non-aggregation function', () => {
      // IF(@x > AVG(@scores), 1, 0)
      const node: FunctionCallNode = {
        type: 'FunctionCall',
        name: 'IF',
        args: [
          {
            type: 'BinaryOp',
            operator: '>',
            left: { type: 'VariableRef', name: 'x' },
            right: {
              type: 'FunctionCall',
              name: 'AVG',
              args: [{ type: 'VariableRef', name: 'scores' }],
            },
          },
          { type: 'Literal', valueType: 'number.float', value: 1 },
          { type: 'Literal', valueType: 'number.float', value: 0 },
        ],
      };

      const calls = findAggregationCalls(node, registry);

      expect(calls).toHaveLength(1);
      expect(calls[0]?.functionName).toBe('AVG');
      expect(calls[0]?.variableName).toBe('scores');
    });

    it('should not find non-aggregation functions', () => {
      // LOG(POWER(@x, 2))
      const node: FunctionCallNode = {
        type: 'FunctionCall',
        name: 'LOG',
        args: [
          {
            type: 'FunctionCall',
            name: 'POWER',
            args: [
              { type: 'VariableRef', name: 'x' },
              { type: 'Literal', valueType: 'number.float', value: 2 },
            ],
          },
        ],
      };

      const calls = findAggregationCalls(node, registry);
      expect(calls).toHaveLength(0);
    });

    it('should find duplicate aggregations', () => {
      // AVG(@x) + AVG(@x)
      const node: BinaryOpNode = {
        type: 'BinaryOp',
        operator: '+',
        left: {
          type: 'FunctionCall',
          name: 'AVG',
          args: [{ type: 'VariableRef', name: 'x' }],
        },
        right: {
          type: 'FunctionCall',
          name: 'AVG',
          args: [{ type: 'VariableRef', name: 'x' }],
        },
      };

      const calls = findAggregationCalls(node, registry);

      // Should find both, deduplication is separate
      expect(calls).toHaveLength(2);
    });
  });

  describe('deduplicateAggregationCalls', () => {
    it('should keep unique calls', () => {
      const avgNode: FunctionCallNode = {
        type: 'FunctionCall',
        name: 'AVG',
        args: [{ type: 'VariableRef', name: 'x' }],
      };
      const sumNode: FunctionCallNode = {
        type: 'FunctionCall',
        name: 'SUM',
        args: [{ type: 'VariableRef', name: 'y' }],
      };

      const calls: AggregationCallInfo[] = [
        { functionName: 'AVG', variableName: 'x', node: avgNode },
        { functionName: 'SUM', variableName: 'y', node: sumNode },
      ];

      const result = deduplicateAggregationCalls(calls);

      expect(result).toHaveLength(2);
    });

    it('should remove duplicate calls', () => {
      const avgNode1: FunctionCallNode = {
        type: 'FunctionCall',
        name: 'AVG',
        args: [{ type: 'VariableRef', name: 'x' }],
      };
      const avgNode2: FunctionCallNode = {
        type: 'FunctionCall',
        name: 'AVG',
        args: [{ type: 'VariableRef', name: 'x' }],
      };

      const calls: AggregationCallInfo[] = [
        { functionName: 'AVG', variableName: 'x', node: avgNode1 },
        { functionName: 'AVG', variableName: 'x', node: avgNode2 },
      ];

      const result = deduplicateAggregationCalls(calls);

      expect(result).toHaveLength(1);
      expect(result[0]?.functionName).toBe('AVG');
      expect(result[0]?.variableName).toBe('x');
    });

    it('should keep same function with different variables', () => {
      const avgXNode: FunctionCallNode = {
        type: 'FunctionCall',
        name: 'AVG',
        args: [{ type: 'VariableRef', name: 'x' }],
      };
      const avgYNode: FunctionCallNode = {
        type: 'FunctionCall',
        name: 'AVG',
        args: [{ type: 'VariableRef', name: 'y' }],
      };

      const calls: AggregationCallInfo[] = [
        { functionName: 'AVG', variableName: 'x', node: avgXNode },
        { functionName: 'AVG', variableName: 'y', node: avgYNode },
      ];

      const result = deduplicateAggregationCalls(calls);

      expect(result).toHaveLength(2);
    });

    it('should return empty array for empty input', () => {
      const result = deduplicateAggregationCalls([]);
      expect(result).toHaveLength(0);
    });
  });

  describe('extractScalarArguments', () => {
    it('should return empty array for single-arg function', () => {
      const node: FunctionCallNode = {
        type: 'FunctionCall',
        name: 'AVG',
        args: [{ type: 'VariableRef', name: 'x' }],
      };

      const result = extractScalarArguments(node);
      expect(result).toHaveLength(0);
    });

    it('should extract k value for PERCENTILE', () => {
      const node: FunctionCallNode = {
        type: 'FunctionCall',
        name: 'PERCENTILE',
        args: [
          { type: 'VariableRef', name: 'salary' },
          { type: 'Literal', valueType: 'number.float', value: 90 },
        ],
      };

      const result = extractScalarArguments(node);

      expect(result).toHaveLength(1);
      expect(result[0]?.type).toBe('number.float');
      expect(result[0]?.value).toBe(90);
    });

    it('should return null for non-literal arguments', () => {
      const node: FunctionCallNode = {
        type: 'FunctionCall',
        name: 'SOME_FUNC',
        args: [
          { type: 'VariableRef', name: 'x' },
          { type: 'VariableRef', name: 'k' }, // Variable, not literal
        ],
      };

      const result = extractScalarArguments(node);

      expect(result).toHaveLength(1);
      expect(result[0]).toBeNull();
    });
  });

  describe('prepareAggregationArgs', () => {
    it('should return variable values when no scalar args', () => {
      const values: Value[] = [
        { type: 'number.float', value: 1 },
        { type: 'number.float', value: 2 },
        { type: 'number.float', value: 3 },
      ];

      const result = prepareAggregationArgs(values, []);

      expect(result).toHaveLength(3);
      expect(result[0]?.value).toBe(1);
      expect(result[1]?.value).toBe(2);
      expect(result[2]?.value).toBe(3);
    });

    it('should append scalar args to variable values', () => {
      const values: Value[] = [
        { type: 'number.float', value: 10 },
        { type: 'number.float', value: 20 },
      ];
      const scalarArgs: Value[] = [{ type: 'number.float', value: 50 }];

      const result = prepareAggregationArgs(values, scalarArgs);

      expect(result).toHaveLength(3);
      expect(result[0]?.value).toBe(10);
      expect(result[1]?.value).toBe(20);
      expect(result[2]?.value).toBe(50);
    });

    it('should skip null scalar args', () => {
      const values: Value[] = [{ type: 'number.float', value: 1 }];
      const scalarArgs: (Value | null)[] = [null, { type: 'number.float', value: 50 }];

      const result = prepareAggregationArgs(values, scalarArgs);

      expect(result).toHaveLength(2);
      expect(result[1]?.value).toBe(50);
    });
  });
});

describe('aggregationComputer', () => {
  let registry: FunctionRegistryImpl;

  beforeEach(() => {
    registry = createFunctionRegistry({ includeDefaults: true });
  });

  describe('computeAggregations', () => {
    it('should compute AVG aggregation', async () => {
      const node: FunctionCallNode = {
        type: 'FunctionCall',
        name: 'AVG',
        args: [{ type: 'VariableRef', name: 'score' }],
      };

      const context: AggregationComputeContext = {
        getVariableValues(name: string): Value[] {
          if (name === 'score') {
            return [
              { type: 'number.float', value: 80 },
              { type: 'number.float', value: 90 },
              { type: 'number.float', value: 100 },
            ];
          }
          return [];
        },
        registry,
      };

      const result = await computeAggregations(node, context);

      expect(result.cache.size).toBe(1);
      expect(result.cache.get('AVG:score')?.value).toBe(90);
      expect(result.aggregations).toHaveLength(1);
    });

    it('should compute SUM aggregation', async () => {
      const node: FunctionCallNode = {
        type: 'FunctionCall',
        name: 'SUM',
        args: [{ type: 'VariableRef', name: 'prices' }],
      };

      const context: AggregationComputeContext = {
        getVariableValues(name: string): Value[] {
          if (name === 'prices') {
            return [
              { type: 'number.float', value: 10 },
              { type: 'number.float', value: 20 },
              { type: 'number.float', value: 30 },
            ];
          }
          return [];
        },
        registry,
      };

      const result = await computeAggregations(node, context);

      expect(result.cache.get('SUM:prices')?.value).toBe(60);
    });

    it('should compute MIN and MAX aggregations', async () => {
      const node: BinaryOpNode = {
        type: 'BinaryOp',
        operator: '-',
        left: {
          type: 'FunctionCall',
          name: 'MAX',
          args: [{ type: 'VariableRef', name: 'values' }],
        },
        right: {
          type: 'FunctionCall',
          name: 'MIN',
          args: [{ type: 'VariableRef', name: 'values' }],
        },
      };

      const context: AggregationComputeContext = {
        getVariableValues(name: string): Value[] {
          if (name === 'values') {
            return [
              { type: 'number.float', value: 5 },
              { type: 'number.float', value: 15 },
              { type: 'number.float', value: 25 },
            ];
          }
          return [];
        },
        registry,
      };

      const result = await computeAggregations(node, context);

      expect(result.cache.size).toBe(2);
      expect(result.cache.get('MAX:values')?.value).toBe(25);
      expect(result.cache.get('MIN:values')?.value).toBe(5);
    });

    it('should compute COUNT aggregation', async () => {
      const node: FunctionCallNode = {
        type: 'FunctionCall',
        name: 'COUNT',
        args: [{ type: 'VariableRef', name: 'items' }],
      };

      const context: AggregationComputeContext = {
        getVariableValues(name: string): Value[] {
          if (name === 'items') {
            return [
              { type: 'string.text', value: 'a' },
              { type: 'string.text', value: null },
              { type: 'string.text', value: 'b' },
              { type: 'string.text', value: 'c' },
            ];
          }
          return [];
        },
        registry,
      };

      const result = await computeAggregations(node, context);

      // COUNT skips null values
      expect(result.cache.get('COUNT:items')?.value).toBe(3);
    });

    it('should handle null values in aggregation', async () => {
      const node: FunctionCallNode = {
        type: 'FunctionCall',
        name: 'AVG',
        args: [{ type: 'VariableRef', name: 'discount' }],
      };

      const context: AggregationComputeContext = {
        getVariableValues(name: string): Value[] {
          if (name === 'discount') {
            return [
              { type: 'number.float', value: 0.1 },
              { type: 'number.float', value: 0.2 },
              { type: 'number.float', value: 0.15 },
              { type: 'number.float', value: null },
              { type: 'number.float', value: 0.1 },
            ];
          }
          return [];
        },
        registry,
      };

      const result = await computeAggregations(node, context);

      // AVG of [0.1, 0.2, 0.15, 0.1] = 0.55 / 4 = 0.1375
      expect(result.cache.get('AVG:discount')?.value).toBeCloseTo(0.1375, 10);
    });

    it('should deduplicate same aggregation appearing twice', async () => {
      // AVG(@x) + AVG(@x)
      const node: BinaryOpNode = {
        type: 'BinaryOp',
        operator: '+',
        left: {
          type: 'FunctionCall',
          name: 'AVG',
          args: [{ type: 'VariableRef', name: 'x' }],
        },
        right: {
          type: 'FunctionCall',
          name: 'AVG',
          args: [{ type: 'VariableRef', name: 'x' }],
        },
      };

      let callCount = 0;
      const context: AggregationComputeContext = {
        getVariableValues(name: string): Value[] {
          if (name === 'x') {
            callCount++;
            return [
              { type: 'number.float', value: 10 },
              { type: 'number.float', value: 20 },
            ];
          }
          return [];
        },
        registry,
      };

      const result = await computeAggregations(node, context);

      expect(result.cache.size).toBe(1);
      expect(result.cache.get('AVG:x')?.value).toBe(15);
      // The function was called only once due to deduplication
      expect(callCount).toBe(1);
    });

    it('should compute multiple different aggregations', async () => {
      // SUM(@sales) / COUNT(@sales)
      const node: BinaryOpNode = {
        type: 'BinaryOp',
        operator: '/',
        left: {
          type: 'FunctionCall',
          name: 'SUM',
          args: [{ type: 'VariableRef', name: 'sales' }],
        },
        right: {
          type: 'FunctionCall',
          name: 'COUNT',
          args: [{ type: 'VariableRef', name: 'sales' }],
        },
      };

      const context: AggregationComputeContext = {
        getVariableValues(name: string): Value[] {
          if (name === 'sales') {
            return [
              { type: 'number.float', value: 100 },
              { type: 'number.float', value: 200 },
              { type: 'number.float', value: 300 },
            ];
          }
          return [];
        },
        registry,
      };

      const result = await computeAggregations(node, context);

      expect(result.cache.size).toBe(2);
      expect(result.cache.get('SUM:sales')?.value).toBe(600);
      expect(result.cache.get('COUNT:sales')?.value).toBe(3);
    });

    it('should return empty cache for formula without aggregations', async () => {
      const node: BinaryOpNode = {
        type: 'BinaryOp',
        operator: '+',
        left: { type: 'VariableRef', name: 'x' },
        right: { type: 'VariableRef', name: 'y' },
      };

      const context: AggregationComputeContext = {
        getVariableValues(): Value[] {
          return [];
        },
        registry,
      };

      const result = await computeAggregations(node, context);

      expect(result.cache.size).toBe(0);
      expect(result.aggregations).toHaveLength(0);
    });

    it('should return null for empty variable array', async () => {
      const node: FunctionCallNode = {
        type: 'FunctionCall',
        name: 'AVG',
        args: [{ type: 'VariableRef', name: 'empty' }],
      };

      const context: AggregationComputeContext = {
        getVariableValues(): Value[] {
          return [];
        },
        registry,
      };

      const result = await computeAggregations(node, context);

      expect(result.cache.get('AVG:empty')?.value).toBeNull();
    });

    it('should handle PERCENTILE with k parameter', async () => {
      const node: FunctionCallNode = {
        type: 'FunctionCall',
        name: 'PERCENTILE',
        args: [
          { type: 'VariableRef', name: 'data' },
          { type: 'Literal', valueType: 'number.float', value: 50 },
        ],
      };

      const context: AggregationComputeContext = {
        getVariableValues(name: string): Value[] {
          if (name === 'data') {
            return [
              { type: 'number.float', value: 10 },
              { type: 'number.float', value: 20 },
              { type: 'number.float', value: 30 },
              { type: 'number.float', value: 40 },
              { type: 'number.float', value: 50 },
            ];
          }
          return [];
        },
        registry,
      };

      const result = await computeAggregations(node, context);

      // 50th percentile (median) of [10, 20, 30, 40, 50] = 30
      expect(result.cache.get('PERCENTILE:data')?.value).toBe(30);
    });

    it('should handle unknown function gracefully', async () => {
      const node: FunctionCallNode = {
        type: 'FunctionCall',
        name: 'UNKNOWN_AGG',
        args: [{ type: 'VariableRef', name: 'x' }],
      };

      const context: AggregationComputeContext = {
        getVariableValues(): Value[] {
          return [{ type: 'number.float', value: 1 }];
        },
        registry,
      };

      // Should not throw, unknown functions are filtered out during find
      const result = await computeAggregations(node, context);
      expect(result.cache.size).toBe(0);
    });
  });

  describe('createAggregationComputeContext', () => {
    it('should create context from EvaluationContext', () => {
      const evalContext = {
        variables: {
          x: [
            { type: 'number.float' as const, value: 1 },
            { type: 'number.float' as const, value: 2 },
          ],
          y: [
            { type: 'string.text' as const, value: 'a' },
            { type: 'string.text' as const, value: 'b' },
          ],
        },
        rowCount: 2,
      };

      const context = createAggregationComputeContext(evalContext, registry);

      expect(context.registry).toBe(registry);
      expect(context.getVariableValues('x')).toHaveLength(2);
      expect(context.getVariableValues('x')[0]?.value).toBe(1);
      expect(context.getVariableValues('y')[1]?.value).toBe('b');
    });

    it('should return empty array for unknown variable', () => {
      const evalContext = {
        variables: {},
        rowCount: 0,
      };

      const context = createAggregationComputeContext(evalContext, registry);

      expect(context.getVariableValues('unknown')).toHaveLength(0);
    });
  });

  describe('hasAggregations', () => {
    it('should return true for formula with aggregation', () => {
      const node: FunctionCallNode = {
        type: 'FunctionCall',
        name: 'AVG',
        args: [{ type: 'VariableRef', name: 'x' }],
      };

      expect(hasAggregations(node, registry)).toBe(true);
    });

    it('should return false for formula without aggregation', () => {
      const node: BinaryOpNode = {
        type: 'BinaryOp',
        operator: '+',
        left: { type: 'VariableRef', name: 'x' },
        right: { type: 'Literal', valueType: 'number.float', value: 1 },
      };

      expect(hasAggregations(node, registry)).toBe(false);
    });

    it('should return true for nested aggregation', () => {
      // IF(@x > AVG(@y), 1, 0)
      const node: FunctionCallNode = {
        type: 'FunctionCall',
        name: 'IF',
        args: [
          {
            type: 'BinaryOp',
            operator: '>',
            left: { type: 'VariableRef', name: 'x' },
            right: {
              type: 'FunctionCall',
              name: 'AVG',
              args: [{ type: 'VariableRef', name: 'y' }],
            },
          },
          { type: 'Literal', valueType: 'number.float', value: 1 },
          { type: 'Literal', valueType: 'number.float', value: 0 },
        ],
      };

      expect(hasAggregations(node, registry)).toBe(true);
    });
  });

  describe('getAggregationFunctionNames', () => {
    it('should return unique function names', () => {
      // SUM(@x) + AVG(@y) - SUM(@z)
      const node: BinaryOpNode = {
        type: 'BinaryOp',
        operator: '-',
        left: {
          type: 'BinaryOp',
          operator: '+',
          left: {
            type: 'FunctionCall',
            name: 'SUM',
            args: [{ type: 'VariableRef', name: 'x' }],
          },
          right: {
            type: 'FunctionCall',
            name: 'AVG',
            args: [{ type: 'VariableRef', name: 'y' }],
          },
        },
        right: {
          type: 'FunctionCall',
          name: 'SUM',
          args: [{ type: 'VariableRef', name: 'z' }],
        },
      };

      const names = getAggregationFunctionNames(node, registry);

      expect(names.sort()).toEqual(['AVG', 'SUM']);
    });

    it('should return empty array for no aggregations', () => {
      const node: LiteralNode = {
        type: 'Literal',
        valueType: 'number.float',
        value: 42,
      };

      const names = getAggregationFunctionNames(node, registry);
      expect(names).toHaveLength(0);
    });
  });

  describe('Integration: Full formula evaluation context', () => {
    it('should work with realistic formula: @price * (1 - AVG(@discount))', async () => {
      // Build AST for: @price * (1 - AVG(@discount))
      const node: BinaryOpNode = {
        type: 'BinaryOp',
        operator: '*',
        left: { type: 'VariableRef', name: 'price' },
        right: {
          type: 'BinaryOp',
          operator: '-',
          left: { type: 'Literal', valueType: 'number.float', value: 1 },
          right: {
            type: 'FunctionCall',
            name: 'AVG',
            args: [{ type: 'VariableRef', name: 'discount' }],
          },
        },
      };

      const context: AggregationComputeContext = {
        getVariableValues(name: string): Value[] {
          if (name === 'discount') {
            return [
              { type: 'number.float', value: 0.1 },
              { type: 'number.float', value: 0.2 },
              { type: 'number.float', value: 0.15 },
              { type: 'number.float', value: null },
              { type: 'number.float', value: 0.1 },
            ];
          }
          if (name === 'price') {
            return [
              { type: 'number.float', value: 100 },
              { type: 'number.float', value: 200 },
              { type: 'number.float', value: 150 },
              { type: 'number.float', value: 300 },
              { type: 'number.float', value: 250 },
            ];
          }
          return [];
        },
        registry,
      };

      const result = await computeAggregations(node, context);

      // AVG([0.1, 0.2, 0.15, 0.1]) = 0.55 / 4 = 0.1375
      expect(result.cache.size).toBe(1);
      expect(result.cache.get('AVG:discount')?.value).toBeCloseTo(0.1375, 10);
      expect(result.aggregations).toHaveLength(1);
      expect(result.aggregations[0]?.functionName).toBe('AVG');
      expect(result.aggregations[0]?.variableName).toBe('discount');
    });

    it('should work with complex formula: (@score - AVG(@score)) / (MAX(@score) - MIN(@score))', async () => {
      // Normalized score formula
      const node: BinaryOpNode = {
        type: 'BinaryOp',
        operator: '/',
        left: {
          type: 'BinaryOp',
          operator: '-',
          left: { type: 'VariableRef', name: 'score' },
          right: {
            type: 'FunctionCall',
            name: 'AVG',
            args: [{ type: 'VariableRef', name: 'score' }],
          },
        },
        right: {
          type: 'BinaryOp',
          operator: '-',
          left: {
            type: 'FunctionCall',
            name: 'MAX',
            args: [{ type: 'VariableRef', name: 'score' }],
          },
          right: {
            type: 'FunctionCall',
            name: 'MIN',
            args: [{ type: 'VariableRef', name: 'score' }],
          },
        },
      };

      const scores = [
        { type: 'number.float' as const, value: 60 },
        { type: 'number.float' as const, value: 70 },
        { type: 'number.float' as const, value: 80 },
        { type: 'number.float' as const, value: 90 },
        { type: 'number.float' as const, value: 100 },
      ];

      const context: AggregationComputeContext = {
        getVariableValues(name: string): Value[] {
          if (name === 'score') {
            return scores;
          }
          return [];
        },
        registry,
      };

      const result = await computeAggregations(node, context);

      expect(result.cache.size).toBe(3);
      expect(result.cache.get('AVG:score')?.value).toBe(80); // (60+70+80+90+100)/5
      expect(result.cache.get('MAX:score')?.value).toBe(100);
      expect(result.cache.get('MIN:score')?.value).toBe(60);
    });
  });
});
