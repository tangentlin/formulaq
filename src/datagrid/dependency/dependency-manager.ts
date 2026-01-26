/**
 * DependencyManager for tracking formula column dependencies.
 *
 * This module provides the main API for managing dependencies between
 * formula columns in a DataGrid. It handles:
 * - Building and maintaining a dependency graph
 * - Detecting circular references
 * - Computing evaluation order via topological sort
 * - Propagating column renames to dependent formulas
 *
 * @module
 */

import type { DependencyGraph } from './topological-sort.ts';
import { createDependencyGraph } from './topological-sort.ts';
import type { FormulaColumnInfo } from './dependency-manager.view-model.ts';
import {
  buildDependencyGraph,
  getEvaluationOrder as getEvaluationOrderFromGraph,
  hasCycle as hasCycleInGraph,
  getCyclePath as getCyclePathFromGraph,
  getDependents as getDependentsFromGraph,
  getBlockers as getBlockersFromGraph,
  updateReferences as updateReferencesInFormulas,
  extractDependenciesFromFormula,
  wouldCreateCycle,
} from './dependency-manager.view-model.ts';

/**
 * Manages dependencies between formula columns.
 *
 * The DependencyManager tracks which formula columns depend on which
 * other columns, enabling:
 * - Correct evaluation order (topological sort)
 * - Circular reference detection
 * - Rename propagation (updating formulas when a column is renamed)
 * - Deletion validation (checking if other columns depend on a column)
 *
 * @example
 * ```typescript
 * const manager = new DependencyManager();
 *
 * // Add formula columns
 * manager.addFormulaColumn({
 *   field: 'total',
 *   formula: '@price * @quantity',
 *   dependencies: ['price', 'quantity']
 * });
 *
 * manager.addFormulaColumn({
 *   field: 'tax',
 *   formula: '@total * 0.1',
 *   dependencies: ['total']
 * });
 *
 * // Get evaluation order
 * const order = manager.getEvaluationOrder();
 * // order = ['total', 'tax']
 *
 * // Check for circular references
 * if (manager.hasCycle()) {
 *   console.error('Circular reference detected!');
 * }
 *
 * // Rename a column
 * const updates = manager.updateReferences('price', 'unitPrice');
 * // updates = Map { 'total' -> '@unitPrice * @quantity' }
 * ```
 */
export class DependencyManager {
  /**
   * Map of field names to their formula column info.
   */
  private columns: Map<string, FormulaColumnInfo>;

  /**
   * The current dependency graph (cached, rebuilt on changes).
   */
  private graph: DependencyGraph;

  /**
   * Creates a new DependencyManager instance.
   */
  constructor() {
    this.columns = new Map();
    this.graph = createDependencyGraph(new Set(), new Map());
  }

  /**
   * Adds a formula column to the dependency graph.
   *
   * @param info - Information about the formula column
   *
   * @example
   * ```typescript
   * manager.addFormulaColumn({
   *   field: 'profit',
   *   formula: '@revenue - @cost',
   *   dependencies: ['revenue', 'cost']
   * });
   * ```
   */
  public addFormulaColumn(info: FormulaColumnInfo): void {
    this.columns.set(info.field, info);
    this.rebuildGraph();
  }

  /**
   * Removes a formula column from the dependency graph.
   *
   * Note: This does not check for dependent columns. Use getBlockers()
   * first to check if the column can be safely removed.
   *
   * @param field - The field name of the column to remove
   *
   * @example
   * ```typescript
   * const blockers = manager.getBlockers('total');
   * if (blockers.length === 0) {
   *   manager.removeFormulaColumn('total');
   * }
   * ```
   */
  public removeFormulaColumn(field: string): void {
    this.columns.delete(field);
    this.rebuildGraph();
  }

  /**
   * Updates the formula for an existing formula column.
   *
   * If the column doesn't exist, this creates a new column.
   *
   * @param field - The field name of the column to update
   * @param formula - The new formula string
   *
   * @example
   * ```typescript
   * manager.updateFormulaColumn('profit', '@revenue - @cost - @tax');
   * ```
   */
  public updateFormulaColumn(field: string, formula: string): void {
    const dependencies = extractDependenciesFromFormula(formula);
    const info: FormulaColumnInfo = {
      field,
      formula,
      dependencies,
    };
    this.columns.set(field, info);
    this.rebuildGraph();
  }

  /**
   * Gets the evaluation order for all formula columns.
   *
   * Returns columns in topological order: columns with no formula
   * dependencies first, then columns that depend only on already-computed
   * columns.
   *
   * If a cycle exists, returns an empty array.
   *
   * @returns Array of field names in evaluation order
   *
   * @example
   * ```typescript
   * const order = manager.getEvaluationOrder();
   * for (const field of order) {
   *   evaluateColumn(field);
   * }
   * ```
   */
  public getEvaluationOrder(): readonly string[] {
    const order = getEvaluationOrderFromGraph(this.graph);
    if (order === null) {
      return [];
    }
    return order;
  }

  /**
   * Gets all columns that depend on the given column (transitively).
   *
   * This is useful for determining which columns need to be recalculated
   * when a source column's data changes.
   *
   * @param field - The field name to find dependents for
   * @returns Array of field names that depend on the given column
   *
   * @example
   * ```typescript
   * const dependents = manager.getDependents('price');
   * // If 'total' depends on 'price', and 'tax' depends on 'total':
   * // dependents = ['total', 'tax']
   * ```
   */
  public getDependents(field: string): readonly string[] {
    return getDependentsFromGraph(field, this.graph);
  }

  /**
   * Gets columns that block deletion of the given column.
   *
   * Returns columns that directly reference the given column in their
   * formula. These must be updated or deleted before the target column
   * can be safely removed.
   *
   * @param field - The field name to check for blockers
   * @returns Array of field names that block deletion
   *
   * @example
   * ```typescript
   * const blockers = manager.getBlockers('total');
   * if (blockers.length > 0) {
   *   console.log(`Cannot delete: used by ${blockers.join(', ')}`);
   * }
   * ```
   */
  public getBlockers(field: string): readonly string[] {
    return getBlockersFromGraph(field, this.graph);
  }

  /**
   * Checks if the dependency graph contains any cycles.
   *
   * @returns True if a circular reference exists, false otherwise
   *
   * @example
   * ```typescript
   * if (manager.hasCycle()) {
   *   const path = manager.getCyclePath();
   *   console.error(`Circular reference: ${path?.join(' -> ')}`);
   * }
   * ```
   */
  public hasCycle(): boolean {
    return hasCycleInGraph(this.graph);
  }

  /**
   * Gets the cycle path if a circular reference exists.
   *
   * @returns Array of field names forming the cycle, or null if no cycle
   *
   * @example
   * ```typescript
   * const path = manager.getCyclePath();
   * // If 'a' -> 'b' -> 'c' -> 'a':
   * // path = ['a', 'b', 'c', 'a']
   * ```
   */
  public getCyclePath(): readonly string[] | null {
    return getCyclePathFromGraph(this.graph);
  }

  /**
   * Updates all formulas that reference a renamed column.
   *
   * Returns a map of field names to updated formula strings. The caller
   * is responsible for applying these updates and persisting them.
   *
   * @param oldName - The old column name
   * @param newName - The new column name
   * @returns Map of field names to updated formulas
   *
   * @example
   * ```typescript
   * const updates = manager.updateReferences('price', 'unitPrice');
   * for (const [field, newFormula] of updates) {
   *   await saveFormula(field, newFormula);
   * }
   * ```
   */
  public updateReferences(oldName: string, newName: string): Map<string, string> {
    const updates = updateReferencesInFormulas(oldName, newName, this.columns);

    // Apply updates to our internal state
    for (const [field, newFormula] of updates) {
      const existing = this.columns.get(field);
      if (existing !== undefined) {
        // Update dependencies to reflect the rename
        const newDependencies = existing.dependencies.map(function renameDep(dep: string): string {
          return dep === oldName ? newName : dep;
        });

        this.columns.set(field, {
          field,
          formula: newFormula,
          dependencies: newDependencies,
        });
      }
    }

    // Rebuild the graph if any updates were made
    if (updates.size > 0) {
      this.rebuildGraph();
    }

    return updates;
  }

  /**
   * Checks if adding a formula column would create a cycle.
   *
   * Use this before adding a column to validate the formula.
   *
   * @param field - The proposed field name
   * @param dependencies - The proposed dependencies
   * @returns The cycle path if adding would create a cycle, null otherwise
   *
   * @example
   * ```typescript
   * const cyclePath = manager.wouldCreateCycle('result', ['total', 'result']);
   * if (cyclePath !== null) {
   *   console.error('Cannot add: would create circular reference');
   * }
   * ```
   */
  public wouldCreateCycle(
    field: string,
    dependencies: readonly string[],
  ): readonly string[] | null {
    return wouldCreateCycle(field, dependencies, this.graph);
  }

  /**
   * Gets all formula columns currently tracked.
   *
   * @returns Map of field names to formula column info
   */
  public getColumns(): ReadonlyMap<string, FormulaColumnInfo> {
    return this.columns;
  }

  /**
   * Gets information about a specific formula column.
   *
   * @param field - The field name to look up
   * @returns The column info, or undefined if not found
   */
  public getColumn(field: string): FormulaColumnInfo | undefined {
    return this.columns.get(field);
  }

  /**
   * Checks if a formula column exists.
   *
   * @param field - The field name to check
   * @returns True if the column exists, false otherwise
   */
  public hasColumn(field: string): boolean {
    return this.columns.has(field);
  }

  /**
   * Clears all formula columns from the manager.
   */
  public clear(): void {
    this.columns.clear();
    this.rebuildGraph();
  }

  /**
   * Rebuilds the dependency graph from the current columns.
   */
  private rebuildGraph(): void {
    const result = buildDependencyGraph(Array.from(this.columns.values()));
    this.graph = result.graph;
  }
}

/**
 * Creates a new DependencyManager instance.
 *
 * @returns A new DependencyManager
 *
 * @example
 * ```typescript
 * const manager = createDependencyManager();
 * ```
 */
export function createDependencyManager(): DependencyManager {
  return new DependencyManager();
}

// Re-export types
export type { FormulaColumnInfo } from './dependency-manager.view-model.ts';
export type { DependencyGraph, TopologicalSortResult } from './topological-sort.ts';

// Re-export utility functions for direct use
export { extractDependenciesFromFormula } from './dependency-manager.view-model.ts';
