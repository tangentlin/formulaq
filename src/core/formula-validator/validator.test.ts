/**
 * Comprehensive tests for the Validator class.
 *
 * These tests verify:
 * - ValidatedAST includes hasAggregations: boolean
 * - ValidatedAST includes aggregations: string[] (function names)
 * - ValidatedAST includes resultType: ValueType
 * - Full formula validation in single pass
 * - All error types tested
 *
 * @module
 */

import { describe, expect, it, beforeEach } from 'vitest';

import type {
  ASTNode,
  BinaryOpNode,
  BinaryOperator,
  FunctionCallNode,
  LiteralNode,
  UnaryOpNode,
  VariableRefNode,
} from '../types/ast.ts';
import type { VariableProvider } from '../types/context.ts';
import { FormulaSemanticError } from '../types/errors.ts';
import type { FormulaFunction } from '../types/functions.ts';
import type { ValueType, VariableInfo } from '../types/values.ts';
import { createFunctionRegistry, FunctionRegistryImpl } from '../functions/function-registry.ts';
import { Validator, createSimpleVariableProvider } from './validator.ts';
import {
  detectAggregations,
  collectFunctionCallNodes,
  extractUniqueAggregationNames,
  filterAggregationCalls,
  isAggregationFunction,
  extractVariableFromFirstArg,
  getAggregationInfos,
} from './aggregation-detector.view-model.ts';
import {
  detectAggregationsFromAst,
  hasAggregations,
  getAggregationNames,
  getAggregationDetails,
} from './aggregation-detector.ts';

// =============================================================================
// Test fixtures
// =============================================================================

/**
 * Creates a simple variable reference node.
 */
function createVariableRef(name: string, start: number = 0, end: number = 5): VariableRefNode {
  return {
    type: 'VariableRef',
    name,
    location: { start, end },
  };
}

/**
 * Creates a literal node.
 */
function createLiteral(
  value: number | string | boolean,
  valueType: ValueType,
  start: number = 0,
  end: number = 5,
): LiteralNode {
  return {
    type: 'Literal',
    valueType,
    value,
    location: { start, end },
  };
}

/**
 * Creates a binary operation node.
 */
function createBinaryOp(
  operator: BinaryOperator,
  left: ASTNode,
  right: ASTNode,
  start: number = 0,
  end: number = 10,
): BinaryOpNode {
  return {
    type: 'BinaryOp',
    operator,
    left,
    right,
    location: { start, end },
  };
}

/**
 * Creates a unary operation node.
 */
function createUnaryOp(
  operator: '-' | '+',
  operand: ASTNode,
  start: number = 0,
  end: number = 5,
): UnaryOpNode {
  return {
    type: 'UnaryOp',
    operator,
    operand,
    location: { start, end },
  };
}

/**
 * Creates a function call node.
 */
function createFunctionCall(
  name: string,
  args: ASTNode[],
  start: number = 0,
  end: number = 10,
): FunctionCallNode {
  return {
    type: 'FunctionCall',
    name,
    args,
    location: { start, end },
  };
}

/**
 * Creates a test VariableProvider.
 */
function createTestProvider(variableNames: string[]): VariableProvider {
  const variables: VariableInfo[] = variableNames.map(function createInfo(name) {
    return {
      name,
      type: 'number.float' as ValueType,
      nullable: true,
    };
  });

  return {
    getVariables: function getVariables() {
      return variables;
    },
    hasVariable: function hasVariable(name: string) {
      return variableNames.includes(name);
    },
    getVariableType: function getVariableType(name: string) {
      if (variableNames.includes(name)) {
        return 'number.float';
      }
      return undefined;
    },
    isNullable: function isNullable() {
      return true;
    },
  };
}

/**
 * Creates a function registry with common test functions.
 */
function createTestRegistry(): FunctionRegistryImpl {
  const registry = createFunctionRegistry();

  // Register AVG - aggregation function
  registry.register({
    name: 'AVG',
    description: 'Calculate average',
    params: [
      {
        name: 'values',
        type: ['number.integer', 'number.float'],
        description: 'Values to average',
      },
    ],
    returnType: 'number.float',
    isAggregation: true,
    category: 'Aggregation',
    evaluate: async function evaluate() {
      return { type: 'number.float', value: 0 };
    },
  } as FormulaFunction);

  // Register SUM - aggregation function
  registry.register({
    name: 'SUM',
    description: 'Calculate sum',
    params: [
      {
        name: 'values',
        type: ['number.integer', 'number.float'],
        description: 'Values to sum',
      },
    ],
    returnType: 'number.float',
    isAggregation: true,
    category: 'Aggregation',
    evaluate: async function evaluate() {
      return { type: 'number.float', value: 0 };
    },
  } as FormulaFunction);

  // Register MAX - aggregation function
  registry.register({
    name: 'MAX',
    description: 'Find maximum',
    params: [
      {
        name: 'values',
        type: ['number.integer', 'number.float'],
        description: 'Values to find max of',
      },
    ],
    returnType: 'number.float',
    isAggregation: true,
    category: 'Aggregation',
    evaluate: async function evaluate() {
      return { type: 'number.float', value: 0 };
    },
  } as FormulaFunction);

  // Register MIN - aggregation function
  registry.register({
    name: 'MIN',
    description: 'Find minimum',
    params: [
      {
        name: 'values',
        type: ['number.integer', 'number.float'],
        description: 'Values to find min of',
      },
    ],
    returnType: 'number.float',
    isAggregation: true,
    category: 'Aggregation',
    evaluate: async function evaluate() {
      return { type: 'number.float', value: 0 };
    },
  } as FormulaFunction);

  // Register COUNT - aggregation function
  registry.register({
    name: 'COUNT',
    description: 'Count values',
    params: [
      {
        name: 'values',
        type: 'any',
        description: 'Values to count',
      },
    ],
    returnType: 'number.integer',
    isAggregation: true,
    category: 'Aggregation',
    evaluate: async function evaluate() {
      return { type: 'number.integer', value: 0 };
    },
  } as FormulaFunction);

  // Register IF - non-aggregation function
  registry.register({
    name: 'IF',
    description: 'Conditional expression',
    params: [
      { name: 'condition', type: 'boolean.boolean', description: 'Condition' },
      { name: 'then_value', type: 'any', description: 'Value if true' },
      { name: 'else_value', type: 'any', description: 'Value if false' },
    ],
    returnType: 'number.float',
    isAggregation: false,
    category: 'Logical',
    evaluate: async function evaluate() {
      return { type: 'number.float', value: 0 };
    },
  } as FormulaFunction);

  // Register LOG - non-aggregation function
  registry.register({
    name: 'LOG',
    description: 'Natural logarithm',
    params: [{ name: 'x', type: ['number.integer', 'number.float'], description: 'Value' }],
    returnType: 'number.float',
    isAggregation: false,
    category: 'Math',
    evaluate: async function evaluate() {
      return { type: 'number.float', value: 0 };
    },
  } as FormulaFunction);

  // Register POWER - non-aggregation function
  registry.register({
    name: 'POWER',
    description: 'Raise to power',
    params: [
      { name: 'base', type: ['number.integer', 'number.float'], description: 'Base' },
      { name: 'exponent', type: ['number.integer', 'number.float'], description: 'Exponent' },
    ],
    returnType: 'number.float',
    isAggregation: false,
    category: 'Math',
    evaluate: async function evaluate() {
      return { type: 'number.float', value: 0 };
    },
  } as FormulaFunction);

  // Register CONCAT - non-aggregation variadic function
  registry.register({
    name: 'CONCAT',
    description: 'Concatenate strings',
    params: [{ name: 'strings', type: 'string.text', description: 'Strings to concatenate' }],
    returnType: 'string.text',
    isAggregation: false,
    isVariadic: true,
    minArgs: 2,
    category: 'String',
    evaluate: async function evaluate() {
      return { type: 'string.text', value: '' };
    },
  } as FormulaFunction);

  return registry;
}

// =============================================================================
// Aggregation Detector ViewModel Tests
// =============================================================================

describe('aggregationDetector.viewModel', function () {
  let registry: FunctionRegistryImpl;

  beforeEach(function () {
    registry = createTestRegistry();
  });

  function getFunction(name: string) {
    return registry.get(name);
  }

  describe('collectFunctionCallNodes', function () {
    it('should collect function calls from AST', function () {
      const ast = createFunctionCall('AVG', [createVariableRef('score')]);
      const calls = collectFunctionCallNodes(ast);
      expect(calls).toHaveLength(1);
      expect(calls[0]!.name).toBe('AVG');
    });

    it('should collect nested function calls', function () {
      const innerCall = createFunctionCall('AVG', [createVariableRef('score')]);
      const outerCall = createFunctionCall('POWER', [innerCall, createLiteral(2, 'number.float')]);
      const calls = collectFunctionCallNodes(outerCall);
      expect(calls).toHaveLength(2);
      expect(calls[0]!.name).toBe('POWER');
      expect(calls[1]!.name).toBe('AVG');
    });

    it('should find function calls in binary operations', function () {
      const left = createFunctionCall('SUM', [createVariableRef('score')]);
      const right = createFunctionCall('AVG', [createVariableRef('count')]);
      const ast = createBinaryOp('+', left, right);
      const calls = collectFunctionCallNodes(ast);
      expect(calls).toHaveLength(2);
    });

    it('should find function calls in unary operations', function () {
      const fnCall = createFunctionCall('AVG', [createVariableRef('score')]);
      const ast = createUnaryOp('-', fnCall);
      const calls = collectFunctionCallNodes(ast);
      expect(calls).toHaveLength(1);
    });

    it('should return empty array for literal', function () {
      const ast = createLiteral(42, 'number.float');
      const calls = collectFunctionCallNodes(ast);
      expect(calls).toHaveLength(0);
    });

    it('should return empty array for variable reference', function () {
      const ast = createVariableRef('x');
      const calls = collectFunctionCallNodes(ast);
      expect(calls).toHaveLength(0);
    });
  });

  describe('isAggregationFunction', function () {
    it('should return true for aggregation functions', function () {
      expect(isAggregationFunction('AVG', getFunction)).toBe(true);
      expect(isAggregationFunction('SUM', getFunction)).toBe(true);
      expect(isAggregationFunction('MAX', getFunction)).toBe(true);
      expect(isAggregationFunction('MIN', getFunction)).toBe(true);
      expect(isAggregationFunction('COUNT', getFunction)).toBe(true);
    });

    it('should return false for non-aggregation functions', function () {
      expect(isAggregationFunction('IF', getFunction)).toBe(false);
      expect(isAggregationFunction('LOG', getFunction)).toBe(false);
      expect(isAggregationFunction('POWER', getFunction)).toBe(false);
    });

    it('should return false for unknown functions', function () {
      expect(isAggregationFunction('UNKNOWN', getFunction)).toBe(false);
    });
  });

  describe('extractVariableFromFirstArg', function () {
    it('should extract variable name from first argument', function () {
      const call = createFunctionCall('AVG', [createVariableRef('score')]);
      expect(extractVariableFromFirstArg(call)).toBe('score');
    });

    it('should return undefined if first argument is not a variable', function () {
      const call = createFunctionCall('LOG', [createLiteral(10, 'number.float')]);
      expect(extractVariableFromFirstArg(call)).toBeUndefined();
    });

    it('should return undefined if no arguments', function () {
      const call = createFunctionCall('COUNT', []);
      expect(extractVariableFromFirstArg(call)).toBeUndefined();
    });
  });

  describe('extractUniqueAggregationNames', function () {
    it('should extract unique aggregation names', function () {
      const calls = [
        createFunctionCall('AVG', [createVariableRef('score')]),
        createFunctionCall('SUM', [createVariableRef('score')]),
        createFunctionCall('AVG', [createVariableRef('count')]),
      ];
      const names = extractUniqueAggregationNames(calls, getFunction);
      expect(names).toEqual(['AVG', 'SUM']);
    });

    it('should exclude non-aggregation functions', function () {
      const calls = [
        createFunctionCall('AVG', [createVariableRef('score')]),
        createFunctionCall('LOG', [createVariableRef('score')]),
      ];
      const names = extractUniqueAggregationNames(calls, getFunction);
      expect(names).toEqual(['AVG']);
    });

    it('should return empty array for no aggregations', function () {
      const calls = [createFunctionCall('LOG', [createVariableRef('score')])];
      const names = extractUniqueAggregationNames(calls, getFunction);
      expect(names).toEqual([]);
    });
  });

  describe('filterAggregationCalls', function () {
    it('should filter to only aggregation calls', function () {
      const calls = [
        createFunctionCall('AVG', [createVariableRef('score')]),
        createFunctionCall('LOG', [createVariableRef('score')]),
        createFunctionCall('SUM', [createVariableRef('count')]),
      ];
      const filtered = filterAggregationCalls(calls, getFunction);
      expect(filtered).toHaveLength(2);
      expect(filtered[0]!.name).toBe('AVG');
      expect(filtered[1]!.name).toBe('SUM');
    });
  });

  describe('detectAggregations', function () {
    it('should detect aggregations in AST', function () {
      const ast = createFunctionCall('AVG', [createVariableRef('score')]);
      const result = detectAggregations({ ast, getFunction });
      expect(result.hasAggregations).toBe(true);
      expect(result.aggregations).toEqual(['AVG']);
      expect(result.aggregationCalls).toHaveLength(1);
    });

    it('should detect multiple aggregations', function () {
      const avgCall = createFunctionCall('AVG', [createVariableRef('score')]);
      const sumCall = createFunctionCall('SUM', [createVariableRef('count')]);
      const ast = createBinaryOp('+', avgCall, sumCall);
      const result = detectAggregations({ ast, getFunction });
      expect(result.hasAggregations).toBe(true);
      expect(result.aggregations).toEqual(['AVG', 'SUM']);
      expect(result.aggregationCalls).toHaveLength(2);
    });

    it('should return no aggregations for non-aggregation formula', function () {
      const ast = createFunctionCall('LOG', [createVariableRef('score')]);
      const result = detectAggregations({ ast, getFunction });
      expect(result.hasAggregations).toBe(false);
      expect(result.aggregations).toEqual([]);
      expect(result.aggregationCalls).toHaveLength(0);
    });

    it('should return no aggregations for simple expression', function () {
      const ast = createBinaryOp('+', createVariableRef('x'), createLiteral(5, 'number.float'));
      const result = detectAggregations({ ast, getFunction });
      expect(result.hasAggregations).toBe(false);
      expect(result.aggregations).toEqual([]);
    });
  });

  describe('getAggregationInfos', function () {
    it('should get detailed info about aggregation calls', function () {
      const ast = createFunctionCall('AVG', [createVariableRef('score')]);
      const infos = getAggregationInfos({ ast, getFunction });
      expect(infos).toHaveLength(1);
      expect(infos[0]!.functionName).toBe('AVG');
      expect(infos[0]!.variableName).toBe('score');
      expect(infos[0]!.node).toBeDefined();
    });

    it('should handle multiple aggregations', function () {
      const avgCall = createFunctionCall('AVG', [createVariableRef('score')]);
      const maxCall = createFunctionCall('MAX', [createVariableRef('count')]);
      const ast = createBinaryOp('-', avgCall, maxCall);
      const infos = getAggregationInfos({ ast, getFunction });
      expect(infos).toHaveLength(2);
      expect(infos[0]!.functionName).toBe('AVG');
      expect(infos[0]!.variableName).toBe('score');
      expect(infos[1]!.functionName).toBe('MAX');
      expect(infos[1]!.variableName).toBe('count');
    });
  });
});

// =============================================================================
// Aggregation Detector Main Module Tests
// =============================================================================

describe('aggregationDetector', function () {
  let registry: FunctionRegistryImpl;

  beforeEach(function () {
    registry = createTestRegistry();
  });

  describe('detectAggregationsFromAst', function () {
    it('should detect aggregations using registry', function () {
      const ast = createFunctionCall('AVG', [createVariableRef('score')]);
      const result = detectAggregationsFromAst(ast, registry);
      expect(result.hasAggregations).toBe(true);
      expect(result.aggregations).toEqual(['AVG']);
    });

    it('should detect nested aggregations', function () {
      const innerAvg = createFunctionCall('AVG', [createVariableRef('score')]);
      const outerPower = createFunctionCall('POWER', [innerAvg, createLiteral(2, 'number.float')]);
      const sumCall = createFunctionCall('SUM', [createVariableRef('count')]);
      const ast = createBinaryOp('+', outerPower, sumCall);
      const result = detectAggregationsFromAst(ast, registry);
      expect(result.hasAggregations).toBe(true);
      expect(result.aggregations).toContain('AVG');
      expect(result.aggregations).toContain('SUM');
    });
  });

  describe('hasAggregations', function () {
    it('should return true when aggregations are present', function () {
      const ast = createFunctionCall('SUM', [createVariableRef('score')]);
      expect(hasAggregations(ast, registry)).toBe(true);
    });

    it('should return false when no aggregations', function () {
      const ast = createFunctionCall('LOG', [createVariableRef('score')]);
      expect(hasAggregations(ast, registry)).toBe(false);
    });
  });

  describe('getAggregationNames', function () {
    it('should return aggregation names', function () {
      const avgCall = createFunctionCall('AVG', [createVariableRef('score')]);
      const maxCall = createFunctionCall('MAX', [createVariableRef('count')]);
      const ast = createBinaryOp('/', avgCall, maxCall);
      const names = getAggregationNames(ast, registry);
      expect(names).toContain('AVG');
      expect(names).toContain('MAX');
    });
  });

  describe('getAggregationDetails', function () {
    it('should return detailed aggregation info', function () {
      const ast = createFunctionCall('AVG', [createVariableRef('score')]);
      const details = getAggregationDetails(ast, registry);
      expect(details).toHaveLength(1);
      expect(details[0]!.functionName).toBe('AVG');
      expect(details[0]!.variableName).toBe('score');
    });
  });
});

// =============================================================================
// Complete Validator Tests
// =============================================================================

describe('Validator', function () {
  let registry: FunctionRegistryImpl;
  let provider: VariableProvider;
  let validator: Validator;

  beforeEach(function () {
    registry = createTestRegistry();
    provider = createSimpleVariableProvider([
      { name: 'score', type: 'number.float', nullable: true },
      { name: 'count', type: 'number.integer', nullable: false },
      { name: 'name', type: 'string.text', nullable: true },
      { name: 'active', type: 'boolean.boolean', nullable: false },
    ]);
    validator = new Validator(provider, registry);
  });

  describe('validate with aggregation detection', function () {
    it('should return ValidatedAST with hasAggregations: true for aggregation formula', function () {
      const ast = createFunctionCall('AVG', [createVariableRef('score')]);
      const result = validator.validate(ast);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.ast.hasAggregations).toBe(true);
        expect(result.ast.aggregations).toEqual(['AVG']);
      }
    });

    it('should return ValidatedAST with hasAggregations: false for non-aggregation formula', function () {
      const ast = createBinaryOp('+', createVariableRef('score'), createLiteral(5, 'number.float'));
      const result = validator.validate(ast);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.ast.hasAggregations).toBe(false);
        expect(result.ast.aggregations).toEqual([]);
      }
    });

    it('should return ValidatedAST with multiple aggregations', function () {
      const avgCall = createFunctionCall('AVG', [createVariableRef('score')]);
      const sumCall = createFunctionCall('SUM', [createVariableRef('count')]);
      const maxCall = createFunctionCall('MAX', [createVariableRef('score')]);
      const ast = createBinaryOp('+', createBinaryOp('+', avgCall, sumCall), maxCall);
      const result = validator.validate(ast);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.ast.hasAggregations).toBe(true);
        expect(result.ast.aggregations).toContain('AVG');
        expect(result.ast.aggregations).toContain('SUM');
        expect(result.ast.aggregations).toContain('MAX');
      }
    });

    it('should return ValidatedAST with correct resultType for function call', function () {
      const ast = createFunctionCall('AVG', [createVariableRef('score')]);
      const result = validator.validate(ast);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.ast.resultType).toBe('number.float');
      }
    });

    it('should return ValidatedAST with correct resultType for binary operation', function () {
      const ast = createBinaryOp('+', createVariableRef('score'), createVariableRef('count'));
      const result = validator.validate(ast);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.ast.resultType).toBe('number.float');
      }
    });

    it('should return ValidatedAST with correct resultType for comparison', function () {
      const ast = createBinaryOp(
        '>',
        createVariableRef('score'),
        createLiteral(50, 'number.float'),
      );
      const result = validator.validate(ast);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.ast.resultType).toBe('boolean.boolean');
      }
    });

    it('should return ValidatedAST with correct dependencies', function () {
      const ast = createBinaryOp('+', createVariableRef('score'), createVariableRef('count'));
      const result = validator.validate(ast);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.ast.dependencies).toContain('score');
        expect(result.ast.dependencies).toContain('count');
      }
    });
  });

  describe('validate with all error types', function () {
    it('should return error for unknown variable', function () {
      const ast = createVariableRef('unknown');
      const result = validator.validate(ast);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0]).toBeInstanceOf(FormulaSemanticError);
        expect(result.errors[0]!.code).toBe('UNKNOWN_VARIABLE');
      }
    });

    it('should return error for type mismatch in arithmetic', function () {
      const providerWithString = createSimpleVariableProvider([
        { name: 'text', type: 'string.text', nullable: false },
      ]);
      const validatorWithString = new Validator(providerWithString, registry);

      const ast = createBinaryOp('+', createVariableRef('text'), createLiteral(5, 'number.float'));
      const result = validatorWithString.validate(ast);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.length).toBeGreaterThan(0);
        expect(result.errors[0]!.code).toBe('TYPE_MISMATCH');
      }
    });

    it('should return error for unknown function', function () {
      const ast = createFunctionCall('UNKNOWN', [createVariableRef('score')]);
      const result = validator.validate(ast);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0]!.code).toBe('UNKNOWN_FUNCTION');
      }
    });

    it('should return error for wrong argument count', function () {
      const ast = createFunctionCall('POWER', [createVariableRef('score')]);
      const result = validator.validate(ast);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0]!.code).toBe('ARGUMENT_COUNT_MISMATCH');
      }
    });

    it('should return error for wrong argument type', function () {
      const ast = createFunctionCall('IF', [
        createLiteral(5, 'number.float'), // Should be boolean
        createLiteral(1, 'number.float'),
        createLiteral(0, 'number.float'),
      ]);
      const result = validator.validate(ast);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0]!.code).toBe('ARGUMENT_TYPE_MISMATCH');
      }
    });

    it('should return error for aggregation without variable reference', function () {
      const ast = createFunctionCall('AVG', [createLiteral(5, 'number.float')]);
      const result = validator.validate(ast);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0]!.code).toBe('INVALID_AGGREGATION_ARGUMENT');
      }
    });

    it('should collect all errors by default', function () {
      const ast = createBinaryOp('+', createVariableRef('unknown1'), createVariableRef('unknown2'));
      const result = validator.validate(ast);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors).toHaveLength(2);
      }
    });

    it('should stop at first error when collectAllErrors is false', function () {
      const ast = createBinaryOp('+', createVariableRef('unknown1'), createVariableRef('unknown2'));
      const result = validator.validate(ast, { collectAllErrors: false });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.length).toBeGreaterThanOrEqual(1);
      }
    });
  });

  describe('validateFunctions', function () {
    it('should validate function calls', function () {
      const ast = createFunctionCall('AVG', [createVariableRef('score')]);
      const errors = validator.validateFunctions(ast);
      expect(errors).toHaveLength(0);
    });

    it('should return error for unknown function', function () {
      const ast = createFunctionCall('UNKNOWN', [createVariableRef('score')]);
      const errors = validator.validateFunctions(ast);
      expect(errors).toHaveLength(1);
      expect(errors[0]!.code).toBe('UNKNOWN_FUNCTION');
    });

    it('should return empty array without registry', function () {
      const validatorNoRegistry = new Validator(provider);
      const ast = createFunctionCall('AVG', [createVariableRef('score')]);
      const errors = validatorNoRegistry.validateFunctions(ast);
      expect(errors).toHaveLength(0);
    });
  });

  describe('getAggregations', function () {
    it('should return aggregation names from AST', function () {
      const avgCall = createFunctionCall('AVG', [createVariableRef('score')]);
      const sumCall = createFunctionCall('SUM', [createVariableRef('count')]);
      const ast = createBinaryOp('+', avgCall, sumCall);
      const aggregations = validator.getAggregations(ast);
      expect(aggregations).toContain('AVG');
      expect(aggregations).toContain('SUM');
    });

    it('should return empty array for non-aggregation formula', function () {
      const ast = createBinaryOp('+', createVariableRef('score'), createLiteral(5, 'number.float'));
      const aggregations = validator.getAggregations(ast);
      expect(aggregations).toEqual([]);
    });

    it('should return empty array without registry', function () {
      const validatorNoRegistry = new Validator(provider);
      const ast = createFunctionCall('AVG', [createVariableRef('score')]);
      const aggregations = validatorNoRegistry.getAggregations(ast);
      expect(aggregations).toEqual([]);
    });
  });

  describe('complex formulas', function () {
    it('should validate IF with aggregation in condition', function () {
      const avgCall = createFunctionCall('AVG', [createVariableRef('score')]);
      const condition = createBinaryOp('>', avgCall, createLiteral(50, 'number.float'));
      const ast = createFunctionCall('IF', [
        condition,
        createVariableRef('score'),
        createLiteral(0, 'number.float'),
      ]);

      const result = validator.validate(ast);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.ast.hasAggregations).toBe(true);
        expect(result.ast.aggregations).toEqual(['AVG']);
        expect(result.ast.dependencies).toContain('score');
      }
    });

    it('should validate nested function calls with aggregations', function () {
      const avgCall = createFunctionCall('AVG', [createVariableRef('score')]);
      const powerCall = createFunctionCall('POWER', [avgCall, createLiteral(2, 'number.float')]);
      const logCall = createFunctionCall('LOG', [powerCall]);

      const result = validator.validate(logCall);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.ast.hasAggregations).toBe(true);
        expect(result.ast.aggregations).toEqual(['AVG']);
        expect(result.ast.resultType).toBe('number.float');
      }
    });

    it('should validate formula with multiple different aggregations', function () {
      const avgScore = createFunctionCall('AVG', [createVariableRef('score')]);
      const maxScore = createFunctionCall('MAX', [createVariableRef('score')]);
      const minScore = createFunctionCall('MIN', [createVariableRef('score')]);
      const sumScore = createFunctionCall('SUM', [createVariableRef('score')]);

      const diff = createBinaryOp('-', maxScore, minScore);
      const ratio = createBinaryOp('/', avgScore, sumScore);
      const ast = createBinaryOp('*', diff, ratio);

      const result = validator.validate(ast);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.ast.hasAggregations).toBe(true);
        expect(result.ast.aggregations).toHaveLength(4);
        expect(result.ast.aggregations).toContain('AVG');
        expect(result.ast.aggregations).toContain('MAX');
        expect(result.ast.aggregations).toContain('MIN');
        expect(result.ast.aggregations).toContain('SUM');
      }
    });
  });

  describe('ValidatedAST structure', function () {
    it('should have all required properties', function () {
      const ast = createFunctionCall('AVG', [createVariableRef('score')]);
      const result = validator.validate(ast);

      expect(result.success).toBe(true);
      if (result.success) {
        // Check root
        expect(result.ast.root).toBeDefined();
        expect(result.ast.root.type).toBe('FunctionCall');

        // Check resultType
        expect(result.ast.resultType).toBeDefined();
        expect(typeof result.ast.resultType).toBe('string');

        // Check dependencies
        expect(result.ast.dependencies).toBeDefined();
        expect(Array.isArray(result.ast.dependencies)).toBe(true);

        // Check hasAggregations
        expect(typeof result.ast.hasAggregations).toBe('boolean');

        // Check aggregations
        expect(result.ast.aggregations).toBeDefined();
        expect(Array.isArray(result.ast.aggregations)).toBe(true);
      }
    });
  });
});

// =============================================================================
// Integration with existing tests (backward compatibility)
// =============================================================================

describe('Validator backward compatibility', function () {
  describe('validate without function registry', function () {
    it('should work without function registry', function () {
      const provider = createTestProvider(['x', 'y']);
      const validator = new Validator(provider);

      const ast = createBinaryOp('+', createVariableRef('x'), createVariableRef('y'));
      const result = validator.validate(ast);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.ast.dependencies).toEqual(['x', 'y']);
        expect(result.ast.hasAggregations).toBe(false);
        expect(result.ast.aggregations).toEqual([]);
      }
    });

    it('should not validate functions without registry', function () {
      const provider = createTestProvider(['score']);
      const validator = new Validator(provider);

      // This function call won't be validated (no registry)
      const ast = createFunctionCall('AVG', [createVariableRef('score')]);
      const result = validator.validate(ast);

      // Should succeed because function validation is skipped
      expect(result.success).toBe(true);
    });
  });

  describe('validateVariables still works', function () {
    it('should return empty array for valid variables', function () {
      const provider = createTestProvider(['x']);
      const validator = new Validator(provider);
      const ast = createVariableRef('x');
      const errors = validator.validateVariables(ast);
      expect(errors).toHaveLength(0);
    });

    it('should return errors for unknown variables', function () {
      const provider = createTestProvider([]);
      const validator = new Validator(provider);
      const ast = createVariableRef('unknown');
      const errors = validator.validateVariables(ast);
      expect(errors).toHaveLength(1);
      expect(errors[0]!.code).toBe('UNKNOWN_VARIABLE');
    });
  });

  describe('validateTypes still works', function () {
    it('should return empty array for valid types', function () {
      const provider = createTestProvider(['x', 'y']);
      const validator = new Validator(provider);
      const ast = createBinaryOp('+', createVariableRef('x'), createVariableRef('y'));
      const errors = validator.validateTypes(ast);
      expect(errors).toHaveLength(0);
    });
  });

  describe('getDependencies still works', function () {
    it('should return all dependencies', function () {
      const provider = createTestProvider([]);
      const validator = new Validator(provider);
      const ast = createBinaryOp('+', createVariableRef('a'), createVariableRef('b'));
      const deps = validator.getDependencies(ast);
      expect(deps).toEqual(['a', 'b']);
    });
  });
});

// =============================================================================
// createSimpleVariableProvider tests
// =============================================================================

describe('createSimpleVariableProvider', function () {
  it('should create provider from string array', function () {
    const provider = createSimpleVariableProvider(['x', 'y', 'z']);

    expect(provider.hasVariable('x')).toBe(true);
    expect(provider.hasVariable('y')).toBe(true);
    expect(provider.hasVariable('z')).toBe(true);
    expect(provider.hasVariable('unknown')).toBe(false);
  });

  it('should return variables info', function () {
    const provider = createSimpleVariableProvider(['x', 'y']);
    const variables = provider.getVariables();

    expect(variables).toHaveLength(2);
    expect(variables[0]!.name).toBe('x');
    expect(variables[0]!.type).toBe('number.float');
  });

  it('should return type for existing variable', function () {
    const provider = createSimpleVariableProvider([
      { name: 'score', type: 'number.float', nullable: false },
    ]);

    expect(provider.getVariableType('score')).toBe('number.float');
  });

  it('should return undefined for unknown variable type', function () {
    const provider = createSimpleVariableProvider(['x']);

    expect(provider.getVariableType('unknown')).toBeUndefined();
  });

  it('should handle mixed input', function () {
    const provider = createSimpleVariableProvider([
      'simple',
      { name: 'complex', type: 'string.text', nullable: true },
    ]);

    expect(provider.hasVariable('simple')).toBe(true);
    expect(provider.hasVariable('complex')).toBe(true);
    expect(provider.getVariableType('simple')).toBe('number.float');
    expect(provider.getVariableType('complex')).toBe('string.text');
  });
});
