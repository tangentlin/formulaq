/**
 * Pure graph algorithm functions for dependency management.
 *
 * This module contains pure functions for building dependency graphs,
 * detecting cycles, and updating variable references in formulas.
 * These functions have no side effects and are designed for testability.
 *
 * @module
 */

import type { DependencyGraph } from './topological-sort.ts';
import {
  topologicalSort,
  detectCycle,
  getDependents as getDependentsFromGraph,
  getDirectDependents,
  createDependencyGraph,
} from './topological-sort.ts';

/**
 * Information about a formula column for dependency tracking.
 */
export interface FormulaColumnInfo {
  /**
   * The field name (column identifier).
   */
  readonly field: string;

  /**
   * The formula expression string.
   */
  readonly formula: string;

  /**
   * Array of column fields this formula references.
   */
  readonly dependencies: readonly string[];
}

/**
 * Result of building a dependency graph.
 */
export interface BuildGraphResult {
  /**
   * The constructed dependency graph.
   */
  readonly graph: DependencyGraph;

  /**
   * Map from field name to formula info.
   */
  readonly columnMap: ReadonlyMap<string, FormulaColumnInfo>;
}

/**
 * Builds a dependency graph from formula column information.
 *
 * Creates a directed graph where nodes are column fields and edges
 * represent dependency relationships (field A depends on field B).
 *
 * @param columns - Array of formula column information
 * @returns The constructed dependency graph and column map
 *
 * @example
 * ```typescript
 * const columns = [
 *   { field: 'total', formula: '@price * @quantity', dependencies: ['price', 'quantity'] },
 *   { field: 'tax', formula: '@total * 0.1', dependencies: ['total'] }
 * ];
 *
 * const result = buildDependencyGraph(columns);
 * // result.graph.nodes = Set { 'total', 'tax' }
 * // result.graph.dependencies = Map { 'total' -> ['price', 'quantity'], 'tax' -> ['total'] }
 * ```
 */
export function buildDependencyGraph(columns: readonly FormulaColumnInfo[]): BuildGraphResult {
  const nodes = new Set<string>();
  const dependencies = new Map<string, readonly string[]>();
  const columnMap = new Map<string, FormulaColumnInfo>();

  for (const column of columns) {
    nodes.add(column.field);
    dependencies.set(column.field, column.dependencies);
    columnMap.set(column.field, column);
  }

  const graph = createDependencyGraph(nodes, dependencies);

  return {
    graph,
    columnMap,
  };
}

/**
 * Gets the evaluation order for formula columns.
 *
 * Returns columns in topological order: columns with no formula dependencies
 * first, then columns that depend only on already-computed columns.
 *
 * @param graph - The dependency graph
 * @returns Array of field names in evaluation order, or null if cycle detected
 *
 * @example
 * ```typescript
 * const order = getEvaluationOrder(graph);
 * // order = ['price', 'quantity', 'total', 'tax']
 * ```
 */
export function getEvaluationOrder(graph: DependencyGraph): readonly string[] | null {
  const result = topologicalSort(graph);
  if (!result.success) {
    return null;
  }
  return result.sorted;
}

/**
 * Checks if the dependency graph has any cycles.
 *
 * @param graph - The dependency graph to check
 * @returns True if a cycle exists, false otherwise
 */
export function hasCycle(graph: DependencyGraph): boolean {
  return detectCycle(graph) !== null;
}

/**
 * Gets the cycle path if one exists in the graph.
 *
 * @param graph - The dependency graph to check
 * @returns The cycle path as field names, or null if no cycle
 *
 * @example
 * ```typescript
 * // If 'a' depends on 'b', 'b' depends on 'c', 'c' depends on 'a':
 * const path = getCyclePath(graph);
 * // path = ['a', 'b', 'c', 'a']
 * ```
 */
export function getCyclePath(graph: DependencyGraph): readonly string[] | null {
  return detectCycle(graph);
}

/**
 * Gets all columns that depend on a given column (transitively).
 *
 * This is useful for determining what columns need to be recalculated
 * when a source column changes.
 *
 * @param field - The field name to find dependents for
 * @param graph - The dependency graph
 * @returns Array of field names that depend on the given column
 *
 * @example
 * ```typescript
 * // If 'tax' depends on 'total', and 'total' depends on 'price':
 * const dependents = getDependents('price', graph);
 * // dependents = ['total', 'tax']
 * ```
 */
export function getDependents(field: string, graph: DependencyGraph): readonly string[] {
  const dependentSet = getDependentsFromGraph(field, graph);
  return Array.from(dependentSet);
}

/**
 * Gets columns that block deletion of a given column.
 *
 * A column blocks deletion if it depends on the column being deleted.
 * Only direct dependents are returned (columns that directly reference
 * the given column in their formula).
 *
 * @param field - The field name to check for blockers
 * @param graph - The dependency graph
 * @returns Array of field names that block deletion
 *
 * @example
 * ```typescript
 * // If 'tax' depends on 'total' directly:
 * const blockers = getBlockers('total', graph);
 * // blockers = ['tax']
 * ```
 */
export function getBlockers(field: string, graph: DependencyGraph): readonly string[] {
  return getDirectDependents(field, graph);
}

/**
 * Updates a variable reference in a formula string.
 *
 * Replaces all occurrences of @oldName with @newName in the formula,
 * being careful to only match complete variable names.
 *
 * @param formula - The original formula string
 * @param oldName - The old variable name (without @ prefix)
 * @param newName - The new variable name (without @ prefix)
 * @returns The updated formula string
 *
 * @example
 * ```typescript
 * const updated = updateVariableInFormula('@price * @quantity', 'price', 'unitPrice');
 * // updated = '@unitPrice * @quantity'
 * ```
 */
export function updateVariableInFormula(formula: string, oldName: string, newName: string): string {
  // Escape special regex characters in the old name
  const escapedOldName = escapeRegexChars(oldName);

  // Match @oldName where it's a complete variable name
  // Variable names can contain alphanumeric, underscore, and dots
  // We need to ensure we're not matching a substring of a longer variable name
  const pattern = new RegExp(`@${escapedOldName}(?![a-zA-Z0-9_\\.])`, 'g');

  return formula.replace(pattern, `@${newName}`);
}

/**
 * Escapes special regex characters in a string.
 *
 * @param str - The string to escape
 * @returns The escaped string safe for use in a regex pattern
 */
function escapeRegexChars(str: string): string {
  // Escape special regex characters: . * + ? ^ $ { } [ ] | ( ) \ /
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Updates all formulas that reference a renamed column.
 *
 * @param oldName - The old column name
 * @param newName - The new column name
 * @param columns - Map of field names to formula info
 * @returns Map of field names to updated formulas (only includes changed formulas)
 *
 * @example
 * ```typescript
 * const columns = new Map([
 *   ['total', { field: 'total', formula: '@price * @quantity', dependencies: ['price', 'quantity'] }],
 *   ['tax', { field: 'tax', formula: '@total * 0.1', dependencies: ['total'] }]
 * ]);
 *
 * const updates = updateReferences('price', 'unitPrice', columns);
 * // updates = Map { 'total' -> '@unitPrice * @quantity' }
 * ```
 */
export function updateReferences(
  oldName: string,
  newName: string,
  columns: ReadonlyMap<string, FormulaColumnInfo>,
): Map<string, string> {
  const updates = new Map<string, string>();

  for (const [field, info] of columns) {
    // Check if this formula references the old name
    if (info.dependencies.includes(oldName)) {
      const updatedFormula = updateVariableInFormula(info.formula, oldName, newName);

      // Only add to updates if the formula actually changed
      if (updatedFormula !== info.formula) {
        updates.set(field, updatedFormula);
      }
    }
  }

  return updates;
}

/**
 * Extracts dependencies from a formula string.
 *
 * This function parses the formula and collects all variable references.
 * It returns unique variable names in the order they first appear.
 *
 * Note: This is a simpler regex-based extraction for cases where
 * full parsing is not required. For full validation, use the parser.
 *
 * @param formula - The formula string to extract dependencies from
 * @returns Array of unique variable names (without @ prefix)
 *
 * @example
 * ```typescript
 * const deps = extractDependenciesFromFormula('@x + @y * @x');
 * // deps = ['x', 'y']
 * ```
 */
export function extractDependenciesFromFormula(formula: string): readonly string[] {
  // Match @variableName patterns
  // Variable names can contain: letters, digits, underscores, and dots
  const pattern = /@([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*)/g;

  const seen = new Set<string>();
  const dependencies: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(formula)) !== null) {
    const varName = match[1];
    if (varName !== undefined && !seen.has(varName)) {
      seen.add(varName);
      dependencies.push(varName);
    }
  }

  return dependencies;
}

/**
 * Validates that adding a new formula column would not create a cycle.
 *
 * @param field - The field name for the new column
 * @param dependencies - The dependencies of the new formula
 * @param existingGraph - The current dependency graph
 * @returns The cycle path if adding would create a cycle, null otherwise
 */
export function wouldCreateCycle(
  field: string,
  dependencies: readonly string[],
  existingGraph: DependencyGraph,
): readonly string[] | null {
  // Create a new graph with the proposed addition
  const newNodes = new Set(existingGraph.nodes);
  newNodes.add(field);

  const newDeps = new Map(existingGraph.dependencies);
  newDeps.set(field, dependencies);

  const newGraph = createDependencyGraph(newNodes, newDeps);
  return detectCycle(newGraph);
}
