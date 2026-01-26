/**
 * Aggregation detection for formula validation.
 *
 * This module provides the main API for detecting aggregation function calls
 * in a formula AST. It uses the function registry to determine which functions
 * are aggregation functions.
 *
 * @module
 */

import type { ASTNode, FunctionCallNode } from '../types/ast.ts';
import type { FunctionInfo, FunctionRegistry } from '../types/functions.ts';
import {
  detectAggregations as detectAggregationsPure,
  getAggregationInfos as getAggregationInfosPure,
  type AggregationInfo,
} from './aggregation-detector.view-model.ts';

/**
 * Result of aggregation detection for the validator.
 */
export interface AggregationDetectionResult {
  /**
   * Whether any aggregation functions are used in the formula.
   */
  readonly hasAggregations: boolean;

  /**
   * List of unique aggregation function names found.
   * Ordered by first occurrence in the AST.
   * Examples: ['AVG', 'SUM', 'MAX']
   */
  readonly aggregations: readonly string[];

  /**
   * All aggregation function call nodes found in the AST.
   * Useful for aggregation pre-computation during evaluation.
   */
  readonly aggregationCalls: readonly FunctionCallNode[];
}

/**
 * Detects all aggregation function calls in an AST.
 *
 * This function traverses the AST, finds all function calls, and checks
 * which ones are aggregation functions using the function registry.
 *
 * @param ast - The parsed AST to analyze
 * @param registry - The function registry to check for aggregation functions
 * @returns Aggregation detection result
 *
 * @example
 * ```typescript
 * const result = detectAggregationsFromAst(ast, registry);
 *
 * if (result.hasAggregations) {
 *   console.log('Formula uses aggregations:', result.aggregations);
 * }
 * ```
 */
export function detectAggregationsFromAst(
  ast: ASTNode,
  registry: FunctionRegistry,
): AggregationDetectionResult {
  const result = detectAggregationsPure({
    ast,
    getFunction: function getFunc(name: string): FunctionInfo | undefined {
      return registry.get(name);
    },
  });

  return {
    hasAggregations: result.hasAggregations,
    aggregations: result.aggregations,
    aggregationCalls: result.aggregationCalls,
  };
}

/**
 * Checks if a formula uses any aggregation functions.
 *
 * This is a convenience function for when you only need to know
 * whether aggregations are present, without needing the full list.
 *
 * @param ast - The parsed AST to check
 * @param registry - The function registry
 * @returns true if the formula uses any aggregation functions
 *
 * @example
 * ```typescript
 * if (hasAggregations(ast, registry)) {
 *   console.log('Formula requires aggregation pre-computation');
 * }
 * ```
 */
export function hasAggregations(ast: ASTNode, registry: FunctionRegistry): boolean {
  const result = detectAggregationsFromAst(ast, registry);
  return result.hasAggregations;
}

/**
 * Gets the list of aggregation function names used in a formula.
 *
 * Returns unique names in the order they first appear in the AST.
 *
 * @param ast - The parsed AST to analyze
 * @param registry - The function registry
 * @returns Array of unique aggregation function names
 *
 * @example
 * ```typescript
 * const names = getAggregationNames(ast, registry);
 * // names = ['AVG', 'SUM']
 * ```
 */
export function getAggregationNames(ast: ASTNode, registry: FunctionRegistry): readonly string[] {
  const result = detectAggregationsFromAst(ast, registry);
  return result.aggregations;
}

/**
 * Gets detailed information about all aggregation calls in a formula.
 *
 * This includes the function name, the AST node, and the variable name
 * being aggregated (if the first argument is a variable reference).
 *
 * @param ast - The parsed AST to analyze
 * @param registry - The function registry
 * @returns Array of aggregation info objects
 *
 * @example
 * ```typescript
 * const infos = getAggregationDetails(ast, registry);
 * for (const info of infos) {
 *   if (info.variableName) {
 *     console.log(`${info.functionName}(@${info.variableName})`);
 *   }
 * }
 * ```
 */
export function getAggregationDetails(
  ast: ASTNode,
  registry: FunctionRegistry,
): readonly AggregationInfo[] {
  return getAggregationInfosPure({
    ast,
    getFunction: function getFunc(name: string): FunctionInfo | undefined {
      return registry.get(name);
    },
  });
}

// Re-export types for convenience
export type { AggregationInfo } from './aggregation-detector.view-model.ts';
