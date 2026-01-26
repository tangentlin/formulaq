/**
 * Function signature validation for parsed formulas.
 *
 * This module provides the main API for validating function calls
 * against registered function signatures. It validates:
 * - Function existence
 * - Argument count (required, optional, variadic)
 * - Argument types
 * - Aggregation function requirements
 *
 * @module
 */

import type { ASTNode, FunctionCallNode } from '../types/ast.ts';
import type { VariableProvider } from '../types/context.ts';
import { FormulaSemanticError, type SemanticErrorCode } from '../types/errors.ts';
import type { FunctionInfo, FunctionRegistry } from '../types/functions.ts';
import type { ValueType } from '../types/values.ts';
import { inferType } from './type-checker.view-model.ts';
import {
  validateFunctions as validateFunctionsPure,
  validateFunctionCall as validateFunctionCallPure,
  collectFunctionCalls,
  getFunctionReturnType as getFunctionReturnTypePure,
  type FunctionValidationErrorInfo,
  type FunctionValidationErrorCode,
} from './function-validator.view-model.ts';

/**
 * Result of function validation.
 */
export interface FunctionValidationResult {
  /**
   * Semantic errors for function validation issues.
   * Empty if all function calls are valid.
   */
  readonly errors: readonly FormulaSemanticError[];

  /**
   * Function return types indexed by node location key.
   * Used for type inference of function calls.
   */
  readonly returnTypes: ReadonlyMap<string, ValueType>;
}

/**
 * Validates all function calls in an AST against registered function signatures.
 *
 * This function traverses the AST, finds all function calls, and validates each one
 * against the function registry. It checks:
 * - Function existence
 * - Argument count
 * - Argument types
 * - Aggregation function requirements
 *
 * @param ast - The parsed AST to validate
 * @param registry - The function registry to validate against
 * @param variableProvider - Provider for variable type lookup
 * @returns Validation result with errors and return type mappings
 *
 * @example
 * ```typescript
 * const result = validateFunctionCalls(ast, registry, provider);
 *
 * if (result.errors.length === 0) {
 *   console.log('All function calls are valid');
 * } else {
 *   for (const error of result.errors) {
 *     console.log(`Error: ${error.message}`);
 *   }
 * }
 * ```
 */
export function validateFunctionCalls(
  ast: ASTNode,
  registry: FunctionRegistry,
  variableProvider: VariableProvider,
): FunctionValidationResult {
  const result = validateFunctionsPure({
    ast,
    getFunction: function getFunc(name: string): FunctionInfo | undefined {
      return registry.get(name);
    },
    inferArgumentType: function inferArg(node: ASTNode): ValueType | undefined {
      // Use the type checker's inference with function registry for nested calls
      return inferExpressionTypeWithFunctions(node, variableProvider, registry);
    },
  });

  // Convert validation error info to semantic errors
  const errors = result.errors.map(function createError(
    info: FunctionValidationErrorInfo,
  ): FormulaSemanticError {
    return createFunctionError(info);
  });

  return {
    errors,
    returnTypes: result.returnTypes,
  };
}

/**
 * Validates a single function call node.
 *
 * Useful for targeted validation of a specific function call.
 *
 * @param functionCall - The function call node to validate
 * @param registry - The function registry to validate against
 * @param variableProvider - Provider for variable type lookup
 * @returns Array of semantic errors (empty if valid)
 *
 * @example
 * ```typescript
 * const errors = validateSingleFunctionCall(fnCallNode, registry, provider);
 * if (errors.length > 0) {
 *   console.log('Function call is invalid:', errors[0].message);
 * }
 * ```
 */
export function validateSingleFunctionCall(
  functionCall: FunctionCallNode,
  registry: FunctionRegistry,
  variableProvider: VariableProvider,
): readonly FormulaSemanticError[] {
  const result = validateFunctionCallPure(
    functionCall,
    function getFunc(name: string): FunctionInfo | undefined {
      return registry.get(name);
    },
    function inferArg(node: ASTNode): ValueType | undefined {
      return inferExpressionTypeWithFunctions(node, variableProvider, registry);
    },
  );

  return result.errors.map(function createError(
    info: FunctionValidationErrorInfo,
  ): FormulaSemanticError {
    return createFunctionError(info);
  });
}

/**
 * Gets all function call nodes from an AST.
 *
 * Useful for analyzing function usage in a formula.
 *
 * @param ast - The AST to traverse
 * @returns Array of function call nodes
 *
 * @example
 * ```typescript
 * const calls = getFunctionCalls(ast);
 * for (const call of calls) {
 *   console.log(`Found function call: ${call.name}`);
 * }
 * ```
 */
export function getFunctionCalls(ast: ASTNode): readonly FunctionCallNode[] {
  return collectFunctionCalls(ast);
}

/**
 * Gets the return type of a function call.
 *
 * @param functionCall - The function call node
 * @param registry - The function registry
 * @returns The return type, or undefined if the function is not found
 *
 * @example
 * ```typescript
 * const returnType = getFunctionReturnType(fnCallNode, registry);
 * if (returnType) {
 *   console.log(`Function returns: ${returnType}`);
 * }
 * ```
 */
export function getFunctionReturnType(
  functionCall: FunctionCallNode,
  registry: FunctionRegistry,
): ValueType | undefined {
  return getFunctionReturnTypePure(functionCall, function getFunc(name: string):
    | FunctionInfo
    | undefined {
    return registry.get(name);
  });
}

/**
 * Checks if a function exists in the registry.
 *
 * @param functionName - The function name to check
 * @param registry - The function registry
 * @returns true if the function exists
 *
 * @example
 * ```typescript
 * if (functionExists('AVG', registry)) {
 *   console.log('AVG function is available');
 * }
 * ```
 */
export function functionExists(functionName: string, registry: FunctionRegistry): boolean {
  return registry.has(functionName);
}

/**
 * Creates a FormulaSemanticError from function validation error info.
 *
 * @param info - The error information
 * @returns A FormulaSemanticError with appropriate code
 */
function createFunctionError(info: FunctionValidationErrorInfo): FormulaSemanticError {
  const semanticCode = mapToSemanticErrorCode(info.code);

  return new FormulaSemanticError(
    info.message,
    semanticCode,
    { start: info.start, end: info.end },
    undefined,
    info.functionName,
  );
}

/**
 * Maps function validation error codes to semantic error codes.
 *
 * @param code - The function validation error code
 * @returns The corresponding semantic error code
 */
function mapToSemanticErrorCode(code: FunctionValidationErrorCode): SemanticErrorCode {
  switch (code) {
    case 'UNKNOWN_FUNCTION':
      return 'UNKNOWN_FUNCTION';
    case 'ARGUMENT_COUNT_MISMATCH':
      return 'ARGUMENT_COUNT_MISMATCH';
    case 'ARGUMENT_TYPE_MISMATCH':
      return 'ARGUMENT_TYPE_MISMATCH';
    case 'INVALID_AGGREGATION_ARGUMENT':
      return 'INVALID_AGGREGATION_ARGUMENT';
    default:
      // Exhaustive check
      return assertNever(code);
  }
}

/**
 * Infers the type of an expression, including function return types.
 *
 * This combines the type checker's inference with function registry lookup
 * to properly infer types for function calls.
 *
 * @param node - The AST node to infer the type of
 * @param variableProvider - Provider for variable type lookup
 * @param registry - The function registry
 * @returns The inferred type, or undefined if it cannot be determined
 */
function inferExpressionTypeWithFunctions(
  node: ASTNode,
  variableProvider: VariableProvider,
  registry: FunctionRegistry,
): ValueType | undefined {
  // Handle function calls specially
  if (node.type === 'FunctionCall') {
    const funcInfo = registry.get(node.name);
    return funcInfo?.returnType;
  }

  // For other nodes, use the standard type inference
  const result = inferType({
    ast: node,
    getVariableType: function getType(name: string): ValueType | undefined {
      return variableProvider.getVariableType(name);
    },
  });

  return result.type;
}

/**
 * Helper for exhaustive type checking.
 *
 * @param x - Value that should never exist
 * @returns Never
 */
function assertNever(x: never): never {
  throw new Error(`Unexpected error code: ${x}`);
}
