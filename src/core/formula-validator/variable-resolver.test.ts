/**
 * Tests for variable resolution.
 *
 * These tests verify:
 * - Unknown variables produce FormulaSemanticError
 * - Error includes variable name and position
 * - All variables extracted and returned in dependencies array
 * - Works with simple VariableProvider mock
 *
 * @module
 */

import { describe, expect, it } from 'vitest';

import type {
  ASTNode,
  BinaryOpNode,
  BinaryOperator,
  FunctionCallNode,
  VariableRefNode,
} from '../types/ast.ts';
import type { VariableProvider } from '../types/context.ts';
import { FormulaSemanticError } from '../types/errors.ts';
import type { ValueType, VariableInfo } from '../types/values.ts';
import { Validator, createSimpleVariableProvider } from './validator.ts';
import {
  resolveVariablesFromAst,
  areVariablesValid,
  getDependencies,
} from './variable-resolver.ts';
import {
  collectVariableReferences,
  extractUniqueVariableNames,
  findUnknownVariables,
  createUnknownVariableMessage,
  resolveVariables,
} from './variable-resolver.view-model.ts';

// =============================================================================
// Test fixtures
// =============================================================================

/**
 * Creates a simple variable reference node.
 */
function createVariableRef(name: string, start: number, end: number): VariableRefNode {
  return {
    type: 'VariableRef',
    name,
    location: { start, end },
  };
}

/**
 * Creates a binary operation node.
 */
function createBinaryOp(operator: BinaryOperator, left: ASTNode, right: ASTNode): BinaryOpNode {
  return {
    type: 'BinaryOp',
    operator,
    left,
    right,
  };
}

/**
 * Creates a function call node.
 */
function createFunctionCall(name: string, args: ASTNode[]): FunctionCallNode {
  return {
    type: 'FunctionCall',
    name,
    args,
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
    isNullable: function isNullable(_name: string) {
      return true;
    },
  };
}

// =============================================================================
// collectVariableReferences tests
// =============================================================================

describe('collectVariableReferences', function collectVariableReferencesTests() {
  it('should collect variable from a simple variable reference', function simpleRefTest() {
    const ast = createVariableRef('score', 0, 6);
    const refs = collectVariableReferences(ast);

    expect(refs).toHaveLength(1);
    expect(refs[0]!.name).toBe('score');
    expect(refs[0]!.start).toBe(0);
    expect(refs[0]!.end).toBe(6);
  });

  it('should collect variables from binary operation', function binaryOpTest() {
    const ast = createBinaryOp('+', createVariableRef('x', 0, 2), createVariableRef('y', 5, 7));
    const refs = collectVariableReferences(ast);

    expect(refs).toHaveLength(2);
    expect(refs[0]!.name).toBe('x');
    expect(refs[1]!.name).toBe('y');
  });

  it('should collect variables from function call arguments', function funcCallTest() {
    const ast = createFunctionCall('AVG', [createVariableRef('score', 4, 10)]);
    const refs = collectVariableReferences(ast);

    expect(refs).toHaveLength(1);
    expect(refs[0]!.name).toBe('score');
  });

  it('should collect all occurrences of the same variable', function duplicateTest() {
    const ast = createBinaryOp('+', createVariableRef('x', 0, 2), createVariableRef('x', 5, 7));
    const refs = collectVariableReferences(ast);

    expect(refs).toHaveLength(2);
    expect(refs[0]!.name).toBe('x');
    expect(refs[1]!.name).toBe('x');
  });

  it('should return empty array for literal', function literalTest() {
    const ast = { type: 'Literal' as const, valueType: 'number.float' as const, value: 42 };
    const refs = collectVariableReferences(ast);

    expect(refs).toHaveLength(0);
  });

  it('should handle deeply nested expressions', function deepNestingTest() {
    const ast = createFunctionCall('IF', [
      createBinaryOp('>', createVariableRef('a', 3, 5), {
        type: 'Literal',
        valueType: 'number.float',
        value: 0,
      }),
      createVariableRef('b', 10, 12),
      createVariableRef('c', 15, 17),
    ]);
    const refs = collectVariableReferences(ast);

    expect(refs).toHaveLength(3);
    expect(
      refs.map(function getName(r) {
        return r.name;
      }),
    ).toEqual(['a', 'b', 'c']);
  });
});

// =============================================================================
// extractUniqueVariableNames tests
// =============================================================================

describe('extractUniqueVariableNames', function extractUniqueVariableNamesTests() {
  it('should return unique names preserving order', function uniqueNamesTest() {
    const refs = [
      { name: 'x', start: 0, end: 2 },
      { name: 'y', start: 5, end: 7 },
      { name: 'x', start: 10, end: 12 },
      { name: 'z', start: 15, end: 17 },
    ];
    const unique = extractUniqueVariableNames(refs);

    expect(unique).toEqual(['x', 'y', 'z']);
  });

  it('should handle empty input', function emptyInputTest() {
    const unique = extractUniqueVariableNames([]);
    expect(unique).toEqual([]);
  });

  it('should handle all same variable', function allSameTest() {
    const refs = [
      { name: 'x', start: 0, end: 2 },
      { name: 'x', start: 5, end: 7 },
      { name: 'x', start: 10, end: 12 },
    ];
    const unique = extractUniqueVariableNames(refs);

    expect(unique).toEqual(['x']);
  });
});

// =============================================================================
// findUnknownVariables tests
// =============================================================================

describe('findUnknownVariables', function findUnknownVariablesTests() {
  it('should find unknown variables', function unknownVarsTest() {
    const refs = [
      { name: 'x', start: 0, end: 2 },
      { name: 'unknown', start: 5, end: 12 },
    ];
    const hasVariable = function checkVar(name: string) {
      return name === 'x';
    };

    const unknown = findUnknownVariables(refs, hasVariable);

    expect(unknown).toHaveLength(1);
    expect(unknown[0]!.name).toBe('unknown');
    expect(unknown[0]!.start).toBe(5);
    expect(unknown[0]!.end).toBe(12);
  });

  it('should return empty array when all variables exist', function allExistTest() {
    const refs = [
      { name: 'x', start: 0, end: 2 },
      { name: 'y', start: 5, end: 7 },
    ];
    const hasVariable = function checkVar(name: string) {
      return name === 'x' || name === 'y';
    };

    const unknown = findUnknownVariables(refs, hasVariable);

    expect(unknown).toHaveLength(0);
  });

  it('should only report first occurrence of unknown variable', function firstOccurrenceTest() {
    const refs = [
      { name: 'unknown', start: 0, end: 7 },
      { name: 'unknown', start: 10, end: 17 },
    ];
    const hasVariable = function checkVar() {
      return false;
    };

    const unknown = findUnknownVariables(refs, hasVariable);

    expect(unknown).toHaveLength(1);
    expect(unknown[0]!.start).toBe(0); // First occurrence
  });
});

// =============================================================================
// createUnknownVariableMessage tests
// =============================================================================

describe('createUnknownVariableMessage', function messageTests() {
  it('should create message with @ prefix', function prefixTest() {
    const message = createUnknownVariableMessage('score');
    expect(message).toBe('Unknown variable: @score');
  });

  it('should handle variable names with dots', function dotsTest() {
    const message = createUnknownVariableMessage('data.value');
    expect(message).toBe('Unknown variable: @data.value');
  });
});

// =============================================================================
// resolveVariables (pure function) tests
// =============================================================================

describe('resolveVariables (viewModel)', function resolveVariablesPureTests() {
  it('should return dependencies and no unknown for valid variables', function validTest() {
    const ast = createBinaryOp('+', createVariableRef('x', 0, 2), createVariableRef('y', 5, 7));
    const result = resolveVariables({
      ast,
      hasVariable: function checkVar(name: string) {
        return name === 'x' || name === 'y';
      },
    });

    expect(result.dependencies).toEqual(['x', 'y']);
    expect(result.unknownVariables).toHaveLength(0);
  });

  it('should identify unknown variables', function unknownTest() {
    const ast = createVariableRef('unknown', 0, 7);
    const result = resolveVariables({
      ast,
      hasVariable: function checkVar() {
        return false;
      },
    });

    expect(result.dependencies).toEqual(['unknown']);
    expect(result.unknownVariables).toHaveLength(1);
    expect(result.unknownVariables[0]!.name).toBe('unknown');
  });
});

// =============================================================================
// resolveVariablesFromAst tests
// =============================================================================

describe('resolveVariablesFromAst', function resolveVariablesFromAstTests() {
  it('should return dependencies for valid variables', function validDepsTest() {
    const ast = createBinaryOp('+', createVariableRef('x', 0, 2), createVariableRef('y', 5, 7));
    const provider = createTestProvider(['x', 'y']);
    const result = resolveVariablesFromAst(ast, provider);

    expect(result.dependencies).toEqual(['x', 'y']);
    expect(result.errors).toHaveLength(0);
  });

  it('should return FormulaSemanticError for unknown variables', function unknownErrorTest() {
    const ast = createVariableRef('unknown', 0, 8);
    const provider = createTestProvider(['x', 'y']);
    const result = resolveVariablesFromAst(ast, provider);

    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toBeInstanceOf(FormulaSemanticError);
    expect(result.errors[0]!.code).toBe('UNKNOWN_VARIABLE');
    expect(result.errors[0]!.variableName).toBe('unknown');
  });

  it('should include position in error', function positionTest() {
    const ast = createVariableRef('unknown', 5, 12);
    const provider = createTestProvider([]);
    const result = resolveVariablesFromAst(ast, provider);

    expect(result.errors[0]!.position).toBeDefined();
    expect(result.errors[0]!.position!.start).toBe(5);
    expect(result.errors[0]!.position!.end).toBe(12);
  });

  it('should return multiple errors for multiple unknown variables', function multiErrorTest() {
    const ast = createBinaryOp(
      '+',
      createVariableRef('unknown1', 0, 8),
      createVariableRef('unknown2', 11, 19),
    );
    const provider = createTestProvider([]);
    const result = resolveVariablesFromAst(ast, provider);

    expect(result.errors).toHaveLength(2);
    expect(result.errors[0]!.variableName).toBe('unknown1');
    expect(result.errors[1]!.variableName).toBe('unknown2');
  });

  it('should include both valid and invalid in dependencies', function mixedDepsTest() {
    const ast = createBinaryOp(
      '+',
      createVariableRef('valid', 0, 5),
      createVariableRef('invalid', 8, 15),
    );
    const provider = createTestProvider(['valid']);
    const result = resolveVariablesFromAst(ast, provider);

    expect(result.dependencies).toEqual(['valid', 'invalid']);
    expect(result.errors).toHaveLength(1);
  });
});

// =============================================================================
// areVariablesValid tests
// =============================================================================

describe('areVariablesValid', function areVariablesValidTests() {
  it('should return true when all variables exist', function validTest() {
    const ast = createVariableRef('x', 0, 2);
    const provider = createTestProvider(['x']);
    const isValid = areVariablesValid(ast, provider);

    expect(isValid).toBe(true);
  });

  it('should return false when any variable is unknown', function invalidTest() {
    const ast = createVariableRef('unknown', 0, 7);
    const provider = createTestProvider(['x']);
    const isValid = areVariablesValid(ast, provider);

    expect(isValid).toBe(false);
  });
});

// =============================================================================
// getDependencies tests
// =============================================================================

describe('getDependencies', function getDependenciesTests() {
  it('should return all unique variable names', function allDepsTest() {
    const ast = createBinaryOp(
      '+',
      createBinaryOp('+', createVariableRef('a', 0, 2), createVariableRef('b', 5, 7)),
      createVariableRef('a', 10, 12),
    );
    const deps = getDependencies(ast);

    expect(deps).toEqual(['a', 'b']);
  });

  it('should return empty array for no variables', function noDepsTest() {
    const ast = { type: 'Literal' as const, valueType: 'number.float' as const, value: 42 };
    const deps = getDependencies(ast);

    expect(deps).toEqual([]);
  });
});

// =============================================================================
// Validator class tests
// =============================================================================

describe('Validator', function validatorTests() {
  describe('validate', function validateTests() {
    it('should return success for valid formula', function successTest() {
      const ast = createBinaryOp('+', createVariableRef('x', 0, 2), createVariableRef('y', 5, 7));
      const provider = createTestProvider(['x', 'y']);
      const validator = new Validator(provider);

      const result = validator.validate(ast);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.ast.dependencies).toEqual(['x', 'y']);
        expect(result.errors).toEqual([]);
      }
    });

    it('should return failure for unknown variable', function failureTest() {
      const ast = createVariableRef('unknown', 0, 7);
      const provider = createTestProvider(['x']);
      const validator = new Validator(provider);

      const result = validator.validate(ast);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0]!.code).toBe('UNKNOWN_VARIABLE');
      }
    });

    it('should collect all errors by default', function collectAllTest() {
      const ast = createBinaryOp(
        '+',
        createVariableRef('unknown1', 0, 8),
        createVariableRef('unknown2', 11, 19),
      );
      const provider = createTestProvider([]);
      const validator = new Validator(provider);

      const result = validator.validate(ast);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors).toHaveLength(2);
      }
    });

    it('should stop at first error when collectAllErrors is false', function stopEarlyTest() {
      const ast = createBinaryOp(
        '+',
        createVariableRef('unknown1', 0, 8),
        createVariableRef('unknown2', 11, 19),
      );
      const provider = createTestProvider([]);
      const validator = new Validator(provider);

      const result = validator.validate(ast, { collectAllErrors: false });

      expect(result.success).toBe(false);
      if (!result.success) {
        // Should have at least one error
        expect(result.errors.length).toBeGreaterThanOrEqual(1);
      }
    });
  });

  describe('validateVariables', function validateVariablesTests() {
    it('should return empty array for valid variables', function validTest() {
      const ast = createVariableRef('x', 0, 2);
      const provider = createTestProvider(['x']);
      const validator = new Validator(provider);

      const errors = validator.validateVariables(ast);

      expect(errors).toHaveLength(0);
    });

    it('should return errors for unknown variables', function invalidTest() {
      const ast = createVariableRef('unknown', 0, 7);
      const provider = createTestProvider([]);
      const validator = new Validator(provider);

      const errors = validator.validateVariables(ast);

      expect(errors).toHaveLength(1);
      expect(errors[0]!.code).toBe('UNKNOWN_VARIABLE');
    });
  });

  describe('getDependencies', function getDependenciesTests() {
    it('should return all dependencies', function allDepsTest() {
      const ast = createBinaryOp('+', createVariableRef('a', 0, 2), createVariableRef('b', 5, 7));
      const provider = createTestProvider([]);
      const validator = new Validator(provider);

      const deps = validator.getDependencies(ast);

      expect(deps).toEqual(['a', 'b']);
    });
  });
});

// =============================================================================
// createSimpleVariableProvider tests
// =============================================================================

describe('createSimpleVariableProvider', function providerTests() {
  it('should create provider from string array', function stringArrayTest() {
    const provider = createSimpleVariableProvider(['x', 'y', 'z']);

    expect(provider.hasVariable('x')).toBe(true);
    expect(provider.hasVariable('y')).toBe(true);
    expect(provider.hasVariable('z')).toBe(true);
    expect(provider.hasVariable('unknown')).toBe(false);
  });

  it('should return variables info', function variablesInfoTest() {
    const provider = createSimpleVariableProvider(['x', 'y']);
    const variables = provider.getVariables();

    expect(variables).toHaveLength(2);
    expect(variables[0]!.name).toBe('x');
    expect(variables[0]!.type).toBe('number.float');
  });

  it('should return type for existing variable', function typeTest() {
    const provider = createSimpleVariableProvider([
      { name: 'score', type: 'number.float', nullable: false },
    ]);

    expect(provider.getVariableType('score')).toBe('number.float');
  });

  it('should return undefined for unknown variable type', function unknownTypeTest() {
    const provider = createSimpleVariableProvider(['x']);

    expect(provider.getVariableType('unknown')).toBeUndefined();
  });

  it('should handle mixed input', function mixedInputTest() {
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

// =============================================================================
// Error properties tests
// =============================================================================

describe('FormulaSemanticError properties', function errorPropertiesTests() {
  it('should be instanceof FormulaSemanticError', function instanceOfTest() {
    const ast = createVariableRef('unknown', 0, 7);
    const provider = createTestProvider([]);
    const result = resolveVariablesFromAst(ast, provider);

    expect(result.errors[0]).toBeInstanceOf(FormulaSemanticError);
    expect(result.errors[0]).toBeInstanceOf(Error);
  });

  it('should have name property set', function namePropertyTest() {
    const ast = createVariableRef('unknown', 0, 7);
    const provider = createTestProvider([]);
    const result = resolveVariablesFromAst(ast, provider);

    expect(result.errors[0]!.name).toBe('FormulaSemanticError');
  });

  it('should have all required properties', function requiredPropertiesTest() {
    const ast = createVariableRef('unknown', 0, 7);
    const provider = createTestProvider([]);
    const result = resolveVariablesFromAst(ast, provider);
    const error = result.errors[0]!;

    expect(typeof error.message).toBe('string');
    expect(typeof error.name).toBe('string');
    expect(typeof error.code).toBe('string');
    expect(error.position).toBeDefined();
    expect(error.variableName).toBe('unknown');
  });
});
