/**
 * Tests for type checking.
 *
 * These tests verify:
 * - Arithmetic operators require numeric operands
 * - Comparison operators work on compatible types
 * - String concatenation requires string operands
 * - Unary operators require numeric operands
 * - FormulaSemanticError for type mismatches with clear messages
 * - Return type is inferred correctly for expressions
 *
 * @module
 */

import { describe, expect, it } from 'vitest';

import type {
  ASTNode,
  BinaryOpNode,
  BinaryOperator,
  LiteralNode,
  UnaryOpNode,
  UnaryOperator,
  VariableRefNode,
  FunctionCallNode,
} from '../types/ast.ts';
import type { VariableProvider } from '../types/context.ts';
import { FormulaSemanticError } from '../types/errors.ts';
import type { ValueType, VariableInfo } from '../types/values.ts';
import { checkTypes, inferExpressionType, areTypesValid } from './type-checker.ts';
import {
  getTypeCategory,
  isNumericType,
  isStringType,
  isBooleanType,
  isArithmeticOperator,
  isComparisonOperator,
  isStringConcatOperator,
  createArithmeticTypeError,
  createComparisonTypeError,
  createStringConcatTypeError,
  getBinaryOperatorResultType,
  getUnaryOperatorResultType,
  checkBinaryOperatorTypes,
  checkUnaryOperatorTypes,
  inferType,
} from './type-checker.view-model.ts';

// =============================================================================
// Test fixtures
// =============================================================================

/**
 * Creates a literal node.
 */
function createLiteral(valueType: ValueType, value: number | string | boolean): LiteralNode {
  return {
    type: 'Literal',
    valueType,
    value,
  };
}

/**
 * Creates a variable reference node.
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
function createBinaryOp(
  operator: BinaryOperator,
  left: ASTNode,
  right: ASTNode,
  start?: number,
  end?: number,
): BinaryOpNode {
  const node: BinaryOpNode = {
    type: 'BinaryOp',
    operator,
    left,
    right,
  };

  if (start !== undefined && end !== undefined) {
    return {
      ...node,
      location: { start, end },
    };
  }

  return node;
}

/**
 * Creates a unary operation node.
 */
function createUnaryOp(
  operator: UnaryOperator,
  operand: ASTNode,
  start?: number,
  end?: number,
): UnaryOpNode {
  const node: UnaryOpNode = {
    type: 'UnaryOp',
    operator,
    operand,
  };

  if (start !== undefined && end !== undefined) {
    return {
      ...node,
      location: { start, end },
    };
  }

  return node;
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
 * Creates a test VariableProvider with specified types.
 */
function createTypedProvider(
  variables: Array<{ name: string; type: ValueType }>,
): VariableProvider {
  const variableMap = new Map<string, VariableInfo>();

  for (const v of variables) {
    variableMap.set(v.name, {
      name: v.name,
      type: v.type,
      nullable: true,
    });
  }

  return {
    getVariables: function getVariables() {
      return Array.from(variableMap.values());
    },
    hasVariable: function hasVariable(name: string) {
      return variableMap.has(name);
    },
    getVariableType: function getVariableType(name: string) {
      const info = variableMap.get(name);
      return info?.type;
    },
    isNullable: function isNullable(_name: string) {
      return true;
    },
  };
}

// =============================================================================
// getTypeCategory tests
// =============================================================================

describe('getTypeCategory', function getTypeCategoryTests() {
  it('should return numeric for number.integer', function integerTest() {
    expect(getTypeCategory('number.integer')).toBe('numeric');
  });

  it('should return numeric for number.float', function floatTest() {
    expect(getTypeCategory('number.float')).toBe('numeric');
  });

  it('should return string for string.text', function stringTest() {
    expect(getTypeCategory('string.text')).toBe('string');
  });

  it('should return boolean for boolean.boolean', function booleanTest() {
    expect(getTypeCategory('boolean.boolean')).toBe('boolean');
  });

  it('should return unknown for undefined', function undefinedTest() {
    expect(getTypeCategory(undefined)).toBe('unknown');
  });
});

// =============================================================================
// isNumericType tests
// =============================================================================

describe('isNumericType', function isNumericTypeTests() {
  it('should return true for number.integer', function integerTest() {
    expect(isNumericType('number.integer')).toBe(true);
  });

  it('should return true for number.float', function floatTest() {
    expect(isNumericType('number.float')).toBe(true);
  });

  it('should return false for string.text', function stringTest() {
    expect(isNumericType('string.text')).toBe(false);
  });

  it('should return false for boolean.boolean', function booleanTest() {
    expect(isNumericType('boolean.boolean')).toBe(false);
  });

  it('should return false for undefined', function undefinedTest() {
    expect(isNumericType(undefined)).toBe(false);
  });
});

// =============================================================================
// isStringType tests
// =============================================================================

describe('isStringType', function isStringTypeTests() {
  it('should return true for string.text', function stringTest() {
    expect(isStringType('string.text')).toBe(true);
  });

  it('should return false for number.float', function numberTest() {
    expect(isStringType('number.float')).toBe(false);
  });

  it('should return false for boolean.boolean', function booleanTest() {
    expect(isStringType('boolean.boolean')).toBe(false);
  });
});

// =============================================================================
// isBooleanType tests
// =============================================================================

describe('isBooleanType', function isBooleanTypeTests() {
  it('should return true for boolean.boolean', function booleanTest() {
    expect(isBooleanType('boolean.boolean')).toBe(true);
  });

  it('should return false for number.float', function numberTest() {
    expect(isBooleanType('number.float')).toBe(false);
  });

  it('should return false for string.text', function stringTest() {
    expect(isBooleanType('string.text')).toBe(false);
  });
});

// =============================================================================
// isArithmeticOperator tests
// =============================================================================

describe('isArithmeticOperator', function isArithmeticOperatorTests() {
  it('should return true for +', function plusTest() {
    expect(isArithmeticOperator('+')).toBe(true);
  });

  it('should return true for -', function minusTest() {
    expect(isArithmeticOperator('-')).toBe(true);
  });

  it('should return true for *', function multiplyTest() {
    expect(isArithmeticOperator('*')).toBe(true);
  });

  it('should return true for /', function divideTest() {
    expect(isArithmeticOperator('/')).toBe(true);
  });

  it('should return true for %', function moduloTest() {
    expect(isArithmeticOperator('%')).toBe(true);
  });

  it('should return true for ^', function powerTest() {
    expect(isArithmeticOperator('^')).toBe(true);
  });

  it('should return false for &', function concatTest() {
    expect(isArithmeticOperator('&')).toBe(false);
  });

  it('should return false for ==', function eqTest() {
    expect(isArithmeticOperator('==')).toBe(false);
  });
});

// =============================================================================
// isComparisonOperator tests
// =============================================================================

describe('isComparisonOperator', function isComparisonOperatorTests() {
  it('should return true for ==', function eqTest() {
    expect(isComparisonOperator('==')).toBe(true);
  });

  it('should return true for !=', function neqTest() {
    expect(isComparisonOperator('!=')).toBe(true);
  });

  it('should return true for <>', function neq2Test() {
    expect(isComparisonOperator('<>')).toBe(true);
  });

  it('should return true for <', function ltTest() {
    expect(isComparisonOperator('<')).toBe(true);
  });

  it('should return true for >', function gtTest() {
    expect(isComparisonOperator('>')).toBe(true);
  });

  it('should return true for <=', function lteTest() {
    expect(isComparisonOperator('<=')).toBe(true);
  });

  it('should return true for >=', function gteTest() {
    expect(isComparisonOperator('>=')).toBe(true);
  });

  it('should return false for +', function plusTest() {
    expect(isComparisonOperator('+')).toBe(false);
  });

  it('should return false for &', function concatTest() {
    expect(isComparisonOperator('&')).toBe(false);
  });
});

// =============================================================================
// isStringConcatOperator tests
// =============================================================================

describe('isStringConcatOperator', function isStringConcatOperatorTests() {
  it('should return true for &', function concatTest() {
    expect(isStringConcatOperator('&')).toBe(true);
  });

  it('should return false for +', function plusTest() {
    expect(isStringConcatOperator('+')).toBe(false);
  });

  it('should return false for ==', function eqTest() {
    expect(isStringConcatOperator('==')).toBe(false);
  });
});

// =============================================================================
// Error message tests
// =============================================================================

describe('createArithmeticTypeError', function arithmeticErrorTests() {
  it('should create message for string type', function stringErrorTest() {
    const message = createArithmeticTypeError('+', 'string.text');
    expect(message).toBe("Operator '+' requires numeric operands, but got string.text");
  });

  it('should create message for boolean type', function booleanErrorTest() {
    const message = createArithmeticTypeError('*', 'boolean.boolean');
    expect(message).toBe("Operator '*' requires numeric operands, but got boolean.boolean");
  });

  it('should create message for undefined type', function undefinedErrorTest() {
    const message = createArithmeticTypeError('-', undefined);
    expect(message).toBe("Operator '-' requires numeric operands, but got unknown");
  });

  it('should work with unary operators', function unaryErrorTest() {
    const message = createArithmeticTypeError('-', 'string.text');
    expect(message).toBe("Operator '-' requires numeric operands, but got string.text");
  });
});

describe('createComparisonTypeError', function comparisonErrorTests() {
  it('should create message for number vs string', function numStrTest() {
    const message = createComparisonTypeError('number.float', 'string.text');
    expect(message).toBe(
      'Comparison operators require matching types: number.float vs string.text',
    );
  });

  it('should create message for boolean vs number', function boolNumTest() {
    const message = createComparisonTypeError('boolean.boolean', 'number.integer');
    expect(message).toBe(
      'Comparison operators require matching types: boolean.boolean vs number.integer',
    );
  });

  it('should handle undefined types', function undefinedTest() {
    const message = createComparisonTypeError(undefined, 'number.float');
    expect(message).toBe('Comparison operators require matching types: unknown vs number.float');
  });
});

describe('createStringConcatTypeError', function concatErrorTests() {
  it('should create message for number type', function numberErrorTest() {
    const message = createStringConcatTypeError('number.float');
    expect(message).toBe("Operator '&' requires string operands, but got number.float");
  });

  it('should create message for boolean type', function booleanErrorTest() {
    const message = createStringConcatTypeError('boolean.boolean');
    expect(message).toBe("Operator '&' requires string operands, but got boolean.boolean");
  });
});

// =============================================================================
// getBinaryOperatorResultType tests
// =============================================================================

describe('getBinaryOperatorResultType', function resultTypeTests() {
  it('should return number.float for arithmetic operators', function arithmeticTest() {
    expect(getBinaryOperatorResultType('+')).toBe('number.float');
    expect(getBinaryOperatorResultType('-')).toBe('number.float');
    expect(getBinaryOperatorResultType('*')).toBe('number.float');
    expect(getBinaryOperatorResultType('/')).toBe('number.float');
    expect(getBinaryOperatorResultType('%')).toBe('number.float');
    expect(getBinaryOperatorResultType('^')).toBe('number.float');
  });

  it('should return boolean.boolean for comparison operators', function comparisonTest() {
    expect(getBinaryOperatorResultType('==')).toBe('boolean.boolean');
    expect(getBinaryOperatorResultType('!=')).toBe('boolean.boolean');
    expect(getBinaryOperatorResultType('<>')).toBe('boolean.boolean');
    expect(getBinaryOperatorResultType('<')).toBe('boolean.boolean');
    expect(getBinaryOperatorResultType('>')).toBe('boolean.boolean');
    expect(getBinaryOperatorResultType('<=')).toBe('boolean.boolean');
    expect(getBinaryOperatorResultType('>=')).toBe('boolean.boolean');
  });

  it('should return string.text for concat operator', function concatTest() {
    expect(getBinaryOperatorResultType('&')).toBe('string.text');
  });
});

// =============================================================================
// getUnaryOperatorResultType tests
// =============================================================================

describe('getUnaryOperatorResultType', function unaryResultTypeTests() {
  it('should return number.float for unary minus', function minusTest() {
    expect(getUnaryOperatorResultType('-')).toBe('number.float');
  });

  it('should return number.float for unary plus', function plusTest() {
    expect(getUnaryOperatorResultType('+')).toBe('number.float');
  });
});

// =============================================================================
// checkBinaryOperatorTypes tests
// =============================================================================

describe('checkBinaryOperatorTypes', function checkBinaryTests() {
  it('should return undefined for valid arithmetic operation', function validArithmeticTest() {
    const error = checkBinaryOperatorTypes('+', 'number.float', 'number.integer', undefined);
    expect(error).toBeUndefined();
  });

  it('should return error for arithmetic with string left operand', function stringLeftTest() {
    const error = checkBinaryOperatorTypes('+', 'string.text', 'number.float', {
      start: 0,
      end: 10,
    });
    expect(error).toBeDefined();
    expect(error!.message).toContain("Operator '+' requires numeric operands");
    expect(error!.start).toBe(0);
    expect(error!.end).toBe(10);
  });

  it('should return error for arithmetic with string right operand', function stringRightTest() {
    const error = checkBinaryOperatorTypes('*', 'number.float', 'string.text', undefined);
    expect(error).toBeDefined();
    expect(error!.message).toContain("Operator '*' requires numeric operands");
  });

  it('should return undefined for valid comparison with same types', function validComparisonTest() {
    const error = checkBinaryOperatorTypes('==', 'number.float', 'number.integer', undefined);
    expect(error).toBeUndefined();
  });

  it('should return undefined for comparison of booleans', function booleanComparisonTest() {
    const error = checkBinaryOperatorTypes('!=', 'boolean.boolean', 'boolean.boolean', undefined);
    expect(error).toBeUndefined();
  });

  it('should return undefined for comparison of strings', function stringComparisonTest() {
    const error = checkBinaryOperatorTypes('<', 'string.text', 'string.text', undefined);
    expect(error).toBeUndefined();
  });

  it('should return error for comparison of different type categories', function mixedComparisonTest() {
    const error = checkBinaryOperatorTypes('>', 'number.float', 'string.text', {
      start: 5,
      end: 15,
    });
    expect(error).toBeDefined();
    expect(error!.message).toContain('Comparison operators require matching types');
    expect(error!.start).toBe(5);
  });

  it('should allow comparison when one type is unknown', function unknownComparisonTest() {
    const error = checkBinaryOperatorTypes('==', undefined, 'number.float', undefined);
    expect(error).toBeUndefined();
  });

  it('should return undefined for valid string concatenation', function validConcatTest() {
    const error = checkBinaryOperatorTypes('&', 'string.text', 'string.text', undefined);
    expect(error).toBeUndefined();
  });

  it('should return error for concat with number left operand', function numberConcatLeftTest() {
    const error = checkBinaryOperatorTypes('&', 'number.float', 'string.text', undefined);
    expect(error).toBeDefined();
    expect(error!.message).toContain("Operator '&' requires string operands");
  });

  it('should return error for concat with boolean right operand', function booleanConcatRightTest() {
    const error = checkBinaryOperatorTypes('&', 'string.text', 'boolean.boolean', undefined);
    expect(error).toBeDefined();
    expect(error!.message).toContain("Operator '&' requires string operands");
  });
});

// =============================================================================
// checkUnaryOperatorTypes tests
// =============================================================================

describe('checkUnaryOperatorTypes', function checkUnaryTests() {
  it('should return undefined for valid unary minus', function validMinusTest() {
    const error = checkUnaryOperatorTypes('-', 'number.float', undefined);
    expect(error).toBeUndefined();
  });

  it('should return undefined for valid unary plus', function validPlusTest() {
    const error = checkUnaryOperatorTypes('+', 'number.integer', undefined);
    expect(error).toBeUndefined();
  });

  it('should return error for unary minus on string', function stringMinusTest() {
    const error = checkUnaryOperatorTypes('-', 'string.text', { start: 0, end: 5 });
    expect(error).toBeDefined();
    expect(error!.message).toContain("Operator '-' requires numeric operands");
    expect(error!.start).toBe(0);
    expect(error!.end).toBe(5);
  });

  it('should return error for unary plus on boolean', function booleanPlusTest() {
    const error = checkUnaryOperatorTypes('+', 'boolean.boolean', undefined);
    expect(error).toBeDefined();
    expect(error!.message).toContain("Operator '+' requires numeric operands");
  });
});

// =============================================================================
// inferType (viewModel) tests
// =============================================================================

describe('inferType (viewModel)', function inferTypePureTests() {
  it('should infer literal type', function literalTest() {
    const ast = createLiteral('number.float', 42);
    const result = inferType({
      ast,
      getVariableType: function getType() {
        return undefined;
      },
    });

    expect(result.type).toBe('number.float');
    expect(result.errors).toHaveLength(0);
  });

  it('should infer variable type from provider', function variableTest() {
    const ast = createVariableRef('score', 0, 6);
    const result = inferType({
      ast,
      getVariableType: function getType(name: string) {
        if (name === 'score') {
          return 'number.float';
        }
        return undefined;
      },
    });

    expect(result.type).toBe('number.float');
    expect(result.errors).toHaveLength(0);
  });

  it('should infer arithmetic result type', function arithmeticTest() {
    const ast = createBinaryOp(
      '+',
      createLiteral('number.float', 1),
      createLiteral('number.integer', 2),
    );
    const result = inferType({
      ast,
      getVariableType: function getType() {
        return undefined;
      },
    });

    expect(result.type).toBe('number.float');
    expect(result.errors).toHaveLength(0);
  });

  it('should infer comparison result type', function comparisonTest() {
    const ast = createBinaryOp(
      '>',
      createLiteral('number.float', 10),
      createLiteral('number.float', 5),
    );
    const result = inferType({
      ast,
      getVariableType: function getType() {
        return undefined;
      },
    });

    expect(result.type).toBe('boolean.boolean');
    expect(result.errors).toHaveLength(0);
  });

  it('should infer concat result type', function concatTest() {
    const ast = createBinaryOp(
      '&',
      createLiteral('string.text', 'hello'),
      createLiteral('string.text', 'world'),
    );
    const result = inferType({
      ast,
      getVariableType: function getType() {
        return undefined;
      },
    });

    expect(result.type).toBe('string.text');
    expect(result.errors).toHaveLength(0);
  });

  it('should infer unary result type', function unaryTest() {
    const ast = createUnaryOp('-', createLiteral('number.integer', 5));
    const result = inferType({
      ast,
      getVariableType: function getType() {
        return undefined;
      },
    });

    expect(result.type).toBe('number.float');
    expect(result.errors).toHaveLength(0);
  });

  it('should collect type errors for arithmetic mismatch', function arithmeticErrorTest() {
    const ast = createBinaryOp(
      '+',
      createLiteral('number.float', 1),
      createLiteral('string.text', 'hello'),
      0,
      15,
    );
    const result = inferType({
      ast,
      getVariableType: function getType() {
        return undefined;
      },
    });

    expect(result.type).toBe('number.float'); // Still returns expected type
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]!.message).toContain("Operator '+' requires numeric operands");
  });

  it('should collect type errors for unary mismatch', function unaryErrorTest() {
    const ast = createUnaryOp('-', createLiteral('string.text', 'hello'), 0, 8);
    const result = inferType({
      ast,
      getVariableType: function getType() {
        return undefined;
      },
    });

    expect(result.type).toBe('number.float');
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]!.message).toContain("Operator '-' requires numeric operands");
  });

  it('should collect multiple type errors', function multipleErrorsTest() {
    // (-"hello") + (true)
    const ast = createBinaryOp(
      '+',
      createUnaryOp('-', createLiteral('string.text', 'hello'), 0, 8),
      createLiteral('boolean.boolean', true),
      0,
      20,
    );
    const result = inferType({
      ast,
      getVariableType: function getType() {
        return undefined;
      },
    });

    // Should have errors for both unary minus on string and arithmetic with boolean
    expect(result.errors.length).toBeGreaterThanOrEqual(2);
  });

  it('should handle nested expressions', function nestedTest() {
    // (@a + @b) * @c
    const ast = createBinaryOp(
      '*',
      createBinaryOp('+', createVariableRef('a', 1, 3), createVariableRef('b', 6, 8)),
      createVariableRef('c', 12, 14),
    );
    const result = inferType({
      ast,
      getVariableType: function getType(name: string) {
        if (name === 'a' || name === 'b' || name === 'c') {
          return 'number.float';
        }
        return undefined;
      },
    });

    expect(result.type).toBe('number.float');
    expect(result.errors).toHaveLength(0);
  });

  it('should return undefined type for function calls', function functionTest() {
    const ast = createFunctionCall('AVG', [createVariableRef('score', 4, 10)]);
    const result = inferType({
      ast,
      getVariableType: function getType(name: string) {
        if (name === 'score') {
          return 'number.float';
        }
        return undefined;
      },
    });

    // Function return types are handled by function validator
    expect(result.type).toBeUndefined();
    expect(result.errors).toHaveLength(0);
  });
});

// =============================================================================
// inferExpressionType tests
// =============================================================================

describe('inferExpressionType', function inferExpressionTypeTests() {
  it('should infer type for numeric expression', function numericTest() {
    const ast = createBinaryOp('+', createVariableRef('x', 0, 2), createVariableRef('y', 5, 7));
    const provider = createTypedProvider([
      { name: 'x', type: 'number.float' },
      { name: 'y', type: 'number.integer' },
    ]);

    const type = inferExpressionType(ast, provider);
    expect(type).toBe('number.float');
  });

  it('should infer boolean type for comparison', function comparisonTest() {
    const ast = createBinaryOp('>', createVariableRef('x', 0, 2), createLiteral('number.float', 0));
    const provider = createTypedProvider([{ name: 'x', type: 'number.float' }]);

    const type = inferExpressionType(ast, provider);
    expect(type).toBe('boolean.boolean');
  });

  it('should infer string type for concatenation', function concatTest() {
    const ast = createBinaryOp(
      '&',
      createVariableRef('firstName', 0, 10),
      createVariableRef('lastName', 13, 21),
    );
    const provider = createTypedProvider([
      { name: 'firstName', type: 'string.text' },
      { name: 'lastName', type: 'string.text' },
    ]);

    const type = inferExpressionType(ast, provider);
    expect(type).toBe('string.text');
  });
});

// =============================================================================
// checkTypes tests
// =============================================================================

describe('checkTypes', function checkTypesTests() {
  it('should return no errors for valid expression', function validTest() {
    const ast = createBinaryOp('+', createVariableRef('x', 0, 2), createVariableRef('y', 5, 7));
    const provider = createTypedProvider([
      { name: 'x', type: 'number.float' },
      { name: 'y', type: 'number.float' },
    ]);

    const result = checkTypes(ast, provider);
    expect(result.errors).toHaveLength(0);
    expect(result.resultType).toBe('number.float');
  });

  it('should return FormulaSemanticError for type mismatch', function errorTest() {
    const ast = createBinaryOp(
      '+',
      createVariableRef('x', 0, 2),
      createVariableRef('y', 5, 7),
      0,
      7,
    );
    const provider = createTypedProvider([
      { name: 'x', type: 'number.float' },
      { name: 'y', type: 'string.text' },
    ]);

    const result = checkTypes(ast, provider);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toBeInstanceOf(FormulaSemanticError);
    expect(result.errors[0]!.code).toBe('TYPE_MISMATCH');
    expect(result.errors[0]!.message).toContain("Operator '+' requires numeric operands");
  });

  it('should include position in error', function positionTest() {
    const ast = createBinaryOp(
      '+',
      createLiteral('number.float', 1),
      createLiteral('string.text', 'hello'),
      5,
      20,
    );
    const provider = createTypedProvider([]);

    const result = checkTypes(ast, provider);
    expect(result.errors[0]!.position).toBeDefined();
    expect(result.errors[0]!.position!.start).toBe(5);
    expect(result.errors[0]!.position!.end).toBe(20);
  });

  it('should return error for string concatenation with number', function concatErrorTest() {
    const ast = createBinaryOp(
      '&',
      createVariableRef('name', 0, 5),
      createVariableRef('age', 8, 12),
      0,
      12,
    );
    const provider = createTypedProvider([
      { name: 'name', type: 'string.text' },
      { name: 'age', type: 'number.integer' },
    ]);

    const result = checkTypes(ast, provider);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]!.message).toContain("Operator '&' requires string operands");
  });

  it('should return error for comparison of incompatible types', function comparisonErrorTest() {
    const ast = createBinaryOp(
      '==',
      createVariableRef('flag', 0, 5),
      createVariableRef('count', 9, 14),
      0,
      14,
    );
    const provider = createTypedProvider([
      { name: 'flag', type: 'boolean.boolean' },
      { name: 'count', type: 'number.float' },
    ]);

    const result = checkTypes(ast, provider);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]!.message).toContain('Comparison operators require matching types');
  });

  it('should return error for unary operator on wrong type', function unaryErrorTest() {
    const ast = createUnaryOp('-', createVariableRef('name', 1, 5), 0, 5);
    const provider = createTypedProvider([{ name: 'name', type: 'string.text' }]);

    const result = checkTypes(ast, provider);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]!.message).toContain("Operator '-' requires numeric operands");
  });

  it('should collect multiple errors', function multipleErrorsTest() {
    // (-@name) + @flag
    const ast = createBinaryOp(
      '+',
      createUnaryOp('-', createVariableRef('name', 2, 6), 0, 6),
      createVariableRef('flag', 10, 14),
      0,
      14,
    );
    const provider = createTypedProvider([
      { name: 'name', type: 'string.text' },
      { name: 'flag', type: 'boolean.boolean' },
    ]);

    const result = checkTypes(ast, provider);
    // Should have error for unary minus on string and arithmetic with boolean
    expect(result.errors.length).toBeGreaterThanOrEqual(2);
    expect(
      result.errors.every(function checkInstance(e) {
        return e instanceof FormulaSemanticError;
      }),
    ).toBe(true);
  });
});

// =============================================================================
// areTypesValid tests
// =============================================================================

describe('areTypesValid', function areTypesValidTests() {
  it('should return true for valid expression', function validTest() {
    const ast = createBinaryOp('*', createVariableRef('x', 0, 2), createVariableRef('y', 5, 7));
    const provider = createTypedProvider([
      { name: 'x', type: 'number.float' },
      { name: 'y', type: 'number.float' },
    ]);

    expect(areTypesValid(ast, provider)).toBe(true);
  });

  it('should return false for invalid expression', function invalidTest() {
    const ast = createBinaryOp(
      '*',
      createVariableRef('x', 0, 2),
      createVariableRef('y', 5, 7),
      0,
      7,
    );
    const provider = createTypedProvider([
      { name: 'x', type: 'number.float' },
      { name: 'y', type: 'string.text' },
    ]);

    expect(areTypesValid(ast, provider)).toBe(false);
  });
});

// =============================================================================
// Edge case tests
// =============================================================================

describe('Edge cases', function edgeCaseTests() {
  it('should handle unknown variable type gracefully', function unknownVarTest() {
    const ast = createBinaryOp(
      '+',
      createVariableRef('unknown', 0, 7),
      createLiteral('number.float', 1),
    );
    const provider = createTypedProvider([]);

    const result = checkTypes(ast, provider);
    // Unknown variable type should not cause type error by itself
    // (that's handled by variable resolution)
    // But if we try arithmetic with unknown, we should not error
    // because we can't verify the type
    expect(result.resultType).toBe('number.float');
  });

  it('should handle deeply nested expressions', function deepNestingTest() {
    // (((@a + @b) * @c) / @d) ^ @e
    const ast = createBinaryOp(
      '^',
      createBinaryOp(
        '/',
        createBinaryOp(
          '*',
          createBinaryOp('+', createVariableRef('a', 4, 6), createVariableRef('b', 9, 11)),
          createVariableRef('c', 15, 17),
        ),
        createVariableRef('d', 21, 23),
      ),
      createVariableRef('e', 27, 29),
    );
    const provider = createTypedProvider([
      { name: 'a', type: 'number.float' },
      { name: 'b', type: 'number.float' },
      { name: 'c', type: 'number.float' },
      { name: 'd', type: 'number.float' },
      { name: 'e', type: 'number.float' },
    ]);

    const result = checkTypes(ast, provider);
    expect(result.errors).toHaveLength(0);
    expect(result.resultType).toBe('number.float');
  });

  it('should handle mixed integer and float correctly', function mixedNumericTest() {
    const ast = createBinaryOp(
      '+',
      createLiteral('number.integer', 1),
      createLiteral('number.float', 2.5),
    );
    const provider = createTypedProvider([]);

    const result = checkTypes(ast, provider);
    expect(result.errors).toHaveLength(0);
    expect(result.resultType).toBe('number.float');
  });

  it('should allow comparison between integer and float', function numericComparisonTest() {
    const ast = createBinaryOp(
      '>',
      createVariableRef('intVar', 0, 6),
      createVariableRef('floatVar', 9, 17),
    );
    const provider = createTypedProvider([
      { name: 'intVar', type: 'number.integer' },
      { name: 'floatVar', type: 'number.float' },
    ]);

    const result = checkTypes(ast, provider);
    expect(result.errors).toHaveLength(0);
    expect(result.resultType).toBe('boolean.boolean');
  });
});

// =============================================================================
// Error properties tests
// =============================================================================

describe('FormulaSemanticError properties', function errorPropertiesTests() {
  it('should be instanceof FormulaSemanticError', function instanceOfTest() {
    const ast = createBinaryOp(
      '+',
      createLiteral('number.float', 1),
      createLiteral('string.text', 'hello'),
      0,
      15,
    );
    const provider = createTypedProvider([]);

    const result = checkTypes(ast, provider);
    expect(result.errors[0]).toBeInstanceOf(FormulaSemanticError);
    expect(result.errors[0]).toBeInstanceOf(Error);
  });

  it('should have name property set', function namePropertyTest() {
    const ast = createBinaryOp(
      '*',
      createLiteral('number.float', 1),
      createLiteral('boolean.boolean', true),
      0,
      10,
    );
    const provider = createTypedProvider([]);

    const result = checkTypes(ast, provider);
    expect(result.errors[0]!.name).toBe('FormulaSemanticError');
  });

  it('should have code TYPE_MISMATCH', function codePropertyTest() {
    const ast = createBinaryOp(
      '&',
      createLiteral('number.float', 1),
      createLiteral('string.text', 'hello'),
      0,
      15,
    );
    const provider = createTypedProvider([]);

    const result = checkTypes(ast, provider);
    expect(result.errors[0]!.code).toBe('TYPE_MISMATCH');
  });
});
