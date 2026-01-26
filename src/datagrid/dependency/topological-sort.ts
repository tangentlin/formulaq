/**
 * Topological sort utility for dependency graphs.
 *
 * Provides functions for topologically sorting directed acyclic graphs (DAGs)
 * and detecting cycles in dependency relationships.
 *
 * @module
 */

/**
 * Represents a directed graph as an adjacency list.
 * Each key is a node, and its value is an array of nodes it depends on.
 */
export interface DependencyGraph {
  /**
   * Map from node ID to the list of node IDs it depends on.
   */
  readonly dependencies: ReadonlyMap<string, readonly string[]>;

  /**
   * Set of all node IDs in the graph.
   */
  readonly nodes: ReadonlySet<string>;
}

/**
 * Result of a topological sort operation.
 */
export interface TopologicalSortResult {
  /**
   * Whether the sort was successful (no cycles detected).
   */
  readonly success: boolean;

  /**
   * The sorted nodes in evaluation order (dependencies first).
   * Only populated if success is true.
   */
  readonly sorted: readonly string[];

  /**
   * The cycle path if a cycle was detected.
   * Only populated if success is false.
   */
  readonly cyclePath: readonly string[] | null;
}

/**
 * Node state during DFS traversal.
 */
const enum VisitState {
  /** Not yet visited */
  Unvisited = 0,
  /** Currently being processed (on the stack) */
  Visiting = 1,
  /** Fully processed */
  Visited = 2,
}

/**
 * Performs a topological sort using depth-first search (Kahn's algorithm variant).
 *
 * Returns nodes in evaluation order: nodes with no dependencies first,
 * then nodes that depend only on already-sorted nodes.
 *
 * @param graph - The dependency graph to sort
 * @returns The sort result with either sorted nodes or cycle information
 *
 * @example
 * ```typescript
 * const graph: DependencyGraph = {
 *   nodes: new Set(['a', 'b', 'c']),
 *   dependencies: new Map([
 *     ['a', []],          // 'a' has no dependencies
 *     ['b', ['a']],       // 'b' depends on 'a'
 *     ['c', ['a', 'b']]   // 'c' depends on 'a' and 'b'
 *   ])
 * };
 *
 * const result = topologicalSort(graph);
 * // result.sorted = ['a', 'b', 'c']
 * ```
 */
export function topologicalSort(graph: DependencyGraph): TopologicalSortResult {
  const state = new Map<string, VisitState>();
  const result: string[] = [];
  const parent = new Map<string, string>();

  // Initialize all nodes as unvisited
  for (const node of graph.nodes) {
    state.set(node, VisitState.Unvisited);
  }

  // Visit each node
  for (const node of graph.nodes) {
    if (state.get(node) === VisitState.Unvisited) {
      const cycleResult = visitNode(node, graph, state, result, parent);
      if (cycleResult !== null) {
        return {
          success: false,
          sorted: [],
          cyclePath: cycleResult,
        };
      }
    }
  }

  return {
    success: true,
    sorted: result,
    cyclePath: null,
  };
}

/**
 * Visits a node during DFS traversal.
 *
 * @param node - The node to visit
 * @param graph - The dependency graph
 * @param state - Map of node visit states
 * @param result - Array to accumulate sorted nodes
 * @param parent - Map tracking parent nodes for cycle path reconstruction
 * @returns The cycle path if a cycle is detected, null otherwise
 */
function visitNode(
  node: string,
  graph: DependencyGraph,
  state: Map<string, VisitState>,
  result: string[],
  parent: Map<string, string>,
): readonly string[] | null {
  state.set(node, VisitState.Visiting);

  const dependencies = graph.dependencies.get(node) ?? [];
  for (const dep of dependencies) {
    // Check if this dependency is in the graph
    if (!graph.nodes.has(dep)) {
      // Dependency is not a formula column, skip it
      continue;
    }

    const depState = state.get(dep);

    if (depState === VisitState.Visiting) {
      // Found a cycle - reconstruct the path
      return reconstructCyclePath(node, dep, parent);
    }

    if (depState === VisitState.Unvisited) {
      parent.set(dep, node);
      const cycleResult = visitNode(dep, graph, state, result, parent);
      if (cycleResult !== null) {
        return cycleResult;
      }
    }
  }

  state.set(node, VisitState.Visited);
  result.push(node);
  return null;
}

/**
 * Reconstructs the cycle path from parent tracking.
 *
 * @param current - The current node where cycle was detected
 * @param cycleTarget - The node that completes the cycle
 * @param parent - Map of parent relationships
 * @returns The cycle path as an array of node IDs
 */
function reconstructCyclePath(
  current: string,
  cycleTarget: string,
  parent: Map<string, string>,
): readonly string[] {
  const path: string[] = [cycleTarget];
  let node = current;

  // Trace back from current to cycleTarget
  while (node !== cycleTarget) {
    path.unshift(node);
    const parentNode = parent.get(node);
    if (parentNode === undefined) {
      break;
    }
    node = parentNode;
  }

  // Add the cycle target again to show the cycle is complete
  path.push(cycleTarget);
  return path;
}

/**
 * Detects if a graph contains any cycles.
 *
 * @param graph - The dependency graph to check
 * @returns The cycle path if a cycle exists, null otherwise
 *
 * @example
 * ```typescript
 * const cyclePath = detectCycle(graph);
 * if (cyclePath !== null) {
 *   console.log('Cycle detected:', cyclePath.join(' -> '));
 * }
 * ```
 */
export function detectCycle(graph: DependencyGraph): readonly string[] | null {
  const result = topologicalSort(graph);
  return result.cyclePath;
}

/**
 * Creates a dependency graph from formula column information.
 *
 * @param nodes - Set of node IDs to include in the graph
 * @param dependencies - Map from node ID to its dependencies
 * @returns A DependencyGraph object
 */
export function createDependencyGraph(
  nodes: ReadonlySet<string>,
  dependencies: ReadonlyMap<string, readonly string[]>,
): DependencyGraph {
  return {
    nodes,
    dependencies,
  };
}

/**
 * Gets all nodes that depend on a given node (direct and transitive).
 *
 * Uses a reverse traversal of the dependency graph.
 *
 * @param node - The node to find dependents for
 * @param graph - The dependency graph
 * @returns Set of all nodes that depend on the given node
 *
 * @example
 * ```typescript
 * // If 'c' depends on 'b', and 'b' depends on 'a':
 * const dependents = getDependents('a', graph);
 * // dependents = Set { 'b', 'c' }
 * ```
 */
export function getDependents(node: string, graph: DependencyGraph): ReadonlySet<string> {
  // Build reverse graph: for each node, which nodes depend on it
  const reverseDeps = new Map<string, string[]>();

  for (const graphNode of graph.nodes) {
    reverseDeps.set(graphNode, []);
  }

  for (const [dependent, deps] of graph.dependencies) {
    for (const dep of deps) {
      if (graph.nodes.has(dep)) {
        const list = reverseDeps.get(dep);
        if (list !== undefined) {
          list.push(dependent);
        }
      }
    }
  }

  // BFS to find all transitive dependents
  const visited = new Set<string>();
  const queue: string[] = [];

  // Start with direct dependents
  const directDependents = reverseDeps.get(node);
  if (directDependents !== undefined) {
    for (const dep of directDependents) {
      if (!visited.has(dep)) {
        visited.add(dep);
        queue.push(dep);
      }
    }
  }

  // Process queue
  while (queue.length > 0) {
    const current = queue.shift()!;
    const dependents = reverseDeps.get(current);
    if (dependents !== undefined) {
      for (const dep of dependents) {
        if (!visited.has(dep)) {
          visited.add(dep);
          queue.push(dep);
        }
      }
    }
  }

  return visited;
}

/**
 * Gets all direct dependents of a node (not transitive).
 *
 * @param node - The node to find direct dependents for
 * @param graph - The dependency graph
 * @returns Array of nodes that directly depend on the given node
 */
export function getDirectDependents(node: string, graph: DependencyGraph): readonly string[] {
  const dependents: string[] = [];

  for (const [dependent, deps] of graph.dependencies) {
    if (deps.includes(node)) {
      dependents.push(dependent);
    }
  }

  return dependents;
}
