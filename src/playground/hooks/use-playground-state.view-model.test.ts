/**
 * Unit tests for usePlaygroundState viewModel functions.
 *
 * Tests for:
 * - Creating VariableProvider from PlaygroundVariables
 * - Creating EvaluationContext from PlaygroundVariables
 * - Extracting aggregation results
 * - State transition functions
 * - Row count calculation
 *
 * @module
 */

import { describe, it, expect } from 'vitest';
import type { Value } from '../../core/types/values';
import type { ASTNode, FunctionCallNode } from '../../core/types/ast';
import type { PlaygroundVariable } from '../variable-card/variable-card.types';
import type { ValidationResult } from '../../editor/formula-editor/formula-editor.types';
import {
  createInitialState,
  createVariableProvider,
  createEvaluationContext,
  calculateRowCount,
  extractAggregations,
  addVariableToState,
  editVariableInState,
  removeVariableFromState,
  setFormulaInState,
  setValidationResultInState,
  setEvaluationResultInState,
  setIsEvaluatingInState,
  canEvaluate,
  createEmptyEvaluationResult,
  createEvaluationResult,
  type PlaygroundState,
} from './use-playground-state.view-model';

/**
 * Helper to create a PlaygroundVariable.
 */
function createVariable(
  name: string,
  values: readonly (number | string | boolean | null)[],
  type: 'number.float' | 'string.text' | 'boolean.boolean' = 'number.float',
): PlaygroundVariable {
  return { name, type, values };
}

/**
 * Helper to create a numeric value.
 */
function numericValue(value: number | null): Value {
  return { type: 'number.float', value };
}

/**
 * Helper to create a variable reference AST node.
 */
function variableRef(name: string): ASTNode {
  return { type: 'VariableRef', name };
}

/**
 * Helper to create a function call AST node.
 */
function functionCall(name: string, args: readonly ASTNode[]): FunctionCallNode {
  return { type: 'FunctionCall', name, args };
}

/**
 * Helper to create a literal AST node.
 */
function literal(value: number): ASTNode {
  return { type: 'Literal', valueType: 'number.float', value };
}

/**
 * Creates a mock validation result.
 */
function createValidationResult(isValid: boolean): ValidationResult {
  if (isValid) {
    return {
      isValid: true,
      validatedAST: {
        root: literal(1),
        resultType: 'number.float',
        dependencies: [],
        hasAggregations: false,
        aggregations: [],
      },
    };
  }
  return {
    isValid: false,
    errors: [],
  };
}

describe('createInitialState', function () {
  it('creates state with empty variables', function () {
    const state = createInitialState();
    expect(state.variables).toEqual([]);
  });

  it('creates state with empty formula', function () {
    const state = createInitialState();
    expect(state.formula).toBe('');
  });

  it('creates state with null validation result', function () {
    const state = createInitialState();
    expect(state.validationResult).toBeNull();
  });

  it('creates state with null evaluation result', function () {
    const state = createInitialState();
    expect(state.evaluationResult).toBeNull();
  });

  it('creates state with isEvaluating false', function () {
    const state = createInitialState();
    expect(state.isEvaluating).toBe(false);
  });
});

describe('createVariableProvider', function () {
  it('creates provider with empty variables', function () {
    const provider = createVariableProvider([]);
    expect(provider.getVariables()).toEqual([]);
  });

  it('returns all variables from getVariables', function () {
    const variables = [createVariable('x', [1, 2, 3]), createVariable('y', [4, 5, 6])];
    const provider = createVariableProvider(variables);
    const result = provider.getVariables();

    expect(result).toHaveLength(2);
    expect(result[0]?.name).toBe('x');
    expect(result[1]?.name).toBe('y');
  });

  it('hasVariable returns true for existing variables', function () {
    const variables = [createVariable('score', [1, 2, 3])];
    const provider = createVariableProvider(variables);

    expect(provider.hasVariable('score')).toBe(true);
  });

  it('hasVariable returns false for non-existing variables', function () {
    const variables = [createVariable('score', [1, 2, 3])];
    const provider = createVariableProvider(variables);

    expect(provider.hasVariable('unknown')).toBe(false);
  });

  it('getVariableType returns correct type', function () {
    const variables = [
      createVariable('num', [1, 2], 'number.float'),
      createVariable('str', ['a', 'b'], 'string.text'),
    ];
    const provider = createVariableProvider(variables);

    expect(provider.getVariableType('num')).toBe('number.float');
    expect(provider.getVariableType('str')).toBe('string.text');
  });

  it('getVariableType returns undefined for unknown variable', function () {
    const provider = createVariableProvider([]);
    expect(provider.getVariableType('unknown')).toBeUndefined();
  });

  it('isNullable returns true for variables with null values', function () {
    const variables = [createVariable('x', [1, null, 3])];
    const provider = createVariableProvider(variables);

    expect(provider.isNullable('x')).toBe(true);
  });

  it('isNullable returns false for variables without null values', function () {
    const variables = [createVariable('x', [1, 2, 3])];
    const provider = createVariableProvider(variables);

    expect(provider.isNullable('x')).toBe(false);
  });

  it('isNullable returns true for unknown variables', function () {
    const provider = createVariableProvider([]);
    expect(provider.isNullable('unknown')).toBe(true);
  });

  it('sets group to Test Variables', function () {
    const variables = [createVariable('x', [1])];
    const provider = createVariableProvider(variables);
    const varInfo = provider.getVariables()[0];

    expect(varInfo?.group).toBe('Test Variables');
  });
});

describe('createEvaluationContext', function () {
  it('creates context with empty variables', function () {
    const context = createEvaluationContext([]);
    expect(context.variables).toEqual({});
    expect(context.rowCount).toBe(0);
  });

  it('converts values to typed Value objects', function () {
    const variables = [createVariable('x', [1, 2, 3])];
    const context = createEvaluationContext(variables);

    expect(context.variables['x']).toHaveLength(3);
    expect(context.variables['x']?.[0]).toEqual({ type: 'number.float', value: 1 });
    expect(context.variables['x']?.[1]).toEqual({ type: 'number.float', value: 2 });
    expect(context.variables['x']?.[2]).toEqual({ type: 'number.float', value: 3 });
  });

  it('preserves null values', function () {
    const variables = [createVariable('x', [1, null, 3])];
    const context = createEvaluationContext(variables);

    expect(context.variables['x']?.[1]).toEqual({ type: 'number.float', value: null });
  });

  it('sets rowCount to max length of variables', function () {
    const variables = [createVariable('short', [1, 2]), createVariable('long', [1, 2, 3, 4, 5])];
    const context = createEvaluationContext(variables);

    expect(context.rowCount).toBe(5);
  });

  it('handles string type correctly', function () {
    const variables = [createVariable('name', ['Alice', 'Bob'], 'string.text')];
    const context = createEvaluationContext(variables);

    expect(context.variables['name']?.[0]).toEqual({ type: 'string.text', value: 'Alice' });
  });

  it('handles boolean type correctly', function () {
    const variables = [createVariable('flag', [true, false], 'boolean.boolean')];
    const context = createEvaluationContext(variables);

    expect(context.variables['flag']?.[0]).toEqual({ type: 'boolean.boolean', value: true });
  });
});

describe('calculateRowCount', function () {
  it('returns 0 for empty variables', function () {
    expect(calculateRowCount([])).toBe(0);
  });

  it('returns length of single variable', function () {
    const variables = [createVariable('x', [1, 2, 3])];
    expect(calculateRowCount(variables)).toBe(3);
  });

  it('returns max length across multiple variables', function () {
    const variables = [
      createVariable('a', [1]),
      createVariable('b', [1, 2, 3]),
      createVariable('c', [1, 2]),
    ];
    expect(calculateRowCount(variables)).toBe(3);
  });

  it('handles variables with empty values', function () {
    const variables = [createVariable('empty', []), createVariable('full', [1, 2, 3])];
    expect(calculateRowCount(variables)).toBe(3);
  });
});

describe('extractAggregations', function () {
  it('returns empty array for literal AST', function () {
    const ast = literal(42);
    const cache = new Map<string, Value>();
    const result = extractAggregations(ast, cache);

    expect(result).toEqual([]);
  });

  it('returns empty array for variable reference', function () {
    const ast = variableRef('x');
    const cache = new Map<string, Value>();
    const result = extractAggregations(ast, cache);

    expect(result).toEqual([]);
  });

  it('extracts aggregation from function call', function () {
    const ast = functionCall('AVG', [variableRef('score')]);
    const cache = new Map<string, Value>();
    cache.set('AVG:score', numericValue(85.5));

    const result = extractAggregations(ast, cache);

    expect(result).toHaveLength(1);
    expect(result[0]?.expression).toBe('AVG(@score)');
    expect(result[0]?.value).toEqual(numericValue(85.5));
  });

  it('extracts multiple aggregations', function () {
    // AVG(@score) + SUM(@value)
    const ast: ASTNode = {
      type: 'BinaryOp',
      operator: '+',
      left: functionCall('AVG', [variableRef('score')]),
      right: functionCall('SUM', [variableRef('value')]),
    };
    const cache = new Map<string, Value>();
    cache.set('AVG:score', numericValue(85.5));
    cache.set('SUM:value', numericValue(1000));

    const result = extractAggregations(ast, cache);

    expect(result).toHaveLength(2);
    expect(result[0]?.expression).toBe('AVG(@score)');
    expect(result[1]?.expression).toBe('SUM(@value)');
  });

  it('deduplicates same aggregation used multiple times', function () {
    // AVG(@score) + AVG(@score)
    const ast: ASTNode = {
      type: 'BinaryOp',
      operator: '+',
      left: functionCall('AVG', [variableRef('score')]),
      right: functionCall('AVG', [variableRef('score')]),
    };
    const cache = new Map<string, Value>();
    cache.set('AVG:score', numericValue(85.5));

    const result = extractAggregations(ast, cache);

    expect(result).toHaveLength(1);
  });

  it('handles nested aggregations in binary ops', function () {
    // -AVG(@score)
    const ast: ASTNode = {
      type: 'UnaryOp',
      operator: '-',
      operand: functionCall('AVG', [variableRef('score')]),
    };
    const cache = new Map<string, Value>();
    cache.set('AVG:score', numericValue(85.5));

    const result = extractAggregations(ast, cache);

    expect(result).toHaveLength(1);
    expect(result[0]?.expression).toBe('AVG(@score)');
  });

  it('ignores function calls not in cache', function () {
    const ast = functionCall('UNKNOWN', [variableRef('x')]);
    const cache = new Map<string, Value>();

    const result = extractAggregations(ast, cache);

    expect(result).toEqual([]);
  });

  it('handles PERCENTILE with second argument', function () {
    const ast = functionCall('PERCENTILE', [variableRef('score'), literal(50)]);
    const cache = new Map<string, Value>();
    cache.set('PERCENTILE:score', numericValue(75));

    const result = extractAggregations(ast, cache);

    expect(result).toHaveLength(1);
    expect(result[0]?.expression).toBe('PERCENTILE(@score, 50)');
  });
});

describe('addVariableToState', function () {
  it('adds variable to empty state', function () {
    const state = createInitialState();
    const variable = createVariable('x', [1, 2, 3]);

    const newState = addVariableToState(state, variable);

    expect(newState.variables).toHaveLength(1);
    expect(newState.variables[0]).toBe(variable);
  });

  it('adds variable to existing variables', function () {
    const state: PlaygroundState = {
      ...createInitialState(),
      variables: [createVariable('x', [1])],
    };
    const variable = createVariable('y', [2, 3]);

    const newState = addVariableToState(state, variable);

    expect(newState.variables).toHaveLength(2);
    expect(newState.variables[1]).toBe(variable);
  });

  it('replaces variable with same name', function () {
    const state: PlaygroundState = {
      ...createInitialState(),
      variables: [createVariable('x', [1, 2])],
    };
    const variable = createVariable('x', [10, 20, 30]);

    const newState = addVariableToState(state, variable);

    expect(newState.variables).toHaveLength(1);
    expect(newState.variables[0]?.values).toEqual([10, 20, 30]);
  });

  it('clears evaluation result', function () {
    const state: PlaygroundState = {
      ...createInitialState(),
      evaluationResult: createEmptyEvaluationResult(),
    };
    const variable = createVariable('x', [1]);

    const newState = addVariableToState(state, variable);

    expect(newState.evaluationResult).toBeNull();
  });
});

describe('editVariableInState', function () {
  it('updates existing variable', function () {
    const state: PlaygroundState = {
      ...createInitialState(),
      variables: [createVariable('x', [1, 2])],
    };
    const updated = createVariable('x', [10, 20, 30]);

    const newState = editVariableInState(state, updated);

    expect(newState.variables).toHaveLength(1);
    expect(newState.variables[0]?.values).toEqual([10, 20, 30]);
  });

  it('adds variable if not found', function () {
    const state = createInitialState();
    const variable = createVariable('x', [1]);

    const newState = editVariableInState(state, variable);

    expect(newState.variables).toHaveLength(1);
  });

  it('clears evaluation result', function () {
    const state: PlaygroundState = {
      ...createInitialState(),
      variables: [createVariable('x', [1])],
      evaluationResult: createEmptyEvaluationResult(),
    };
    const updated = createVariable('x', [2]);

    const newState = editVariableInState(state, updated);

    expect(newState.evaluationResult).toBeNull();
  });
});

describe('removeVariableFromState', function () {
  it('removes existing variable', function () {
    const state: PlaygroundState = {
      ...createInitialState(),
      variables: [createVariable('x', [1]), createVariable('y', [2])],
    };

    const newState = removeVariableFromState(state, 'x');

    expect(newState.variables).toHaveLength(1);
    expect(newState.variables[0]?.name).toBe('y');
  });

  it('handles removing non-existent variable', function () {
    const state: PlaygroundState = {
      ...createInitialState(),
      variables: [createVariable('x', [1])],
    };

    const newState = removeVariableFromState(state, 'unknown');

    expect(newState.variables).toHaveLength(1);
  });

  it('clears evaluation result', function () {
    const state: PlaygroundState = {
      ...createInitialState(),
      variables: [createVariable('x', [1])],
      evaluationResult: createEmptyEvaluationResult(),
    };

    const newState = removeVariableFromState(state, 'x');

    expect(newState.evaluationResult).toBeNull();
  });
});

describe('setFormulaInState', function () {
  it('updates formula', function () {
    const state = createInitialState();
    const newState = setFormulaInState(state, '@x + @y');

    expect(newState.formula).toBe('@x + @y');
  });

  it('clears validation result', function () {
    const state: PlaygroundState = {
      ...createInitialState(),
      validationResult: createValidationResult(true),
    };

    const newState = setFormulaInState(state, '@x');

    expect(newState.validationResult).toBeNull();
  });

  it('clears evaluation result', function () {
    const state: PlaygroundState = {
      ...createInitialState(),
      evaluationResult: createEmptyEvaluationResult(),
    };

    const newState = setFormulaInState(state, '@x');

    expect(newState.evaluationResult).toBeNull();
  });
});

describe('setValidationResultInState', function () {
  it('sets validation result', function () {
    const state = createInitialState();
    const validationResult = createValidationResult(true);

    const newState = setValidationResultInState(state, validationResult);

    expect(newState.validationResult).toBe(validationResult);
  });

  it('can set null validation result', function () {
    const state: PlaygroundState = {
      ...createInitialState(),
      validationResult: createValidationResult(true),
    };

    const newState = setValidationResultInState(state, null);

    expect(newState.validationResult).toBeNull();
  });
});

describe('setEvaluationResultInState', function () {
  it('sets evaluation result and clears isEvaluating', function () {
    const state: PlaygroundState = {
      ...createInitialState(),
      isEvaluating: true,
    };
    const evaluationResult = createEmptyEvaluationResult();

    const newState = setEvaluationResultInState(state, evaluationResult);

    expect(newState.evaluationResult).toBe(evaluationResult);
    expect(newState.isEvaluating).toBe(false);
  });
});

describe('setIsEvaluatingInState', function () {
  it('sets isEvaluating to true', function () {
    const state = createInitialState();
    const newState = setIsEvaluatingInState(state, true);

    expect(newState.isEvaluating).toBe(true);
  });

  it('sets isEvaluating to false', function () {
    const state: PlaygroundState = {
      ...createInitialState(),
      isEvaluating: true,
    };

    const newState = setIsEvaluatingInState(state, false);

    expect(newState.isEvaluating).toBe(false);
  });
});

describe('canEvaluate', function () {
  it('returns false for empty variables', function () {
    const state: PlaygroundState = {
      ...createInitialState(),
      formula: '@x + 1',
      validationResult: createValidationResult(true),
    };

    expect(canEvaluate(state)).toBe(false);
  });

  it('returns false for empty formula', function () {
    const state: PlaygroundState = {
      ...createInitialState(),
      variables: [createVariable('x', [1])],
      validationResult: createValidationResult(true),
    };

    expect(canEvaluate(state)).toBe(false);
  });

  it('returns false for whitespace-only formula', function () {
    const state: PlaygroundState = {
      ...createInitialState(),
      variables: [createVariable('x', [1])],
      formula: '   ',
      validationResult: createValidationResult(true),
    };

    expect(canEvaluate(state)).toBe(false);
  });

  it('returns false for null validation result', function () {
    const state: PlaygroundState = {
      ...createInitialState(),
      variables: [createVariable('x', [1])],
      formula: '@x + 1',
    };

    expect(canEvaluate(state)).toBe(false);
  });

  it('returns false for invalid validation result', function () {
    const state: PlaygroundState = {
      ...createInitialState(),
      variables: [createVariable('x', [1])],
      formula: '@x + 1',
      validationResult: createValidationResult(false),
    };

    expect(canEvaluate(state)).toBe(false);
  });

  it('returns true when all conditions met', function () {
    const state: PlaygroundState = {
      ...createInitialState(),
      variables: [createVariable('x', [1])],
      formula: '@x + 1',
      validationResult: createValidationResult(true),
    };

    expect(canEvaluate(state)).toBe(true);
  });
});

describe('createEmptyEvaluationResult', function () {
  it('creates result with empty values', function () {
    const result = createEmptyEvaluationResult();
    expect(result.values).toEqual([]);
  });

  it('creates result with empty errors', function () {
    const result = createEmptyEvaluationResult();
    expect(result.errors).toEqual([]);
  });

  it('creates result with empty aggregations', function () {
    const result = createEmptyEvaluationResult();
    expect(result.aggregations).toEqual([]);
  });
});

describe('createEvaluationResult', function () {
  it('creates result with provided values', function () {
    const values = [numericValue(1), numericValue(2)];
    const result = createEvaluationResult(values, [], []);

    expect(result.values).toBe(values);
  });

  it('creates result with provided errors', function () {
    const errors = [{ rowIndex: 0, code: 'DIV_BY_ZERO' as const, message: 'Division by zero' }];
    const result = createEvaluationResult([], errors, []);

    expect(result.errors).toBe(errors);
  });

  it('creates result with provided aggregations', function () {
    const aggregations = [{ expression: 'AVG(@x)', value: numericValue(5) }];
    const result = createEvaluationResult([], [], aggregations);

    expect(result.aggregations).toBe(aggregations);
  });
});
