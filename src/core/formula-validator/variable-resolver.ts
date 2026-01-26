/**
 * Variable resolution for formula validation.
 *
 * This module provides the main API for resolving variables in a formula AST.
 * It validates that all variable references exist in the provided VariableProvider
 * and collects them as dependencies.
 *
 * @module
 */

import type { ASTNode } from '../types/ast.ts';
import type { VariableProvider } from '../types/context.ts';
import { FormulaSemanticError } from '../types/errors.ts';
import type { VariableResolutionResult } from './validator.types.ts';
import {
  createUnknownVariableMessage,
  resolveVariables as resolveVariablesPure,
  type UnknownVariableInfo,
} from './variable-resolver.view-model.ts';

/**
 * Resolves all variable references in an AST and validates them.
 *
 * This function traverses the AST, collects all variable references,
 * validates them against the VariableProvider, and returns:
 * - The list of dependencies (all variable names referenced)
 * - Any errors for unknown variable references
 *
 * @param ast - The parsed AST to validate
 * @param variableProvider - Provider for variable lookup
 * @returns Resolution result with dependencies and errors
 *
 * @example
 * ```typescript
 * const ast = parse('@score + @weight * 2');
 * const provider = createVariableProvider([
 *   { name: 'score', type: 'number.float', nullable: false }
 * ]);
 *
 * const result = resolveVariables(ast, provider);
 * // result.dependencies = ['score', 'weight']
 * // result.errors = [FormulaSemanticError for 'weight']
 * ```
 */
export function resolveVariablesFromAst(
  ast: ASTNode,
  variableProvider: VariableProvider,
): VariableResolutionResult {
  // Use the pure function to do the actual resolution
  const result = resolveVariablesPure({
    ast,
    hasVariable: function checkVariable(name: string): boolean {
      return variableProvider.hasVariable(name);
    },
  });

  // Convert unknown variable info to semantic errors
  const errors = result.unknownVariables.map(function createError(
    info: UnknownVariableInfo,
  ): FormulaSemanticError {
    return createUnknownVariableError(info);
  });

  return {
    dependencies: result.dependencies,
    errors,
  };
}

/**
 * Creates a FormulaSemanticError for an unknown variable.
 *
 * @param info - Information about the unknown variable
 * @returns A FormulaSemanticError with code UNKNOWN_VARIABLE
 */
function createUnknownVariableError(info: UnknownVariableInfo): FormulaSemanticError {
  const message = createUnknownVariableMessage(info.name);

  return new FormulaSemanticError(
    message,
    'UNKNOWN_VARIABLE',
    { start: info.start, end: info.end },
    info.name,
    undefined,
  );
}

/**
 * Checks if all variables in an AST are valid.
 *
 * Convenience function that returns true if there are no unknown variables.
 *
 * @param ast - The parsed AST to validate
 * @param variableProvider - Provider for variable lookup
 * @returns true if all variables are valid, false otherwise
 *
 * @example
 * ```typescript
 * const isValid = areVariablesValid(ast, provider);
 * if (!isValid) {
 *   console.log('Formula has unknown variable references');
 * }
 * ```
 */
export function areVariablesValid(ast: ASTNode, variableProvider: VariableProvider): boolean {
  const result = resolveVariablesFromAst(ast, variableProvider);
  return result.errors.length === 0;
}

/**
 * Gets the list of variable dependencies from an AST.
 *
 * This function only extracts the dependencies without validating them.
 * Useful when you need the dependencies regardless of validity.
 *
 * @param ast - The parsed AST
 * @returns Array of unique variable names referenced in the formula
 *
 * @example
 * ```typescript
 * const deps = getDependencies(parse('@a + @b + @a'));
 * // deps = ['a', 'b']
 * ```
 */
export function getDependencies(ast: ASTNode): readonly string[] {
  // We don't need a real variable provider here since we're not validating
  const result = resolveVariablesPure({
    ast,
    hasVariable: function alwaysTrue(): boolean {
      return true;
    },
  });

  return result.dependencies;
}
