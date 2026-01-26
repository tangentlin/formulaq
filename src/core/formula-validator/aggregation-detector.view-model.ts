/**
 * Pure logic for aggregation detection in formulas.
 *
 * This module contains the pure functions for detecting aggregation
 * function calls in an AST. It has no dependencies on classes,
 * returning plain data structures.
 *
 * @module
 */

import type { ASTNode, FunctionCallNode } from '../types/ast.ts';
import type { FunctionInfo } from '../types/functions.ts';

/**
 * Input for aggregation detection.
 */
export interface DetectAggregationsInput {
  /**
   * The AST to traverse for aggregation function calls.
   */
  readonly ast: ASTNode;

  /**
   * Function to get a function definition by name.
   * Returns undefined if the function is not found.
   */
  readonly getFunction: (name: string) => FunctionInfo | undefined;
}

/**
 * Result of aggregation detection (pure data).
 */
export interface DetectAggregationsResult {
  /**
   * Whether any aggregation functions are used in the formula.
   */
  readonly hasAggregations: boolean;

  /**
   * List of unique aggregation function names found.
   * Ordered by first occurrence in the AST.
   */
  readonly aggregations: readonly string[];

  /**
   * All aggregation function call nodes found in the AST.
   * May contain duplicates if the same function is called multiple times.
   */
  readonly aggregationCalls: readonly FunctionCallNode[];
}

/**
 * Information about a single aggregation function call.
 */
export interface AggregationInfo {
  /**
   * The name of the aggregation function.
   */
  readonly functionName: string;

  /**
   * The function call node in the AST.
   */
  readonly node: FunctionCallNode;

  /**
   * The variable name being aggregated (if first argument is a variable reference).
   */
  readonly variableName: string | undefined;
}

/**
 * Collects all function call nodes from an AST.
 *
 * @param ast - The AST to traverse
 * @returns Array of function call nodes
 */
export function collectFunctionCallNodes(ast: ASTNode): FunctionCallNode[] {
  const calls: FunctionCallNode[] = [];
  traverseForFunctions(ast, calls);
  return calls;
}

/**
 * Recursive helper to traverse AST and collect function calls.
 *
 * @param node - Current AST node
 * @param calls - Array to accumulate function calls into
 */
function traverseForFunctions(node: ASTNode, calls: FunctionCallNode[]): void {
  switch (node.type) {
    case 'Literal':
      // Literals have no function calls
      break;

    case 'VariableRef':
      // Variable references have no function calls
      break;

    case 'BinaryOp':
      traverseForFunctions(node.left, calls);
      traverseForFunctions(node.right, calls);
      break;

    case 'UnaryOp':
      traverseForFunctions(node.operand, calls);
      break;

    case 'FunctionCall':
      calls.push(node);
      // Also traverse arguments for nested function calls
      for (const arg of node.args) {
        traverseForFunctions(arg, calls);
      }
      break;

    default:
      // Exhaustive check
      assertNever(node);
  }
}

/**
 * Checks if a function is an aggregation function.
 *
 * @param functionName - The name of the function
 * @param getFunction - Function to get function definition
 * @returns true if the function is an aggregation function
 */
export function isAggregationFunction(
  functionName: string,
  getFunction: (name: string) => FunctionInfo | undefined,
): boolean {
  const funcInfo = getFunction(functionName);
  return funcInfo?.isAggregation === true;
}

/**
 * Extracts the variable name from the first argument of a function call.
 *
 * Aggregation functions typically take a variable reference as their first argument.
 *
 * @param functionCall - The function call node
 * @returns The variable name if the first argument is a variable reference, undefined otherwise
 */
export function extractVariableFromFirstArg(functionCall: FunctionCallNode): string | undefined {
  const firstArg = functionCall.args[0];
  if (firstArg === undefined) {
    return undefined;
  }

  if (firstArg.type === 'VariableRef') {
    return firstArg.name;
  }

  return undefined;
}

/**
 * Extracts unique aggregation function names from a list of function calls.
 *
 * Preserves the order of first occurrence.
 *
 * @param calls - Array of function call nodes
 * @param getFunction - Function to get function definition
 * @returns Array of unique aggregation function names
 */
export function extractUniqueAggregationNames(
  calls: readonly FunctionCallNode[],
  getFunction: (name: string) => FunctionInfo | undefined,
): string[] {
  const seen = new Set<string>();
  const unique: string[] = [];

  for (const call of calls) {
    if (!seen.has(call.name) && isAggregationFunction(call.name, getFunction)) {
      seen.add(call.name);
      unique.push(call.name);
    }
  }

  return unique;
}

/**
 * Filters function calls to only include aggregation function calls.
 *
 * @param calls - Array of function call nodes
 * @param getFunction - Function to get function definition
 * @returns Array of aggregation function call nodes
 */
export function filterAggregationCalls(
  calls: readonly FunctionCallNode[],
  getFunction: (name: string) => FunctionInfo | undefined,
): FunctionCallNode[] {
  const aggregationCalls: FunctionCallNode[] = [];

  for (const call of calls) {
    if (isAggregationFunction(call.name, getFunction)) {
      aggregationCalls.push(call);
    }
  }

  return aggregationCalls;
}

/**
 * Detects all aggregation function calls in an AST.
 *
 * This is the main entry point for aggregation detection. It:
 * 1. Collects all function calls from the AST
 * 2. Filters to only aggregation functions
 * 3. Returns unique names and whether aggregations are present
 *
 * @param input - The detection input
 * @returns Detection result with aggregation information
 *
 * @example
 * ```typescript
 * const result = detectAggregations({
 *   ast: parsedAst,
 *   getFunction: (name) => registry.get(name),
 * });
 *
 * if (result.hasAggregations) {
 *   console.log('Aggregations used:', result.aggregations);
 * }
 * ```
 */
export function detectAggregations(input: DetectAggregationsInput): DetectAggregationsResult {
  const allFunctionCalls = collectFunctionCallNodes(input.ast);
  const aggregationCalls = filterAggregationCalls(allFunctionCalls, input.getFunction);
  const aggregations = extractUniqueAggregationNames(allFunctionCalls, input.getFunction);

  return {
    hasAggregations: aggregations.length > 0,
    aggregations,
    aggregationCalls,
  };
}

/**
 * Extracts detailed information about all aggregation calls in an AST.
 *
 * @param input - The detection input
 * @returns Array of aggregation info objects
 *
 * @example
 * ```typescript
 * const infos = getAggregationInfos({
 *   ast: parsedAst,
 *   getFunction: (name) => registry.get(name),
 * });
 *
 * for (const info of infos) {
 *   console.log(`${info.functionName}(@${info.variableName})`);
 * }
 * ```
 */
export function getAggregationInfos(input: DetectAggregationsInput): AggregationInfo[] {
  const allFunctionCalls = collectFunctionCallNodes(input.ast);
  const infos: AggregationInfo[] = [];

  for (const call of allFunctionCalls) {
    if (isAggregationFunction(call.name, input.getFunction)) {
      infos.push({
        functionName: call.name,
        node: call,
        variableName: extractVariableFromFirstArg(call),
      });
    }
  }

  return infos;
}

/**
 * Helper for exhaustive type checking.
 *
 * @param x - Value that should never exist
 */
function assertNever(x: never): never {
  throw new Error(`Unexpected node type: ${(x as ASTNode).type}`);
}
