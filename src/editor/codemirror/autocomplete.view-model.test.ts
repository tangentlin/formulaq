/**
 * Tests for autocomplete viewModel pure functions.
 *
 * These tests verify:
 * - Variable completion generation and filtering
 * - Function completion generation and filtering
 * - Trigger detection for variables and functions
 * - Prefix extraction logic
 *
 * @module
 */

import { describe, expect, it } from 'vitest';

import type { VariableProvider } from '../../core/types/context.ts';
import type { FunctionRegistry, FunctionInfo } from '../../core/types/functions.ts';
import type { VariableInfo, ValueType } from '../../core/types/values.ts';
import {
  formatValueType,
  createVariableCompletion,
  formatFunctionSignature,
  createFunctionCompletion,
  getVariableCompletions,
  getFunctionCompletions,
  shouldTriggerVariableCompletion,
  shouldTriggerFunctionCompletion,
  isValidIdentifierPrefix,
  extractVariablePrefix,
  extractFunctionPrefix,
  getCompletionStartPosition,
} from './autocomplete.view-model.ts';

// =============================================================================
// Test fixtures
// =============================================================================

/**
 * Creates a mock VariableProvider for testing.
 */
function createMockVariableProvider(variables: VariableInfo[]): VariableProvider {
  const variableMap = new Map<string, VariableInfo>();
  for (const v of variables) {
    variableMap.set(v.name, v);
  }

  return {
    getVariables: function getVariables() {
      return variables;
    },
    hasVariable: function hasVariable(name: string) {
      return variableMap.has(name);
    },
    getVariableType: function getVariableType(name: string) {
      const info = variableMap.get(name);
      return info?.type;
    },
    isNullable: function isNullable(name: string) {
      const info = variableMap.get(name);
      return info?.nullable ?? true;
    },
  };
}

/**
 * Creates a mock FunctionRegistry for testing.
 */
function createMockFunctionRegistry(functions: FunctionInfo[]): FunctionRegistry {
  const functionMap = new Map<string, FunctionInfo>();
  for (const f of functions) {
    functionMap.set(f.name, f);
  }

  return {
    register: function register() {
      throw new Error('Not implemented for tests');
    },
    get: function get(name: string) {
      const info = functionMap.get(name);
      if (!info) return undefined;
      // Return a mock FormulaFunction (with evaluate)
      return {
        ...info,
        evaluate: async function evaluate() {
          return null;
        },
      };
    },
    has: function has(name: string) {
      return functionMap.has(name);
    },
    getAll: function getAll() {
      return functions;
    },
    getByCategory: function getByCategory(category: string) {
      return functions.filter(function filterByCategory(f) {
        return f.category === category;
      });
    },
  };
}

/**
 * Sample variables for testing.
 */
const sampleVariables: VariableInfo[] = [
  { name: 'score', type: 'number.float', nullable: true, description: 'Test score (0-100)' },
  { name: 'name', type: 'string.text', nullable: false, description: 'Student name' },
  {
    name: 'passed',
    type: 'boolean.boolean',
    nullable: false,
    description: 'Whether the student passed',
  },
  { name: 'score_avg', type: 'number.float', nullable: true },
  { name: 'data.value', type: 'number.integer', nullable: true, description: 'Nested value' },
];

/**
 * Sample functions for testing.
 */
const sampleFunctions: FunctionInfo[] = [
  {
    name: 'SUM',
    description: 'Calculates the sum of all numeric values',
    params: [{ name: 'values', type: ['number.integer', 'number.float'], description: 'Values' }],
    returnType: 'number.float',
    isAggregation: true,
    category: 'Aggregation',
  },
  {
    name: 'AVG',
    description: 'Calculates the arithmetic mean',
    params: [{ name: 'values', type: ['number.integer', 'number.float'], description: 'Values' }],
    returnType: 'number.float',
    isAggregation: true,
    category: 'Aggregation',
  },
  {
    name: 'IF',
    description: 'Returns one value if condition is true, another if false',
    params: [
      { name: 'condition', type: 'boolean.boolean', description: 'Condition to test' },
      { name: 'then_value', type: 'any' as ValueType, description: 'Value if true' },
      { name: 'else_value', type: 'any' as ValueType, description: 'Value if false' },
    ],
    returnType: 'number.float',
    isAggregation: false,
    category: 'Logical',
  },
  {
    name: 'CONCAT',
    description: 'Concatenates strings',
    params: [{ name: 's1', type: 'string.text', description: 'First string' }],
    returnType: 'string.text',
    isAggregation: false,
    isVariadic: true,
    category: 'String',
  },
];

// =============================================================================
// formatValueType tests
// =============================================================================

describe('formatValueType', function formatValueTypeTests() {
  it('should extract category from hierarchical type', function categoryExtractionTest() {
    expect(formatValueType('number.float')).toBe('number');
    expect(formatValueType('number.integer')).toBe('number');
    expect(formatValueType('string.text')).toBe('string');
    expect(formatValueType('boolean.boolean')).toBe('boolean');
  });

  it('should return unchanged if no dot', function noDotTest() {
    expect(formatValueType('number' as ValueType)).toBe('number');
  });
});

// =============================================================================
// createVariableCompletion tests
// =============================================================================

describe('createVariableCompletion', function createVariableCompletionTests() {
  it('should create completion with @ prefix', function atPrefixTest() {
    const variable: VariableInfo = {
      name: 'score',
      type: 'number.float',
      nullable: true,
    };

    const completion = createVariableCompletion(variable);

    expect(completion.label).toBe('@score');
    expect(completion.type).toBe('variable');
    expect(completion.apply).toBe('@score');
  });

  it('should include type detail', function typeDetailTest() {
    const variable: VariableInfo = {
      name: 'name',
      type: 'string.text',
      nullable: false,
    };

    const completion = createVariableCompletion(variable);

    expect(completion.detail).toBe('string');
  });

  it('should include description as info', function descriptionTest() {
    const variable: VariableInfo = {
      name: 'score',
      type: 'number.float',
      nullable: true,
      description: 'Test score (0-100)',
    };

    const completion = createVariableCompletion(variable);

    expect(completion.info).toBe('Test score (0-100)');
  });

  it('should handle variable with dot in name', function dotNameTest() {
    const variable: VariableInfo = {
      name: 'data.value',
      type: 'number.integer',
      nullable: true,
    };

    const completion = createVariableCompletion(variable);

    expect(completion.label).toBe('@data.value');
    expect(completion.apply).toBe('@data.value');
  });
});

// =============================================================================
// formatFunctionSignature tests
// =============================================================================

describe('formatFunctionSignature', function formatFunctionSignatureTests() {
  it('should format empty params as ()', function emptyParamsTest() {
    const signature = formatFunctionSignature([], false);
    expect(signature).toBe('()');
  });

  it('should format single param', function singleParamTest() {
    const params = [{ name: 'values', type: 'number.float' as ValueType, description: 'Values' }];
    const signature = formatFunctionSignature(params, false);
    expect(signature).toBe('(values)');
  });

  it('should format multiple params with comma separator', function multiParamTest() {
    const params = [
      { name: 'a', type: 'number.float' as ValueType, description: 'First' },
      { name: 'b', type: 'number.float' as ValueType, description: 'Second' },
      { name: 'c', type: 'number.float' as ValueType, description: 'Third' },
    ];
    const signature = formatFunctionSignature(params, false);
    expect(signature).toBe('(a, b, c)');
  });

  it('should mark optional params with brackets', function optionalParamTest() {
    const params = [
      { name: 'required', type: 'number.float' as ValueType, description: 'Required' },
      {
        name: 'optional',
        type: 'number.float' as ValueType,
        description: 'Optional',
        optional: true,
      },
    ];
    const signature = formatFunctionSignature(params, false);
    expect(signature).toBe('(required, [optional])');
  });

  it('should add ellipsis for variadic functions', function variadicTest() {
    const params = [{ name: 'values', type: 'number.float' as ValueType, description: 'Values' }];
    const signature = formatFunctionSignature(params, true);
    expect(signature).toBe('(values, ...)');
  });
});

// =============================================================================
// createFunctionCompletion tests
// =============================================================================

describe('createFunctionCompletion', function createFunctionCompletionTests() {
  it('should create completion with function name', function nameTest() {
    const func: FunctionInfo = {
      name: 'SUM',
      description: 'Sum values',
      params: [{ name: 'values', type: 'number.float', description: 'Values' }],
      returnType: 'number.float',
      isAggregation: true,
    };

    const completion = createFunctionCompletion(func);

    expect(completion.label).toBe('SUM');
    expect(completion.type).toBe('function');
  });

  it('should include signature as detail', function signatureTest() {
    const func: FunctionInfo = {
      name: 'IF',
      description: 'Conditional',
      params: [
        { name: 'cond', type: 'boolean.boolean', description: 'Condition' },
        { name: 'then', type: 'any' as ValueType, description: 'Then value' },
        { name: 'else', type: 'any' as ValueType, description: 'Else value' },
      ],
      returnType: 'number.float',
      isAggregation: false,
    };

    const completion = createFunctionCompletion(func);

    expect(completion.detail).toBe('(cond, then, else)');
  });

  it('should include category in info', function categoryInfoTest() {
    const func: FunctionInfo = {
      name: 'SUM',
      description: 'Sum values',
      params: [],
      returnType: 'number.float',
      isAggregation: true,
      category: 'Aggregation',
    };

    const completion = createFunctionCompletion(func);

    expect(completion.info).toBe('[Aggregation] Sum values');
  });

  it('should apply function name with opening parenthesis', function applyParenTest() {
    const func: FunctionInfo = {
      name: 'AVG',
      description: 'Average',
      params: [],
      returnType: 'number.float',
      isAggregation: true,
    };

    const completion = createFunctionCompletion(func);

    expect(completion.apply).toBe('AVG(');
  });
});

// =============================================================================
// getVariableCompletions tests
// =============================================================================

describe('getVariableCompletions', function getVariableCompletionsTests() {
  it('should return all variables when prefix is empty', function emptyPrefixTest() {
    const provider = createMockVariableProvider(sampleVariables);
    const completions = getVariableCompletions('', provider);

    expect(completions.length).toBe(sampleVariables.length);
  });

  it('should filter by prefix (case insensitive)', function filterPrefixTest() {
    const provider = createMockVariableProvider(sampleVariables);
    const completions = getVariableCompletions('sco', provider);

    expect(completions.length).toBe(2);
    expect(completions[0]!.label).toBe('@score');
    expect(completions[1]!.label).toBe('@score_avg');
  });

  it('should handle no matches', function noMatchTest() {
    const provider = createMockVariableProvider(sampleVariables);
    const completions = getVariableCompletions('xyz', provider);

    expect(completions.length).toBe(0);
  });

  it('should be case insensitive', function caseInsensitiveTest() {
    const provider = createMockVariableProvider(sampleVariables);
    const completions = getVariableCompletions('SCO', provider);

    expect(completions.length).toBe(2);
  });
});

// =============================================================================
// getFunctionCompletions tests
// =============================================================================

describe('getFunctionCompletions', function getFunctionCompletionsTests() {
  it('should return all functions when prefix is empty', function emptyPrefixTest() {
    const registry = createMockFunctionRegistry(sampleFunctions);
    const completions = getFunctionCompletions('', registry);

    expect(completions.length).toBe(sampleFunctions.length);
  });

  it('should filter by prefix', function filterPrefixTest() {
    const registry = createMockFunctionRegistry(sampleFunctions);
    const completions = getFunctionCompletions('SU', registry);

    expect(completions.length).toBe(1);
    expect(completions[0]!.label).toBe('SUM');
  });

  it('should be case insensitive', function caseInsensitiveTest() {
    const registry = createMockFunctionRegistry(sampleFunctions);
    const completions = getFunctionCompletions('av', registry);

    expect(completions.length).toBe(1);
    expect(completions[0]!.label).toBe('AVG');
  });

  it('should handle no matches', function noMatchTest() {
    const registry = createMockFunctionRegistry(sampleFunctions);
    const completions = getFunctionCompletions('XYZ', registry);

    expect(completions.length).toBe(0);
  });
});

// =============================================================================
// shouldTriggerVariableCompletion tests
// =============================================================================

describe('shouldTriggerVariableCompletion', function shouldTriggerVariableCompletionTests() {
  it('should trigger when text ends with @', function atSymbolTest() {
    expect(shouldTriggerVariableCompletion('@')).toBe(true);
    expect(shouldTriggerVariableCompletion('SUM(@')).toBe(true);
  });

  it('should trigger when typing variable name after @', function typingNameTest() {
    expect(shouldTriggerVariableCompletion('@s')).toBe(true);
    expect(shouldTriggerVariableCompletion('@score')).toBe(true);
    expect(shouldTriggerVariableCompletion('@score_avg')).toBe(true);
    expect(shouldTriggerVariableCompletion('@data.value')).toBe(true);
  });

  it('should not trigger for empty string', function emptyStringTest() {
    expect(shouldTriggerVariableCompletion('')).toBe(false);
  });

  it('should not trigger when no @ present', function noAtTest() {
    expect(shouldTriggerVariableCompletion('SUM(')).toBe(false);
    expect(shouldTriggerVariableCompletion('score')).toBe(false);
  });

  it('should not trigger when invalid chars after @', function invalidCharsTest() {
    expect(shouldTriggerVariableCompletion('@123')).toBe(false); // starts with number
    expect(shouldTriggerVariableCompletion('@ ')).toBe(false); // space after @
  });
});

// =============================================================================
// shouldTriggerFunctionCompletion tests
// =============================================================================

describe('shouldTriggerFunctionCompletion', function shouldTriggerFunctionCompletionTests() {
  it('should trigger when typing a function name', function typingNameTest() {
    expect(shouldTriggerFunctionCompletion('S')).toBe(true);
    expect(shouldTriggerFunctionCompletion('SU')).toBe(true);
    expect(shouldTriggerFunctionCompletion('SUM')).toBe(true);
  });

  it('should not trigger for empty string', function emptyStringTest() {
    expect(shouldTriggerFunctionCompletion('')).toBe(false);
  });

  it('should not trigger when in variable context', function variableContextTest() {
    expect(shouldTriggerFunctionCompletion('@')).toBe(false);
    expect(shouldTriggerFunctionCompletion('@score')).toBe(false);
    expect(shouldTriggerFunctionCompletion('SUM(@score')).toBe(false);
  });

  it('should not trigger when only numbers', function numbersOnlyTest() {
    expect(shouldTriggerFunctionCompletion('123')).toBe(false);
  });

  it('should trigger after operators', function afterOperatorTest() {
    expect(shouldTriggerFunctionCompletion('1+S')).toBe(true);
    expect(shouldTriggerFunctionCompletion('@x * IF')).toBe(true);
  });
});

// =============================================================================
// isValidIdentifierPrefix tests
// =============================================================================

describe('isValidIdentifierPrefix', function isValidIdentifierPrefixTests() {
  it('should accept empty string', function emptyTest() {
    expect(isValidIdentifierPrefix('')).toBe(true);
  });

  it('should accept valid identifiers', function validTest() {
    expect(isValidIdentifierPrefix('score')).toBe(true);
    expect(isValidIdentifierPrefix('Score')).toBe(true);
    expect(isValidIdentifierPrefix('_private')).toBe(true);
    expect(isValidIdentifierPrefix('score123')).toBe(true);
    expect(isValidIdentifierPrefix('data.value')).toBe(true);
  });

  it('should reject identifiers starting with number', function numberStartTest() {
    expect(isValidIdentifierPrefix('123abc')).toBe(false);
    expect(isValidIdentifierPrefix('1score')).toBe(false);
  });

  it('should reject invalid characters', function invalidCharsTest() {
    expect(isValidIdentifierPrefix('score!')).toBe(false);
    expect(isValidIdentifierPrefix('score value')).toBe(false);
    expect(isValidIdentifierPrefix('score-value')).toBe(false);
  });
});

// =============================================================================
// extractVariablePrefix tests
// =============================================================================

describe('extractVariablePrefix', function extractVariablePrefixTests() {
  it('should extract prefix after @', function extractTest() {
    expect(extractVariablePrefix('@score')).toBe('score');
    expect(extractVariablePrefix('@s')).toBe('s');
    expect(extractVariablePrefix('@')).toBe('');
  });

  it('should handle @ in middle of text', function middleAtTest() {
    expect(extractVariablePrefix('SUM(@score')).toBe('score');
    expect(extractVariablePrefix('IF(@x > @y')).toBe('y');
  });

  it('should return empty for no @', function noAtTest() {
    expect(extractVariablePrefix('score')).toBe('');
    expect(extractVariablePrefix('SUM(')).toBe('');
  });
});

// =============================================================================
// extractFunctionPrefix tests
// =============================================================================

describe('extractFunctionPrefix', function extractFunctionPrefixTests() {
  it('should extract function prefix', function extractTest() {
    expect(extractFunctionPrefix('SUM')).toBe('SUM');
    expect(extractFunctionPrefix('S')).toBe('S');
    expect(extractFunctionPrefix('IF')).toBe('IF');
  });

  it('should extract after operators', function afterOpTest() {
    expect(extractFunctionPrefix('1+SUM')).toBe('SUM');
    expect(extractFunctionPrefix('@x * IF')).toBe('IF');
  });

  it('should return empty when in variable context', function variableContextTest() {
    expect(extractFunctionPrefix('@score')).toBe('');
    expect(extractFunctionPrefix('SUM(@')).toBe('');
  });

  it('should return empty for empty string', function emptyTest() {
    expect(extractFunctionPrefix('')).toBe('');
  });
});

// =============================================================================
// getCompletionStartPosition tests
// =============================================================================

describe('getCompletionStartPosition', function getCompletionStartPositionTests() {
  it('should return @ position for variable completion', function variablePositionTest() {
    expect(getCompletionStartPosition('@score', 'variable')).toBe(0);
    expect(getCompletionStartPosition('SUM(@score', 'variable')).toBe(4);
    expect(getCompletionStartPosition('@', 'variable')).toBe(0);
  });

  it('should return identifier start for function completion', function functionPositionTest() {
    expect(getCompletionStartPosition('SUM', 'function')).toBe(0);
    expect(getCompletionStartPosition('1+SUM', 'function')).toBe(2);
    expect(getCompletionStartPosition('@x * IF', 'function')).toBe(5);
  });
});
