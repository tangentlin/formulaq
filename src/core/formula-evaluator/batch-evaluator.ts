/**
 * Batch evaluator for FormulaQ expressions.
 *
 * Evaluates a formula across all rows in a dataset using chunked execution.
 * Pre-computes aggregations once, then processes rows in batches to maintain
 * UI responsiveness. Supports progress reporting and cancellation.
 *
 * @module
 */

import type { ASTNode, ValidatedAST } from '../types/ast.ts';
import type { EvaluationContext } from '../types/context.ts';
import type { FunctionRegistry } from '../types/functions.ts';
import type { BatchResult } from '../types/results.ts';
import type { AggregationCache } from './evaluator.types.ts';
import { createRowContext } from './evaluator.types.ts';
import { evaluateRow } from './row-evaluator.ts';
import { computeAggregations, createAggregationComputeContext } from './aggregation-computer.ts';
import {
  createRowIndices,
  assembleBatchResult,
  createEmptyBatchResult,
  validateBatchOptions,
  DEFAULT_CHUNK_SIZE,
  DEFAULT_DELAY_MS,
  type RowResult,
} from './batch-evaluator.view-model.ts';

/**
 * Options for batch evaluation.
 *
 * Controls chunking behavior, progress reporting, and cancellation.
 */
export interface BatchEvaluationOptions {
  /**
   * Number of rows to process in each chunk.
   *
   * Smaller chunks provide more responsive progress updates and
   * better cancellation responsiveness, but may be slower overall.
   *
   * @defaultValue 1000
   */
  readonly chunkSize?: number | undefined;

  /**
   * Delay in milliseconds between chunks.
   *
   * Use 0 for maximum speed with setTimeout(0) for yielding.
   * Use 16 for ~60fps UI responsiveness during evaluation.
   *
   * @defaultValue 0
   */
  readonly delayMs?: number | undefined;

  /**
   * Progress callback called after each chunk is processed.
   *
   * @param completed - Number of rows processed so far
   * @param total - Total number of rows to process
   */
  readonly onProgress?: ((completed: number, total: number) => void) | undefined;

  /**
   * AbortSignal for cancellation support.
   *
   * When aborted, evaluation stops after the current chunk
   * and returns partial results.
   */
  readonly signal?: AbortSignal | undefined;
}

/**
 * Creates a promise that resolves after a specified delay.
 *
 * @param ms - Delay in milliseconds
 * @returns Promise that resolves after the delay
 */
function delay(ms: number): Promise<void> {
  return new Promise(function resolveAfterDelay(resolve) {
    setTimeout(resolve, ms);
  });
}

/**
 * Evaluates an AST across all rows in a context.
 *
 * This function:
 * 1. Pre-computes all aggregations once using aggregationComputer
 * 2. Processes rows in batches using async chunking
 * 3. For each row, calls evaluateRow with the aggregation cache
 * 4. Collects runtime errors without throwing
 * 5. Returns a complete BatchResult
 *
 * @param ast - The AST or ValidatedAST to evaluate
 * @param context - The evaluation context with all variable data
 * @param registry - The function registry for function lookups
 * @param options - Optional batch evaluation options
 * @returns Promise resolving to a BatchResult with values and errors
 *
 * @example
 * ```typescript
 * const result = await evaluateBatch(ast, context, registry, {
 *   chunkSize: 500,
 *   onProgress: (completed, total) => {
 *     console.log(`Processed ${completed}/${total} rows`);
 *   },
 * });
 *
 * if (result.hasErrors) {
 *   console.log(`${result.errorCount} errors occurred`);
 * }
 * ```
 */
export async function evaluateBatch(
  ast: ASTNode | ValidatedAST,
  context: EvaluationContext,
  registry: FunctionRegistry,
  options?: BatchEvaluationOptions,
): Promise<BatchResult> {
  const rowCount = context.rowCount;

  // Handle empty dataset
  if (rowCount === 0) {
    return createEmptyBatchResult();
  }

  // Extract the AST node
  const node = isValidatedAST(ast) ? ast.root : ast;

  // Validate and apply default options
  const validatedOptions = validateBatchOptions(options?.chunkSize, options?.delayMs);
  const chunkSize = validatedOptions.chunkSize;
  const delayMs = validatedOptions.delayMs;
  const onProgress = options?.onProgress;
  const signal = options?.signal;

  // Check if already aborted before starting
  if (signal && signal.aborted) {
    return createEmptyBatchResult();
  }

  // Pre-compute all aggregations once
  const aggregationContext = createAggregationComputeContext(context, registry);
  const aggregationResult = await computeAggregations(node, aggregationContext);
  const aggregationCache = aggregationResult.cache;

  // Create array of row indices to process
  const rowIndices = createRowIndices(rowCount);

  // Process rows in chunks with async handling
  const allResults: RowResult[] = [];
  const totalItems = rowIndices.length;
  const chunkCount = Math.ceil(totalItems / chunkSize);

  // Process single chunk directly without delay
  if (chunkCount === 1) {
    const chunkResults = await processChunkAsync(
      rowIndices,
      node,
      context,
      registry,
      aggregationCache,
    );
    allResults.push(...chunkResults);

    if (onProgress) {
      onProgress(totalItems, totalItems);
    }

    return assembleBatchResult(allResults);
  }

  // Process multiple chunks with yielding between them
  for (let chunkIndex = 0; chunkIndex < chunkCount; chunkIndex++) {
    // Check for abort before processing each chunk
    if (signal && signal.aborted) {
      return assembleBatchResult(allResults);
    }

    const startIndex = chunkIndex * chunkSize;
    const endIndex = Math.min(startIndex + chunkSize, totalItems);
    const chunk = rowIndices.slice(startIndex, endIndex);

    // Process the chunk asynchronously
    const chunkResults = await processChunkAsync(chunk, node, context, registry, aggregationCache);
    allResults.push(...chunkResults);

    // Report progress after each chunk
    if (onProgress) {
      onProgress(endIndex, totalItems);
    }

    // Yield to main thread between chunks (but not after the last one)
    if (chunkIndex < chunkCount - 1) {
      await delay(delayMs);
    }
  }

  return assembleBatchResult(allResults);
}

/**
 * Processes a chunk of row indices asynchronously.
 *
 * @param rowIndices - Array of row indices to process in this chunk
 * @param node - The AST node to evaluate
 * @param context - The full evaluation context
 * @param registry - The function registry
 * @param aggregationCache - Pre-computed aggregation results
 * @returns Promise resolving to array of RowResult objects for each row
 */
async function processChunkAsync(
  rowIndices: number[],
  node: ASTNode,
  context: EvaluationContext,
  registry: FunctionRegistry,
  aggregationCache: AggregationCache,
): Promise<RowResult[]> {
  const results: RowResult[] = [];

  for (const rowIndex of rowIndices) {
    const result = await evaluateRowAsync(node, context, registry, rowIndex, aggregationCache);
    results.push(result);
  }

  return results;
}

/**
 * Evaluates a single row asynchronously.
 *
 * @param node - The AST node to evaluate
 * @param context - The full evaluation context
 * @param registry - The function registry
 * @param rowIndex - The index of the row to evaluate
 * @param aggregationCache - Pre-computed aggregation results
 * @returns Promise resolving to RowResult with value and optional error
 */
async function evaluateRowAsync(
  node: ASTNode,
  context: EvaluationContext,
  registry: FunctionRegistry,
  rowIndex: number,
  aggregationCache: AggregationCache,
): Promise<RowResult> {
  const rowContext = createRowContext(context.variables, rowIndex, aggregationCache);

  try {
    const evalResult = await evaluateRow(node, rowContext, registry, context, aggregationCache);

    if (evalResult.error !== undefined) {
      return {
        value: evalResult.value,
        error: evalResult.error,
      };
    }

    return {
      value: evalResult.value,
    };
  } catch (err) {
    // This should not happen as evaluateRow catches errors internally
    // but handle it gracefully just in case
    return {
      value: { type: 'number.float', value: null },
      error: {
        rowIndex,
        code: 'DOMAIN_ERROR',
        message: err instanceof Error ? err.message : 'Unknown error',
      },
    };
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
 * Creates a batch evaluator function with bound registry.
 *
 * Useful for creating a reusable evaluator with a fixed function registry.
 *
 * @param registry - The function registry to use
 * @returns A function that evaluates batches with the bound registry
 *
 * @example
 * ```typescript
 * const evaluate = createBatchEvaluator(registry);
 *
 * // Later, use without passing registry each time
 * const result = await evaluate(ast, context);
 * ```
 */
export function createBatchEvaluator(
  registry: FunctionRegistry,
): (
  ast: ASTNode | ValidatedAST,
  context: EvaluationContext,
  options?: BatchEvaluationOptions,
) => Promise<BatchResult> {
  return function boundEvaluateBatch(
    ast: ASTNode | ValidatedAST,
    context: EvaluationContext,
    options?: BatchEvaluationOptions,
  ): Promise<BatchResult> {
    return evaluateBatch(ast, context, registry, options);
  };
}

// Re-export types and constants for convenience
export { DEFAULT_CHUNK_SIZE, DEFAULT_DELAY_MS };
export type { RowResult };
