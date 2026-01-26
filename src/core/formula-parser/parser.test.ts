/**
 * Tests for the Parser facade.
 *
 * These tests verify:
 * - parse() returns AST for valid formulas
 * - FormulaSyntaxError thrown for invalid formulas with position info
 * - Error messages include what was expected vs found
 * - Position info includes start and end offsets
 * - Parser is stateless (can be reused)
 *
 * @module
 */

import { describe, expect, it } from 'vitest';

import type {
  ASTNode,
  BinaryOpNode,
  FunctionCallNode,
  LiteralNode,
  VariableRefNode,
} from '../types/ast.ts';
import { FormulaSyntaxError } from '../types/errors.ts';
import { isValidSyntax, parse, tryParse } from './parser.ts';

// =============================================================================
// Helper functions
// =============================================================================

/**
 * Type guard for LiteralNode.
 */
function isLiteral(node: ASTNode): node is LiteralNode {
  return node.type === 'Literal';
}

/**
 * Type guard for VariableRefNode.
 */
function isVariableRef(node: ASTNode): node is VariableRefNode {
  return node.type === 'VariableRef';
}

/**
 * Type guard for BinaryOpNode.
 */
function isBinaryOp(node: ASTNode): node is BinaryOpNode {
  return node.type === 'BinaryOp';
}

/**
 * Type guard for FunctionCallNode.
 */
function isFunctionCall(node: ASTNode): node is FunctionCallNode {
  return node.type === 'FunctionCall';
}

/**
 * Asserts that parsing throws a FormulaSyntaxError.
 */
function expectSyntaxError(formula: string): FormulaSyntaxError {
  try {
    parse(formula);
    throw new Error(`Expected FormulaSyntaxError for: "${formula}"`);
  } catch (error) {
    expect(error).toBeInstanceOf(FormulaSyntaxError);
    return error as FormulaSyntaxError;
  }
}

// =============================================================================
// Valid formula parsing tests
// =============================================================================

describe('Parser: Valid Formulas', function validFormulaTests() {
  describe('Simple expressions', function simpleExpressionTests() {
    it('should parse a number literal', function numberLiteralTest() {
      const ast = parse('42');
      expect(isLiteral(ast)).toBe(true);
      expect((ast as LiteralNode).value).toBe(42);
    });

    it('should parse a string literal', function stringLiteralTest() {
      const ast = parse('"hello"');
      expect(isLiteral(ast)).toBe(true);
      expect((ast as LiteralNode).value).toBe('hello');
    });

    it('should parse a boolean literal', function booleanLiteralTest() {
      const ast = parse('TRUE');
      expect(isLiteral(ast)).toBe(true);
      expect((ast as LiteralNode).value).toBe(true);
    });

    it('should parse a variable reference', function variableRefTest() {
      const ast = parse('@score');
      expect(isVariableRef(ast)).toBe(true);
      expect((ast as VariableRefNode).name).toBe('score');
    });
  });

  describe('Binary operations', function binaryOpTests() {
    it('should parse addition', function additionTest() {
      const ast = parse('@a + @b');
      expect(isBinaryOp(ast)).toBe(true);
      expect((ast as BinaryOpNode).operator).toBe('+');
    });

    it('should parse complex expression', function complexExprTest() {
      const ast = parse('@a + @b * @c - @d');
      expect(isBinaryOp(ast)).toBe(true);
    });

    it('should parse comparison', function comparisonTest() {
      const ast = parse('@x > 10');
      expect(isBinaryOp(ast)).toBe(true);
      expect((ast as BinaryOpNode).operator).toBe('>');
    });
  });

  describe('Function calls', function functionCallTests() {
    it('should parse function with no arguments', function noArgsTest() {
      const ast = parse('NOW()');
      expect(isFunctionCall(ast)).toBe(true);
      expect((ast as FunctionCallNode).name).toBe('NOW');
    });

    it('should parse function with arguments', function withArgsTest() {
      const ast = parse('AVG(@score)');
      expect(isFunctionCall(ast)).toBe(true);
      expect((ast as FunctionCallNode).name).toBe('AVG');
      expect((ast as FunctionCallNode).args).toHaveLength(1);
    });

    it('should parse nested function calls', function nestedFuncTest() {
      const ast = parse('IF(@x > 0, @x, ABS(@x))');
      expect(isFunctionCall(ast)).toBe(true);
    });
  });

  describe('Parenthesized expressions', function parenTests() {
    it('should parse parenthesized expression', function parenTest() {
      const ast = parse('(@a + @b) * @c');
      expect(isBinaryOp(ast)).toBe(true);
      expect((ast as BinaryOpNode).operator).toBe('*');
    });
  });

  describe('Multi-line formulas', function multiLineTests() {
    it('should parse formula with newlines', function newlineTest() {
      const formula = `@a
        + @b
        + @c`;
      const ast = parse(formula);
      expect(isBinaryOp(ast)).toBe(true);
    });
  });
});

// =============================================================================
// Error handling tests
// =============================================================================

describe('Parser: Error Handling', function errorHandlingTests() {
  describe('Empty input', function emptyInputTests() {
    it('should throw for empty string', function emptyStringTest() {
      const error = expectSyntaxError('');
      expect(error.code).toBe('UNEXPECTED_END');
      expect(error.message).toContain('Empty formula');
    });

    it('should throw for whitespace only', function whitespaceOnlyTest() {
      const error = expectSyntaxError('   ');
      expect(error.code).toBe('UNEXPECTED_END');
    });

    it('should throw for tabs and newlines only', function tabsNewlinesTest() {
      const error = expectSyntaxError('\t\n  \t');
      expect(error.code).toBe('UNEXPECTED_END');
    });
  });

  describe('Missing parenthesis', function missingParenTests() {
    it('should throw for unclosed parenthesis', function unclosedParenTest() {
      const error = expectSyntaxError('(@a + @b');
      expect(error.position).toBeDefined();
      expect(error.position!.start).toBeGreaterThanOrEqual(0);
    });

    it('should throw for unclosed function call', function unclosedFuncTest() {
      const error = expectSyntaxError('AVG(@x');
      expect(error.position).toBeDefined();
    });

    it('should throw for extra closing parenthesis', function extraCloseParenTest() {
      const error = expectSyntaxError('@a + @b)');
      expect(error.position).toBeDefined();
    });
  });

  describe('Missing operand', function missingOperandTests() {
    it('should throw for trailing operator', function trailingOpTest() {
      const error = expectSyntaxError('@a +');
      expect(error.position).toBeDefined();
    });

    it('should throw for leading operator', function leadingOpTest() {
      const error = expectSyntaxError('* @a');
      expect(error.position).toBeDefined();
    });

    it('should throw for double multiplicative operator', function doubleOpTest() {
      // Note: @a + + @b is valid (unary plus), but * * is not (no unary *)
      const error = expectSyntaxError('@a * * @b');
      expect(error.position).toBeDefined();
    });
  });

  describe('Unclosed strings', function unclosedStringTests() {
    it('should throw for unclosed double-quoted string', function unclosedDoubleQuoteTest() {
      const error = expectSyntaxError('"hello');
      expect(error.position).toBeDefined();
    });

    it('should throw for unclosed single-quoted string', function unclosedSingleQuoteTest() {
      const error = expectSyntaxError("'hello");
      expect(error.position).toBeDefined();
    });
  });

  describe('Invalid characters', function invalidCharTests() {
    it('should throw for hash character', function hashCharTest() {
      const error = expectSyntaxError('@a # @b');
      expect(error.position).toBeDefined();
    });

    it('should throw for dollar sign', function dollarSignTest() {
      const error = expectSyntaxError('@a $ @b');
      expect(error.position).toBeDefined();
    });
  });
});

// =============================================================================
// Error position tests
// =============================================================================

describe('Parser: Error Positions', function errorPositionTests() {
  it('should have start and end offsets', function startEndOffsetsTest() {
    // Note: @a + + @b is actually valid (unary plus on @b), use * * instead
    const error = expectSyntaxError('@a * * @b');
    expect(error.position).toBeDefined();
    expect(typeof error.position!.start).toBe('number');
    expect(typeof error.position!.end).toBe('number');
    expect(error.position!.start).toBeLessThanOrEqual(error.position!.end);
  });

  it('should have position at start for empty input', function emptyInputPosTest() {
    const error = expectSyntaxError('');
    expect(error.position).toBeDefined();
    expect(error.position!.start).toBe(0);
  });

  it('should have position near the error location', function errorLocationTest() {
    // Note: @a + + @b is valid (unary plus), use * * instead
    const error = expectSyntaxError('@a * * @b');
    expect(error.position).toBeDefined();
    // The error should be somewhere around position 5
    expect(error.position!.start).toBeGreaterThanOrEqual(0);
    expect(error.position!.start).toBeLessThan(10);
  });
});

// =============================================================================
// Error message tests
// =============================================================================

describe('Parser: Error Messages', function errorMessageTests() {
  it('should have a descriptive message', function descriptiveMessageTest() {
    const error = expectSyntaxError('@a +');
    expect(error.message.length).toBeGreaterThan(0);
    expect(typeof error.message).toBe('string');
  });

  it('should include expected info when available', function expectedInfoTest() {
    const error = expectSyntaxError('');
    // Empty input should mention expecting an expression
    expect(error.expected).toBeDefined();
    expect(error.expected).toBe('expression');
  });

  it('should include found info when available', function foundInfoTest() {
    const error = expectSyntaxError('');
    expect(error.found).toBeDefined();
    expect(error.found).toBe('EOF');
  });

  it('should have error code', function errorCodeTest() {
    const error = expectSyntaxError('@a +');
    expect(error.code).toBeDefined();
    expect(typeof error.code).toBe('string');
  });
});

// =============================================================================
// tryParse tests
// =============================================================================

describe('Parser: tryParse', function tryParseTests() {
  it('should return success for valid formula', function successTest() {
    const result = tryParse('@a + @b');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.ast).toBeDefined();
      expect(isBinaryOp(result.ast)).toBe(true);
    }
  });

  it('should return failure for invalid formula', function failureTest() {
    // Note: @a + + @b is valid (unary plus), use * * instead
    const result = tryParse('@a * * @b');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBeInstanceOf(FormulaSyntaxError);
      expect(result.error.message.length).toBeGreaterThan(0);
    }
  });

  it('should return failure for empty input', function emptyInputTest() {
    const result = tryParse('');
    expect(result.success).toBe(false);
  });
});

// =============================================================================
// isValidSyntax tests
// =============================================================================

describe('Parser: isValidSyntax', function isValidSyntaxTests() {
  it('should return true for valid formulas', function validTest() {
    expect(isValidSyntax('@a + @b')).toBe(true);
    expect(isValidSyntax('42')).toBe(true);
    expect(isValidSyntax('"hello"')).toBe(true);
    expect(isValidSyntax('AVG(@score)')).toBe(true);
    // Note: @a + + @b is valid (unary plus on @b)
    expect(isValidSyntax('@a + +@b')).toBe(true);
  });

  it('should return false for invalid formulas', function invalidTest() {
    expect(isValidSyntax('')).toBe(false);
    // Note: @a + + @b is valid (unary plus), use * * instead
    expect(isValidSyntax('@a * * @b')).toBe(false);
    expect(isValidSyntax('(@a + @b')).toBe(false);
    expect(isValidSyntax('"unclosed')).toBe(false);
  });
});

// =============================================================================
// Parser statefulness tests
// =============================================================================

describe('Parser: Statelessness', function statelessnessTests() {
  it('should be reusable for multiple valid formulas', function multipleValidTest() {
    const ast1 = parse('@a + @b');
    const ast2 = parse('@c * @d');
    const ast3 = parse('SUM(@x)');

    expect(isBinaryOp(ast1)).toBe(true);
    expect(isBinaryOp(ast2)).toBe(true);
    expect(isFunctionCall(ast3)).toBe(true);
  });

  it('should be reusable after errors', function reusableAfterErrorTest() {
    // First, cause an error
    expect(function causeError() {
      parse('@a +');
    }).toThrow(FormulaSyntaxError);

    // Then, parse valid formula - should work fine
    const ast = parse('@a + @b');
    expect(isBinaryOp(ast)).toBe(true);
  });

  it('should produce consistent results', function consistentResultsTest() {
    const formula = '@a + @b * @c';

    const ast1 = parse(formula);
    const ast2 = parse(formula);

    // Should produce identical ASTs
    expect(ast1.type).toBe(ast2.type);
    expect((ast1 as BinaryOpNode).operator).toBe((ast2 as BinaryOpNode).operator);
  });
});

// =============================================================================
// FormulaSyntaxError properties tests
// =============================================================================

describe('Parser: FormulaSyntaxError Properties', function errorPropertiesTests() {
  it('should be instanceof FormulaSyntaxError', function instanceOfTest() {
    try {
      parse('@a +');
    } catch (error) {
      expect(error).toBeInstanceOf(FormulaSyntaxError);
      expect(error).toBeInstanceOf(Error);
    }
  });

  it('should have name property set', function namePropertyTest() {
    const error = expectSyntaxError('@a +');
    expect(error.name).toBe('FormulaSyntaxError');
  });

  it('should have all required properties', function requiredPropertiesTest() {
    const error = expectSyntaxError('@a +');

    // From Error
    expect(typeof error.message).toBe('string');
    expect(typeof error.name).toBe('string');

    // From FormulaError
    expect(typeof error.code).toBe('string');
    expect(error.position).toBeDefined();

    // From FormulaSyntaxError (may be undefined but should be present)
    expect('expected' in error).toBe(true);
    expect('found' in error).toBe(true);
  });

  it('should have correct error code types', function errorCodeTypesTest() {
    const validCodes = [
      'UNEXPECTED_TOKEN',
      'MISSING_PARENTHESIS',
      'INVALID_LITERAL',
      'UNEXPECTED_END',
      'INVALID_EXPRESSION',
    ];

    const error = expectSyntaxError('@a +');
    expect(validCodes).toContain(error.code);
  });
});

// =============================================================================
// Edge case tests
// =============================================================================

describe('Parser: Edge Cases', function edgeCaseTests() {
  it('should handle very long formulas', function longFormulaTest() {
    const formula = Array.from({ length: 100 }, function createVar(_, i) {
      return `@var${i}`;
    }).join(' + ');

    const ast = parse(formula);
    expect(isBinaryOp(ast)).toBe(true);
  });

  it('should handle deeply nested parentheses', function deepNestingTest() {
    const formula = '(((((@a + @b)))))';
    const ast = parse(formula);
    expect(isBinaryOp(ast)).toBe(true);
  });

  it('should handle deeply nested function calls', function deepFuncNestingTest() {
    const formula = 'F1(F2(F3(F4(@x))))';
    const ast = parse(formula);
    expect(isFunctionCall(ast)).toBe(true);
  });

  it('should handle variable with dots', function varWithDotsTest() {
    const ast = parse('@result_data.minimized_affinity');
    expect(isVariableRef(ast)).toBe(true);
    expect((ast as VariableRefNode).name).toBe('result_data.minimized_affinity');
  });

  it('should handle escaped characters in strings', function escapedCharsTest() {
    const ast = parse('"hello\\nworld"');
    expect(isLiteral(ast)).toBe(true);
    expect((ast as LiteralNode).value).toBe('hello\nworld');
  });

  it('should handle scientific notation', function scientificNotationTest() {
    const ast = parse('1.5e-10');
    expect(isLiteral(ast)).toBe(true);
    expect((ast as LiteralNode).value).toBe(1.5e-10);
  });
});
