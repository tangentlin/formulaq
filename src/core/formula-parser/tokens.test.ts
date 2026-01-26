/**
 * Tests for the FormulaQ lexer token definitions.
 *
 * These tests verify that the lexer correctly tokenizes all formula constructs
 * including operators, literals, variable references, and function names.
 *
 * @module
 */

import { describe, it, expect } from 'vitest';
import {
  tokenize,
  parseStringLiteral,
  parseNumberLiteral,
  parseVariableRef,
  // Token types for assertions
  Plus,
  Minus,
  Multiply,
  Divide,
  Modulo,
  Power,
  Ampersand,
  Equal,
  NotEqual,
  NotEqualAlt,
  LessThan,
  GreaterThan,
  LessThanOrEqual,
  GreaterThanOrEqual,
  LeftParen,
  RightParen,
  Comma,
  NumberLiteral,
  StringLiteral,
  SingleQuoteStringLiteral,
  True,
  False,
  VariableRef,
  Identifier,
} from './tokens.ts';

describe('FormulaQ Lexer', function () {
  describe('Arithmetic Operators', function () {
    it('should tokenize plus operator', function () {
      const result = tokenize('+');
      expect(result.errors).toHaveLength(0);
      expect(result.tokens).toHaveLength(1);
      expect(result.tokens[0]!.tokenType).toBe(Plus);
      expect(result.tokens[0]!.image).toBe('+');
    });

    it('should tokenize minus operator', function () {
      const result = tokenize('-');
      expect(result.errors).toHaveLength(0);
      expect(result.tokens).toHaveLength(1);
      expect(result.tokens[0]!.tokenType).toBe(Minus);
      expect(result.tokens[0]!.image).toBe('-');
    });

    it('should tokenize multiply operator', function () {
      const result = tokenize('*');
      expect(result.errors).toHaveLength(0);
      expect(result.tokens).toHaveLength(1);
      expect(result.tokens[0]!.tokenType).toBe(Multiply);
      expect(result.tokens[0]!.image).toBe('*');
    });

    it('should tokenize divide operator', function () {
      const result = tokenize('/');
      expect(result.errors).toHaveLength(0);
      expect(result.tokens).toHaveLength(1);
      expect(result.tokens[0]!.tokenType).toBe(Divide);
      expect(result.tokens[0]!.image).toBe('/');
    });

    it('should tokenize modulo operator', function () {
      const result = tokenize('%');
      expect(result.errors).toHaveLength(0);
      expect(result.tokens).toHaveLength(1);
      expect(result.tokens[0]!.tokenType).toBe(Modulo);
      expect(result.tokens[0]!.image).toBe('%');
    });

    it('should tokenize power operator', function () {
      const result = tokenize('^');
      expect(result.errors).toHaveLength(0);
      expect(result.tokens).toHaveLength(1);
      expect(result.tokens[0]!.tokenType).toBe(Power);
      expect(result.tokens[0]!.image).toBe('^');
    });

    it('should tokenize ampersand (string concat) operator', function () {
      const result = tokenize('&');
      expect(result.errors).toHaveLength(0);
      expect(result.tokens).toHaveLength(1);
      expect(result.tokens[0]!.tokenType).toBe(Ampersand);
      expect(result.tokens[0]!.image).toBe('&');
    });
  });

  describe('Comparison Operators', function () {
    it('should tokenize equal operator', function () {
      const result = tokenize('==');
      expect(result.errors).toHaveLength(0);
      expect(result.tokens).toHaveLength(1);
      expect(result.tokens[0]!.tokenType).toBe(Equal);
      expect(result.tokens[0]!.image).toBe('==');
    });

    it('should tokenize not equal operator', function () {
      const result = tokenize('!=');
      expect(result.errors).toHaveLength(0);
      expect(result.tokens).toHaveLength(1);
      expect(result.tokens[0]!.tokenType).toBe(NotEqual);
      expect(result.tokens[0]!.image).toBe('!=');
    });

    it('should tokenize alternate not equal operator', function () {
      const result = tokenize('<>');
      expect(result.errors).toHaveLength(0);
      expect(result.tokens).toHaveLength(1);
      expect(result.tokens[0]!.tokenType).toBe(NotEqualAlt);
      expect(result.tokens[0]!.image).toBe('<>');
    });

    it('should tokenize less than operator', function () {
      const result = tokenize('<');
      expect(result.errors).toHaveLength(0);
      expect(result.tokens).toHaveLength(1);
      expect(result.tokens[0]!.tokenType).toBe(LessThan);
      expect(result.tokens[0]!.image).toBe('<');
    });

    it('should tokenize greater than operator', function () {
      const result = tokenize('>');
      expect(result.errors).toHaveLength(0);
      expect(result.tokens).toHaveLength(1);
      expect(result.tokens[0]!.tokenType).toBe(GreaterThan);
      expect(result.tokens[0]!.image).toBe('>');
    });

    it('should tokenize less than or equal operator', function () {
      const result = tokenize('<=');
      expect(result.errors).toHaveLength(0);
      expect(result.tokens).toHaveLength(1);
      expect(result.tokens[0]!.tokenType).toBe(LessThanOrEqual);
      expect(result.tokens[0]!.image).toBe('<=');
    });

    it('should tokenize greater than or equal operator', function () {
      const result = tokenize('>=');
      expect(result.errors).toHaveLength(0);
      expect(result.tokens).toHaveLength(1);
      expect(result.tokens[0]!.tokenType).toBe(GreaterThanOrEqual);
      expect(result.tokens[0]!.image).toBe('>=');
    });
  });

  describe('Punctuation', function () {
    it('should tokenize left parenthesis', function () {
      const result = tokenize('(');
      expect(result.errors).toHaveLength(0);
      expect(result.tokens).toHaveLength(1);
      expect(result.tokens[0]!.tokenType).toBe(LeftParen);
      expect(result.tokens[0]!.image).toBe('(');
    });

    it('should tokenize right parenthesis', function () {
      const result = tokenize(')');
      expect(result.errors).toHaveLength(0);
      expect(result.tokens).toHaveLength(1);
      expect(result.tokens[0]!.tokenType).toBe(RightParen);
      expect(result.tokens[0]!.image).toBe(')');
    });

    it('should tokenize comma', function () {
      const result = tokenize(',');
      expect(result.errors).toHaveLength(0);
      expect(result.tokens).toHaveLength(1);
      expect(result.tokens[0]!.tokenType).toBe(Comma);
      expect(result.tokens[0]!.image).toBe(',');
    });
  });

  describe('Number Literals', function () {
    it('should tokenize integer', function () {
      const result = tokenize('42');
      expect(result.errors).toHaveLength(0);
      expect(result.tokens).toHaveLength(1);
      expect(result.tokens[0]!.tokenType).toBe(NumberLiteral);
      expect(result.tokens[0]!.image).toBe('42');
    });

    it('should tokenize zero', function () {
      const result = tokenize('0');
      expect(result.errors).toHaveLength(0);
      expect(result.tokens).toHaveLength(1);
      expect(result.tokens[0]!.tokenType).toBe(NumberLiteral);
      expect(result.tokens[0]!.image).toBe('0');
    });

    it('should tokenize decimal number', function () {
      const result = tokenize('3.14159');
      expect(result.errors).toHaveLength(0);
      expect(result.tokens).toHaveLength(1);
      expect(result.tokens[0]!.tokenType).toBe(NumberLiteral);
      expect(result.tokens[0]!.image).toBe('3.14159');
    });

    it('should tokenize decimal starting with dot', function () {
      const result = tokenize('.5');
      expect(result.errors).toHaveLength(0);
      expect(result.tokens).toHaveLength(1);
      expect(result.tokens[0]!.tokenType).toBe(NumberLiteral);
      expect(result.tokens[0]!.image).toBe('.5');
    });

    it('should tokenize scientific notation with positive exponent', function () {
      const result = tokenize('1.5e10');
      expect(result.errors).toHaveLength(0);
      expect(result.tokens).toHaveLength(1);
      expect(result.tokens[0]!.tokenType).toBe(NumberLiteral);
      expect(result.tokens[0]!.image).toBe('1.5e10');
    });

    it('should tokenize scientific notation with negative exponent', function () {
      const result = tokenize('1.5e-10');
      expect(result.errors).toHaveLength(0);
      expect(result.tokens).toHaveLength(1);
      expect(result.tokens[0]!.tokenType).toBe(NumberLiteral);
      expect(result.tokens[0]!.image).toBe('1.5e-10');
    });

    it('should tokenize scientific notation with explicit positive exponent', function () {
      const result = tokenize('1.5E+10');
      expect(result.errors).toHaveLength(0);
      expect(result.tokens).toHaveLength(1);
      expect(result.tokens[0]!.tokenType).toBe(NumberLiteral);
      expect(result.tokens[0]!.image).toBe('1.5E+10');
    });

    it('should tokenize integer with scientific notation', function () {
      const result = tokenize('5e3');
      expect(result.errors).toHaveLength(0);
      expect(result.tokens).toHaveLength(1);
      expect(result.tokens[0]!.tokenType).toBe(NumberLiteral);
      expect(result.tokens[0]!.image).toBe('5e3');
    });
  });

  describe('String Literals', function () {
    it('should tokenize double-quoted string', function () {
      const result = tokenize('"hello world"');
      expect(result.errors).toHaveLength(0);
      expect(result.tokens).toHaveLength(1);
      expect(result.tokens[0]!.tokenType).toBe(StringLiteral);
      expect(result.tokens[0]!.image).toBe('"hello world"');
    });

    it('should tokenize single-quoted string', function () {
      const result = tokenize("'hello world'");
      expect(result.errors).toHaveLength(0);
      expect(result.tokens).toHaveLength(1);
      expect(result.tokens[0]!.tokenType).toBe(SingleQuoteStringLiteral);
      expect(result.tokens[0]!.image).toBe("'hello world'");
    });

    it('should tokenize empty double-quoted string', function () {
      const result = tokenize('""');
      expect(result.errors).toHaveLength(0);
      expect(result.tokens).toHaveLength(1);
      expect(result.tokens[0]!.tokenType).toBe(StringLiteral);
      expect(result.tokens[0]!.image).toBe('""');
    });

    it('should tokenize empty single-quoted string', function () {
      const result = tokenize("''");
      expect(result.errors).toHaveLength(0);
      expect(result.tokens).toHaveLength(1);
      expect(result.tokens[0]!.tokenType).toBe(SingleQuoteStringLiteral);
      expect(result.tokens[0]!.image).toBe("''");
    });

    it('should tokenize string with escaped double quote', function () {
      const result = tokenize('"say \\"hello\\""');
      expect(result.errors).toHaveLength(0);
      expect(result.tokens).toHaveLength(1);
      expect(result.tokens[0]!.tokenType).toBe(StringLiteral);
      expect(result.tokens[0]!.image).toBe('"say \\"hello\\""');
    });

    it('should tokenize string with escaped single quote', function () {
      const result = tokenize("'it\\'s great'");
      expect(result.errors).toHaveLength(0);
      expect(result.tokens).toHaveLength(1);
      expect(result.tokens[0]!.tokenType).toBe(SingleQuoteStringLiteral);
      expect(result.tokens[0]!.image).toBe("'it\\'s great'");
    });

    it('should tokenize string with escaped backslash', function () {
      const result = tokenize('"path\\\\to\\\\file"');
      expect(result.errors).toHaveLength(0);
      expect(result.tokens).toHaveLength(1);
      expect(result.tokens[0]!.tokenType).toBe(StringLiteral);
      expect(result.tokens[0]!.image).toBe('"path\\\\to\\\\file"');
    });

    it('should tokenize string with escaped newline', function () {
      const result = tokenize('"line1\\nline2"');
      expect(result.errors).toHaveLength(0);
      expect(result.tokens).toHaveLength(1);
      expect(result.tokens[0]!.tokenType).toBe(StringLiteral);
      expect(result.tokens[0]!.image).toBe('"line1\\nline2"');
    });

    it('should tokenize string with escaped tab', function () {
      const result = tokenize('"col1\\tcol2"');
      expect(result.errors).toHaveLength(0);
      expect(result.tokens).toHaveLength(1);
      expect(result.tokens[0]!.tokenType).toBe(StringLiteral);
      expect(result.tokens[0]!.image).toBe('"col1\\tcol2"');
    });
  });

  describe('Boolean Literals', function () {
    it('should tokenize TRUE (uppercase)', function () {
      const result = tokenize('TRUE');
      expect(result.errors).toHaveLength(0);
      expect(result.tokens).toHaveLength(1);
      expect(result.tokens[0]!.tokenType).toBe(True);
      expect(result.tokens[0]!.image).toBe('TRUE');
    });

    it('should tokenize FALSE (uppercase)', function () {
      const result = tokenize('FALSE');
      expect(result.errors).toHaveLength(0);
      expect(result.tokens).toHaveLength(1);
      expect(result.tokens[0]!.tokenType).toBe(False);
      expect(result.tokens[0]!.image).toBe('FALSE');
    });

    it('should tokenize true (lowercase)', function () {
      const result = tokenize('true');
      expect(result.errors).toHaveLength(0);
      expect(result.tokens).toHaveLength(1);
      expect(result.tokens[0]!.tokenType).toBe(True);
      expect(result.tokens[0]!.image).toBe('true');
    });

    it('should tokenize false (lowercase)', function () {
      const result = tokenize('false');
      expect(result.errors).toHaveLength(0);
      expect(result.tokens).toHaveLength(1);
      expect(result.tokens[0]!.tokenType).toBe(False);
      expect(result.tokens[0]!.image).toBe('false');
    });

    it('should tokenize True (mixed case)', function () {
      const result = tokenize('True');
      expect(result.errors).toHaveLength(0);
      expect(result.tokens).toHaveLength(1);
      expect(result.tokens[0]!.tokenType).toBe(True);
      expect(result.tokens[0]!.image).toBe('True');
    });

    it('should tokenize False (mixed case)', function () {
      const result = tokenize('False');
      expect(result.errors).toHaveLength(0);
      expect(result.tokens).toHaveLength(1);
      expect(result.tokens[0]!.tokenType).toBe(False);
      expect(result.tokens[0]!.image).toBe('False');
    });
  });

  describe('Variable References', function () {
    it('should tokenize simple variable reference', function () {
      const result = tokenize('@score');
      expect(result.errors).toHaveLength(0);
      expect(result.tokens).toHaveLength(1);
      expect(result.tokens[0]!.tokenType).toBe(VariableRef);
      expect(result.tokens[0]!.image).toBe('@score');
    });

    it('should tokenize variable with underscores', function () {
      const result = tokenize('@result_data');
      expect(result.errors).toHaveLength(0);
      expect(result.tokens).toHaveLength(1);
      expect(result.tokens[0]!.tokenType).toBe(VariableRef);
      expect(result.tokens[0]!.image).toBe('@result_data');
    });

    it('should tokenize variable with dots (nested path)', function () {
      const result = tokenize('@result_data.minimized_affinity');
      expect(result.errors).toHaveLength(0);
      expect(result.tokens).toHaveLength(1);
      expect(result.tokens[0]!.tokenType).toBe(VariableRef);
      expect(result.tokens[0]!.image).toBe('@result_data.minimized_affinity');
    });

    it('should tokenize variable starting with underscore', function () {
      const result = tokenize('@_private');
      expect(result.errors).toHaveLength(0);
      expect(result.tokens).toHaveLength(1);
      expect(result.tokens[0]!.tokenType).toBe(VariableRef);
      expect(result.tokens[0]!.image).toBe('@_private');
    });

    it('should tokenize variable with digits', function () {
      const result = tokenize('@col1');
      expect(result.errors).toHaveLength(0);
      expect(result.tokens).toHaveLength(1);
      expect(result.tokens[0]!.tokenType).toBe(VariableRef);
      expect(result.tokens[0]!.image).toBe('@col1');
    });

    it('should tokenize single letter variable', function () {
      const result = tokenize('@x');
      expect(result.errors).toHaveLength(0);
      expect(result.tokens).toHaveLength(1);
      expect(result.tokens[0]!.tokenType).toBe(VariableRef);
      expect(result.tokens[0]!.image).toBe('@x');
    });
  });

  describe('Function Names (Identifiers)', function () {
    it('should tokenize function name', function () {
      const result = tokenize('AVG');
      expect(result.errors).toHaveLength(0);
      expect(result.tokens).toHaveLength(1);
      expect(result.tokens[0]!.tokenType).toBe(Identifier);
      expect(result.tokens[0]!.image).toBe('AVG');
    });

    it('should tokenize lowercase function name', function () {
      const result = tokenize('sum');
      expect(result.errors).toHaveLength(0);
      expect(result.tokens).toHaveLength(1);
      expect(result.tokens[0]!.tokenType).toBe(Identifier);
      expect(result.tokens[0]!.image).toBe('sum');
    });

    it('should tokenize function name with underscores', function () {
      const result = tokenize('my_function');
      expect(result.errors).toHaveLength(0);
      expect(result.tokens).toHaveLength(1);
      expect(result.tokens[0]!.tokenType).toBe(Identifier);
      expect(result.tokens[0]!.image).toBe('my_function');
    });

    it('should tokenize function name with digits', function () {
      const result = tokenize('LOG10');
      expect(result.errors).toHaveLength(0);
      expect(result.tokens).toHaveLength(1);
      expect(result.tokens[0]!.tokenType).toBe(Identifier);
      expect(result.tokens[0]!.image).toBe('LOG10');
    });

    it('should tokenize mixed case function name', function () {
      const result = tokenize('IfNull');
      expect(result.errors).toHaveLength(0);
      expect(result.tokens).toHaveLength(1);
      expect(result.tokens[0]!.tokenType).toBe(Identifier);
      expect(result.tokens[0]!.image).toBe('IfNull');
    });
  });

  describe('Whitespace Handling', function () {
    it('should skip single space', function () {
      const result = tokenize('@x + @y');
      expect(result.errors).toHaveLength(0);
      expect(result.tokens).toHaveLength(3);
      expect(result.tokens[0]!.tokenType).toBe(VariableRef);
      expect(result.tokens[1]!.tokenType).toBe(Plus);
      expect(result.tokens[2]!.tokenType).toBe(VariableRef);
    });

    it('should skip multiple spaces', function () {
      const result = tokenize('@x    +    @y');
      expect(result.errors).toHaveLength(0);
      expect(result.tokens).toHaveLength(3);
    });

    it('should skip tabs', function () {
      const result = tokenize('@x\t+\t@y');
      expect(result.errors).toHaveLength(0);
      expect(result.tokens).toHaveLength(3);
    });

    it('should skip newlines', function () {
      const result = tokenize('@x\n+\n@y');
      expect(result.errors).toHaveLength(0);
      expect(result.tokens).toHaveLength(3);
    });

    it('should skip mixed whitespace', function () {
      const result = tokenize('  @x  \n\t  +  \n  @y  ');
      expect(result.errors).toHaveLength(0);
      expect(result.tokens).toHaveLength(3);
    });

    it('should NOT skip whitespace inside strings', function () {
      const result = tokenize('"hello world"');
      expect(result.errors).toHaveLength(0);
      expect(result.tokens).toHaveLength(1);
      expect(result.tokens[0]!.image).toBe('"hello world"');
    });
  });

  describe('Complex Formulas', function () {
    it('should tokenize arithmetic expression', function () {
      const result = tokenize('@x + @y * 2');
      expect(result.errors).toHaveLength(0);
      expect(result.tokens).toHaveLength(5);
      expect(result.tokens[0]!.tokenType).toBe(VariableRef);
      expect(result.tokens[1]!.tokenType).toBe(Plus);
      expect(result.tokens[2]!.tokenType).toBe(VariableRef);
      expect(result.tokens[3]!.tokenType).toBe(Multiply);
      expect(result.tokens[4]!.tokenType).toBe(NumberLiteral);
    });

    it('should tokenize function call with single argument', function () {
      const result = tokenize('AVG(@score)');
      expect(result.errors).toHaveLength(0);
      expect(result.tokens).toHaveLength(4);
      expect(result.tokens[0]!.tokenType).toBe(Identifier);
      expect(result.tokens[0]!.image).toBe('AVG');
      expect(result.tokens[1]!.tokenType).toBe(LeftParen);
      expect(result.tokens[2]!.tokenType).toBe(VariableRef);
      expect(result.tokens[3]!.tokenType).toBe(RightParen);
    });

    it('should tokenize function call with multiple arguments', function () {
      const result = tokenize('IF(@x > 0, @x, 0)');
      expect(result.errors).toHaveLength(0);
      // IF, (, @x, >, 0, ,, @x, ,, 0, )
      expect(result.tokens).toHaveLength(10);
      expect(result.tokens[0]!.tokenType).toBe(Identifier);
      expect(result.tokens[0]!.image).toBe('IF');
      expect(result.tokens[5]!.tokenType).toBe(Comma);
      expect(result.tokens[7]!.tokenType).toBe(Comma);
    });

    it('should tokenize nested function calls', function () {
      const result = tokenize('MAX(AVG(@x), MIN(@y))');
      expect(result.errors).toHaveLength(0);
      expect(result.tokens).toHaveLength(12);
    });

    it('should tokenize comparison expression', function () {
      const result = tokenize('@score >= 50');
      expect(result.errors).toHaveLength(0);
      expect(result.tokens).toHaveLength(3);
      expect(result.tokens[0]!.tokenType).toBe(VariableRef);
      expect(result.tokens[1]!.tokenType).toBe(GreaterThanOrEqual);
      expect(result.tokens[2]!.tokenType).toBe(NumberLiteral);
    });

    it('should tokenize string concatenation', function () {
      const result = tokenize('@first_name & " " & @last_name');
      expect(result.errors).toHaveLength(0);
      expect(result.tokens).toHaveLength(5);
      expect(result.tokens[0]!.tokenType).toBe(VariableRef);
      expect(result.tokens[1]!.tokenType).toBe(Ampersand);
      expect(result.tokens[2]!.tokenType).toBe(StringLiteral);
      expect(result.tokens[3]!.tokenType).toBe(Ampersand);
      expect(result.tokens[4]!.tokenType).toBe(VariableRef);
    });

    it('should tokenize parenthesized expression', function () {
      const result = tokenize('(@x + @y) * 2');
      expect(result.errors).toHaveLength(0);
      expect(result.tokens).toHaveLength(7);
      expect(result.tokens[0]!.tokenType).toBe(LeftParen);
      expect(result.tokens[4]!.tokenType).toBe(RightParen);
    });

    it('should tokenize unary negation', function () {
      const result = tokenize('-@x');
      expect(result.errors).toHaveLength(0);
      expect(result.tokens).toHaveLength(2);
      expect(result.tokens[0]!.tokenType).toBe(Minus);
      expect(result.tokens[1]!.tokenType).toBe(VariableRef);
    });

    it('should tokenize exponentiation', function () {
      const result = tokenize('@x ^ 2');
      expect(result.errors).toHaveLength(0);
      expect(result.tokens).toHaveLength(3);
      expect(result.tokens[0]!.tokenType).toBe(VariableRef);
      expect(result.tokens[1]!.tokenType).toBe(Power);
      expect(result.tokens[2]!.tokenType).toBe(NumberLiteral);
    });

    it('should tokenize multi-line formula', function () {
      const formula = `IF(
        @value > 100,
        @value * 0.9,
        @value
      )`;
      const result = tokenize(formula);
      expect(result.errors).toHaveLength(0);
      // IF, (, @value, >, 100, ,, @value, *, 0.9, ,, @value, )
      expect(result.tokens).toHaveLength(12);
    });

    it('should tokenize formula with boolean literals', function () {
      const result = tokenize('IF(@active == TRUE, @x, 0)');
      expect(result.errors).toHaveLength(0);
      expect(result.tokens).toHaveLength(10);
      expect(result.tokens[4]!.tokenType).toBe(True);
    });

    it('should tokenize formula from spec example', function () {
      const result = tokenize('(@score - AVG(@score)) / 100');
      expect(result.errors).toHaveLength(0);
      // (, @score, -, AVG, (, @score, ), ), /, 100
      expect(result.tokens).toHaveLength(10);
    });
  });

  describe('Error Cases', function () {
    it('should report error for @ without identifier', function () {
      const result = tokenize('@ + @y');
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should report error for unterminated double-quoted string', function () {
      const result = tokenize('"hello');
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should report error for unterminated single-quoted string', function () {
      const result = tokenize("'hello");
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should report error for invalid character', function () {
      const result = tokenize('@x $ @y');
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });
});

describe('parseStringLiteral', function () {
  it('should parse simple double-quoted string', function () {
    expect(parseStringLiteral('"hello"')).toBe('hello');
  });

  it('should parse simple single-quoted string', function () {
    expect(parseStringLiteral("'hello'")).toBe('hello');
  });

  it('should parse empty string', function () {
    expect(parseStringLiteral('""')).toBe('');
  });

  it('should parse string with escaped double quote', function () {
    expect(parseStringLiteral('"say \\"hi\\""')).toBe('say "hi"');
  });

  it('should parse string with escaped single quote', function () {
    expect(parseStringLiteral("'it\\'s'")).toBe("it's");
  });

  it('should parse string with escaped backslash', function () {
    expect(parseStringLiteral('"path\\\\to\\\\file"')).toBe('path\\to\\file');
  });

  it('should parse string with escaped newline', function () {
    expect(parseStringLiteral('"line1\\nline2"')).toBe('line1\nline2');
  });

  it('should parse string with escaped tab', function () {
    expect(parseStringLiteral('"col1\\tcol2"')).toBe('col1\tcol2');
  });

  it('should parse string with multiple escape sequences', function () {
    expect(parseStringLiteral('"a\\nb\\tc\\\\d"')).toBe('a\nb\tc\\d');
  });

  it('should handle unknown escape sequence by keeping backslash', function () {
    expect(parseStringLiteral('"hello\\xworld"')).toBe('hello\\xworld');
  });
});

describe('parseNumberLiteral', function () {
  it('should parse integer', function () {
    expect(parseNumberLiteral('42')).toBe(42);
  });

  it('should parse zero', function () {
    expect(parseNumberLiteral('0')).toBe(0);
  });

  it('should parse decimal', function () {
    expect(parseNumberLiteral('3.14')).toBe(3.14);
  });

  it('should parse decimal starting with dot', function () {
    expect(parseNumberLiteral('.5')).toBe(0.5);
  });

  it('should parse scientific notation positive', function () {
    expect(parseNumberLiteral('1.5e10')).toBe(1.5e10);
  });

  it('should parse scientific notation negative', function () {
    expect(parseNumberLiteral('1.5e-10')).toBe(1.5e-10);
  });

  it('should parse scientific notation with explicit positive', function () {
    expect(parseNumberLiteral('1.5E+10')).toBe(1.5e10);
  });

  it('should parse integer with scientific notation', function () {
    expect(parseNumberLiteral('5e3')).toBe(5000);
  });
});

describe('parseVariableRef', function () {
  it('should extract simple variable name', function () {
    expect(parseVariableRef('@score')).toBe('score');
  });

  it('should extract variable with underscores', function () {
    expect(parseVariableRef('@result_data')).toBe('result_data');
  });

  it('should extract variable with dots', function () {
    expect(parseVariableRef('@result_data.minimized_affinity')).toBe(
      'result_data.minimized_affinity',
    );
  });

  it('should extract single letter variable', function () {
    expect(parseVariableRef('@x')).toBe('x');
  });

  it('should extract variable starting with underscore', function () {
    expect(parseVariableRef('@_private')).toBe('_private');
  });
});
