/**
 * Chevrotain token definitions for the FormulaQ language.
 *
 * This module defines all lexer tokens used to tokenize formula strings.
 * Tokens are organized by category: operators, comparison, punctuation,
 * literals, keywords, and identifiers.
 *
 * @module
 */

import { createToken, Lexer, type IToken, type TokenType } from 'chevrotain';

// =============================================================================
// Whitespace (Skipped)
// =============================================================================

/**
 * Whitespace token (spaces, tabs, newlines).
 * These are skipped during lexing and not included in the token stream.
 */
export const WhiteSpace = createToken({
  name: 'WhiteSpace',
  pattern: /\s+/,
  group: Lexer.SKIPPED,
});

// =============================================================================
// Comparison Operators (Multi-character first, then single-character)
// =============================================================================

/**
 * Less than or equal operator (<=).
 */
export const LessThanOrEqual = createToken({
  name: 'LessThanOrEqual',
  pattern: /<=/,
});

/**
 * Greater than or equal operator (>=).
 */
export const GreaterThanOrEqual = createToken({
  name: 'GreaterThanOrEqual',
  pattern: />=/,
});

/**
 * Equal operator (==).
 */
export const Equal = createToken({
  name: 'Equal',
  pattern: /==/,
});

/**
 * Not equal operator (!=).
 */
export const NotEqual = createToken({
  name: 'NotEqual',
  pattern: /!=/,
});

/**
 * Not equal operator (alternate syntax: <>).
 */
export const NotEqualAlt = createToken({
  name: 'NotEqualAlt',
  pattern: /<>/,
});

/**
 * Less than operator (<).
 * Must come after <=, <> in token definitions for correct matching.
 */
export const LessThan = createToken({
  name: 'LessThan',
  pattern: /</,
});

/**
 * Greater than operator (>).
 * Must come after >= in token definitions for correct matching.
 */
export const GreaterThan = createToken({
  name: 'GreaterThan',
  pattern: />/,
});

// =============================================================================
// Arithmetic Operators
// =============================================================================

/**
 * Addition operator (+).
 */
export const Plus = createToken({
  name: 'Plus',
  pattern: /\+/,
});

/**
 * Subtraction/negation operator (-).
 */
export const Minus = createToken({
  name: 'Minus',
  pattern: /-/,
});

/**
 * Multiplication operator (*).
 */
export const Multiply = createToken({
  name: 'Multiply',
  pattern: /\*/,
});

/**
 * Division operator (/).
 */
export const Divide = createToken({
  name: 'Divide',
  pattern: /\//,
});

/**
 * Modulo operator (%).
 */
export const Modulo = createToken({
  name: 'Modulo',
  pattern: /%/,
});

/**
 * Exponentiation operator (^).
 */
export const Power = createToken({
  name: 'Power',
  pattern: /\^/,
});

/**
 * String concatenation operator (&).
 */
export const Ampersand = createToken({
  name: 'Ampersand',
  pattern: /&/,
});

// =============================================================================
// Punctuation
// =============================================================================

/**
 * Left parenthesis for grouping and function calls.
 */
export const LeftParen = createToken({
  name: 'LeftParen',
  pattern: /\(/,
});

/**
 * Right parenthesis for grouping and function calls.
 */
export const RightParen = createToken({
  name: 'RightParen',
  pattern: /\)/,
});

/**
 * Comma for separating function arguments.
 */
export const Comma = createToken({
  name: 'Comma',
  pattern: /,/,
});

// =============================================================================
// Keywords (Boolean literals - case insensitive)
// =============================================================================

/**
 * Boolean TRUE literal.
 * Case-insensitive matching (TRUE, true, True, etc.).
 */
export const True = createToken({
  name: 'True',
  pattern: /TRUE/i,
});

/**
 * Boolean FALSE literal.
 * Case-insensitive matching (FALSE, false, False, etc.).
 */
export const False = createToken({
  name: 'False',
  pattern: /FALSE/i,
});

// =============================================================================
// Literals
// =============================================================================

/**
 * Numeric literal.
 *
 * Supports:
 * - Integers: 42, 0
 * - Decimals: 3.14, .5
 * - Scientific notation: 1.5e10, 1.5e-10, 1.5E+10
 *
 * Note: The sign (- or +) is handled separately as a unary operator.
 */
export const NumberLiteral = createToken({
  name: 'NumberLiteral',
  pattern: /(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/,
});

/**
 * Double-quoted string literal.
 *
 * Supports escape sequences:
 * - \\" for double quote
 * - \\\\ for backslash
 * - \\n for newline
 * - \\t for tab
 *
 * Pattern explanation:
 * - Starts with "
 * - Contains any character except " and \, or
 * - Contains escape sequences (\\. matches any escaped character)
 * - Ends with "
 */
export const StringLiteral = createToken({
  name: 'StringLiteral',
  pattern: /"(?:[^"\\]|\\.)*"/,
});

/**
 * Single-quoted string literal.
 *
 * Supports escape sequences:
 * - \\' for single quote
 * - \\\\ for backslash
 * - \\n for newline
 * - \\t for tab
 */
export const SingleQuoteStringLiteral = createToken({
  name: 'SingleQuoteStringLiteral',
  pattern: /'(?:[^'\\]|\\.)*'/,
});

// =============================================================================
// Identifiers (Variable References and Function Names)
// =============================================================================

/**
 * Variable reference with @ prefix.
 *
 * Format: @identifier
 * - Starts with @ followed by a letter or underscore
 * - Followed by letters, digits, underscores, or periods
 * - Periods are part of the identifier (not property access)
 *
 * Examples: @score, @result_data.minimized_affinity, @mol_structure
 */
export const VariableRef = createToken({
  name: 'VariableRef',
  pattern: /@[a-zA-Z_][a-zA-Z0-9_.]*|@[a-zA-Z_]/,
});

/**
 * Function name identifier.
 *
 * Format: identifier
 * - Starts with a letter (function names are case-sensitive)
 * - Followed by letters, digits, or underscores
 *
 * Examples: AVG, SUM, IF, POWER, my_function
 *
 * Note: This token must come after keyword tokens (TRUE, FALSE) in the
 * token list to ensure keywords are matched first.
 */
export const Identifier = createToken({
  name: 'Identifier',
  pattern: /[a-zA-Z][a-zA-Z0-9_]*/,
});

// =============================================================================
// Token List (Order Matters!)
// =============================================================================

/**
 * All tokens in the order they should be matched.
 *
 * Order is critical for correct lexing:
 * 1. Whitespace (skipped first)
 * 2. Multi-character operators before single-character (<=, >= before <, >)
 * 3. Keywords before identifiers (TRUE, FALSE before Identifier)
 * 4. Longer patterns before shorter ones
 */
export const allTokens: TokenType[] = [
  // Whitespace (skipped)
  WhiteSpace,

  // Multi-character comparison operators (must come before single-char)
  LessThanOrEqual,
  GreaterThanOrEqual,
  NotEqualAlt, // <>
  Equal, // ==
  NotEqual, // !=

  // Single-character comparison operators
  LessThan,
  GreaterThan,

  // Arithmetic operators
  Plus,
  Minus,
  Multiply,
  Divide,
  Modulo,
  Power,
  Ampersand,

  // Punctuation
  LeftParen,
  RightParen,
  Comma,

  // Keywords (must come before Identifier)
  True,
  False,

  // Literals
  NumberLiteral,
  StringLiteral,
  SingleQuoteStringLiteral,

  // Identifiers (must come last among alphanumeric tokens)
  VariableRef,
  Identifier,
];

// =============================================================================
// Lexer Instance
// =============================================================================

/**
 * The FormulaQ lexer instance.
 *
 * Use this to tokenize formula strings:
 *
 * @example
 * ```typescript
 * const result = FormulaLexer.tokenize('@x + 1');
 * if (result.errors.length > 0) {
 *   console.error('Lexer errors:', result.errors);
 * } else {
 *   console.log('Tokens:', result.tokens);
 * }
 * ```
 */
export const FormulaLexer = new Lexer(allTokens);

/**
 * Result type for tokenization.
 */
export interface TokenizeResult {
  /**
   * The successfully parsed tokens.
   */
  readonly tokens: IToken[];

  /**
   * Any errors encountered during tokenization.
   */
  readonly errors: readonly LexerError[];
}

/**
 * Information about a lexer error.
 */
export interface LexerError {
  /**
   * The character offset where the error occurred.
   */
  readonly offset: number;

  /**
   * The line number (1-based) where the error occurred.
   */
  readonly line: number;

  /**
   * The column number (1-based) where the error occurred.
   */
  readonly column: number;

  /**
   * The length of the unrecognized text.
   */
  readonly length: number;

  /**
   * Error message describing what went wrong.
   */
  readonly message: string;
}

/**
 * Tokenize a formula string into tokens.
 *
 * This is the main entry point for lexical analysis. It takes a formula
 * string and returns the tokens along with any lexer errors.
 *
 * @param formulaText - The formula string to tokenize
 * @returns The tokenization result with tokens and errors
 *
 * @example
 * ```typescript
 * const result = tokenize('@x + @y * 2');
 * if (result.errors.length === 0) {
 *   // Process tokens
 *   for (const token of result.tokens) {
 *     console.log(token.tokenType.name, token.image);
 *   }
 * }
 * ```
 */
export function tokenize(formulaText: string): TokenizeResult {
  const lexResult = FormulaLexer.tokenize(formulaText);

  const errors: LexerError[] = lexResult.errors.map(function mapError(error) {
    return {
      offset: error.offset,
      line: error.line ?? 1,
      column: error.column ?? 1,
      length: error.length,
      message: error.message,
    };
  });

  return {
    tokens: lexResult.tokens,
    errors,
  };
}

/**
 * Parses a string literal token image and returns the actual string value.
 *
 * Handles escape sequences:
 * - \\" -> "
 * - \\' -> '
 * - \\\\ -> \\
 * - \\n -> newline
 * - \\t -> tab
 *
 * @param tokenImage - The raw token image including quotes
 * @returns The parsed string value without quotes
 *
 * @example
 * ```typescript
 * parseStringLiteral('"hello"') // returns 'hello'
 * parseStringLiteral('"hello\\nworld"') // returns 'hello\nworld'
 * parseStringLiteral("'it\\'s'") // returns "it's"
 * ```
 */
export function parseStringLiteral(tokenImage: string): string {
  // Remove surrounding quotes
  const inner = tokenImage.slice(1, -1);

  // Process escape sequences
  let result = '';
  let i = 0;

  while (i < inner.length) {
    const char = inner[i];

    if (char === '\\' && i + 1 < inner.length) {
      const nextChar = inner[i + 1];

      switch (nextChar) {
        case 'n':
          result += '\n';
          i += 2;
          break;
        case 't':
          result += '\t';
          i += 2;
          break;
        case '\\':
          result += '\\';
          i += 2;
          break;
        case '"':
          result += '"';
          i += 2;
          break;
        case "'":
          result += "'";
          i += 2;
          break;
        default:
          // Unknown escape sequence, keep as-is
          result += char;
          i += 1;
          break;
      }
    } else {
      result += char;
      i += 1;
    }
  }

  return result;
}

/**
 * Parses a number literal token image and returns the numeric value.
 *
 * Handles:
 * - Integers: 42
 * - Decimals: 3.14, .5
 * - Scientific notation: 1.5e10, 1.5e-10
 *
 * @param tokenImage - The raw token image
 * @returns The parsed numeric value
 *
 * @example
 * ```typescript
 * parseNumberLiteral('42') // returns 42
 * parseNumberLiteral('3.14') // returns 3.14
 * parseNumberLiteral('1.5e-10') // returns 1.5e-10
 * ```
 */
export function parseNumberLiteral(tokenImage: string): number {
  return Number(tokenImage);
}

/**
 * Extracts the variable name from a VariableRef token image.
 *
 * @param tokenImage - The raw token image including the @ prefix
 * @returns The variable name without the @ prefix
 *
 * @example
 * ```typescript
 * parseVariableRef('@score') // returns 'score'
 * parseVariableRef('@result_data.affinity') // returns 'result_data.affinity'
 * ```
 */
export function parseVariableRef(tokenImage: string): string {
  // Remove the @ prefix
  return tokenImage.slice(1);
}
