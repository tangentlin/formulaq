/**
 * Tests for the FormulaQ grammar parser.
 *
 * These tests verify:
 * - All operators with correct precedence
 * - Right-associative exponentiation
 * - Unary operators
 * - Function calls with arbitrary arguments
 * - Variable references with @ prefix
 * - Parentheses for grouping
 * - Multi-line formulas
 * - Error handling
 *
 * @module
 */

import { describe, expect, it } from 'vitest';

import type {
  ASTNode,
  BinaryOpNode,
  FunctionCallNode,
  LiteralNode,
  UnaryOpNode,
  VariableRefNode,
} from '../types/ast.ts';
import { parseFormula } from './grammar.ts';

// =============================================================================
// Helper functions
// =============================================================================

/**
 * Parses a formula and asserts it succeeds, returning the AST.
 */
function parseSuccess(formula: string): ASTNode {
  const result = parseFormula(formula);
  expect(result.errors, `Expected no errors for: ${formula}`).toHaveLength(0);
  expect(result.ast, `Expected AST for: ${formula}`).toBeDefined();
  return result.ast!;
}

/**
 * Parses a formula and asserts it fails.
 */
function parseError(formula: string): void {
  const result = parseFormula(formula);
  expect(result.errors.length, `Expected errors for: ${formula}`).toBeGreaterThan(0);
}

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
 * Type guard for UnaryOpNode.
 */
function isUnaryOp(node: ASTNode): node is UnaryOpNode {
  return node.type === 'UnaryOp';
}

/**
 * Type guard for FunctionCallNode.
 */
function isFunctionCall(node: ASTNode): node is FunctionCallNode {
  return node.type === 'FunctionCall';
}

// =============================================================================
// Literal parsing tests
// =============================================================================

describe('Grammar: Literals', function literalTests() {
  describe('Number literals', function numberLiteralTests() {
    it('should parse integer literals', function integerLiteralTest() {
      const ast = parseSuccess('42');
      expect(isLiteral(ast)).toBe(true);
      expect((ast as LiteralNode).valueType).toBe('number.float');
      expect((ast as LiteralNode).value).toBe(42);
    });

    it('should parse decimal literals', function decimalLiteralTest() {
      const ast = parseSuccess('3.14159');
      expect(isLiteral(ast)).toBe(true);
      expect((ast as LiteralNode).value).toBe(3.14159);
    });

    it('should parse leading dot decimals', function leadingDotTest() {
      const ast = parseSuccess('.5');
      expect(isLiteral(ast)).toBe(true);
      expect((ast as LiteralNode).value).toBe(0.5);
    });

    it('should parse scientific notation', function scientificNotationTest() {
      const ast = parseSuccess('1.5e10');
      expect(isLiteral(ast)).toBe(true);
      expect((ast as LiteralNode).value).toBe(1.5e10);
    });

    it('should parse negative exponent scientific notation', function negativeExponentTest() {
      const ast = parseSuccess('1.5e-10');
      expect(isLiteral(ast)).toBe(true);
      expect((ast as LiteralNode).value).toBe(1.5e-10);
    });

    it('should parse zero', function zeroTest() {
      const ast = parseSuccess('0');
      expect(isLiteral(ast)).toBe(true);
      expect((ast as LiteralNode).value).toBe(0);
    });
  });

  describe('String literals', function stringLiteralTests() {
    it('should parse double-quoted strings', function doubleQuoteTest() {
      const ast = parseSuccess('"hello"');
      expect(isLiteral(ast)).toBe(true);
      expect((ast as LiteralNode).valueType).toBe('string.text');
      expect((ast as LiteralNode).value).toBe('hello');
    });

    it('should parse single-quoted strings', function singleQuoteTest() {
      const ast = parseSuccess("'world'");
      expect(isLiteral(ast)).toBe(true);
      expect((ast as LiteralNode).value).toBe('world');
    });

    it('should parse escaped characters', function escapedCharsTest() {
      const ast = parseSuccess('"hello\\nworld"');
      expect(isLiteral(ast)).toBe(true);
      expect((ast as LiteralNode).value).toBe('hello\nworld');
    });

    it('should parse escaped quotes', function escapedQuotesTest() {
      const ast = parseSuccess('"say \\"hello\\""');
      expect(isLiteral(ast)).toBe(true);
      expect((ast as LiteralNode).value).toBe('say "hello"');
    });

    it('should parse empty strings', function emptyStringTest() {
      const ast = parseSuccess('""');
      expect(isLiteral(ast)).toBe(true);
      expect((ast as LiteralNode).value).toBe('');
    });
  });

  describe('Boolean literals', function booleanLiteralTests() {
    it('should parse TRUE', function trueTest() {
      const ast = parseSuccess('TRUE');
      expect(isLiteral(ast)).toBe(true);
      expect((ast as LiteralNode).valueType).toBe('boolean.boolean');
      expect((ast as LiteralNode).value).toBe(true);
    });

    it('should parse FALSE', function falseTest() {
      const ast = parseSuccess('FALSE');
      expect(isLiteral(ast)).toBe(true);
      expect((ast as LiteralNode).value).toBe(false);
    });

    it('should parse case-insensitive true', function caseTrueTest() {
      const ast = parseSuccess('true');
      expect(isLiteral(ast)).toBe(true);
      expect((ast as LiteralNode).value).toBe(true);
    });

    it('should parse case-insensitive false', function caseFalseTest() {
      const ast = parseSuccess('False');
      expect(isLiteral(ast)).toBe(true);
      expect((ast as LiteralNode).value).toBe(false);
    });
  });
});

// =============================================================================
// Variable reference tests
// =============================================================================

describe('Grammar: Variable References', function variableRefTests() {
  it('should parse simple variable reference', function simpleVarTest() {
    const ast = parseSuccess('@score');
    expect(isVariableRef(ast)).toBe(true);
    expect((ast as VariableRefNode).name).toBe('score');
  });

  it('should parse variable with underscores', function underscoreVarTest() {
    const ast = parseSuccess('@total_score');
    expect(isVariableRef(ast)).toBe(true);
    expect((ast as VariableRefNode).name).toBe('total_score');
  });

  it('should parse variable with numbers', function numberVarTest() {
    const ast = parseSuccess('@value2');
    expect(isVariableRef(ast)).toBe(true);
    expect((ast as VariableRefNode).name).toBe('value2');
  });

  it('should parse variable with dots', function dotVarTest() {
    const ast = parseSuccess('@result_data.minimized_affinity');
    expect(isVariableRef(ast)).toBe(true);
    expect((ast as VariableRefNode).name).toBe('result_data.minimized_affinity');
  });

  it('should have source location', function locationTest() {
    const ast = parseSuccess('@x');
    expect(ast.location).toBeDefined();
    expect(ast.location!.start).toBe(0);
    expect(ast.location!.end).toBe(2);
  });
});

// =============================================================================
// Operator precedence tests
// =============================================================================

describe('Grammar: Operator Precedence', function precedenceTests() {
  it('should give multiplication higher precedence than addition', function multAddTest() {
    // @a + @b * @c should parse as @a + (@b * @c)
    const ast = parseSuccess('@a + @b * @c');
    expect(isBinaryOp(ast)).toBe(true);
    expect((ast as BinaryOpNode).operator).toBe('+');

    const right = (ast as BinaryOpNode).right;
    expect(isBinaryOp(right)).toBe(true);
    expect((right as BinaryOpNode).operator).toBe('*');
  });

  it('should give division higher precedence than subtraction', function divSubTest() {
    // @a - @b / @c should parse as @a - (@b / @c)
    const ast = parseSuccess('@a - @b / @c');
    expect(isBinaryOp(ast)).toBe(true);
    expect((ast as BinaryOpNode).operator).toBe('-');

    const right = (ast as BinaryOpNode).right;
    expect(isBinaryOp(right)).toBe(true);
    expect((right as BinaryOpNode).operator).toBe('/');
  });

  it('should give exponentiation higher precedence than multiplication', function expMultTest() {
    // @a * @b ^ @c should parse as @a * (@b ^ @c)
    const ast = parseSuccess('@a * @b ^ @c');
    expect(isBinaryOp(ast)).toBe(true);
    expect((ast as BinaryOpNode).operator).toBe('*');

    const right = (ast as BinaryOpNode).right;
    expect(isBinaryOp(right)).toBe(true);
    expect((right as BinaryOpNode).operator).toBe('^');
  });

  it('should give unary minus higher precedence than exponentiation', function unaryExpTest() {
    // -@x ^ 2 should parse as (-@x) ^ 2
    const ast = parseSuccess('-@x ^ 2');
    expect(isBinaryOp(ast)).toBe(true);
    expect((ast as BinaryOpNode).operator).toBe('^');

    const left = (ast as BinaryOpNode).left;
    expect(isUnaryOp(left)).toBe(true);
    expect((left as UnaryOpNode).operator).toBe('-');
  });

  it('should give multiplication higher precedence than concatenation', function multConcatTest() {
    // "a" & @x * @y should not parse correctly since * has higher precedence
    // But & is lower, so: "a" & (@x * @y)
    const ast = parseSuccess('"a" & @x * @y');
    expect(isBinaryOp(ast)).toBe(true);
    expect((ast as BinaryOpNode).operator).toBe('&');
  });

  it('should give concatenation higher precedence than comparison', function concatCompareTest() {
    // @a & @b == @c should parse as (@a & @b) == @c
    const ast = parseSuccess('@a & @b == @c');
    expect(isBinaryOp(ast)).toBe(true);
    expect((ast as BinaryOpNode).operator).toBe('==');

    const left = (ast as BinaryOpNode).left;
    expect(isBinaryOp(left)).toBe(true);
    expect((left as BinaryOpNode).operator).toBe('&');
  });

  it('should handle modulo at same precedence as multiplication', function moduloTest() {
    // @a + @b % @c should parse as @a + (@b % @c)
    const ast = parseSuccess('@a + @b % @c');
    expect(isBinaryOp(ast)).toBe(true);
    expect((ast as BinaryOpNode).operator).toBe('+');

    const right = (ast as BinaryOpNode).right;
    expect(isBinaryOp(right)).toBe(true);
    expect((right as BinaryOpNode).operator).toBe('%');
  });
});

// =============================================================================
// Associativity tests
// =============================================================================

describe('Grammar: Operator Associativity', function associativityTests() {
  describe('Left-associative operators', function leftAssocTests() {
    it('should parse addition left-to-right', function addLeftTest() {
      // @a + @b + @c should parse as (@a + @b) + @c
      const ast = parseSuccess('@a + @b + @c');
      expect(isBinaryOp(ast)).toBe(true);
      expect((ast as BinaryOpNode).operator).toBe('+');

      const left = (ast as BinaryOpNode).left;
      expect(isBinaryOp(left)).toBe(true);
      expect((left as BinaryOpNode).operator).toBe('+');

      // Inner left should be @a
      expect(isVariableRef((left as BinaryOpNode).left)).toBe(true);
      expect(((left as BinaryOpNode).left as VariableRefNode).name).toBe('a');
    });

    it('should parse subtraction left-to-right', function subLeftTest() {
      // @a - @b - @c should parse as (@a - @b) - @c
      const ast = parseSuccess('@a - @b - @c');
      expect(isBinaryOp(ast)).toBe(true);

      const left = (ast as BinaryOpNode).left;
      expect(isBinaryOp(left)).toBe(true);
    });

    it('should parse mixed additive left-to-right', function mixedAddTest() {
      // @a + @b - @c + @d should parse as ((@a + @b) - @c) + @d
      const ast = parseSuccess('@a + @b - @c + @d');
      expect(isBinaryOp(ast)).toBe(true);
      expect((ast as BinaryOpNode).operator).toBe('+');

      // Right should be @d
      expect(isVariableRef((ast as BinaryOpNode).right)).toBe(true);
    });

    it('should parse multiplication left-to-right', function multLeftTest() {
      // @a * @b * @c should parse as (@a * @b) * @c
      const ast = parseSuccess('@a * @b * @c');
      expect(isBinaryOp(ast)).toBe(true);
      expect((ast as BinaryOpNode).operator).toBe('*');

      const left = (ast as BinaryOpNode).left;
      expect(isBinaryOp(left)).toBe(true);
    });

    it('should parse concatenation left-to-right', function concatLeftTest() {
      // @a & @b & @c should parse as (@a & @b) & @c
      const ast = parseSuccess('@a & @b & @c');
      expect(isBinaryOp(ast)).toBe(true);
      expect((ast as BinaryOpNode).operator).toBe('&');

      const left = (ast as BinaryOpNode).left;
      expect(isBinaryOp(left)).toBe(true);
      expect((left as BinaryOpNode).operator).toBe('&');
    });
  });

  describe('Right-associative exponentiation', function rightAssocTests() {
    it('should parse exponentiation right-to-left', function expRightTest() {
      // 2 ^ 3 ^ 4 should parse as 2 ^ (3 ^ 4)
      const ast = parseSuccess('2 ^ 3 ^ 4');
      expect(isBinaryOp(ast)).toBe(true);
      expect((ast as BinaryOpNode).operator).toBe('^');

      // Left should be literal 2
      const left = (ast as BinaryOpNode).left;
      expect(isLiteral(left)).toBe(true);
      expect((left as LiteralNode).value).toBe(2);

      // Right should be 3 ^ 4
      const right = (ast as BinaryOpNode).right;
      expect(isBinaryOp(right)).toBe(true);
      expect((right as BinaryOpNode).operator).toBe('^');

      // Inner left should be 3
      expect(isLiteral((right as BinaryOpNode).left)).toBe(true);
      expect(((right as BinaryOpNode).left as LiteralNode).value).toBe(3);
    });

    it('should parse triple exponentiation right-to-left', function tripleExpTest() {
      // 2 ^ 3 ^ 4 ^ 5 should parse as 2 ^ (3 ^ (4 ^ 5))
      const ast = parseSuccess('2 ^ 3 ^ 4 ^ 5');
      expect(isBinaryOp(ast)).toBe(true);

      // Left should be 2
      expect(isLiteral((ast as BinaryOpNode).left)).toBe(true);
      expect(((ast as BinaryOpNode).left as LiteralNode).value).toBe(2);

      // Right should be 3 ^ (4 ^ 5)
      const right = (ast as BinaryOpNode).right;
      expect(isBinaryOp(right)).toBe(true);
      expect(isLiteral((right as BinaryOpNode).left)).toBe(true);
      expect(((right as BinaryOpNode).left as LiteralNode).value).toBe(3);
    });
  });
});

// =============================================================================
// Unary operator tests
// =============================================================================

describe('Grammar: Unary Operators', function unaryTests() {
  it('should parse unary minus', function unaryMinusTest() {
    const ast = parseSuccess('-@x');
    expect(isUnaryOp(ast)).toBe(true);
    expect((ast as UnaryOpNode).operator).toBe('-');
    expect(isVariableRef((ast as UnaryOpNode).operand)).toBe(true);
  });

  it('should parse unary plus', function unaryPlusTest() {
    const ast = parseSuccess('+@x');
    expect(isUnaryOp(ast)).toBe(true);
    expect((ast as UnaryOpNode).operator).toBe('+');
  });

  it('should parse double unary minus', function doubleUnaryTest() {
    // --@x should parse as -(-@x)
    const ast = parseSuccess('--@x');
    expect(isUnaryOp(ast)).toBe(true);
    expect((ast as UnaryOpNode).operator).toBe('-');

    const inner = (ast as UnaryOpNode).operand;
    expect(isUnaryOp(inner)).toBe(true);
    expect((inner as UnaryOpNode).operator).toBe('-');
  });

  it('should parse unary minus on number', function unaryNumTest() {
    const ast = parseSuccess('-42');
    expect(isUnaryOp(ast)).toBe(true);
    expect((ast as UnaryOpNode).operator).toBe('-');

    const operand = (ast as UnaryOpNode).operand;
    expect(isLiteral(operand)).toBe(true);
    expect((operand as LiteralNode).value).toBe(42);
  });

  it('should parse unary in expression context', function unaryExprTest() {
    // @a + -@b should parse as @a + (-@b)
    const ast = parseSuccess('@a + -@b');
    expect(isBinaryOp(ast)).toBe(true);
    expect((ast as BinaryOpNode).operator).toBe('+');

    const right = (ast as BinaryOpNode).right;
    expect(isUnaryOp(right)).toBe(true);
    expect((right as UnaryOpNode).operator).toBe('-');
  });
});

// =============================================================================
// Comparison operator tests
// =============================================================================

describe('Grammar: Comparison Operators', function comparisonTests() {
  it('should parse == operator', function equalTest() {
    const ast = parseSuccess('@a == @b');
    expect(isBinaryOp(ast)).toBe(true);
    expect((ast as BinaryOpNode).operator).toBe('==');
  });

  it('should parse != operator', function notEqualTest() {
    const ast = parseSuccess('@a != @b');
    expect(isBinaryOp(ast)).toBe(true);
    expect((ast as BinaryOpNode).operator).toBe('!=');
  });

  it('should parse <> operator', function notEqualAltTest() {
    const ast = parseSuccess('@a <> @b');
    expect(isBinaryOp(ast)).toBe(true);
    expect((ast as BinaryOpNode).operator).toBe('<>');
  });

  it('should parse < operator', function lessThanTest() {
    const ast = parseSuccess('@a < @b');
    expect(isBinaryOp(ast)).toBe(true);
    expect((ast as BinaryOpNode).operator).toBe('<');
  });

  it('should parse > operator', function greaterThanTest() {
    const ast = parseSuccess('@a > @b');
    expect(isBinaryOp(ast)).toBe(true);
    expect((ast as BinaryOpNode).operator).toBe('>');
  });

  it('should parse <= operator', function lessThanOrEqualTest() {
    const ast = parseSuccess('@a <= @b');
    expect(isBinaryOp(ast)).toBe(true);
    expect((ast as BinaryOpNode).operator).toBe('<=');
  });

  it('should parse >= operator', function greaterThanOrEqualTest() {
    const ast = parseSuccess('@a >= @b');
    expect(isBinaryOp(ast)).toBe(true);
    expect((ast as BinaryOpNode).operator).toBe('>=');
  });

  it('should chain comparison operators', function chainedCompareTest() {
    // @a < @b < @c parses left-to-right as (@a < @b) < @c
    const ast = parseSuccess('@a < @b < @c');
    expect(isBinaryOp(ast)).toBe(true);
    expect((ast as BinaryOpNode).operator).toBe('<');

    const left = (ast as BinaryOpNode).left;
    expect(isBinaryOp(left)).toBe(true);
    expect((left as BinaryOpNode).operator).toBe('<');
  });
});

// =============================================================================
// Function call tests
// =============================================================================

describe('Grammar: Function Calls', function functionCallTests() {
  it('should parse function with no arguments', function noArgsTest() {
    const ast = parseSuccess('NOW()');
    expect(isFunctionCall(ast)).toBe(true);
    expect((ast as FunctionCallNode).name).toBe('NOW');
    expect((ast as FunctionCallNode).args).toHaveLength(0);
  });

  it('should parse function with one argument', function oneArgTest() {
    const ast = parseSuccess('AVG(@score)');
    expect(isFunctionCall(ast)).toBe(true);
    expect((ast as FunctionCallNode).name).toBe('AVG');
    expect((ast as FunctionCallNode).args).toHaveLength(1);

    const arg = (ast as FunctionCallNode).args[0]!;
    expect(isVariableRef(arg)).toBe(true);
    expect((arg as VariableRefNode).name).toBe('score');
  });

  it('should parse function with multiple arguments', function multiArgTest() {
    const ast = parseSuccess('IF(@x > 0, @x, 0)');
    expect(isFunctionCall(ast)).toBe(true);
    expect((ast as FunctionCallNode).name).toBe('IF');
    expect((ast as FunctionCallNode).args).toHaveLength(3);
  });

  it('should parse nested function calls', function nestedFuncTest() {
    const ast = parseSuccess('POWER(LOG(@x), 2)');
    expect(isFunctionCall(ast)).toBe(true);
    expect((ast as FunctionCallNode).name).toBe('POWER');
    expect((ast as FunctionCallNode).args).toHaveLength(2);

    const firstArg = (ast as FunctionCallNode).args[0]!;
    expect(isFunctionCall(firstArg)).toBe(true);
    expect((firstArg as FunctionCallNode).name).toBe('LOG');
  });

  it('should parse function with expression arguments', function exprArgTest() {
    const ast = parseSuccess('MAX(@a + @b, @c * @d)');
    expect(isFunctionCall(ast)).toBe(true);
    expect((ast as FunctionCallNode).args).toHaveLength(2);

    const firstArg = (ast as FunctionCallNode).args[0]!;
    expect(isBinaryOp(firstArg)).toBe(true);
  });

  it('should preserve function name case', function casePreserveTest() {
    const ast = parseSuccess('MyFunction(@x)');
    expect(isFunctionCall(ast)).toBe(true);
    expect((ast as FunctionCallNode).name).toBe('MyFunction');
  });

  it('should have correct location for function call', function funcLocationTest() {
    const ast = parseSuccess('SUM(@x)');
    expect(ast.location).toBeDefined();
    expect(ast.location!.start).toBe(0);
    expect(ast.location!.end).toBe(7);
  });
});

// =============================================================================
// Parentheses tests
// =============================================================================

describe('Grammar: Parentheses', function parenTests() {
  it('should override precedence with parentheses', function overridePrecTest() {
    // (@a + @b) * @c should keep addition first
    const ast = parseSuccess('(@a + @b) * @c');
    expect(isBinaryOp(ast)).toBe(true);
    expect((ast as BinaryOpNode).operator).toBe('*');

    const left = (ast as BinaryOpNode).left;
    expect(isBinaryOp(left)).toBe(true);
    expect((left as BinaryOpNode).operator).toBe('+');
  });

  it('should handle nested parentheses', function nestedParenTest() {
    const ast = parseSuccess('((@a + @b))');
    expect(isBinaryOp(ast)).toBe(true);
    expect((ast as BinaryOpNode).operator).toBe('+');
  });

  it('should handle parentheses with unary', function parenUnaryTest() {
    const ast = parseSuccess('-(@a + @b)');
    expect(isUnaryOp(ast)).toBe(true);

    const operand = (ast as UnaryOpNode).operand;
    expect(isBinaryOp(operand)).toBe(true);
    expect((operand as BinaryOpNode).operator).toBe('+');
  });

  it('should handle empty parentheses in function context', function emptyParenTest() {
    const ast = parseSuccess('NOW()');
    expect(isFunctionCall(ast)).toBe(true);
    expect((ast as FunctionCallNode).args).toHaveLength(0);
  });

  it('should update location to include parentheses', function parenLocationTest() {
    const ast = parseSuccess('(@x)');
    expect(ast.location).toBeDefined();
    expect(ast.location!.start).toBe(0);
    expect(ast.location!.end).toBe(4);
  });
});

// =============================================================================
// Multi-line formula tests
// =============================================================================

describe('Grammar: Multi-line Formulas', function multiLineTests() {
  it('should parse formula with newlines', function newlineTest() {
    const formula = `@a
    + @b
    + @c`;
    const ast = parseSuccess(formula);
    expect(isBinaryOp(ast)).toBe(true);
    expect((ast as BinaryOpNode).operator).toBe('+');
  });

  it('should parse formula with tabs and spaces', function whitespaceTest() {
    const formula = '@a\t+\t@b   +   @c';
    const ast = parseSuccess(formula);
    expect(isBinaryOp(ast)).toBe(true);
  });

  it('should parse complex multi-line formula', function complexMultiLineTest() {
    const formula = `IF(
      @score > 90,
      "A",
      IF(
        @score > 80,
        "B",
        "C"
      )
    )`;
    const ast = parseSuccess(formula);
    expect(isFunctionCall(ast)).toBe(true);
    expect((ast as FunctionCallNode).name).toBe('IF');
  });
});

// =============================================================================
// Complex expression tests
// =============================================================================

describe('Grammar: Complex Expressions', function complexTests() {
  it('should parse complex arithmetic expression', function complexArithTest() {
    const ast = parseSuccess('@a + @b * @c - @d / @e % @f ^ @g');
    expect(isBinaryOp(ast)).toBe(true);
  });

  it('should parse aggregation with arithmetic', function aggArithTest() {
    const ast = parseSuccess('AVG(@score) * 100 + 50');
    expect(isBinaryOp(ast)).toBe(true);
    expect((ast as BinaryOpNode).operator).toBe('+');

    const left = (ast as BinaryOpNode).left;
    expect(isBinaryOp(left)).toBe(true);
    expect((left as BinaryOpNode).operator).toBe('*');

    const funcCall = (left as BinaryOpNode).left;
    expect(isFunctionCall(funcCall)).toBe(true);
  });

  it('should parse conditional expression', function conditionalTest() {
    const ast = parseSuccess('IF(@x > 0, @x * 2, @x / 2)');
    expect(isFunctionCall(ast)).toBe(true);
    expect((ast as FunctionCallNode).args).toHaveLength(3);
  });

  it('should parse string concatenation with functions', function strConcatFuncTest() {
    const ast = parseSuccess('"Result: " & CONCAT(@a, @b)');
    expect(isBinaryOp(ast)).toBe(true);
    expect((ast as BinaryOpNode).operator).toBe('&');
  });

  it('should parse deeply nested expression', function deepNestTest() {
    const ast = parseSuccess('(((@a + @b) * @c) - @d)');
    expect(isBinaryOp(ast)).toBe(true);
    expect((ast as BinaryOpNode).operator).toBe('-');
  });
});

// =============================================================================
// Error handling tests
// =============================================================================

describe('Grammar: Error Handling', function errorTests() {
  it('should fail on empty input', function emptyInputTest() {
    parseError('');
  });

  it('should fail on mismatched parentheses', function mismatchedParenTest() {
    parseError('(@a + @b');
    parseError('@a + @b)');
    parseError('((@a + @b)');
  });

  it('should fail on missing operator', function missingOpTest() {
    parseError('@a @b');
  });

  it('should fail on missing operand', function missingOperandTest() {
    parseError('@a +');
    parseError('+ @a +');
  });

  it('should fail on incomplete function call', function incompleteFuncTest() {
    parseError('AVG(');
    parseError('AVG(@x');
  });

  it('should fail on invalid token', function invalidTokenTest() {
    parseError('@a # @b');
    parseError('@a $ @b');
  });

  it('should fail on unclosed string', function unclosedStringTest() {
    parseError('"hello');
    parseError("'world");
  });
});

// =============================================================================
// Source location tests
// =============================================================================

describe('Grammar: Source Locations', function locationTests() {
  it('should have location for number literal', function numLocationTest() {
    const ast = parseSuccess('42');
    expect(ast.location).toEqual({ start: 0, end: 2 });
  });

  it('should have location for string literal', function strLocationTest() {
    const ast = parseSuccess('"hello"');
    expect(ast.location).toEqual({ start: 0, end: 7 });
  });

  it('should have location for variable reference', function varLocationTest() {
    const ast = parseSuccess('@score');
    expect(ast.location).toEqual({ start: 0, end: 6 });
  });

  it('should have location for binary expression', function binLocationTest() {
    const ast = parseSuccess('@a + @b');
    expect(ast.location).toBeDefined();
    expect(ast.location!.start).toBe(0);
    expect(ast.location!.end).toBe(7);
  });

  it('should have location for function call', function funcCallLocationTest() {
    const ast = parseSuccess('AVG(@x)');
    expect(ast.location).toBeDefined();
    expect(ast.location!.start).toBe(0);
    expect(ast.location!.end).toBe(7);
  });
});
