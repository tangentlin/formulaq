/**
 * Validator-specific types for semantic validation of formulas.
 *
 * These types support variable resolution, type checking, and function validation.
 *
 * @module
 */

import type { ASTNode, ValidatedAST } from '../types/ast.ts';
import type { FormulaSemanticError } from '../types/errors.ts';
import type { ValueType } from '../types/values.ts';

/**
 * Result of variable resolution.
 *
 * Contains all variable references found in the AST along with
 * any validation errors for unknown variables.
 */
export interface VariableResolutionResult {
  /**
   * Names of all variables referenced in the formula (without @ prefix).
   * These become the formula's dependencies.
   */
  readonly dependencies: readonly string[];

  /**
   * Semantic errors for unknown variable references.
   * Empty if all variables are valid.
   */
  readonly errors: readonly FormulaSemanticError[];
}

/**
 * Information about a variable reference found in the AST.
 *
 * Used during AST traversal to collect variable references.
 */
export interface VariableReference {
  /**
   * The variable name (without @ prefix).
   */
  readonly name: string;

  /**
   * Start position of the variable reference in the source.
   */
  readonly start: number;

  /**
   * End position of the variable reference in the source.
   */
  readonly end: number;
}

/**
 * Result of the full validation process.
 *
 * Contains either a validated AST or validation errors.
 */
export interface ValidationResult {
  /**
   * Whether validation was successful.
   */
  readonly success: boolean;

  /**
   * The validated AST if validation was successful.
   * Undefined if there were validation errors.
   */
  readonly ast?: ValidatedAST | undefined;

  /**
   * Validation errors if validation failed.
   * Empty array if validation was successful.
   */
  readonly errors: readonly FormulaSemanticError[];
}

/**
 * Success result from validation.
 */
export interface ValidationSuccess {
  readonly success: true;
  readonly ast: ValidatedAST;
  readonly errors: readonly [];
}

/**
 * Failure result from validation.
 */
export interface ValidationFailure {
  readonly success: false;
  readonly ast?: undefined;
  readonly errors: readonly FormulaSemanticError[];
}

/**
 * Type guard discriminated union for validation result.
 */
export type ValidationOutcome = ValidationSuccess | ValidationFailure;

/**
 * Options for validation.
 */
export interface ValidationOptions {
  /**
   * Whether to collect all errors or stop at the first error.
   * Defaults to true (collect all errors).
   */
  readonly collectAllErrors?: boolean | undefined;
}

/**
 * Context passed to validator functions.
 *
 * Contains all information needed to validate a formula.
 */
export interface ValidatorContext {
  /**
   * The root AST node to validate.
   */
  readonly ast: ASTNode;

  /**
   * Function to check if a variable exists.
   */
  readonly hasVariable: (name: string) => boolean;

  /**
   * Function to get a variable's type.
   */
  readonly getVariableType: (name: string) => ValueType | undefined;

  /**
   * Function to check if a function exists.
   */
  readonly hasFunction?: ((name: string) => boolean) | undefined;

  /**
   * Validation options.
   */
  readonly options?: ValidationOptions | undefined;
}
