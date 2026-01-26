/**
 * FormulaQEngine facade for the formula engine.
 *
 * This module provides the main entry point for using FormulaQ, combining
 * parsing, validation, and evaluation into a unified interface.
 *
 * The engine is designed to be stateless where possible, reusing the
 * FunctionRegistry across calls for efficiency.
 *
 * @module
 */

import type { ASTNode, ValidatedAST } from './types/ast.ts';
import type { EvaluationContext, VariableProvider } from './types/context.ts';
import type { FormulaFunction, FunctionInfo } from './types/functions.ts';
import type { BatchResult } from './types/results.ts';
import type { Value, ValueType } from './types/values.ts';
import type { RowContext } from './formula-evaluator/evaluator.types.ts';

import { parse } from './formula-parser/parser.ts';
import { Validator, createSimpleVariableProvider } from './formula-validator/validator.ts';
import { getDependencies } from './formula-validator/variable-resolver.ts';
import { createFunctionRegistry, FunctionRegistryImpl } from './functions/function-registry.ts';
import { evaluateRow } from './formula-evaluator/row-evaluator.ts';
import { evaluateBatch, type BatchEvaluationOptions } from './formula-evaluator/batch-evaluator.ts';

/**
 * Options for creating a FormulaQEngine.
 */
export interface EngineOptions {
  /**
   * Whether to include default built-in functions.
   *
   * When true, includes all standard functions:
   * - Aggregation: SUM, AVG, MIN, MAX, COUNT, PERCENTILE
   * - Math: LOG, LOG10, POWER
   * - Logical: IF, AND, OR, NOT, IFNULL
   * - String: CONCAT
   *
   * @defaultValue true
   */
  readonly includeDefaultFunctions?: boolean | undefined;
}

/**
 * Main facade interface for the FormulaQ engine.
 *
 * Provides a unified API for parsing, validating, and evaluating formulas.
 *
 * @example
 * ```typescript
 * const engine = createFormulaEngine();
 *
 * // Parse a formula
 * const ast = engine.parse('@score * 2');
 *
 * // Validate against available variables
 * const validated = engine.validate(ast, variableProvider);
 *
 * // Evaluate for all rows
 * const result = await engine.evaluateBatch(validated, context);
 *
 * // Or use execute() for convenience
 * const result = await engine.execute('@score * 2', context);
 * ```
 */
export interface FormulaQEngine {
  /**
   * Parses a formula string into an AST.
   *
   * @param formula - The formula string to parse
   * @returns The parsed AST node
   * @throws FormulaSyntaxError if the formula is syntactically invalid
   */
  parse(formula: string): ASTNode;

  /**
   * Validates a formula against a variable provider.
   *
   * @param formula - The formula string or AST to validate
   * @param provider - Provider for variable metadata
   * @returns The validated AST with metadata
   * @throws FormulaSemanticError if validation fails
   */
  validate(formula: string | ASTNode, provider: VariableProvider): ValidatedAST;

  /**
   * Evaluates a formula for a single row.
   *
   * @param formula - The formula, AST, or validated AST to evaluate
   * @param rowContext - Context providing variable values for a single row
   * @returns The computed value for this row
   */
  evaluateRow(formula: string | ASTNode | ValidatedAST, rowContext: RowContext): Promise<Value>;

  /**
   * Evaluates a formula across all rows in a dataset.
   *
   * @param formula - The formula, AST, or validated AST to evaluate
   * @param context - The evaluation context with all variable data
   * @param options - Optional batch evaluation options
   * @returns Promise resolving to BatchResult with values and errors
   */
  evaluateBatch(
    formula: string | ASTNode | ValidatedAST,
    context: EvaluationContext,
    options?: BatchEvaluationOptions,
  ): Promise<BatchResult>;

  /**
   * Convenience method that validates and evaluates a formula.
   *
   * Combines validation and batch evaluation into a single call.
   * Creates a VariableProvider from the EvaluationContext automatically.
   *
   * @param formula - The formula string to execute
   * @param context - The evaluation context with all variable data
   * @param options - Optional batch evaluation options
   * @returns Promise resolving to BatchResult with values and errors
   */
  execute(
    formula: string,
    context: EvaluationContext,
    options?: BatchEvaluationOptions,
  ): Promise<BatchResult>;

  /**
   * Returns metadata for all registered functions.
   *
   * @returns Array of function metadata for autocomplete and documentation
   */
  getFunctions(): FunctionInfo[];

  /**
   * Registers a custom function with the engine.
   *
   * @param fn - The function definition to register
   * @throws DuplicateFunctionError if a function with the same name exists
   */
  registerFunction(fn: FormulaFunction): void;

  /**
   * Extracts variable dependencies from a formula.
   *
   * @param formula - The formula string or AST to analyze
   * @returns Array of unique variable names referenced in the formula
   */
  getDependencies(formula: string | ASTNode): string[];
}

/**
 * Implementation of the FormulaQEngine interface.
 */
class FormulaQEngineImpl implements FormulaQEngine {
  private readonly functionRegistry: FunctionRegistryImpl;

  /**
   * Creates a new FormulaQEngine instance.
   *
   * @param registry - The function registry to use
   */
  constructor(registry: FunctionRegistryImpl) {
    this.functionRegistry = registry;
  }

  /**
   * Parses a formula string into an AST.
   */
  public parse(formula: string): ASTNode {
    return parse(formula);
  }

  /**
   * Validates a formula against a variable provider.
   */
  public validate(formula: string | ASTNode, provider: VariableProvider): ValidatedAST {
    const ast = this.resolveToAst(formula);
    const validator = new Validator(provider, this.functionRegistry);
    const result = validator.validate(ast);

    if (!result.success) {
      // Throw the first error
      const firstError = result.errors[0];
      if (firstError !== undefined) {
        throw firstError;
      }
      // This should never happen, but handle gracefully
      throw new Error('Validation failed with no errors');
    }

    return result.ast;
  }

  /**
   * Evaluates a formula for a single row.
   */
  public async evaluateRow(
    formula: string | ASTNode | ValidatedAST,
    rowContext: RowContext,
  ): Promise<Value> {
    const ast = this.resolveToAstNode(formula);
    const result = await evaluateRow(ast, rowContext, this.functionRegistry);
    return result.value;
  }

  /**
   * Evaluates a formula across all rows in a dataset.
   */
  public async evaluateBatch(
    formula: string | ASTNode | ValidatedAST,
    context: EvaluationContext,
    options?: BatchEvaluationOptions,
  ): Promise<BatchResult> {
    const ast = this.resolveToAstNode(formula);
    return evaluateBatch(ast, context, this.functionRegistry, options);
  }

  /**
   * Convenience method that validates and evaluates a formula.
   */
  public async execute(
    formula: string,
    context: EvaluationContext,
    options?: BatchEvaluationOptions,
  ): Promise<BatchResult> {
    // Parse the formula
    const ast = this.parse(formula);

    // Create a VariableProvider from the context
    const provider = createVariableProviderFromContext(context);

    // Validate the formula
    const validated = this.validate(ast, provider);

    // Evaluate the validated AST
    return this.evaluateBatch(validated, context, options);
  }

  /**
   * Returns metadata for all registered functions.
   */
  public getFunctions(): FunctionInfo[] {
    return this.functionRegistry.getAll();
  }

  /**
   * Registers a custom function with the engine.
   */
  public registerFunction(fn: FormulaFunction): void {
    this.functionRegistry.register(fn);
  }

  /**
   * Extracts variable dependencies from a formula.
   */
  public getDependencies(formula: string | ASTNode): string[] {
    const ast = this.resolveToAst(formula);
    const dependencies = getDependencies(ast);
    return Array.from(dependencies);
  }

  /**
   * Resolves a formula input to an AST node, parsing if necessary.
   *
   * @param formula - The formula string or AST to resolve
   * @returns The AST node
   */
  private resolveToAst(formula: string | ASTNode): ASTNode {
    if (typeof formula === 'string') {
      return this.parse(formula);
    }
    return formula;
  }

  /**
   * Resolves a formula input to an AST node, handling ValidatedAST as well.
   *
   * @param formula - The formula string, AST, or ValidatedAST to resolve
   * @returns The AST node
   */
  private resolveToAstNode(formula: string | ASTNode | ValidatedAST): ASTNode {
    if (typeof formula === 'string') {
      return this.parse(formula);
    }
    if (isValidatedAST(formula)) {
      return formula.root;
    }
    return formula;
  }
}

/**
 * Type guard for ValidatedAST.
 *
 * @param ast - The value to check
 * @returns True if the value is a ValidatedAST
 */
function isValidatedAST(ast: ASTNode | ValidatedAST): ast is ValidatedAST {
  return 'root' in ast && 'resultType' in ast;
}

/**
 * Creates a VariableProvider from an EvaluationContext.
 *
 * This is used by the execute() method to automatically create
 * a VariableProvider from the evaluation context.
 *
 * @param context - The evaluation context
 * @returns A VariableProvider for the context's variables
 */
function createVariableProviderFromContext(context: EvaluationContext): VariableProvider {
  const variableNames = Object.keys(context.variables);

  // Infer types from the first non-null value in each variable array
  const variableInfos = variableNames.map(function inferVariableInfo(name: string) {
    const values = context.variables[name];
    if (values === undefined || values.length === 0) {
      return { name, type: 'number.float' as ValueType, nullable: true };
    }

    // Find the first non-null value to get the type
    let type: ValueType = 'number.float';
    let hasNull = false;

    for (const value of values) {
      if (value.value === null) {
        hasNull = true;
      } else {
        type = value.type;
        break;
      }
    }

    // If all values are null, we still need to check if there are any null values
    if (!hasNull) {
      for (const value of values) {
        if (value.value === null) {
          hasNull = true;
          break;
        }
      }
    }

    return { name, type, nullable: hasNull };
  });

  return createSimpleVariableProvider(variableInfos);
}

/**
 * Creates a new FormulaQEngine instance.
 *
 * This is the main factory function for creating engines.
 *
 * @param options - Optional configuration for the engine
 * @returns A new FormulaQEngine instance
 *
 * @example
 * ```typescript
 * // Create an engine with default functions
 * const engine = createFormulaEngine();
 *
 * // Create an engine without default functions
 * const customEngine = createFormulaEngine({ includeDefaultFunctions: false });
 * customEngine.registerFunction(myCustomFunction);
 * ```
 */
export function createFormulaEngine(options?: EngineOptions): FormulaQEngine {
  const includeDefaults = options?.includeDefaultFunctions !== false;
  const registry = createFunctionRegistry({ includeDefaults });
  return new FormulaQEngineImpl(registry);
}

// Re-export relevant types for convenience
export type { BatchEvaluationOptions } from './formula-evaluator/batch-evaluator.ts';
export type { RowContext, RowEvaluationResult } from './formula-evaluator/evaluator.types.ts';
