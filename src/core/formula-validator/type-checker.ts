/**
 * Type checking for formula validation.
 *
 * This module provides the main API for type checking in formula ASTs.
 * It validates type compatibility for operators and infers result types.
 *
 * @module
 */

import type { ASTNode } from '../types/ast.ts';
import type { VariableProvider } from '../types/context.ts';
import { FormulaSemanticError } from '../types/errors.ts';
import type { ValueType } from '../types/values.ts';
import { inferType as inferTypePure, type TypeErrorInfo } from './type-checker.view-model.ts';

/**
 * Result of type checking.
 */
export interface TypeCheckResult {
  /**
   * The inferred result type of the expression.
   * Undefined if the type cannot be determined.
   */
  readonly resultType: ValueType | undefined;

  /**
   * Semantic errors for type mismatches.
   * Empty if all types are valid.
   */
  readonly errors: readonly FormulaSemanticError[];
}

/**
 * Infers the result type of an expression.
 *
 * This function traverses the AST, determines the type of each sub-expression,
 * and returns the overall result type. It does not validate types.
 *
 * @param ast - The parsed AST to infer the type of
 * @param variableProvider - Provider for variable type lookup
 * @returns The inferred result type, or undefined if it cannot be determined
 *
 * @example
 * ```typescript
 * const ast = parse('@score * 2');
 * const type = inferExpressionType(ast, provider);
 * // type = 'number.float'
 * ```
 */
export function inferExpressionType(
  ast: ASTNode,
  variableProvider: VariableProvider,
): ValueType | undefined {
  const result = inferTypePure({
    ast,
    getVariableType: function getType(name: string): ValueType | undefined {
      return variableProvider.getVariableType(name);
    },
  });

  return result.type;
}

/**
 * Checks types in an AST and returns any type errors.
 *
 * This function traverses the AST, validates type compatibility for all
 * operators, and returns any type mismatch errors as FormulaSemanticError.
 *
 * @param ast - The parsed AST to check
 * @param variableProvider - Provider for variable type lookup
 * @returns Type check result with inferred type and errors
 *
 * @example
 * ```typescript
 * const ast = parse('@score + "hello"');
 * const result = checkTypes(ast, provider);
 *
 * if (result.errors.length > 0) {
 *   console.log('Type errors:', result.errors);
 * } else {
 *   console.log('Result type:', result.resultType);
 * }
 * ```
 */
export function checkTypes(ast: ASTNode, variableProvider: VariableProvider): TypeCheckResult {
  const result = inferTypePure({
    ast,
    getVariableType: function getType(name: string): ValueType | undefined {
      return variableProvider.getVariableType(name);
    },
  });

  // Convert type error info to semantic errors
  const errors = result.errors.map(function createError(info: TypeErrorInfo): FormulaSemanticError {
    return createTypeError(info);
  });

  return {
    resultType: result.type,
    errors,
  };
}

/**
 * Validates that all types in an AST are compatible.
 *
 * Convenience function that returns true if there are no type errors.
 *
 * @param ast - The parsed AST to validate
 * @param variableProvider - Provider for variable type lookup
 * @returns true if all types are compatible, false otherwise
 *
 * @example
 * ```typescript
 * const isValid = areTypesValid(ast, provider);
 * if (!isValid) {
 *   console.log('Formula has type mismatches');
 * }
 * ```
 */
export function areTypesValid(ast: ASTNode, variableProvider: VariableProvider): boolean {
  const result = checkTypes(ast, variableProvider);
  return result.errors.length === 0;
}

/**
 * Creates a FormulaSemanticError for a type mismatch.
 *
 * @param info - Information about the type error
 * @returns A FormulaSemanticError with code TYPE_MISMATCH
 */
function createTypeError(info: TypeErrorInfo): FormulaSemanticError {
  return new FormulaSemanticError(
    info.message,
    'TYPE_MISMATCH',
    { start: info.start, end: info.end },
    undefined,
    undefined,
  );
}
