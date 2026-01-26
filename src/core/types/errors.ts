/**
 * Error types for the FormulaQ engine.
 *
 * FormulaQ uses a three-tier error system:
 * 1. SyntaxError - Detected during parsing (malformed formula)
 * 2. SemanticError - Detected during validation (type mismatches, unknown references)
 * 3. RuntimeError - Collected during evaluation (division by zero, domain errors)
 *
 * @module
 */

/**
 * Source position information for error reporting.
 *
 * Indicates where in the formula string an error occurred.
 */
export interface ErrorPosition {
  /**
   * Starting character offset (0-based, inclusive).
   */
  readonly start: number;

  /**
   * Ending character offset (0-based, exclusive).
   */
  readonly end: number;
}

/**
 * Error codes for syntax errors.
 *
 * These indicate parsing failures in the formula.
 */
export type SyntaxErrorCode =
  | 'UNEXPECTED_TOKEN'
  | 'MISSING_PARENTHESIS'
  | 'INVALID_LITERAL'
  | 'UNEXPECTED_END'
  | 'INVALID_EXPRESSION';

/**
 * Error codes for semantic errors.
 *
 * These indicate validation failures after parsing.
 */
export type SemanticErrorCode =
  | 'UNKNOWN_VARIABLE'
  | 'UNKNOWN_FUNCTION'
  | 'TYPE_MISMATCH'
  | 'ARGUMENT_COUNT_MISMATCH'
  | 'ARGUMENT_TYPE_MISMATCH'
  | 'CIRCULAR_REFERENCE'
  | 'INVALID_AGGREGATION_ARGUMENT';

/**
 * Error codes for runtime errors.
 *
 * These occur during evaluation and are collected rather than thrown.
 */
export type RuntimeErrorCode =
  | 'DIV_BY_ZERO'
  | 'DOMAIN_ERROR'
  | 'OVERFLOW'
  | 'TYPE_ERROR'
  | 'NULL_ERROR';

/**
 * Base class for all FormulaQ errors.
 *
 * Provides common properties for all error types including
 * error code and optional position information.
 *
 * @example
 * ```typescript
 * try {
 *   engine.parse('@x + + @y');
 * } catch (error) {
 *   if (error instanceof FormulaError) {
 *     console.log(`Error at position ${error.position?.start}: ${error.message}`);
 *   }
 * }
 * ```
 */
export class FormulaError extends Error {
  /**
   * Creates a new FormulaError.
   *
   * @param message - Human-readable error description
   * @param code - Machine-readable error code for programmatic handling
   * @param position - Optional source position where the error occurred
   */
  constructor(
    message: string,
    public readonly code: string,
    public readonly position?: ErrorPosition | undefined,
  ) {
    super(message);
    this.name = 'FormulaError';

    // Maintains proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Error thrown when parsing fails due to malformed formula syntax.
 *
 * Examples of syntax errors:
 * - Unexpected token: `@a + + @b`
 * - Missing parenthesis: `IF(@a > 0, @a`
 * - Invalid literal: `1.2.3`
 *
 * @example
 * ```typescript
 * try {
 *   engine.parse('@x + + @y');
 * } catch (error) {
 *   if (error instanceof FormulaSyntaxError) {
 *     console.log(`Syntax error: ${error.message}`);
 *     console.log(`Expected: ${error.expected}`);
 *     console.log(`Found: ${error.found}`);
 *   }
 * }
 * ```
 */
export class FormulaSyntaxError extends FormulaError {
  /**
   * Creates a new FormulaSyntaxError.
   *
   * @param message - Human-readable error description
   * @param code - Specific syntax error code
   * @param position - Source position where the error occurred
   * @param expected - What the parser expected to find
   * @param found - What the parser actually found
   */
  constructor(
    message: string,
    code: SyntaxErrorCode,
    position?: ErrorPosition | undefined,
    public readonly expected?: string | undefined,
    public readonly found?: string | undefined,
  ) {
    super(message, code, position);
    this.name = 'FormulaSyntaxError';

    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Error thrown when validation fails due to semantic issues.
 *
 * Examples of semantic errors:
 * - Unknown variable: `@nonexistent`
 * - Type mismatch: `"hello" + 5`
 * - Wrong argument count: `IF(@a > 0, @a)`
 * - Circular reference: formula column references itself
 *
 * @example
 * ```typescript
 * try {
 *   engine.validate(ast, variableProvider);
 * } catch (error) {
 *   if (error instanceof FormulaSemanticError) {
 *     console.log(`Semantic error: ${error.message}`);
 *     if (error.variableName) {
 *       console.log(`Variable: ${error.variableName}`);
 *     }
 *   }
 * }
 * ```
 */
export class FormulaSemanticError extends FormulaError {
  /**
   * Creates a new FormulaSemanticError.
   *
   * @param message - Human-readable error description
   * @param code - Specific semantic error code
   * @param position - Source position where the error occurred
   * @param variableName - Name of the variable involved (if applicable)
   * @param functionName - Name of the function involved (if applicable)
   */
  constructor(
    message: string,
    code: SemanticErrorCode,
    position?: ErrorPosition | undefined,
    public readonly variableName?: string | undefined,
    public readonly functionName?: string | undefined,
  ) {
    super(message, code, position);
    this.name = 'FormulaSemanticError';

    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Runtime error information collected during batch evaluation.
 *
 * Unlike syntax and semantic errors which are thrown immediately,
 * runtime errors are collected in the BatchResult to allow
 * evaluation to continue for other rows.
 *
 * @example
 * ```typescript
 * const result = await engine.evaluateBatch(ast, context);
 * for (const error of result.errors) {
 *   console.log(`Row ${error.rowIndex}: ${error.code} - ${error.message}`);
 * }
 * ```
 */
export interface FormulaRuntimeError {
  /**
   * The row index where the error occurred (0-based).
   */
  readonly rowIndex: number;

  /**
   * Machine-readable error code for programmatic handling.
   */
  readonly code: RuntimeErrorCode;

  /**
   * Human-readable error message.
   */
  readonly message: string;

  /**
   * Name of the variable involved (if applicable).
   */
  readonly variableName?: string | undefined;

  /**
   * Additional details about the error.
   *
   * May include the actual value that caused the error,
   * the operation that failed, etc.
   */
  readonly details?: Readonly<Record<string, unknown>> | undefined;
}

/**
 * Creates a runtime error for division by zero.
 *
 * @param rowIndex - The row where the error occurred
 * @param variableName - Optional variable name involved
 * @returns A FormulaRuntimeError object
 */
export function createDivByZeroError(rowIndex: number, variableName?: string): FormulaRuntimeError {
  return {
    rowIndex,
    code: 'DIV_BY_ZERO',
    message: variableName ? `Division by zero in @${variableName}` : 'Division by zero',
    variableName,
  };
}

/**
 * Creates a runtime error for math domain errors.
 *
 * Examples: LOG of negative number, square root of negative number.
 *
 * @param rowIndex - The row where the error occurred
 * @param operation - The operation that failed
 * @param value - The value that caused the error
 * @returns A FormulaRuntimeError object
 */
export function createDomainError(
  rowIndex: number,
  operation: string,
  value: unknown,
): FormulaRuntimeError {
  return {
    rowIndex,
    code: 'DOMAIN_ERROR',
    message: `${operation} is undefined for value ${String(value)}`,
    details: { operation, value },
  };
}

/**
 * Creates a runtime error for numeric overflow.
 *
 * @param rowIndex - The row where the error occurred
 * @param operation - The operation that caused the overflow
 * @returns A FormulaRuntimeError object
 */
export function createOverflowError(rowIndex: number, operation: string): FormulaRuntimeError {
  return {
    rowIndex,
    code: 'OVERFLOW',
    message: `Numeric overflow in ${operation}`,
    details: { operation },
  };
}

/**
 * Creates a runtime error for unexpected type at runtime.
 *
 * @param rowIndex - The row where the error occurred
 * @param expected - The expected type
 * @param actual - The actual type encountered
 * @returns A FormulaRuntimeError object
 */
export function createTypeError(
  rowIndex: number,
  expected: string,
  actual: string,
): FormulaRuntimeError {
  return {
    rowIndex,
    code: 'TYPE_ERROR',
    message: `Expected ${expected} but got ${actual}`,
    details: { expected, actual },
  };
}

/**
 * Creates a runtime error for null in a non-nullable context.
 *
 * @param rowIndex - The row where the error occurred
 * @param variableName - The variable that was null
 * @returns A FormulaRuntimeError object
 */
export function createNullError(rowIndex: number, variableName: string): FormulaRuntimeError {
  return {
    rowIndex,
    code: 'NULL_ERROR',
    message: `Null value encountered in @${variableName}`,
    variableName,
  };
}
