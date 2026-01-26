/**
 * Aggregation pre-computation for formula evaluation.
 *
 * Aggregation functions like SUM(@column) operate on ALL rows at once,
 * not per-row. This module pre-computes them once and caches the results
 * to avoid redundant computation during row-level evaluation.
 *
 * @module
 */

import type { ASTNode } from '../types/ast.ts';
import type { Value } from '../types/values.ts';
import type { FunctionRegistry } from '../types/functions.ts';
import type { EvaluationContext } from '../types/context.ts';
import type { AggregationCache } from './evaluator.types.ts';
import {
  findAggregationCalls,
  deduplicateAggregationCalls,
  extractScalarArguments,
  prepareAggregationArgs,
  createAggregationCacheKey,
  type AggregationCallInfo,
} from './aggregation-computer.view-model.ts';

/**
 * Context for aggregation computation.
 *
 * Provides access to variable values across all rows and the function registry.
 */
export interface AggregationComputeContext {
  /**
   * Gets all values for a variable across all rows.
   *
   * @param name - Variable name (without @ prefix)
   * @returns Array of values for all rows, or empty array if variable not found
   */
  getVariableValues(name: string): Value[];

  /**
   * The function registry containing aggregation function implementations.
   */
  registry: FunctionRegistry;
}

/**
 * Result of computing aggregations for a formula.
 */
export interface AggregationComputeResult {
  /**
   * The cache containing all computed aggregation values.
   * Keys are in the format "FUNCTION_NAME:variableName".
   */
  readonly cache: AggregationCache;

  /**
   * List of aggregation calls that were computed.
   * Useful for debugging and display purposes.
   */
  readonly aggregations: readonly AggregationCallInfo[];
}

/**
 * Computes all aggregations in an AST and returns a cache of results.
 *
 * This function:
 * 1. Walks the AST to find all aggregation function calls
 * 2. Deduplicates calls to avoid redundant computation
 * 3. Computes each aggregation once using the full variable data
 * 4. Returns a cache for use during row-level evaluation
 *
 * @param ast - The AST to analyze for aggregation calls
 * @param context - Context providing variable values and function registry
 * @returns Promise resolving to the aggregation cache and metadata
 *
 * @example
 * ```typescript
 * // For formula: @price * (1 - AVG(@discount))
 * const result = await computeAggregations(ast, {
 *   getVariableValues: (name) => variableData[name] ?? [],
 *   registry: functionRegistry,
 * });
 *
 * // result.cache contains: Map { "AVG:discount" => { type: "number.float", value: 0.1375 } }
 * ```
 */
export async function computeAggregations(
  ast: ASTNode,
  context: AggregationComputeContext,
): Promise<AggregationComputeResult> {
  const registry = context.registry;

  // Step 1: Find all aggregation calls in the AST
  const allCalls = findAggregationCalls(ast, registry);

  // Step 2: Deduplicate (same aggregation might appear multiple times)
  const uniqueCalls = deduplicateAggregationCalls(allCalls);

  // Step 3: Compute each aggregation
  const cache = new Map<string, Value>();

  for (const call of uniqueCalls) {
    const result = await computeSingleAggregation(call, context);
    const cacheKey = createAggregationCacheKey(call.functionName, call.variableName);
    cache.set(cacheKey, result);
  }

  return {
    cache,
    aggregations: uniqueCalls,
  };
}

/**
 * Computes a single aggregation function call.
 *
 * @param call - Information about the aggregation call
 * @param context - The aggregation compute context
 * @returns Promise resolving to the computed value
 */
async function computeSingleAggregation(
  call: AggregationCallInfo,
  context: AggregationComputeContext,
): Promise<Value> {
  const fn = context.registry.get(call.functionName);

  if (fn === undefined) {
    // Function not found - return null
    // This should not happen if validation passed
    return { type: 'number.float', value: null };
  }

  // Get all values for the variable being aggregated
  const variableValues = context.getVariableValues(call.variableName);

  // Extract any additional scalar arguments (e.g., k for PERCENTILE)
  const scalarArgs = extractScalarArguments(call.node);

  // Prepare the arguments for the aggregation function
  const args = prepareAggregationArgs(variableValues, scalarArgs);

  // Create a minimal evaluation context for the function call
  const evalContext: EvaluationContext = {
    variables: {
      [call.variableName]: variableValues,
    },
    rowCount: variableValues.length,
  };

  try {
    const result = await fn.evaluate(args, evalContext);

    if (result === null) {
      return { type: fn.returnType, value: null };
    }

    return result;
  } catch {
    // Function threw an error - return null
    return { type: fn.returnType, value: null };
  }
}

/**
 * Creates an AggregationComputeContext from an EvaluationContext.
 *
 * This is a convenience function for converting between context types.
 *
 * @param evalContext - The evaluation context with variable data
 * @param registry - The function registry
 * @returns An AggregationComputeContext for use with computeAggregations
 */
export function createAggregationComputeContext(
  evalContext: EvaluationContext,
  registry: FunctionRegistry,
): AggregationComputeContext {
  return {
    getVariableValues(name: string): Value[] {
      const values = evalContext.variables[name];
      if (values === undefined) {
        return [];
      }
      // Convert readonly array to mutable for the return type
      return [...values];
    },
    registry,
  };
}

/**
 * Checks if an AST contains any aggregation function calls.
 *
 * This is a quick check to determine if aggregation pre-computation
 * is needed before row-level evaluation.
 *
 * @param ast - The AST to check
 * @param registry - The function registry
 * @returns True if the AST contains aggregation calls
 */
export function hasAggregations(ast: ASTNode, registry: FunctionRegistry): boolean {
  const calls = findAggregationCalls(ast, registry);
  return calls.length > 0;
}

/**
 * Gets the list of aggregation function names used in an AST.
 *
 * @param ast - The AST to analyze
 * @param registry - The function registry
 * @returns Array of unique aggregation function names
 */
export function getAggregationFunctionNames(ast: ASTNode, registry: FunctionRegistry): string[] {
  const calls = findAggregationCalls(ast, registry);
  const names = new Set<string>();

  for (const call of calls) {
    names.add(call.functionName);
  }

  return Array.from(names);
}
