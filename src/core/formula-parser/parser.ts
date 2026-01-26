/**
 * Parser facade for the FormulaQ language.
 *
 * This module provides the main entry point for parsing formula strings.
 * It wraps the Chevrotain-based grammar parser and provides a clean API
 * that throws FormulaSyntaxError for invalid formulas.
 *
 * The parser is stateless and can be safely reused across multiple parse calls.
 *
 * @module
 */

import type { ASTNode } from '../types/ast.ts';
import { FormulaSyntaxError } from '../types/errors.ts';
import { parseFormula as parseFormulaInternal, type ParseError } from './grammar.ts';
import {
  createEmptyInputError,
  formatParseError,
  type FormattedParseError,
  type RawParseError,
} from './parser.view-model.ts';

/**
 * Options for parsing a formula.
 */
export interface ParseOptions {
  /**
   * Whether to include source location information in AST nodes.
   * Defaults to true.
   */
  readonly includeLocations?: boolean;
}

/**
 * Parses a formula string into an Abstract Syntax Tree (AST).
 *
 * This is the main entry point for parsing formulas. It takes a formula string
 * and returns the parsed AST. If the formula is invalid, it throws a
 * FormulaSyntaxError with detailed position and error information.
 *
 * The parser is stateless and can be called multiple times with different
 * formula strings.
 *
 * @param formula - The formula string to parse
 * @param options - Optional parsing options
 * @returns The parsed AST node
 * @throws FormulaSyntaxError if the formula is syntactically invalid
 *
 * @example
 * ```typescript
 * import { parse } from './parser.ts';
 *
 * // Parse a valid formula
 * const ast = parse('@x + @y * 2');
 * console.log(ast); // BinaryOpNode
 *
 * // Parse with error handling
 * try {
 *   const ast = parse('@x + + @y'); // Invalid!
 * } catch (error) {
 *   if (error instanceof FormulaSyntaxError) {
 *     console.log(`Error at position ${error.position?.start}: ${error.message}`);
 *     console.log(`Expected: ${error.expected}, Found: ${error.found}`);
 *   }
 * }
 * ```
 */
export function parse(formula: string, _options?: ParseOptions): ASTNode {
  // Handle empty input
  if (formula.trim() === '') {
    const emptyError = createEmptyInputError();
    throw createSyntaxError(emptyError);
  }

  // Parse the formula using the internal Chevrotain parser
  const result = parseFormulaInternal(formula);

  // Check for errors
  if (result.errors.length > 0) {
    const firstError = result.errors[0]!;
    const rawError = convertToRawError(firstError);
    const formattedError = formatParseError(rawError);
    throw createSyntaxError(formattedError);
  }

  // Ensure we have an AST
  if (!result.ast) {
    const unexpectedError: FormattedParseError = {
      message: 'Failed to parse formula: no AST produced',
      code: 'INVALID_EXPRESSION',
      position: { start: 0, end: formula.length },
      expected: undefined,
      found: undefined,
    };
    throw createSyntaxError(unexpectedError);
  }

  return result.ast;
}

/**
 * Attempts to parse a formula string and returns the result without throwing.
 *
 * This is useful when you want to handle parse errors without try/catch,
 * or when you need access to both the AST and any errors.
 *
 * @param formula - The formula string to parse
 * @returns An object containing either the AST or the error
 *
 * @example
 * ```typescript
 * const result = tryParse('@x + @y');
 * if (result.success) {
 *   console.log('AST:', result.ast);
 * } else {
 *   console.log('Error:', result.error.message);
 * }
 * ```
 */
export function tryParse(formula: string): ParseAttemptResult {
  try {
    const ast = parse(formula);
    return { success: true, ast };
  } catch (error) {
    if (error instanceof FormulaSyntaxError) {
      return { success: false, error };
    }
    // Re-throw unexpected errors
    throw error;
  }
}

/**
 * Result of a parse attempt using tryParse.
 */
export type ParseAttemptResult = ParseSuccess | ParseFailure;

/**
 * Successful parse result.
 */
export interface ParseSuccess {
  readonly success: true;
  readonly ast: ASTNode;
}

/**
 * Failed parse result.
 */
export interface ParseFailure {
  readonly success: false;
  readonly error: FormulaSyntaxError;
}

/**
 * Validates whether a formula string is syntactically valid.
 *
 * This is a convenience function that returns true/false without
 * throwing or returning error details.
 *
 * @param formula - The formula string to validate
 * @returns true if the formula is syntactically valid, false otherwise
 *
 * @example
 * ```typescript
 * isValidSyntax('@x + @y'); // true
 * isValidSyntax('@x + + @y'); // false
 * isValidSyntax(''); // false
 * ```
 */
export function isValidSyntax(formula: string): boolean {
  const result = tryParse(formula);
  return result.success;
}

/**
 * Converts a ParseError from the grammar module to a RawParseError.
 *
 * @param parseError - The error from the grammar parser
 * @returns A RawParseError suitable for formatting
 */
function convertToRawError(parseError: ParseError): RawParseError {
  // Handle NaN or undefined offsets (can happen with EOF tokens)
  const startOffset = Number.isFinite(parseError.startOffset) ? parseError.startOffset : 0;
  const endOffset = Number.isFinite(parseError.endOffset) ? parseError.endOffset : startOffset;

  return {
    message: parseError.message,
    startOffset,
    endOffset,
    line: parseError.line,
    column: parseError.column,
    tokenImage: parseError.token?.image,
    tokenType: parseError.token?.tokenType?.name,
  };
}

/**
 * Creates a FormulaSyntaxError from formatted error information.
 *
 * @param formattedError - The formatted error from the view model
 * @returns A FormulaSyntaxError instance
 */
function createSyntaxError(formattedError: FormattedParseError): FormulaSyntaxError {
  return new FormulaSyntaxError(
    formattedError.message,
    formattedError.code,
    formattedError.position,
    formattedError.expected,
    formattedError.found,
  );
}
