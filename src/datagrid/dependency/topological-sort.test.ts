/**
 * Tests for topological sort utility.
 *
 * These tests verify:
 * - Correct topological ordering of dependency graphs
 * - Cycle detection in graphs
 * - Getting dependents of a node
 * - Edge cases like empty graphs and self-references
 *
 * @module
 */

import { describe, expect, it } from 'vitest';

import {
  topologicalSort,
  detectCycle,
  createDependencyGraph,
  getDependents,
  getDirectDependents,
  type DependencyGraph,
} from './topological-sort.ts';

// =============================================================================
// Test helpers
// =============================================================================

/**
 * Creates a test dependency graph.
 */
function createTestGraph(nodes: string[], deps: Array<[string, string[]]>): DependencyGraph {
  return createDependencyGraph(new Set(nodes), new Map(deps));
}

// =============================================================================
// topologicalSort tests
// =============================================================================

describe('topologicalSort', function topologicalSortTests() {
  it('should return empty array for empty graph', function emptyGraphTest() {
    const graph = createTestGraph([], []);
    const result = topologicalSort(graph);

    expect(result.success).toBe(true);
    expect(result.sorted).toEqual([]);
    expect(result.cyclePath).toBeNull();
  });

  it('should handle single node with no dependencies', function singleNodeTest() {
    const graph = createTestGraph(['a'], [['a', []]]);
    const result = topologicalSort(graph);

    expect(result.success).toBe(true);
    expect(result.sorted).toEqual(['a']);
  });

  it('should sort linear dependency chain', function linearChainTest() {
    // a -> b -> c (c depends on b, b depends on a)
    const graph = createTestGraph(
      ['a', 'b', 'c'],
      [
        ['a', []],
        ['b', ['a']],
        ['c', ['b']],
      ],
    );
    const result = topologicalSort(graph);

    expect(result.success).toBe(true);
    expect(result.sorted).toEqual(['a', 'b', 'c']);
  });

  it('should sort diamond dependency pattern', function diamondPatternTest() {
    // a -> b, a -> c, b -> d, c -> d
    const graph = createTestGraph(
      ['a', 'b', 'c', 'd'],
      [
        ['a', []],
        ['b', ['a']],
        ['c', ['a']],
        ['d', ['b', 'c']],
      ],
    );
    const result = topologicalSort(graph);

    expect(result.success).toBe(true);
    // 'a' must come first, 'd' must come last
    // 'b' and 'c' can be in either order but must be after 'a' and before 'd'
    expect(result.sorted[0]).toBe('a');
    expect(result.sorted[3]).toBe('d');
    expect(result.sorted).toContain('b');
    expect(result.sorted).toContain('c');
    expect(result.sorted.indexOf('b')).toBeGreaterThan(result.sorted.indexOf('a'));
    expect(result.sorted.indexOf('c')).toBeGreaterThan(result.sorted.indexOf('a'));
    expect(result.sorted.indexOf('d')).toBeGreaterThan(result.sorted.indexOf('b'));
    expect(result.sorted.indexOf('d')).toBeGreaterThan(result.sorted.indexOf('c'));
  });

  it('should handle multiple independent chains', function multipleIndependentChainsTest() {
    const graph = createTestGraph(
      ['a', 'b', 'x', 'y'],
      [
        ['a', []],
        ['b', ['a']],
        ['x', []],
        ['y', ['x']],
      ],
    );
    const result = topologicalSort(graph);

    expect(result.success).toBe(true);
    expect(result.sorted).toHaveLength(4);
    // 'a' before 'b', 'x' before 'y'
    expect(result.sorted.indexOf('a')).toBeLessThan(result.sorted.indexOf('b'));
    expect(result.sorted.indexOf('x')).toBeLessThan(result.sorted.indexOf('y'));
  });

  it('should handle dependencies on non-formula columns', function externalDepsTest() {
    // 'total' depends on 'price' and 'quantity', which are not formula columns
    const graph = createTestGraph(['total'], [['total', ['price', 'quantity']]]);
    const result = topologicalSort(graph);

    expect(result.success).toBe(true);
    expect(result.sorted).toEqual(['total']);
  });

  it('should detect simple two-node cycle', function twoNodeCycleTest() {
    // a -> b -> a
    const graph = createTestGraph(
      ['a', 'b'],
      [
        ['a', ['b']],
        ['b', ['a']],
      ],
    );
    const result = topologicalSort(graph);

    expect(result.success).toBe(false);
    expect(result.cyclePath).not.toBeNull();
    expect(result.cyclePath).toContain('a');
    expect(result.cyclePath).toContain('b');
  });

  it('should detect self-reference cycle', function selfReferenceTest() {
    // a -> a
    const graph = createTestGraph(['a'], [['a', ['a']]]);
    const result = topologicalSort(graph);

    expect(result.success).toBe(false);
    expect(result.cyclePath).not.toBeNull();
    expect(result.cyclePath).toContain('a');
  });

  it('should detect longer cycle', function longerCycleTest() {
    // a -> b -> c -> a
    const graph = createTestGraph(
      ['a', 'b', 'c'],
      [
        ['a', ['c']],
        ['b', ['a']],
        ['c', ['b']],
      ],
    );
    const result = topologicalSort(graph);

    expect(result.success).toBe(false);
    expect(result.cyclePath).not.toBeNull();
    // All three should be in the cycle
    expect(result.cyclePath!.length).toBeGreaterThanOrEqual(3);
  });

  it('should detect cycle in subset of graph', function partialCycleTest() {
    // x is independent, but a -> b -> a forms a cycle
    const graph = createTestGraph(
      ['x', 'a', 'b'],
      [
        ['x', []],
        ['a', ['b']],
        ['b', ['a']],
      ],
    );
    const result = topologicalSort(graph);

    expect(result.success).toBe(false);
    expect(result.cyclePath).not.toBeNull();
  });
});

// =============================================================================
// detectCycle tests
// =============================================================================

describe('detectCycle', function detectCycleTests() {
  it('should return null for acyclic graph', function acyclicTest() {
    const graph = createTestGraph(
      ['a', 'b', 'c'],
      [
        ['a', []],
        ['b', ['a']],
        ['c', ['a', 'b']],
      ],
    );
    const cyclePath = detectCycle(graph);

    expect(cyclePath).toBeNull();
  });

  it('should return cycle path for cyclic graph', function cyclicTest() {
    const graph = createTestGraph(
      ['a', 'b'],
      [
        ['a', ['b']],
        ['b', ['a']],
      ],
    );
    const cyclePath = detectCycle(graph);

    expect(cyclePath).not.toBeNull();
    expect(cyclePath!.length).toBeGreaterThanOrEqual(2);
  });

  it('should return null for empty graph', function emptyGraphTest() {
    const graph = createTestGraph([], []);
    const cyclePath = detectCycle(graph);

    expect(cyclePath).toBeNull();
  });
});

// =============================================================================
// getDependents tests
// =============================================================================

describe('getDependents', function getDependentsTests() {
  it('should return empty set for node with no dependents', function noDependentsTest() {
    const graph = createTestGraph(
      ['a', 'b'],
      [
        ['a', []],
        ['b', ['a']],
      ],
    );
    const dependents = getDependents('b', graph);

    expect(dependents.size).toBe(0);
  });

  it('should return direct dependents', function directDependentsTest() {
    const graph = createTestGraph(
      ['a', 'b', 'c'],
      [
        ['a', []],
        ['b', ['a']],
        ['c', ['a']],
      ],
    );
    const dependents = getDependents('a', graph);

    expect(dependents.size).toBe(2);
    expect(dependents.has('b')).toBe(true);
    expect(dependents.has('c')).toBe(true);
  });

  it('should return transitive dependents', function transitiveDependentsTest() {
    // a <- b <- c (c depends on b, b depends on a)
    const graph = createTestGraph(
      ['a', 'b', 'c'],
      [
        ['a', []],
        ['b', ['a']],
        ['c', ['b']],
      ],
    );
    const dependents = getDependents('a', graph);

    expect(dependents.size).toBe(2);
    expect(dependents.has('b')).toBe(true);
    expect(dependents.has('c')).toBe(true);
  });

  it('should return dependents in diamond pattern', function diamondDependentsTest() {
    const graph = createTestGraph(
      ['a', 'b', 'c', 'd'],
      [
        ['a', []],
        ['b', ['a']],
        ['c', ['a']],
        ['d', ['b', 'c']],
      ],
    );
    const dependents = getDependents('a', graph);

    expect(dependents.size).toBe(3);
    expect(dependents.has('b')).toBe(true);
    expect(dependents.has('c')).toBe(true);
    expect(dependents.has('d')).toBe(true);
  });

  it('should handle node not in graph', function nodeNotInGraphTest() {
    const graph = createTestGraph(['a'], [['a', []]]);
    const dependents = getDependents('nonexistent', graph);

    expect(dependents.size).toBe(0);
  });
});

// =============================================================================
// getDirectDependents tests
// =============================================================================

describe('getDirectDependents', function getDirectDependentsTests() {
  it('should return only direct dependents', function directOnlyTest() {
    // a <- b <- c
    const graph = createTestGraph(
      ['a', 'b', 'c'],
      [
        ['a', []],
        ['b', ['a']],
        ['c', ['b']],
      ],
    );
    const dependents = getDirectDependents('a', graph);

    expect(dependents).toHaveLength(1);
    expect(dependents).toContain('b');
    expect(dependents).not.toContain('c');
  });

  it('should return empty array for leaf node', function leafNodeTest() {
    const graph = createTestGraph(
      ['a', 'b'],
      [
        ['a', []],
        ['b', ['a']],
      ],
    );
    const dependents = getDirectDependents('b', graph);

    expect(dependents).toHaveLength(0);
  });

  it('should return all direct dependents', function multipleDependentsTest() {
    const graph = createTestGraph(
      ['a', 'b', 'c', 'd'],
      [
        ['a', []],
        ['b', ['a']],
        ['c', ['a']],
        ['d', ['a']],
      ],
    );
    const dependents = getDirectDependents('a', graph);

    expect(dependents).toHaveLength(3);
    expect(dependents).toContain('b');
    expect(dependents).toContain('c');
    expect(dependents).toContain('d');
  });
});

// =============================================================================
// createDependencyGraph tests
// =============================================================================

describe('createDependencyGraph', function createDependencyGraphTests() {
  it('should create graph from nodes and dependencies', function createGraphTest() {
    const nodes = new Set(['a', 'b', 'c']);
    const deps = new Map([
      ['a', [] as string[]],
      ['b', ['a']],
      ['c', ['a', 'b']],
    ]);

    const graph = createDependencyGraph(nodes, deps);

    expect(graph.nodes.size).toBe(3);
    expect(graph.dependencies.get('c')).toEqual(['a', 'b']);
  });

  it('should create empty graph', function emptyGraphTest() {
    const graph = createDependencyGraph(new Set(), new Map());

    expect(graph.nodes.size).toBe(0);
    expect(graph.dependencies.size).toBe(0);
  });
});
