/**
 * Tests for function signature validation.
 *
 * @module
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { ASTNode, FunctionCallNode } from '../types/ast.ts';
import type { FormulaFunction, FunctionInfo } from '../types/functions.ts';
import type { ValueType } from '../types/values.ts';
import type { VariableProvider } from '../types/context.ts';
import { createFunctionRegistry, FunctionRegistryImpl } from '../functions/function-registry.ts';
import { createSimpleVariableProvider } from './validator.ts';
import {
  validateFunctionCalls,
  validateSingleFunctionCall,
  getFunctionCalls,
  getFunctionReturnType,
  functionExists,
} from './function-validator.ts';
import {
  validateFunctions,
  validateFunctionCall,
  collectFunctionCalls,
  getMinRequiredArgs,
  getMaxAllowedArgs,
  checkArgumentCount,
  normalizeParamType,
  doesTypeMatch,
  isVariableReference,
  createUnknownFunctionMessage,
  createArgumentCountMessage,
  createArgumentTypeMessage,
  createInvalidAggregationArgumentMessage,
} from './function-validator.view-model.ts';

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * Gets an element from an array with a runtime check.
 * Throws if the element doesn't exist.
 */
function getAt<T>(arr: readonly T[], index: number): T {
  const item = arr[index];
  if (item === undefined) {
    throw new Error(`Expected element at index ${index} but array has ${arr.length} elements`);
  }
  return item;
}

/**
 * Creates a mock function registry with test functions.
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
      { name: 'values', type: ['number.integer', 'number.float'], description: 'Values to sum' },
    ],
    returnType: 'number.float',
    isAggregation: true,
    category: 'Aggregation',
    evaluate: async function evaluate() {
      return { type: 'number.float', value: 0 };
    },
  } as FormulaFunction);

  // Register IF - 3 required arguments
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

  // Register AND - variadic boolean function
  registry.register({
    name: 'AND',
    description: 'Logical AND',
    params: [{ name: 'conditions', type: 'boolean.boolean', description: 'Conditions to AND' }],
    returnType: 'boolean.boolean',
    isAggregation: false,
    isVariadic: true,
    minArgs: 1,
    category: 'Logical',
    evaluate: async function evaluate() {
      return { type: 'boolean.boolean', value: true };
    },
  } as FormulaFunction);

  // Register OR - variadic boolean function
  registry.register({
    name: 'OR',
    description: 'Logical OR',
    params: [{ name: 'conditions', type: 'boolean.boolean', description: 'Conditions to OR' }],
    returnType: 'boolean.boolean',
    isAggregation: false,
    isVariadic: true,
    minArgs: 1,
    category: 'Logical',
    evaluate: async function evaluate() {
      return { type: 'boolean.boolean', value: false };
    },
  } as FormulaFunction);

  // Register CONCAT - variadic string function
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

  // Register LOG - single numeric argument
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

  // Register POWER - two numeric arguments
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

  // Register IFNULL - with optional-like behavior via minArgs
  registry.register({
    name: 'IFNULL',
    description: 'Return default if null',
    params: [
      { name: 'value', type: 'any', description: 'Value to check' },
      { name: 'default', type: 'any', description: 'Default value' },
    ],
    returnType: 'number.float',
    isAggregation: false,
    category: 'Logical',
    evaluate: async function evaluate() {
      return { type: 'number.float', value: 0 };
    },
  } as FormulaFunction);

  return registry;
}

/**
 * Creates a test variable provider.
 */
function createTestProvider(): VariableProvider {
  return createSimpleVariableProvider([
    { name: 'score', type: 'number.float', nullable: true },
    { name: 'count', type: 'number.integer', nullable: false },
    { name: 'name', type: 'string.text', nullable: true },
    { name: 'active', type: 'boolean.boolean', nullable: false },
  ]);
}

/**
 * Creates a function call AST node.
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
 * Creates a variable reference AST node.
 */
function createVariableRef(name: string, start: number = 0, end: number = 5): ASTNode {
  return {
    type: 'VariableRef',
    name,
    location: { start, end },
  };
}

/**
 * Creates a literal AST node.
 */
function createLiteral(
  value: number | string | boolean,
  valueType: ValueType,
  start: number = 0,
  end: number = 5,
): ASTNode {
  return {
    type: 'Literal',
    valueType,
    value,
    location: { start, end },
  };
}

// ============================================================================
// Pure Function Tests (viewModel)
// ============================================================================

describe('functionValidator.viewModel', function () {
  describe('createUnknownFunctionMessage', function () {
    it('should create message for unknown function', function () {
      const message = createUnknownFunctionMessage('XYZ');
      expect(message).toBe("Unknown function 'XYZ'");
    });
  });

  describe('createArgumentCountMessage', function () {
    it('should create message for too few arguments', function () {
      const message = createArgumentCountMessage('AVG', 1, 0, false);
      expect(message).toBe("Function 'AVG' requires 1 argument, but got 0");
    });

    it('should create message for minimum arguments', function () {
      const message = createArgumentCountMessage('IF', 3, 2, true);
      expect(message).toBe("Function 'IF' requires at least 3 arguments, but got 2");
    });

    it('should use plural for multiple arguments', function () {
      const message = createArgumentCountMessage('POWER', 2, 1, false);
      expect(message).toBe("Function 'POWER' requires 2 arguments, but got 1");
    });
  });

  describe('createArgumentTypeMessage', function () {
    it('should create message for single expected type', function () {
      const message = createArgumentTypeMessage(1, 'IF', ['boolean.boolean'], 'number.float');
      expect(message).toBe("Argument 1 of 'IF' expects boolean.boolean, but got number.float");
    });

    it('should create message for multiple expected types', function () {
      const message = createArgumentTypeMessage(
        1,
        'AVG',
        ['number.integer', 'number.float'],
        'string.text',
      );
      expect(message).toBe(
        "Argument 1 of 'AVG' expects number.integer or number.float, but got string.text",
      );
    });
  });

  describe('createInvalidAggregationArgumentMessage', function () {
    it('should create message for aggregation function', function () {
      const message = createInvalidAggregationArgumentMessage('SUM');
      expect(message).toBe(
        "Aggregation function 'SUM' requires a variable reference as first argument",
      );
    });
  });

  describe('getMinRequiredArgs', function () {
    it('should return minArgs if explicitly set', function () {
      const funcInfo: FunctionInfo = {
        name: 'TEST',
        description: 'Test',
        params: [{ name: 'a', type: 'any', description: 'A' }],
        returnType: 'number.float',
        isAggregation: false,
        minArgs: 2,
      };
      expect(getMinRequiredArgs(funcInfo)).toBe(2);
    });

    it('should count non-optional parameters', function () {
      const funcInfo: FunctionInfo = {
        name: 'TEST',
        description: 'Test',
        params: [
          { name: 'a', type: 'any', description: 'A' },
          { name: 'b', type: 'any', description: 'B', optional: true },
          { name: 'c', type: 'any', description: 'C' },
        ],
        returnType: 'number.float',
        isAggregation: false,
      };
      expect(getMinRequiredArgs(funcInfo)).toBe(2);
    });
  });

  describe('getMaxAllowedArgs', function () {
    it('should return maxArgs if explicitly set', function () {
      const funcInfo: FunctionInfo = {
        name: 'TEST',
        description: 'Test',
        params: [{ name: 'a', type: 'any', description: 'A' }],
        returnType: 'number.float',
        isAggregation: false,
        maxArgs: 5,
      };
      expect(getMaxAllowedArgs(funcInfo)).toBe(5);
    });

    it('should return undefined for variadic functions', function () {
      const funcInfo: FunctionInfo = {
        name: 'TEST',
        description: 'Test',
        params: [{ name: 'a', type: 'any', description: 'A' }],
        returnType: 'number.float',
        isAggregation: false,
        isVariadic: true,
      };
      expect(getMaxAllowedArgs(funcInfo)).toBeUndefined();
    });

    it('should return param count for non-variadic functions', function () {
      const funcInfo: FunctionInfo = {
        name: 'TEST',
        description: 'Test',
        params: [
          { name: 'a', type: 'any', description: 'A' },
          { name: 'b', type: 'any', description: 'B' },
        ],
        returnType: 'number.float',
        isAggregation: false,
      };
      expect(getMaxAllowedArgs(funcInfo)).toBe(2);
    });
  });

  describe('checkArgumentCount', function () {
    const funcInfo: FunctionInfo = {
      name: 'TEST',
      description: 'Test',
      params: [
        { name: 'a', type: 'any', description: 'A' },
        { name: 'b', type: 'any', description: 'B' },
      ],
      returnType: 'number.float',
      isAggregation: false,
    };

    it('should return valid for correct count', function () {
      const result = checkArgumentCount(funcInfo, 2);
      expect(result.isValid).toBe(true);
    });

    it('should detect too few arguments', function () {
      const result = checkArgumentCount(funcInfo, 1);
      expect(result.isValid).toBe(false);
      expect(result.isTooFew).toBe(true);
      expect(result.isTooMany).toBe(false);
    });

    it('should detect too many arguments', function () {
      const result = checkArgumentCount(funcInfo, 3);
      expect(result.isValid).toBe(false);
      expect(result.isTooFew).toBe(false);
      expect(result.isTooMany).toBe(true);
    });
  });

  describe('normalizeParamType', function () {
    it('should return undefined for any', function () {
      expect(normalizeParamType('any')).toBeUndefined();
    });

    it('should return array for array input', function () {
      const types: readonly ValueType[] = ['number.integer', 'number.float'];
      expect(normalizeParamType(types)).toEqual(types);
    });

    it('should wrap single type in array', function () {
      expect(normalizeParamType('string.text')).toEqual(['string.text']);
    });
  });

  describe('doesTypeMatch', function () {
    it('should return true for no type constraint', function () {
      expect(doesTypeMatch('string.text', undefined)).toBe(true);
    });

    it('should return true for unknown actual type', function () {
      expect(doesTypeMatch(undefined, ['number.float'])).toBe(true);
    });

    it('should return true for exact match', function () {
      expect(doesTypeMatch('number.float', ['number.float'])).toBe(true);
    });

    it('should return true for numeric compatibility', function () {
      expect(doesTypeMatch('number.integer', ['number.float'])).toBe(true);
      expect(doesTypeMatch('number.float', ['number.integer'])).toBe(true);
    });

    it('should return false for type mismatch', function () {
      expect(doesTypeMatch('string.text', ['number.float'])).toBe(false);
      expect(doesTypeMatch('boolean.boolean', ['number.integer'])).toBe(false);
    });
  });

  describe('isVariableReference', function () {
    it('should return true for VariableRef nodes', function () {
      expect(isVariableReference(createVariableRef('x'))).toBe(true);
    });

    it('should return false for other node types', function () {
      expect(isVariableReference(createLiteral(5, 'number.float'))).toBe(false);
    });
  });

  describe('collectFunctionCalls', function () {
    it('should collect function calls from AST', function () {
      const ast = createFunctionCall('AVG', [createVariableRef('score')]);
      const calls = collectFunctionCalls(ast);
      expect(calls).toHaveLength(1);
      expect(getAt(calls, 0).name).toBe('AVG');
    });

    it('should collect nested function calls', function () {
      const innerCall = createFunctionCall('LOG', [createVariableRef('score')]);
      const outerCall = createFunctionCall('POWER', [
        innerCall,
        createLiteral(2, 'number.integer'),
      ]);
      const calls = collectFunctionCalls(outerCall);
      expect(calls).toHaveLength(2);
      expect(getAt(calls, 0).name).toBe('POWER');
      expect(getAt(calls, 1).name).toBe('LOG');
    });

    it('should find function calls in binary operations', function () {
      const left = createFunctionCall('SUM', [createVariableRef('score')]);
      const right = createFunctionCall('AVG', [createVariableRef('count')]);
      const ast: ASTNode = {
        type: 'BinaryOp',
        operator: '+',
        left,
        right,
      };
      const calls = collectFunctionCalls(ast);
      expect(calls).toHaveLength(2);
    });
  });

  describe('validateFunctionCall', function () {
    let registry: FunctionRegistryImpl;

    beforeEach(function () {
      registry = createTestRegistry();
    });

    function getFunc(name: string): FunctionInfo | undefined {
      return registry.get(name);
    }

    function inferType(node: ASTNode): ValueType | undefined {
      if (node.type === 'Literal') {
        return node.valueType;
      }
      if (node.type === 'VariableRef') {
        if (node.name === 'score' || node.name === 'count') return 'number.float';
        if (node.name === 'name') return 'string.text';
        if (node.name === 'active') return 'boolean.boolean';
      }
      return undefined;
    }

    it('should validate valid function call', function () {
      const call = createFunctionCall('AVG', [createVariableRef('score')]);
      const result = validateFunctionCall(call, getFunc, inferType);
      expect(result.errors).toHaveLength(0);
      expect(result.returnType).toBe('number.float');
    });

    it('should error for unknown function', function () {
      const call = createFunctionCall('UNKNOWN', [createVariableRef('score')]);
      const result = validateFunctionCall(call, getFunc, inferType);
      expect(result.errors).toHaveLength(1);
      expect(getAt(result.errors, 0).code).toBe('UNKNOWN_FUNCTION');
      expect(getAt(result.errors, 0).message).toBe("Unknown function 'UNKNOWN'");
    });

    it('should error for too few arguments', function () {
      const call = createFunctionCall('IF', [createLiteral(true, 'boolean.boolean')]);
      const result = validateFunctionCall(call, getFunc, inferType);
      expect(result.errors).toHaveLength(1);
      expect(getAt(result.errors, 0).code).toBe('ARGUMENT_COUNT_MISMATCH');
    });

    it('should error for too many arguments', function () {
      const call = createFunctionCall('LOG', [
        createLiteral(10, 'number.float'),
        createLiteral(5, 'number.float'),
      ]);
      const result = validateFunctionCall(call, getFunc, inferType);
      expect(result.errors).toHaveLength(1);
      expect(getAt(result.errors, 0).code).toBe('ARGUMENT_COUNT_MISMATCH');
    });

    it('should error for wrong argument type', function () {
      const call = createFunctionCall('IF', [
        createLiteral(5, 'number.float'), // Should be boolean
        createLiteral(1, 'number.float'),
        createLiteral(0, 'number.float'),
      ]);
      const result = validateFunctionCall(call, getFunc, inferType);
      expect(result.errors).toHaveLength(1);
      expect(getAt(result.errors, 0).code).toBe('ARGUMENT_TYPE_MISMATCH');
    });

    it('should error for aggregation without variable reference', function () {
      const call = createFunctionCall('AVG', [createLiteral(5, 'number.float')]);
      const result = validateFunctionCall(call, getFunc, inferType);
      expect(result.errors).toHaveLength(1);
      expect(getAt(result.errors, 0).code).toBe('INVALID_AGGREGATION_ARGUMENT');
    });

    it('should allow variadic functions with multiple arguments', function () {
      const call = createFunctionCall('AND', [
        createLiteral(true, 'boolean.boolean'),
        createLiteral(false, 'boolean.boolean'),
        createLiteral(true, 'boolean.boolean'),
      ]);
      const result = validateFunctionCall(call, getFunc, inferType);
      expect(result.errors).toHaveLength(0);
      expect(result.returnType).toBe('boolean.boolean');
    });

    it('should enforce minArgs for variadic functions', function () {
      const call = createFunctionCall('CONCAT', [createLiteral('hello', 'string.text')]);
      const result = validateFunctionCall(call, getFunc, inferType);
      expect(result.errors).toHaveLength(1);
      expect(getAt(result.errors, 0).code).toBe('ARGUMENT_COUNT_MISMATCH');
    });
  });

  describe('validateFunctions', function () {
    let registry: FunctionRegistryImpl;

    beforeEach(function () {
      registry = createTestRegistry();
    });

    it('should validate all function calls in AST', function () {
      // Give different locations to ensure unique keys
      const innerCall = createFunctionCall('LOG', [createVariableRef('score')], 6, 18);
      const outerCall = createFunctionCall(
        'POWER',
        [innerCall, createLiteral(2, 'number.integer')],
        0,
        24,
      );

      const result = validateFunctions({
        ast: outerCall,
        getFunction: function getFunc(name: string) {
          return registry.get(name);
        },
        inferArgumentType: function inferType(node: ASTNode) {
          if (node.type === 'Literal') return node.valueType;
          if (node.type === 'FunctionCall') return registry.get(node.name)?.returnType;
          return 'number.float';
        },
      });

      expect(result.errors).toHaveLength(0);
      expect(result.returnTypes.size).toBe(2);
    });
  });
});

// ============================================================================
// Integration Tests (main module)
// ============================================================================

describe('functionValidator', function () {
  let registry: FunctionRegistryImpl;
  let provider: VariableProvider;

  beforeEach(function () {
    registry = createTestRegistry();
    provider = createTestProvider();
  });

  describe('validateFunctionCalls', function () {
    it('should validate valid function call', function () {
      const ast = createFunctionCall('AVG', [createVariableRef('score')]);
      const result = validateFunctionCalls(ast, registry, provider);
      expect(result.errors).toHaveLength(0);
    });

    it('should return FormulaSemanticError for unknown function', function () {
      const ast = createFunctionCall('UNKNOWN', [createVariableRef('score')]);
      const result = validateFunctionCalls(ast, registry, provider);
      expect(result.errors).toHaveLength(1);
      expect(getAt(result.errors, 0).code).toBe('UNKNOWN_FUNCTION');
      expect(getAt(result.errors, 0).functionName).toBe('UNKNOWN');
    });

    it('should return error for wrong argument count', function () {
      const ast = createFunctionCall('AVG', []);
      const result = validateFunctionCalls(ast, registry, provider);
      expect(result.errors).toHaveLength(1);
      expect(getAt(result.errors, 0).code).toBe('ARGUMENT_COUNT_MISMATCH');
    });

    it('should return error for IF with too few arguments', function () {
      const ast = createFunctionCall('IF', [
        createLiteral(true, 'boolean.boolean'),
        createLiteral(1, 'number.float'),
      ]);
      const result = validateFunctionCalls(ast, registry, provider);
      expect(result.errors).toHaveLength(1);
      // IF has exactly 3 required args with no optional/variadic, so "requires" not "at least"
      expect(getAt(result.errors, 0).message).toContain('requires 3 arguments');
    });

    it('should return error for wrong argument type', function () {
      const ast = createFunctionCall('IF', [
        createLiteral(5, 'number.float'), // Should be boolean
        createLiteral(1, 'number.float'),
        createLiteral(0, 'number.float'),
      ]);
      const result = validateFunctionCalls(ast, registry, provider);
      expect(result.errors).toHaveLength(1);
      expect(getAt(result.errors, 0).code).toBe('ARGUMENT_TYPE_MISMATCH');
    });

    it('should return error for aggregation function without variable ref', function () {
      const ast = createFunctionCall('SUM', [createLiteral(5, 'number.float')]);
      const result = validateFunctionCalls(ast, registry, provider);
      expect(result.errors).toHaveLength(1);
      expect(getAt(result.errors, 0).code).toBe('INVALID_AGGREGATION_ARGUMENT');
    });

    it('should allow variadic functions with any number of args', function () {
      const ast = createFunctionCall('AND', [
        createVariableRef('active'),
        createLiteral(true, 'boolean.boolean'),
        createLiteral(false, 'boolean.boolean'),
        createLiteral(true, 'boolean.boolean'),
      ]);
      const result = validateFunctionCalls(ast, registry, provider);
      expect(result.errors).toHaveLength(0);
    });

    it('should collect return types for function calls', function () {
      const ast = createFunctionCall('AVG', [createVariableRef('score')], 0, 12);
      const result = validateFunctionCalls(ast, registry, provider);
      expect(result.returnTypes.size).toBe(1);
      expect(result.returnTypes.get('0:12')).toBe('number.float');
    });
  });

  describe('validateSingleFunctionCall', function () {
    it('should validate a single function call', function () {
      const call = createFunctionCall('LOG', [createVariableRef('score')]);
      const errors = validateSingleFunctionCall(call, registry, provider);
      expect(errors).toHaveLength(0);
    });

    it('should return errors for invalid call', function () {
      const call = createFunctionCall('POWER', [createVariableRef('score')]);
      const errors = validateSingleFunctionCall(call, registry, provider);
      expect(errors).toHaveLength(1);
      expect(getAt(errors, 0).code).toBe('ARGUMENT_COUNT_MISMATCH');
    });
  });

  describe('getFunctionCalls', function () {
    it('should return all function calls from AST', function () {
      const inner = createFunctionCall('AVG', [createVariableRef('score')]);
      const outer = createFunctionCall('POWER', [inner, createLiteral(2, 'number.float')]);
      const calls = getFunctionCalls(outer);
      expect(calls).toHaveLength(2);
    });
  });

  describe('getFunctionReturnType', function () {
    it('should return return type for known function', function () {
      const call = createFunctionCall('AVG', [createVariableRef('score')]);
      const returnType = getFunctionReturnType(call, registry);
      expect(returnType).toBe('number.float');
    });

    it('should return undefined for unknown function', function () {
      const call = createFunctionCall('UNKNOWN', [createVariableRef('score')]);
      const returnType = getFunctionReturnType(call, registry);
      expect(returnType).toBeUndefined();
    });
  });

  describe('functionExists', function () {
    it('should return true for registered function', function () {
      expect(functionExists('AVG', registry)).toBe(true);
      expect(functionExists('IF', registry)).toBe(true);
    });

    it('should return false for unregistered function', function () {
      expect(functionExists('UNKNOWN', registry)).toBe(false);
    });
  });

  describe('error messages', function () {
    it('should produce correct error for unknown function', function () {
      const ast = createFunctionCall('XYZ', [createVariableRef('score')]);
      const result = validateFunctionCalls(ast, registry, provider);
      expect(getAt(result.errors, 0).message).toBe("Unknown function 'XYZ'");
    });

    it('should produce correct error for AVG with 0 arguments', function () {
      const ast = createFunctionCall('AVG', []);
      const result = validateFunctionCalls(ast, registry, provider);
      expect(getAt(result.errors, 0).message).toBe("Function 'AVG' requires 1 argument, but got 0");
    });

    it('should produce correct error for IF argument type mismatch', function () {
      const ast = createFunctionCall('IF', [
        createLiteral(5, 'number.float'),
        createLiteral(1, 'number.float'),
        createLiteral(0, 'number.float'),
      ]);
      const result = validateFunctionCalls(ast, registry, provider);
      expect(getAt(result.errors, 0).message).toBe(
        "Argument 1 of 'IF' expects boolean.boolean, but got number.float",
      );
    });

    it('should produce correct error for aggregation without variable ref', function () {
      const ast = createFunctionCall('SUM', [createLiteral(5, 'number.float')]);
      const result = validateFunctionCalls(ast, registry, provider);
      expect(getAt(result.errors, 0).message).toBe(
        "Aggregation function 'SUM' requires a variable reference as first argument",
      );
    });
  });

  describe('optional arguments', function () {
    it('should allow functions with optional parameters to have fewer args', function () {
      // Create a function with optional parameter
      const optionalRegistry = createFunctionRegistry();
      optionalRegistry.register({
        name: 'ROUND',
        description: 'Round a number',
        params: [
          { name: 'value', type: 'number.float', description: 'Value to round' },
          {
            name: 'decimals',
            type: 'number.integer',
            description: 'Decimal places',
            optional: true,
          },
        ],
        returnType: 'number.float',
        isAggregation: false,
        evaluate: async function evaluate() {
          return { type: 'number.float', value: 0 };
        },
      } as FormulaFunction);

      // Call with only required argument
      const ast = createFunctionCall('ROUND', [createVariableRef('score')]);
      const result = validateFunctionCalls(ast, optionalRegistry, provider);
      expect(result.errors).toHaveLength(0);

      // Call with both arguments
      const ast2 = createFunctionCall('ROUND', [
        createVariableRef('score'),
        createLiteral(2, 'number.integer'),
      ]);
      const result2 = validateFunctionCalls(ast2, optionalRegistry, provider);
      expect(result2.errors).toHaveLength(0);
    });
  });

  describe('numeric type compatibility', function () {
    it('should allow number.integer where number.float is expected', function () {
      const ast = createFunctionCall('LOG', [createLiteral(10, 'number.integer')]);
      const result = validateFunctionCalls(ast, registry, provider);
      expect(result.errors).toHaveLength(0);
    });

    it('should allow number.float where number.integer is expected', function () {
      const ast = createFunctionCall('POWER', [
        createLiteral(2.5, 'number.float'),
        createLiteral(3.0, 'number.float'),
      ]);
      const result = validateFunctionCalls(ast, registry, provider);
      expect(result.errors).toHaveLength(0);
    });
  });
});
