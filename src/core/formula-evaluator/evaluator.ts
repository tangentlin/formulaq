/**
 * Main Evaluator class for FormulaQ.
 *
 * Provides both row-level and batch evaluation capabilities.
 * This is the initial structure - batch evaluation will be
 * implemented in a later step.
 *
 * @module
 */

import type { ASTNode, ValidatedAST } from '../types/ast.ts';
import type { EvaluationContext } from '../types/context.ts';
import type { FunctionRegistry } from '../types/functions.ts';
import type { RowContext, RowEvaluationResult, AggregationCache } from './evaluator.types.ts';
import { createRowContext } from './evaluator.types.ts';
import { evaluateRow } from './row-evaluator.ts';

/**
 * Options for creating an Evaluator instance.
 */
export interface EvaluatorOptions {
  /**
   * The function registry containing available functions.
   */
  readonly functionRegistry: FunctionRegistry;
}

/**
 * Evaluator for FormulaQ expressions.
 *
 * Handles both single-row and batch evaluation of validated ASTs.
 * Uses the function registry to resolve function calls.
 *
 * @example
 * ```typescript
 * const evaluator = new Evaluator({ functionRegistry });
 *
 * // Single row evaluation
 * const result = await evaluator.evaluateSingleRow(ast, rowContext);
 *
 * // Row evaluation with full context
 * const result = await evaluator.evaluateRowWithContext(
 *   ast,
 *   context,
 *   rowIndex,
 *   aggregationCache
 * );
 * ```
 */
export class Evaluator {
  private readonly functionRegistry: FunctionRegistry;

  /**
   * Creates a new Evaluator instance.
   *
   * @param options - Configuration options including the function registry
   */
  constructor(options: EvaluatorOptions) {
    this.functionRegistry = options.functionRegistry;
  }

  /**
   * Evaluates an AST for a single row using a RowContext.
   *
   * This is the simplest evaluation method, suitable for
   * evaluating a single value without aggregation support.
   *
   * @param ast - The AST to evaluate (can be ASTNode or ValidatedAST)
   * @param rowContext - The row context providing variable values
   * @returns The evaluation result with value and optional error
   *
   * @example
   * ```typescript
   * const rowContext: RowContext = {
   *   rowIndex: 0,
   *   getVariable: (name) => values[name] ?? null,
   * };
   *
   * const result = await evaluator.evaluateSingleRow(ast, rowContext);
   * console.log(result.value);
   * ```
   */
  public async evaluateSingleRow(
    ast: ASTNode | ValidatedAST,
    rowContext: RowContext,
  ): Promise<RowEvaluationResult> {
    const node = isValidatedAST(ast) ? ast.root : ast;
    return evaluateRow(node, rowContext, this.functionRegistry);
  }

  /**
   * Evaluates an AST for a specific row within an evaluation context.
   *
   * This method is used when evaluating with full context information,
   * including aggregation caching.
   *
   * @param ast - The AST to evaluate (can be ASTNode or ValidatedAST)
   * @param context - The full evaluation context with all variable data
   * @param rowIndex - The index of the row to evaluate
   * @param aggregationCache - Optional pre-computed aggregation results
   * @returns The evaluation result with value and optional error
   *
   * @example
   * ```typescript
   * const context: EvaluationContext = {
   *   variables: {
   *     x: [{ type: 'number.float', value: 10 }, { type: 'number.float', value: 20 }],
   *   },
   *   rowCount: 2,
   * };
   *
   * const result = await evaluator.evaluateRowWithContext(ast, context, 0);
   * console.log(result.value);
   * ```
   */
  public async evaluateRowWithContext(
    ast: ASTNode | ValidatedAST,
    context: EvaluationContext,
    rowIndex: number,
    aggregationCache?: AggregationCache,
  ): Promise<RowEvaluationResult> {
    const node = isValidatedAST(ast) ? ast.root : ast;
    const rowContext = createRowContext(context.variables, rowIndex, aggregationCache);

    return evaluateRow(node, rowContext, this.functionRegistry, context, aggregationCache);
  }

  /**
   * Gets the function registry used by this evaluator.
   *
   * @returns The function registry
   */
  public getFunctionRegistry(): FunctionRegistry {
    return this.functionRegistry;
  }
}

/**
 * Type guard for ValidatedAST.
 *
 * @param ast - The AST to check
 * @returns True if the AST is a ValidatedAST
 */
function isValidatedAST(ast: ASTNode | ValidatedAST): ast is ValidatedAST {
  return 'root' in ast && 'resultType' in ast;
}

/**
 * Creates a new Evaluator instance.
 *
 * Factory function for creating evaluators.
 *
 * @param options - Configuration options
 * @returns A new Evaluator instance
 *
 * @example
 * ```typescript
 * const evaluator = createEvaluator({
 *   functionRegistry: createFunctionRegistry({ includeDefaults: true }),
 * });
 * ```
 */
export function createEvaluator(options: EvaluatorOptions): Evaluator {
  return new Evaluator(options);
}
