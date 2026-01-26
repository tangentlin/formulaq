/**
 * Semantic validator for parsed formulas.
 *
 * The Validator takes a parsed AST and validates it against:
 * - Variable availability (via VariableProvider)
 * - Type compatibility (via type checker)
 * - Function signatures (via FunctionRegistry)
 * - Aggregation detection
 *
 * @module
 */

import type { ASTNode, ValidatedAST } from '../types/ast.ts';
import type { VariableProvider } from '../types/context.ts';
import type { FormulaSemanticError } from '../types/errors.ts';
import type { FunctionRegistry } from '../types/functions.ts';
import type { ValueType } from '../types/values.ts';
import type {
  ValidationOptions,
  ValidationOutcome,
  ValidationSuccess,
  ValidationFailure,
} from './validator.types.ts';
import { resolveVariablesFromAst, getDependencies } from './variable-resolver.ts';
import { checkTypes, inferExpressionType } from './type-checker.ts';
import { validateFunctionCalls, getFunctionReturnType } from './function-validator.ts';
import { detectAggregationsFromAst, getAggregationNames } from './aggregation-detector.ts';

/**
 * Validator for semantic analysis of parsed formulas.
 *
 * The Validator performs semantic validation on a parsed AST,
 * checking for issues like unknown variables, type mismatches,
 * invalid function calls, and detecting aggregation usage.
 *
 * @example
 * ```typescript
 * const validator = new Validator(variableProvider, functionRegistry);
 *
 * // Validate a formula
 * const result = validator.validate(ast);
 *
 * if (result.success) {
 *   console.log('Formula is valid');
 *   console.log('Dependencies:', result.ast.dependencies);
 *   console.log('Has aggregations:', result.ast.hasAggregations);
 *   console.log('Aggregations:', result.ast.aggregations);
 * } else {
 *   console.log('Validation errors:', result.errors);
 * }
 * ```
 */
export class Validator {
  private readonly variableProvider: VariableProvider;
  private readonly functionRegistry: FunctionRegistry | undefined;

  /**
   * Creates a new Validator instance.
   *
   * @param variableProvider - Provider for variable metadata and lookup
   * @param functionRegistry - Optional registry for function validation and aggregation detection
   */
  constructor(variableProvider: VariableProvider, functionRegistry?: FunctionRegistry) {
    this.variableProvider = variableProvider;
    this.functionRegistry = functionRegistry;
  }

  /**
   * Validates a parsed AST.
   *
   * Performs all semantic validation checks and returns either a
   * validated AST or a list of validation errors.
   *
   * @param ast - The parsed AST to validate
   * @param options - Optional validation options
   * @returns Validation result with either validated AST or errors
   *
   * @example
   * ```typescript
   * const ast = parse('@score * 2');
   * const result = validator.validate(ast);
   *
   * if (result.success) {
   *   // Use result.ast (ValidatedAST)
   * } else {
   *   // Handle result.errors
   * }
   * ```
   */
  validate(ast: ASTNode, options?: ValidationOptions): ValidationOutcome {
    const allErrors: FormulaSemanticError[] = [];
    const collectAllErrors = options?.collectAllErrors !== false;

    // Step 1: Resolve variables
    const variableResult = resolveVariablesFromAst(ast, this.variableProvider);

    // Collect variable resolution errors
    for (const error of variableResult.errors) {
      allErrors.push(error);

      // Stop early if not collecting all errors
      if (!collectAllErrors && allErrors.length > 0) {
        return this.createFailure(allErrors);
      }
    }

    // Step 2: Check types
    const typeResult = checkTypes(ast, this.variableProvider);

    // Collect type checking errors
    for (const error of typeResult.errors) {
      allErrors.push(error);

      // Stop early if not collecting all errors
      if (!collectAllErrors && allErrors.length > 0) {
        return this.createFailure(allErrors);
      }
    }

    // Step 3: Validate function signatures (if registry is provided)
    if (this.functionRegistry !== undefined) {
      const functionResult = validateFunctionCalls(
        ast,
        this.functionRegistry,
        this.variableProvider,
      );

      // Collect function validation errors
      for (const error of functionResult.errors) {
        allErrors.push(error);

        // Stop early if not collecting all errors
        if (!collectAllErrors && allErrors.length > 0) {
          return this.createFailure(allErrors);
        }
      }
    }

    // If there are any errors, return failure
    if (allErrors.length > 0) {
      return this.createFailure(allErrors);
    }

    // Infer result type (with function return types if registry is available)
    const resultType = this.inferResultType(ast, typeResult.resultType);

    // Detect aggregations (if registry is provided)
    const aggregationInfo = this.detectAggregations(ast);

    // Create validated AST with all metadata
    const validatedAst = this.createValidatedAst(
      ast,
      variableResult.dependencies,
      resultType,
      aggregationInfo.hasAggregations,
      aggregationInfo.aggregations,
    );

    return this.createSuccess(validatedAst);
  }

  /**
   * Validates only variable resolution.
   *
   * This is a partial validation that only checks if all variables exist.
   * Useful for quick checks before full validation.
   *
   * @param ast - The parsed AST to validate
   * @returns Array of variable resolution errors (empty if valid)
   */
  validateVariables(ast: ASTNode): readonly FormulaSemanticError[] {
    const result = resolveVariablesFromAst(ast, this.variableProvider);
    return result.errors;
  }

  /**
   * Validates only type compatibility.
   *
   * This is a partial validation that only checks type compatibility
   * of operators. Useful for quick checks before full validation.
   *
   * @param ast - The parsed AST to validate
   * @returns Array of type checking errors (empty if valid)
   */
  validateTypes(ast: ASTNode): readonly FormulaSemanticError[] {
    const result = checkTypes(ast, this.variableProvider);
    return result.errors;
  }

  /**
   * Validates only function signatures.
   *
   * This is a partial validation that only checks function calls.
   * Requires a function registry to be provided in the constructor.
   *
   * @param ast - The parsed AST to validate
   * @returns Array of function validation errors (empty if valid)
   */
  validateFunctions(ast: ASTNode): readonly FormulaSemanticError[] {
    if (this.functionRegistry === undefined) {
      return [];
    }

    const result = validateFunctionCalls(ast, this.functionRegistry, this.variableProvider);
    return result.errors;
  }

  /**
   * Gets dependencies from an AST without full validation.
   *
   * Extracts all variable references regardless of validity.
   *
   * @param ast - The parsed AST
   * @returns Array of variable names referenced in the formula
   */
  getDependencies(ast: ASTNode): readonly string[] {
    return getDependencies(ast);
  }

  /**
   * Gets aggregation function names from an AST.
   *
   * Returns unique aggregation function names used in the formula.
   * Requires a function registry to be provided in the constructor.
   *
   * @param ast - The parsed AST
   * @returns Array of unique aggregation function names
   */
  getAggregations(ast: ASTNode): readonly string[] {
    if (this.functionRegistry === undefined) {
      return [];
    }

    return getAggregationNames(ast, this.functionRegistry);
  }

  /**
   * Infers the result type of an expression.
   *
   * Uses the type checker's inference and falls back to function return types
   * when available.
   *
   * @param ast - The AST node
   * @param typeCheckerResult - The result from the type checker
   * @returns The inferred result type
   */
  private inferResultType(ast: ASTNode, typeCheckerResult: ValueType | undefined): ValueType {
    // If the type checker already determined the type, use it
    if (typeCheckerResult !== undefined) {
      return typeCheckerResult;
    }

    // For function calls, try to get the return type from the registry
    if (ast.type === 'FunctionCall' && this.functionRegistry !== undefined) {
      const returnType = getFunctionReturnType(ast, this.functionRegistry);
      if (returnType !== undefined) {
        return returnType;
      }
    }

    // Try to infer the type using the type checker with variable provider
    const inferred = inferExpressionType(ast, this.variableProvider);
    if (inferred !== undefined) {
      return inferred;
    }

    // Default to number.float if we can't determine the type
    return 'number.float';
  }

  /**
   * Detects aggregation functions in the AST.
   *
   * @param ast - The AST node
   * @returns Aggregation detection result
   */
  private detectAggregations(ast: ASTNode): {
    hasAggregations: boolean;
    aggregations: readonly string[];
  } {
    if (this.functionRegistry === undefined) {
      return {
        hasAggregations: false,
        aggregations: [],
      };
    }

    const result = detectAggregationsFromAst(ast, this.functionRegistry);
    return {
      hasAggregations: result.hasAggregations,
      aggregations: result.aggregations,
    };
  }

  /**
   * Creates a successful validation result.
   */
  private createSuccess(ast: ValidatedAST): ValidationSuccess {
    return {
      success: true,
      ast,
      errors: [],
    };
  }

  /**
   * Creates a failed validation result.
   */
  private createFailure(errors: readonly FormulaSemanticError[]): ValidationFailure {
    return {
      success: false,
      ast: undefined,
      errors,
    };
  }

  /**
   * Creates a ValidatedAST from validation results.
   *
   * @param root - The validated AST root
   * @param dependencies - Variable dependencies
   * @param resultType - Inferred result type
   * @param hasAggregations - Whether the formula uses aggregations
   * @param aggregations - List of aggregation function names
   * @returns A ValidatedAST object
   */
  private createValidatedAst(
    root: ASTNode,
    dependencies: readonly string[],
    resultType: ValueType,
    hasAggregations: boolean,
    aggregations: readonly string[],
  ): ValidatedAST {
    return {
      root,
      resultType,
      dependencies,
      hasAggregations,
      aggregations,
    };
  }
}

/**
 * Creates a simple VariableProvider from an array of variable names.
 *
 * Useful for testing and simple cases where you just need to check
 * if variables exist.
 *
 * @param variables - Array of available variable names or VariableInfo objects
 * @returns A VariableProvider implementation
 *
 * @example
 * ```typescript
 * // Simple usage with names only
 * const provider = createSimpleVariableProvider(['x', 'y', 'z']);
 *
 * // Usage with type info
 * const provider = createSimpleVariableProvider([
 *   { name: 'score', type: 'number.float', nullable: false },
 *   { name: 'name', type: 'string.text', nullable: true }
 * ]);
 * ```
 */
export function createSimpleVariableProvider(
  variables: readonly (string | SimpleVariableInfo)[],
): VariableProvider {
  const variableMap = new Map<string, SimpleVariableInfo>();

  for (const v of variables) {
    if (typeof v === 'string') {
      variableMap.set(v, { name: v, type: 'number.float', nullable: true });
    } else {
      variableMap.set(v.name, v);
    }
  }

  return {
    getVariables: function getVariables() {
      return Array.from(variableMap.values());
    },

    hasVariable: function hasVariable(name: string): boolean {
      return variableMap.has(name);
    },

    getVariableType: function getVariableType(name: string): ValueType | undefined {
      const info = variableMap.get(name);
      return info?.type;
    },

    isNullable: function isNullable(name: string): boolean {
      const info = variableMap.get(name);
      return info?.nullable ?? true;
    },
  };
}

/**
 * Simple variable info for createSimpleVariableProvider.
 */
interface SimpleVariableInfo {
  readonly name: string;
  readonly type: ValueType;
  readonly nullable: boolean;
  readonly description?: string | undefined;
  readonly group?: string | undefined;
}
