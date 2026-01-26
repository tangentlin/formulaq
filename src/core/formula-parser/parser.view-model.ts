/**
 * Pure error formatting logic for the Parser.
 *
 * This module contains pure functions for transforming Chevrotain parse errors
 * into user-friendly error messages with position information.
 *
 * @module
 */

import type { ErrorPosition, SyntaxErrorCode } from '../types/errors.ts';

/**
 * Raw error information from the parser.
 */
export interface RawParseError {
  /**
   * The raw error message from Chevrotain.
   */
  readonly message: string;

  /**
   * The starting character offset (0-based).
   */
  readonly startOffset: number;

  /**
   * The ending character offset (0-based).
   */
  readonly endOffset: number;

  /**
   * The line number (1-based).
   */
  readonly line: number;

  /**
   * The column number (1-based).
   */
  readonly column: number;

  /**
   * The token that caused the error (if available).
   */
  readonly tokenImage?: string | undefined;

  /**
   * The token type name (if available).
   */
  readonly tokenType?: string | undefined;
}

/**
 * Formatted error information for display to users.
 */
export interface FormattedParseError {
  /**
   * User-friendly error message.
   */
  readonly message: string;

  /**
   * Machine-readable error code.
   */
  readonly code: SyntaxErrorCode;

  /**
   * Position information for the error.
   */
  readonly position: ErrorPosition;

  /**
   * What the parser expected (if determinable).
   */
  readonly expected?: string | undefined;

  /**
   * What the parser actually found.
   */
  readonly found?: string | undefined;
}

/**
 * Maps token type names to user-friendly descriptions.
 */
const TOKEN_DESCRIPTIONS: Readonly<Record<string, string>> = {
  NumberLiteral: 'number',
  StringLiteral: 'string',
  SingleQuoteStringLiteral: 'string',
  VariableRef: 'variable reference',
  Identifier: 'function name',
  True: 'boolean',
  False: 'boolean',
  Plus: "'+'",
  Minus: "'-'",
  Multiply: "'*'",
  Divide: "'/'",
  Modulo: "'%'",
  Power: "'^'",
  Ampersand: "'&'",
  LeftParen: "'('",
  RightParen: "')'",
  Comma: "','",
  Equal: "'=='",
  NotEqual: "'!='",
  NotEqualAlt: "'<>'",
  LessThan: "'<'",
  GreaterThan: "'>'",
  LessThanOrEqual: "'<='",
  GreaterThanOrEqual: "'>='",
};

/**
 * Gets a user-friendly description for a token type name.
 *
 * @param tokenType - The Chevrotain token type name
 * @returns A human-readable description of the token
 */
export function getTokenDescription(tokenType: string): string {
  const description = TOKEN_DESCRIPTIONS[tokenType];
  if (description) {
    return description;
  }
  return tokenType;
}

/**
 * Determines the error code based on the error message pattern.
 *
 * @param message - The raw error message from Chevrotain
 * @param tokenImage - The token image that caused the error (if available)
 * @returns The appropriate SyntaxErrorCode
 */
export function determineErrorCode(message: string, tokenImage?: string): SyntaxErrorCode {
  const lowerMessage = message.toLowerCase();

  // Check for unexpected end of input
  if (
    lowerMessage.includes('end of input') ||
    tokenImage === '' ||
    lowerMessage.includes('unexpected end')
  ) {
    return 'UNEXPECTED_END';
  }

  // Check for missing parenthesis
  if (
    lowerMessage.includes('rightparen') ||
    lowerMessage.includes('leftparen') ||
    lowerMessage.includes(')')
  ) {
    return 'MISSING_PARENTHESIS';
  }

  // Check for invalid literal patterns
  if (lowerMessage.includes('literal') || lowerMessage.includes('invalid number')) {
    return 'INVALID_LITERAL';
  }

  // Check for invalid expression patterns
  if (
    lowerMessage.includes('expression') ||
    lowerMessage.includes('operand') ||
    lowerMessage.includes('missing operand')
  ) {
    return 'INVALID_EXPRESSION';
  }

  // Default to unexpected token
  return 'UNEXPECTED_TOKEN';
}

/**
 * Extracts expected tokens from a Chevrotain error message.
 *
 * Chevrotain error messages often contain patterns like:
 * "Expecting: one of these possible Token sequences..."
 * or "...but found: 'xyz'"
 *
 * @param message - The raw error message from Chevrotain
 * @returns The expected tokens as a readable string, or undefined
 */
export function extractExpectedFromMessage(message: string): string | undefined {
  // Pattern: "Expecting: ..." or "expecting ..."
  const expectingMatch = message.match(/[Ee]xpecting[:\s]+(.+?)(?:\s+but|\s*$)/);
  if (expectingMatch) {
    return cleanExpectedString(expectingMatch[1]!);
  }

  // Pattern: "one of these possible Token sequences"
  if (message.includes('one of these possible')) {
    const tokenMatch = message.match(/\[([^\]]+)\]/);
    if (tokenMatch) {
      return cleanExpectedString(tokenMatch[1]!);
    }
  }

  return undefined;
}

/**
 * Cleans up an expected string extracted from error messages.
 *
 * @param expected - The raw expected string
 * @returns A cleaned up version suitable for display
 */
function cleanExpectedString(expected: string): string {
  // Replace token type names with descriptions
  let result = expected;

  for (const tokenType of Object.keys(TOKEN_DESCRIPTIONS)) {
    const regex = new RegExp(`\\b${tokenType}\\b`, 'g');
    const description = TOKEN_DESCRIPTIONS[tokenType]!;
    result = result.replace(regex, description);
  }

  // Clean up common patterns
  result = result
    .replace(/\s*,\s*/g, ', ')
    .replace(/\s+/g, ' ')
    .trim();

  return result;
}

/**
 * Creates a user-friendly error message.
 *
 * @param code - The error code
 * @param expected - What was expected (if known)
 * @param found - What was actually found
 * @returns A formatted error message
 */
export function createErrorMessage(
  code: SyntaxErrorCode,
  expected: string | undefined,
  found: string | undefined,
): string {
  switch (code) {
    case 'UNEXPECTED_END':
      if (expected) {
        return `Unexpected end of input: expected ${expected}`;
      }
      return 'Unexpected end of input';

    case 'MISSING_PARENTHESIS':
      if (found === 'EOF' || found === '') {
        return "Missing closing parenthesis: expected ')' but found end of input";
      }
      if (expected && found) {
        return `Missing parenthesis: expected ${expected} but found ${found}`;
      }
      return 'Missing parenthesis';

    case 'INVALID_LITERAL':
      if (found) {
        return `Invalid literal format: '${found}'`;
      }
      return 'Invalid literal format';

    case 'INVALID_EXPRESSION':
      if (expected && found) {
        return `Invalid expression: expected ${expected} but found ${found}`;
      }
      if (found) {
        return `Invalid expression near '${found}'`;
      }
      return 'Invalid expression';

    case 'UNEXPECTED_TOKEN':
    default:
      if (expected && found) {
        return `Unexpected token: expected ${expected} but found ${found}`;
      }
      if (found) {
        return `Unexpected token: '${found}'`;
      }
      if (expected) {
        return `Unexpected token: expected ${expected}`;
      }
      return 'Unexpected token';
  }
}

/**
 * Formats a token image for display.
 *
 * Handles special cases like EOF and truncates long strings.
 *
 * @param tokenImage - The raw token image
 * @returns A formatted string suitable for error messages
 */
export function formatTokenForDisplay(tokenImage: string | undefined): string {
  if (tokenImage === undefined || tokenImage === '') {
    return 'EOF';
  }

  // Truncate long tokens
  const maxLength = 20;
  if (tokenImage.length > maxLength) {
    return `'${tokenImage.slice(0, maxLength)}...'`;
  }

  return `'${tokenImage}'`;
}

/**
 * Formats a raw parse error into a user-friendly format.
 *
 * This is the main function for transforming Chevrotain errors into
 * FormulaSyntaxError-compatible information.
 *
 * @param rawError - The raw error from the parser
 * @returns A formatted error ready for creating FormulaSyntaxError
 */
export function formatParseError(rawError: RawParseError): FormattedParseError {
  const found = formatTokenForDisplay(rawError.tokenImage);
  const expected = extractExpectedFromMessage(rawError.message);
  const code = determineErrorCode(rawError.message, rawError.tokenImage);

  const message = createErrorMessage(code, expected, found);

  const position: ErrorPosition = {
    start: rawError.startOffset,
    end: rawError.endOffset,
  };

  return {
    message,
    code,
    position,
    expected,
    found,
  };
}

/**
 * Creates error information for empty input.
 *
 * @returns A formatted error for empty input
 */
export function createEmptyInputError(): FormattedParseError {
  return {
    message: 'Empty formula: expected an expression',
    code: 'UNEXPECTED_END',
    position: {
      start: 0,
      end: 0,
    },
    expected: 'expression',
    found: 'EOF',
  };
}

/**
 * Creates error information for a lexer error (unrecognized character).
 *
 * @param offset - The character offset where the error occurred
 * @param character - The unrecognized character
 * @param _line - The line number (1-based) - reserved for future use
 * @param _column - The column number (1-based) - reserved for future use
 * @returns A formatted error for the lexer error
 */
export function createLexerError(
  offset: number,
  character: string,
  _line: number,
  _column: number,
): FormattedParseError {
  return {
    message: `Unexpected character: '${character}'`,
    code: 'UNEXPECTED_TOKEN',
    position: {
      start: offset,
      end: offset + 1,
    },
    expected: undefined,
    found: `'${character}'`,
  };
}
