/**
 * Pure computation logic for aggregation pre-computation.
 *
 * This module contains functions for extracting aggregation calls from AST
 * and computing their values. All functions are pure and side-effect free.
 *
 * @module
 */

import type { ASTNode, FunctionCallNode } from '../types/ast.ts';
import type { Value } from '../types/values.ts';
import type { FunctionRegistry } from '../types/functions.ts';

/**
 * Information about an aggregation call found in the AST.
 *
 * Captures the function name and the variable being aggregated.
 */
export interface AggregationCallInfo {
  /**
   * The aggregation function name (e.g., 'SUM', 'AVG', 'COUNT').
   */
  readonly functionName: string;

  /**
   * The variable name being aggregated (without @ prefix).
   * This is extracted from the first argument if it's a VariableRef.
   */
  readonly variableName: string;

  /**
   * The original FunctionCallNode for computing additional arguments.
   * For example, PERCENTILE needs the 'k' value.
   */
  readonly node: FunctionCallNode;
}

/**
 * Creates a cache key for an aggregation result.
 *
 * @param functionName - The aggregation function name
 * @param variableName - The variable name being aggregated
 * @returns A unique cache key in the format "FUNCTION_NAME:variableName"
 */
export function createAggregationCacheKey(functionName: string, variableName: string): string {
  return `${functionName}:${variableName}`;
}

/**
 * Checks if a function is an aggregation function.
 *
 * @param functionName - The function name to check
 * @param registry - The function registry
 * @returns True if the function is an aggregation function
 */
export function isAggregationFunction(functionName: string, registry: FunctionRegistry): boolean {
  const fn = registry.get(functionName);
  if (fn === undefined) {
    return false;
  }
  return fn.isAggregation === true;
}

/**
 * Extracts aggregation call information from a FunctionCallNode.
 *
 * For aggregation functions, the first argument is typically a variable reference.
 * This function extracts that variable name.
 *
 * @param node - The function call node
 * @returns The aggregation call info, or null if not a valid aggregation call
 */
export function extractAggregationCallInfo(node: FunctionCallNode): AggregationCallInfo | null {
  if (node.args.length === 0) {
    return null;
  }

  const firstArg = node.args[0];
  if (firstArg === undefined) {
    return null;
  }

  // The first argument should be a variable reference
  if (firstArg.type !== 'VariableRef') {
    return null;
  }

  return {
    functionName: node.name,
    variableName: firstArg.name,
    node,
  };
}

/**
 * Recursively finds all aggregation calls in an AST.
 *
 * Walks the entire AST tree and collects all aggregation function calls.
 * Handles nested aggregations if present.
 *
 * @param node - The AST node to search
 * @param registry - The function registry to check if functions are aggregations
 * @returns Array of aggregation call info objects
 */
export function findAggregationCalls(
  node: ASTNode,
  registry: FunctionRegistry,
): AggregationCallInfo[] {
  const result: AggregationCallInfo[] = [];
  collectAggregationCalls(node, registry, result);
  return result;
}

/**
 * Internal helper that collects aggregation calls into an array.
 *
 * @param node - The current AST node
 * @param registry - The function registry
 * @param result - Array to collect results into
 */
function collectAggregationCalls(
  node: ASTNode,
  registry: FunctionRegistry,
  result: AggregationCallInfo[],
): void {
  switch (node.type) {
    case 'Literal':
      // Literals don't contain aggregations
      return;

    case 'VariableRef':
      // Variable references don't contain aggregations
      return;

    case 'BinaryOp':
      // Check both operands
      collectAggregationCalls(node.left, registry, result);
      collectAggregationCalls(node.right, registry, result);
      return;

    case 'UnaryOp':
      // Check the operand
      collectAggregationCalls(node.operand, registry, result);
      return;

    case 'FunctionCall':
      // Check if this is an aggregation function
      if (isAggregationFunction(node.name, registry)) {
        const info = extractAggregationCallInfo(node);
        if (info !== null) {
          result.push(info);
        }
      }
      // Also check all arguments for nested aggregations
      for (const arg of node.args) {
        collectAggregationCalls(arg, registry, result);
      }
      return;
  }
}

/**
 * Deduplicates aggregation calls based on their cache keys.
 *
 * If the same aggregation is used multiple times (e.g., AVG(@x) appears twice),
 * we only need to compute it once.
 *
 * @param calls - Array of aggregation call info
 * @returns Deduplicated array of aggregation calls
 */
export function deduplicateAggregationCalls(
  calls: readonly AggregationCallInfo[],
): AggregationCallInfo[] {
  const seen = new Set<string>();
  const result: AggregationCallInfo[] = [];

  for (const call of calls) {
    const key = createAggregationCacheKey(call.functionName, call.variableName);
    if (!seen.has(key)) {
      seen.add(key);
      result.push(call);
    }
  }

  return result;
}

/**
 * Evaluates additional scalar arguments for aggregation functions.
 *
 * Some aggregation functions like PERCENTILE have additional arguments
 * beyond the variable reference. This extracts those values.
 *
 * @param node - The function call node
 * @returns Array of evaluated scalar argument values
 */
export function extractScalarArguments(node: FunctionCallNode): Array<Value | null> {
  const result: Array<Value | null> = [];

  // Skip the first argument (variable reference) and extract remaining literals
  for (let i = 1; i < node.args.length; i++) {
    const arg = node.args[i];
    if (arg === undefined) {
      result.push(null);
      continue;
    }

    if (arg.type === 'Literal') {
      result.push({
        type: arg.valueType,
        value: arg.value,
      });
    } else {
      // Non-literal arguments are not supported for scalar extraction
      // This could be extended to handle simple expressions if needed
      result.push(null);
    }
  }

  return result;
}

/**
 * Prepares arguments for calling an aggregation function.
 *
 * Aggregation functions receive the full array of values for the variable
 * they are aggregating. For functions like PERCENTILE, additional scalar
 * arguments are appended.
 *
 * @param variableValues - All values for the aggregated variable
 * @param scalarArgs - Additional scalar arguments (e.g., k for PERCENTILE)
 * @returns Combined array of values for the function call
 */
export function prepareAggregationArgs(
  variableValues: readonly Value[],
  scalarArgs: readonly (Value | null)[],
): Value[] {
  // Start with all the variable values
  const result: Value[] = [...variableValues];

  // Append scalar arguments
  for (const arg of scalarArgs) {
    if (arg !== null) {
      result.push(arg);
    }
  }

  return result;
}
