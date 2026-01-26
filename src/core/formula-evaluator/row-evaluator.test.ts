/**
 * Tests for the row-level evaluator.
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
import type { RowContext } from './evaluator.types.ts';
import { createRowContext, createAggregationCacheKey } from './evaluator.types.ts';
import { evaluateRow } from './row-evaluator.ts';
import { createFunctionRegistry, FunctionRegistryImpl } from '../functions/function-registry.ts';

// Helper function to create a RowContext for testing
function createTestRowContext(variables: Record<string, Value>, rowIndex: number = 0): RowContext {
  return {
    rowIndex,
    getVariable(name: string): Value | null {
      return variables[name] ?? null;
    },
  };
}

describe('rowEvaluator', () => {
  let registry: FunctionRegistryImpl;

  beforeEach(() => {
    registry = createFunctionRegistry({ includeDefaults: true });
  });

  describe('Literals', () => {
    it('should evaluate integer literal', async () => {
      const node: LiteralNode = {
        type: 'Literal',
        valueType: 'number.integer',
        value: 42,
      };
      const context = createTestRowContext({});

      const result = await evaluateRow(node, context, registry);

      expect(result.value.type).toBe('number.integer');
      expect(result.value.value).toBe(42);
      expect(result.error).toBeUndefined();
    });

    it('should evaluate float literal', async () => {
      const node: LiteralNode = {
        type: 'Literal',
        valueType: 'number.float',
        value: 3.14159,
      };
      const context = createTestRowContext({});

      const result = await evaluateRow(node, context, registry);

      expect(result.value.type).toBe('number.float');
      expect(result.value.value).toBe(3.14159);
    });

    it('should evaluate string literal', async () => {
      const node: LiteralNode = {
        type: 'Literal',
        valueType: 'string.text',
        value: 'hello',
      };
      const context = createTestRowContext({});

      const result = await evaluateRow(node, context, registry);

      expect(result.value.type).toBe('string.text');
      expect(result.value.value).toBe('hello');
    });

    it('should evaluate boolean literal true', async () => {
      const node: LiteralNode = {
        type: 'Literal',
        valueType: 'boolean.boolean',
        value: true,
      };
      const context = createTestRowContext({});

      const result = await evaluateRow(node, context, registry);

      expect(result.value.type).toBe('boolean.boolean');
      expect(result.value.value).toBe(true);
    });

    it('should evaluate boolean literal false', async () => {
      const node: LiteralNode = {
        type: 'Literal',
        valueType: 'boolean.boolean',
        value: false,
      };
      const context = createTestRowContext({});

      const result = await evaluateRow(node, context, registry);

      expect(result.value.type).toBe('boolean.boolean');
      expect(result.value.value).toBe(false);
    });

    it('should evaluate null literal', async () => {
      const node: LiteralNode = {
        type: 'Literal',
        valueType: 'number.float',
        value: null,
      };
      const context = createTestRowContext({});

      const result = await evaluateRow(node, context, registry);

      expect(result.value.type).toBe('number.float');
      expect(result.value.value).toBeNull();
    });
  });

  describe('Variable References', () => {
    it('should look up variable value', async () => {
      const node: VariableRefNode = {
        type: 'VariableRef',
        name: 'x',
      };
      const context = createTestRowContext({
        x: { type: 'number.float', value: 100 },
      });

      const result = await evaluateRow(node, context, registry);

      expect(result.value.type).toBe('number.float');
      expect(result.value.value).toBe(100);
    });

    it('should return null for unknown variable', async () => {
      const node: VariableRefNode = {
        type: 'VariableRef',
        name: 'unknown',
      };
      const context = createTestRowContext({});

      const result = await evaluateRow(node, context, registry);

      expect(result.value.value).toBeNull();
    });

    it('should handle variable with null value', async () => {
      const node: VariableRefNode = {
        type: 'VariableRef',
        name: 'x',
      };
      const context = createTestRowContext({
        x: { type: 'number.float', value: null },
      });

      const result = await evaluateRow(node, context, registry);

      expect(result.value.type).toBe('number.float');
      expect(result.value.value).toBeNull();
    });
  });

  describe('Arithmetic Operations', () => {
    it('should evaluate addition', async () => {
      const node: BinaryOpNode = {
        type: 'BinaryOp',
        operator: '+',
        left: { type: 'Literal', valueType: 'number.float', value: 10 },
        right: { type: 'Literal', valueType: 'number.float', value: 5 },
      };
      const context = createTestRowContext({});

      const result = await evaluateRow(node, context, registry);

      expect(result.value.value).toBe(15);
    });

    it('should evaluate subtraction', async () => {
      const node: BinaryOpNode = {
        type: 'BinaryOp',
        operator: '-',
        left: { type: 'Literal', valueType: 'number.float', value: 10 },
        right: { type: 'Literal', valueType: 'number.float', value: 3 },
      };
      const context = createTestRowContext({});

      const result = await evaluateRow(node, context, registry);

      expect(result.value.value).toBe(7);
    });

    it('should evaluate multiplication', async () => {
      const node: BinaryOpNode = {
        type: 'BinaryOp',
        operator: '*',
        left: { type: 'Literal', valueType: 'number.float', value: 4 },
        right: { type: 'Literal', valueType: 'number.float', value: 5 },
      };
      const context = createTestRowContext({});

      const result = await evaluateRow(node, context, registry);

      expect(result.value.value).toBe(20);
    });

    it('should evaluate division', async () => {
      const node: BinaryOpNode = {
        type: 'BinaryOp',
        operator: '/',
        left: { type: 'Literal', valueType: 'number.float', value: 20 },
        right: { type: 'Literal', valueType: 'number.float', value: 4 },
      };
      const context = createTestRowContext({});

      const result = await evaluateRow(node, context, registry);

      expect(result.value.value).toBe(5);
    });

    it('should handle division by zero', async () => {
      const node: BinaryOpNode = {
        type: 'BinaryOp',
        operator: '/',
        left: { type: 'Literal', valueType: 'number.float', value: 10 },
        right: { type: 'Literal', valueType: 'number.float', value: 0 },
      };
      const context = createTestRowContext({});

      const result = await evaluateRow(node, context, registry);

      expect(result.value.value).toBeNull();
      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe('DIV_BY_ZERO');
    });

    it('should evaluate modulo', async () => {
      const node: BinaryOpNode = {
        type: 'BinaryOp',
        operator: '%',
        left: { type: 'Literal', valueType: 'number.float', value: 10 },
        right: { type: 'Literal', valueType: 'number.float', value: 3 },
      };
      const context = createTestRowContext({});

      const result = await evaluateRow(node, context, registry);

      expect(result.value.value).toBe(1);
    });

    it('should handle modulo by zero', async () => {
      const node: BinaryOpNode = {
        type: 'BinaryOp',
        operator: '%',
        left: { type: 'Literal', valueType: 'number.float', value: 10 },
        right: { type: 'Literal', valueType: 'number.float', value: 0 },
      };
      const context = createTestRowContext({});

      const result = await evaluateRow(node, context, registry);

      expect(result.value.value).toBeNull();
      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe('DIV_BY_ZERO');
    });

    it('should evaluate exponentiation', async () => {
      const node: BinaryOpNode = {
        type: 'BinaryOp',
        operator: '^',
        left: { type: 'Literal', valueType: 'number.float', value: 2 },
        right: { type: 'Literal', valueType: 'number.float', value: 3 },
      };
      const context = createTestRowContext({});

      const result = await evaluateRow(node, context, registry);

      expect(result.value.value).toBe(8);
    });

    it('should evaluate nested arithmetic', async () => {
      // (10 + 5) * 2 = 30
      const node: BinaryOpNode = {
        type: 'BinaryOp',
        operator: '*',
        left: {
          type: 'BinaryOp',
          operator: '+',
          left: { type: 'Literal', valueType: 'number.float', value: 10 },
          right: { type: 'Literal', valueType: 'number.float', value: 5 },
        },
        right: { type: 'Literal', valueType: 'number.float', value: 2 },
      };
      const context = createTestRowContext({});

      const result = await evaluateRow(node, context, registry);

      expect(result.value.value).toBe(30);
    });

    it('should evaluate with variables', async () => {
      const node: BinaryOpNode = {
        type: 'BinaryOp',
        operator: '+',
        left: { type: 'VariableRef', name: 'x' },
        right: { type: 'VariableRef', name: 'y' },
      };
      const context = createTestRowContext({
        x: { type: 'number.float', value: 7 },
        y: { type: 'number.float', value: 3 },
      });

      const result = await evaluateRow(node, context, registry);

      expect(result.value.value).toBe(10);
    });
  });

  describe('Null Propagation', () => {
    it('should propagate null in addition (left null)', async () => {
      const node: BinaryOpNode = {
        type: 'BinaryOp',
        operator: '+',
        left: { type: 'Literal', valueType: 'number.float', value: null },
        right: { type: 'Literal', valueType: 'number.float', value: 5 },
      };
      const context = createTestRowContext({});

      const result = await evaluateRow(node, context, registry);

      expect(result.value.value).toBeNull();
      expect(result.error).toBeUndefined();
    });

    it('should propagate null in addition (right null)', async () => {
      const node: BinaryOpNode = {
        type: 'BinaryOp',
        operator: '+',
        left: { type: 'Literal', valueType: 'number.float', value: 10 },
        right: { type: 'Literal', valueType: 'number.float', value: null },
      };
      const context = createTestRowContext({});

      const result = await evaluateRow(node, context, registry);

      expect(result.value.value).toBeNull();
      expect(result.error).toBeUndefined();
    });

    it('should propagate null in comparison', async () => {
      const node: BinaryOpNode = {
        type: 'BinaryOp',
        operator: '>',
        left: { type: 'Literal', valueType: 'number.float', value: null },
        right: { type: 'Literal', valueType: 'number.float', value: 5 },
      };
      const context = createTestRowContext({});

      const result = await evaluateRow(node, context, registry);

      expect(result.value.value).toBeNull();
    });

    it('should propagate null in string concatenation', async () => {
      const node: BinaryOpNode = {
        type: 'BinaryOp',
        operator: '&',
        left: { type: 'Literal', valueType: 'string.text', value: 'hello' },
        right: { type: 'Literal', valueType: 'string.text', value: null },
      };
      const context = createTestRowContext({});

      const result = await evaluateRow(node, context, registry);

      expect(result.value.value).toBeNull();
    });

    it('should propagate null from variable', async () => {
      const node: BinaryOpNode = {
        type: 'BinaryOp',
        operator: '*',
        left: { type: 'VariableRef', name: 'x' },
        right: { type: 'Literal', valueType: 'number.float', value: 2 },
      };
      const context = createTestRowContext({
        x: { type: 'number.float', value: null },
      });

      const result = await evaluateRow(node, context, registry);

      expect(result.value.value).toBeNull();
    });
  });

  describe('Comparison Operations', () => {
    it('should evaluate equality (true)', async () => {
      const node: BinaryOpNode = {
        type: 'BinaryOp',
        operator: '==',
        left: { type: 'Literal', valueType: 'number.float', value: 5 },
        right: { type: 'Literal', valueType: 'number.float', value: 5 },
      };
      const context = createTestRowContext({});

      const result = await evaluateRow(node, context, registry);

      expect(result.value.type).toBe('boolean.boolean');
      expect(result.value.value).toBe(true);
    });

    it('should evaluate equality (false)', async () => {
      const node: BinaryOpNode = {
        type: 'BinaryOp',
        operator: '==',
        left: { type: 'Literal', valueType: 'number.float', value: 5 },
        right: { type: 'Literal', valueType: 'number.float', value: 10 },
      };
      const context = createTestRowContext({});

      const result = await evaluateRow(node, context, registry);

      expect(result.value.value).toBe(false);
    });

    it('should evaluate inequality with !=', async () => {
      const node: BinaryOpNode = {
        type: 'BinaryOp',
        operator: '!=',
        left: { type: 'Literal', valueType: 'number.float', value: 5 },
        right: { type: 'Literal', valueType: 'number.float', value: 10 },
      };
      const context = createTestRowContext({});

      const result = await evaluateRow(node, context, registry);

      expect(result.value.value).toBe(true);
    });

    it('should evaluate inequality with <>', async () => {
      const node: BinaryOpNode = {
        type: 'BinaryOp',
        operator: '<>',
        left: { type: 'Literal', valueType: 'number.float', value: 5 },
        right: { type: 'Literal', valueType: 'number.float', value: 5 },
      };
      const context = createTestRowContext({});

      const result = await evaluateRow(node, context, registry);

      expect(result.value.value).toBe(false);
    });

    it('should evaluate less than', async () => {
      const node: BinaryOpNode = {
        type: 'BinaryOp',
        operator: '<',
        left: { type: 'Literal', valueType: 'number.float', value: 3 },
        right: { type: 'Literal', valueType: 'number.float', value: 5 },
      };
      const context = createTestRowContext({});

      const result = await evaluateRow(node, context, registry);

      expect(result.value.value).toBe(true);
    });

    it('should evaluate greater than', async () => {
      const node: BinaryOpNode = {
        type: 'BinaryOp',
        operator: '>',
        left: { type: 'Literal', valueType: 'number.float', value: 10 },
        right: { type: 'Literal', valueType: 'number.float', value: 5 },
      };
      const context = createTestRowContext({});

      const result = await evaluateRow(node, context, registry);

      expect(result.value.value).toBe(true);
    });

    it('should evaluate less than or equal', async () => {
      const node: BinaryOpNode = {
        type: 'BinaryOp',
        operator: '<=',
        left: { type: 'Literal', valueType: 'number.float', value: 5 },
        right: { type: 'Literal', valueType: 'number.float', value: 5 },
      };
      const context = createTestRowContext({});

      const result = await evaluateRow(node, context, registry);

      expect(result.value.value).toBe(true);
    });

    it('should evaluate greater than or equal', async () => {
      const node: BinaryOpNode = {
        type: 'BinaryOp',
        operator: '>=',
        left: { type: 'Literal', valueType: 'number.float', value: 3 },
        right: { type: 'Literal', valueType: 'number.float', value: 5 },
      };
      const context = createTestRowContext({});

      const result = await evaluateRow(node, context, registry);

      expect(result.value.value).toBe(false);
    });

    it('should compare strings for equality', async () => {
      const node: BinaryOpNode = {
        type: 'BinaryOp',
        operator: '==',
        left: { type: 'Literal', valueType: 'string.text', value: 'hello' },
        right: { type: 'Literal', valueType: 'string.text', value: 'hello' },
      };
      const context = createTestRowContext({});

      const result = await evaluateRow(node, context, registry);

      expect(result.value.value).toBe(true);
    });
  });

  describe('String Concatenation', () => {
    it('should concatenate strings', async () => {
      const node: BinaryOpNode = {
        type: 'BinaryOp',
        operator: '&',
        left: { type: 'Literal', valueType: 'string.text', value: 'hello' },
        right: { type: 'Literal', valueType: 'string.text', value: ' world' },
      };
      const context = createTestRowContext({});

      const result = await evaluateRow(node, context, registry);

      expect(result.value.type).toBe('string.text');
      expect(result.value.value).toBe('hello world');
    });

    it('should coerce numbers to strings for concatenation', async () => {
      const node: BinaryOpNode = {
        type: 'BinaryOp',
        operator: '&',
        left: { type: 'Literal', valueType: 'string.text', value: 'value: ' },
        right: { type: 'Literal', valueType: 'number.float', value: 42 },
      };
      const context = createTestRowContext({});

      const result = await evaluateRow(node, context, registry);

      expect(result.value.value).toBe('value: 42');
    });
  });

  describe('Unary Operations', () => {
    it('should evaluate unary negation', async () => {
      const node: UnaryOpNode = {
        type: 'UnaryOp',
        operator: '-',
        operand: { type: 'Literal', valueType: 'number.float', value: 5 },
      };
      const context = createTestRowContext({});

      const result = await evaluateRow(node, context, registry);

      expect(result.value.type).toBe('number.float');
      expect(result.value.value).toBe(-5);
    });

    it('should evaluate unary plus', async () => {
      const node: UnaryOpNode = {
        type: 'UnaryOp',
        operator: '+',
        operand: { type: 'Literal', valueType: 'number.float', value: 5 },
      };
      const context = createTestRowContext({});

      const result = await evaluateRow(node, context, registry);

      expect(result.value.value).toBe(5);
    });

    it('should propagate null in unary operation', async () => {
      const node: UnaryOpNode = {
        type: 'UnaryOp',
        operator: '-',
        operand: { type: 'Literal', valueType: 'number.float', value: null },
      };
      const context = createTestRowContext({});

      const result = await evaluateRow(node, context, registry);

      expect(result.value.value).toBeNull();
    });

    it('should evaluate double negation', async () => {
      const node: UnaryOpNode = {
        type: 'UnaryOp',
        operator: '-',
        operand: {
          type: 'UnaryOp',
          operator: '-',
          operand: { type: 'Literal', valueType: 'number.float', value: 5 },
        },
      };
      const context = createTestRowContext({});

      const result = await evaluateRow(node, context, registry);

      expect(result.value.value).toBe(5);
    });
  });

  describe('Function Calls', () => {
    it('should evaluate LOG function', async () => {
      const node: FunctionCallNode = {
        type: 'FunctionCall',
        name: 'LOG',
        args: [{ type: 'Literal', valueType: 'number.float', value: Math.E }],
      };
      const context = createTestRowContext({});

      const result = await evaluateRow(node, context, registry);

      expect(result.value.type).toBe('number.float');
      expect(result.value.value).toBeCloseTo(1, 10);
    });

    it('should evaluate POWER function', async () => {
      const node: FunctionCallNode = {
        type: 'FunctionCall',
        name: 'POWER',
        args: [
          { type: 'Literal', valueType: 'number.float', value: 2 },
          { type: 'Literal', valueType: 'number.float', value: 10 },
        ],
      };
      const context = createTestRowContext({});

      const result = await evaluateRow(node, context, registry);

      expect(result.value.value).toBe(1024);
    });

    it('should evaluate IF function (true condition)', async () => {
      const node: FunctionCallNode = {
        type: 'FunctionCall',
        name: 'IF',
        args: [
          { type: 'Literal', valueType: 'boolean.boolean', value: true },
          { type: 'Literal', valueType: 'string.text', value: 'yes' },
          { type: 'Literal', valueType: 'string.text', value: 'no' },
        ],
      };
      const context = createTestRowContext({});

      const result = await evaluateRow(node, context, registry);

      expect(result.value.value).toBe('yes');
    });

    it('should evaluate IF function (false condition)', async () => {
      const node: FunctionCallNode = {
        type: 'FunctionCall',
        name: 'IF',
        args: [
          { type: 'Literal', valueType: 'boolean.boolean', value: false },
          { type: 'Literal', valueType: 'string.text', value: 'yes' },
          { type: 'Literal', valueType: 'string.text', value: 'no' },
        ],
      };
      const context = createTestRowContext({});

      const result = await evaluateRow(node, context, registry);

      expect(result.value.value).toBe('no');
    });

    it('should evaluate nested function calls', async () => {
      // POWER(2, POWER(2, 2)) = POWER(2, 4) = 16
      const node: FunctionCallNode = {
        type: 'FunctionCall',
        name: 'POWER',
        args: [
          { type: 'Literal', valueType: 'number.float', value: 2 },
          {
            type: 'FunctionCall',
            name: 'POWER',
            args: [
              { type: 'Literal', valueType: 'number.float', value: 2 },
              { type: 'Literal', valueType: 'number.float', value: 2 },
            ],
          },
        ],
      };
      const context = createTestRowContext({});

      const result = await evaluateRow(node, context, registry);

      expect(result.value.value).toBe(16);
    });

    it('should return null for unknown function', async () => {
      const node: FunctionCallNode = {
        type: 'FunctionCall',
        name: 'UNKNOWN_FUNCTION',
        args: [],
      };
      const context = createTestRowContext({});

      const result = await evaluateRow(node, context, registry);

      expect(result.value.value).toBeNull();
    });

    it('should handle function with null argument', async () => {
      const node: FunctionCallNode = {
        type: 'FunctionCall',
        name: 'LOG',
        args: [{ type: 'Literal', valueType: 'number.float', value: null }],
      };
      const context = createTestRowContext({});

      const result = await evaluateRow(node, context, registry);

      expect(result.value.value).toBeNull();
    });

    it('should handle domain error (LOG of negative)', async () => {
      const node: FunctionCallNode = {
        type: 'FunctionCall',
        name: 'LOG',
        args: [{ type: 'Literal', valueType: 'number.float', value: -1 }],
      };
      const context = createTestRowContext({});

      const result = await evaluateRow(node, context, registry);

      expect(result.value.value).toBeNull();
    });
  });

  describe('Complex Expressions', () => {
    it('should evaluate @x * 2 + @y', async () => {
      const node: BinaryOpNode = {
        type: 'BinaryOp',
        operator: '+',
        left: {
          type: 'BinaryOp',
          operator: '*',
          left: { type: 'VariableRef', name: 'x' },
          right: { type: 'Literal', valueType: 'number.float', value: 2 },
        },
        right: { type: 'VariableRef', name: 'y' },
      };
      const context = createTestRowContext({
        x: { type: 'number.float', value: 5 },
        y: { type: 'number.float', value: 3 },
      });

      const result = await evaluateRow(node, context, registry);

      expect(result.value.value).toBe(13); // 5*2 + 3 = 13
    });

    it('should evaluate IF(@x > 0, @x, -@x)', async () => {
      const node: FunctionCallNode = {
        type: 'FunctionCall',
        name: 'IF',
        args: [
          {
            type: 'BinaryOp',
            operator: '>',
            left: { type: 'VariableRef', name: 'x' },
            right: { type: 'Literal', valueType: 'number.float', value: 0 },
          },
          { type: 'VariableRef', name: 'x' },
          {
            type: 'UnaryOp',
            operator: '-',
            operand: { type: 'VariableRef', name: 'x' },
          },
        ],
      };

      // Test with positive x
      const positiveContext = createTestRowContext({
        x: { type: 'number.float', value: 5 },
      });
      const positiveResult = await evaluateRow(node, positiveContext, registry);
      expect(positiveResult.value.value).toBe(5);

      // Test with negative x
      const negativeContext = createTestRowContext({
        x: { type: 'number.float', value: -5 },
      });
      const negativeResult = await evaluateRow(node, negativeContext, registry);
      expect(negativeResult.value.value).toBe(5);
    });
  });

  describe('createRowContext', () => {
    it('should create row context from variables', () => {
      const variables = {
        x: [
          { type: 'number.float' as const, value: 1 },
          { type: 'number.float' as const, value: 2 },
          { type: 'number.float' as const, value: 3 },
        ],
        y: [
          { type: 'string.text' as const, value: 'a' },
          { type: 'string.text' as const, value: 'b' },
          { type: 'string.text' as const, value: 'c' },
        ],
      };

      const context0 = createRowContext(variables, 0);
      expect(context0.rowIndex).toBe(0);
      expect(context0.getVariable('x')?.value).toBe(1);
      expect(context0.getVariable('y')?.value).toBe('a');

      const context1 = createRowContext(variables, 1);
      expect(context1.rowIndex).toBe(1);
      expect(context1.getVariable('x')?.value).toBe(2);
      expect(context1.getVariable('y')?.value).toBe('b');
    });

    it('should handle aggregation cache lookup', () => {
      const cache = new Map<string, Value>();
      cache.set(createAggregationCacheKey('AVG', 'x'), { type: 'number.float', value: 50 });

      const context = createRowContext({}, 0, cache);

      const cached = context.getCachedAggregation?.('AVG', 'x');
      expect(cached?.value).toBe(50);

      const notCached = context.getCachedAggregation?.('SUM', 'x');
      expect(notCached).toBeUndefined();
    });
  });

  describe('Aggregation Cache', () => {
    it('should use cached aggregation value', async () => {
      const node: FunctionCallNode = {
        type: 'FunctionCall',
        name: 'AVG',
        args: [{ type: 'VariableRef', name: 'scores' }],
      };

      const cache = new Map<string, Value>();
      cache.set(createAggregationCacheKey('AVG', 'scores'), { type: 'number.float', value: 85.5 });

      const context = createTestRowContext({});

      const result = await evaluateRow(node, context, registry, undefined, cache);

      expect(result.value.type).toBe('number.float');
      expect(result.value.value).toBe(85.5);
    });
  });
});
