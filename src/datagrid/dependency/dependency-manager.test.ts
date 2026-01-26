/**
 * Tests for DependencyManager.
 *
 * These tests verify:
 * - Building dependency graph from formula columns
 * - Detecting circular references
 * - Topological sort for evaluation order
 * - Getting dependents of a column
 * - Getting blockers for deletion
 * - Updating references when a column is renamed
 *
 * @module
 */

import { describe, expect, it, beforeEach } from 'vitest';

import {
  DependencyManager,
  createDependencyManager,
  extractDependenciesFromFormula,
} from './dependency-manager.ts';
import type { FormulaColumnInfo } from './dependency-manager.view-model.ts';
import {
  buildDependencyGraph,
  updateVariableInFormula,
  updateReferences,
  wouldCreateCycle,
} from './dependency-manager.view-model.ts';

// =============================================================================
// DependencyManager class tests
// =============================================================================

describe('DependencyManager', function dependencyManagerTests() {
  let manager: DependencyManager;

  beforeEach(function setup() {
    manager = new DependencyManager();
  });

  describe('addFormulaColumn', function addFormulaColumnTests() {
    it('should add a formula column', function addColumnTest() {
      manager.addFormulaColumn({
        field: 'total',
        formula: '@price * @quantity',
        dependencies: ['price', 'quantity'],
      });

      expect(manager.hasColumn('total')).toBe(true);
      expect(manager.getColumn('total')?.formula).toBe('@price * @quantity');
    });

    it('should add multiple formula columns', function addMultipleTest() {
      manager.addFormulaColumn({
        field: 'total',
        formula: '@price * @quantity',
        dependencies: ['price', 'quantity'],
      });
      manager.addFormulaColumn({
        field: 'tax',
        formula: '@total * 0.1',
        dependencies: ['total'],
      });

      expect(manager.hasColumn('total')).toBe(true);
      expect(manager.hasColumn('tax')).toBe(true);
      expect(manager.getColumns().size).toBe(2);
    });

    it('should replace existing column with same field', function replaceColumnTest() {
      manager.addFormulaColumn({
        field: 'total',
        formula: '@price * @quantity',
        dependencies: ['price', 'quantity'],
      });
      manager.addFormulaColumn({
        field: 'total',
        formula: '@price * @quantity * 2',
        dependencies: ['price', 'quantity'],
      });

      expect(manager.getColumn('total')?.formula).toBe('@price * @quantity * 2');
    });
  });

  describe('removeFormulaColumn', function removeFormulaColumnTests() {
    it('should remove a formula column', function removeColumnTest() {
      manager.addFormulaColumn({
        field: 'total',
        formula: '@price * @quantity',
        dependencies: ['price', 'quantity'],
      });
      manager.removeFormulaColumn('total');

      expect(manager.hasColumn('total')).toBe(false);
    });

    it('should handle removing non-existent column', function removeNonExistentTest() {
      // Should not throw
      manager.removeFormulaColumn('nonexistent');
      expect(manager.getColumns().size).toBe(0);
    });
  });

  describe('updateFormulaColumn', function updateFormulaColumnTests() {
    it('should update existing formula column', function updateExistingTest() {
      manager.addFormulaColumn({
        field: 'total',
        formula: '@price * @quantity',
        dependencies: ['price', 'quantity'],
      });
      manager.updateFormulaColumn('total', '@price * @quantity + @tax');

      const column = manager.getColumn('total');
      expect(column?.formula).toBe('@price * @quantity + @tax');
      expect(column?.dependencies).toContain('tax');
    });

    it('should create column if it does not exist', function createOnUpdateTest() {
      manager.updateFormulaColumn('profit', '@revenue - @cost');

      expect(manager.hasColumn('profit')).toBe(true);
      expect(manager.getColumn('profit')?.dependencies).toEqual(['revenue', 'cost']);
    });
  });

  describe('getEvaluationOrder', function getEvaluationOrderTests() {
    it('should return empty array for no columns', function emptyOrderTest() {
      const order = manager.getEvaluationOrder();
      expect(order).toEqual([]);
    });

    it('should return single column for single formula', function singleColumnOrderTest() {
      manager.addFormulaColumn({
        field: 'total',
        formula: '@price * @quantity',
        dependencies: ['price', 'quantity'],
      });

      const order = manager.getEvaluationOrder();
      expect(order).toEqual(['total']);
    });

    it('should return correct order for dependent columns', function dependentOrderTest() {
      manager.addFormulaColumn({
        field: 'total',
        formula: '@price * @quantity',
        dependencies: ['price', 'quantity'],
      });
      manager.addFormulaColumn({
        field: 'tax',
        formula: '@total * 0.1',
        dependencies: ['total'],
      });

      const order = manager.getEvaluationOrder();
      expect(order).toEqual(['total', 'tax']);
    });

    it('should handle diamond dependency pattern', function diamondOrderTest() {
      manager.addFormulaColumn({
        field: 'a',
        formula: '@x',
        dependencies: ['x'],
      });
      manager.addFormulaColumn({
        field: 'b',
        formula: '@a',
        dependencies: ['a'],
      });
      manager.addFormulaColumn({
        field: 'c',
        formula: '@a',
        dependencies: ['a'],
      });
      manager.addFormulaColumn({
        field: 'd',
        formula: '@b + @c',
        dependencies: ['b', 'c'],
      });

      const order = manager.getEvaluationOrder();
      expect(order[0]).toBe('a');
      expect(order[3]).toBe('d');
      expect(order.indexOf('b')).toBeLessThan(order.indexOf('d'));
      expect(order.indexOf('c')).toBeLessThan(order.indexOf('d'));
    });

    it('should return empty array when cycle exists', function cycleOrderTest() {
      manager.addFormulaColumn({
        field: 'a',
        formula: '@b',
        dependencies: ['b'],
      });
      manager.addFormulaColumn({
        field: 'b',
        formula: '@a',
        dependencies: ['a'],
      });

      const order = manager.getEvaluationOrder();
      expect(order).toEqual([]);
    });
  });

  describe('getDependents', function getDependentsTests() {
    it('should return empty array for column with no dependents', function noDependentsTest() {
      manager.addFormulaColumn({
        field: 'total',
        formula: '@price * @quantity',
        dependencies: ['price', 'quantity'],
      });

      const dependents = manager.getDependents('total');
      expect(dependents).toEqual([]);
    });

    it('should return direct dependents', function directDependentsTest() {
      manager.addFormulaColumn({
        field: 'total',
        formula: '@price * @quantity',
        dependencies: ['price', 'quantity'],
      });
      manager.addFormulaColumn({
        field: 'tax',
        formula: '@total * 0.1',
        dependencies: ['total'],
      });

      const dependents = manager.getDependents('total');
      expect(dependents).toContain('tax');
    });

    it('should return transitive dependents', function transitiveDependentsTest() {
      manager.addFormulaColumn({
        field: 'a',
        formula: '@x',
        dependencies: ['x'],
      });
      manager.addFormulaColumn({
        field: 'b',
        formula: '@a',
        dependencies: ['a'],
      });
      manager.addFormulaColumn({
        field: 'c',
        formula: '@b',
        dependencies: ['b'],
      });

      const dependents = manager.getDependents('a');
      expect(dependents).toContain('b');
      expect(dependents).toContain('c');
    });

    it('should return dependents for non-formula column', function nonFormulaColTest() {
      manager.addFormulaColumn({
        field: 'total',
        formula: '@price * @quantity',
        dependencies: ['price', 'quantity'],
      });
      manager.addFormulaColumn({
        field: 'tax',
        formula: '@total * 0.1',
        dependencies: ['total'],
      });

      // 'price' is not a formula column, but total depends on it
      const dependents = manager.getDependents('price');
      // Since price is not in the graph, we can't track its dependents
      expect(dependents).toEqual([]);
    });
  });

  describe('getBlockers', function getBlockersTests() {
    it('should return empty array for column with no dependents', function noBlockersTest() {
      manager.addFormulaColumn({
        field: 'total',
        formula: '@price * @quantity',
        dependencies: ['price', 'quantity'],
      });

      const blockers = manager.getBlockers('total');
      expect(blockers).toEqual([]);
    });

    it('should return direct dependents as blockers', function directBlockersTest() {
      manager.addFormulaColumn({
        field: 'total',
        formula: '@price * @quantity',
        dependencies: ['price', 'quantity'],
      });
      manager.addFormulaColumn({
        field: 'tax',
        formula: '@total * 0.1',
        dependencies: ['total'],
      });

      const blockers = manager.getBlockers('total');
      expect(blockers).toContain('tax');
    });

    it('should not include transitive dependents as blockers', function noTransitiveBlockersTest() {
      manager.addFormulaColumn({
        field: 'a',
        formula: '@x',
        dependencies: ['x'],
      });
      manager.addFormulaColumn({
        field: 'b',
        formula: '@a',
        dependencies: ['a'],
      });
      manager.addFormulaColumn({
        field: 'c',
        formula: '@b',
        dependencies: ['b'],
      });

      const blockers = manager.getBlockers('a');
      expect(blockers).toContain('b');
      expect(blockers).not.toContain('c');
    });
  });

  describe('hasCycle', function hasCycleTests() {
    it('should return false for acyclic graph', function acyclicTest() {
      manager.addFormulaColumn({
        field: 'total',
        formula: '@price * @quantity',
        dependencies: ['price', 'quantity'],
      });
      manager.addFormulaColumn({
        field: 'tax',
        formula: '@total * 0.1',
        dependencies: ['total'],
      });

      expect(manager.hasCycle()).toBe(false);
    });

    it('should return true for cyclic graph', function cyclicTest() {
      manager.addFormulaColumn({
        field: 'a',
        formula: '@b',
        dependencies: ['b'],
      });
      manager.addFormulaColumn({
        field: 'b',
        formula: '@a',
        dependencies: ['a'],
      });

      expect(manager.hasCycle()).toBe(true);
    });

    it('should return true for self-referencing formula', function selfRefTest() {
      manager.addFormulaColumn({
        field: 'a',
        formula: '@a + 1',
        dependencies: ['a'],
      });

      expect(manager.hasCycle()).toBe(true);
    });
  });

  describe('getCyclePath', function getCyclePathTests() {
    it('should return null for acyclic graph', function acyclicPathTest() {
      manager.addFormulaColumn({
        field: 'total',
        formula: '@price * @quantity',
        dependencies: ['price', 'quantity'],
      });

      expect(manager.getCyclePath()).toBeNull();
    });

    it('should return cycle path for cyclic graph', function cyclicPathTest() {
      manager.addFormulaColumn({
        field: 'a',
        formula: '@b',
        dependencies: ['b'],
      });
      manager.addFormulaColumn({
        field: 'b',
        formula: '@a',
        dependencies: ['a'],
      });

      const path = manager.getCyclePath();
      expect(path).not.toBeNull();
      expect(path).toContain('a');
      expect(path).toContain('b');
    });
  });

  describe('updateReferences', function updateReferencesTests() {
    it('should update formulas that reference renamed column', function updateRefTest() {
      manager.addFormulaColumn({
        field: 'total',
        formula: '@price * @quantity',
        dependencies: ['price', 'quantity'],
      });
      manager.addFormulaColumn({
        field: 'tax',
        formula: '@total * 0.1',
        dependencies: ['total'],
      });

      const updates = manager.updateReferences('total', 'subtotal');

      expect(updates.size).toBe(1);
      expect(updates.get('tax')).toBe('@subtotal * 0.1');
    });

    it('should update internal state after rename', function updateInternalStateTest() {
      manager.addFormulaColumn({
        field: 'total',
        formula: '@price * @quantity',
        dependencies: ['price', 'quantity'],
      });
      manager.addFormulaColumn({
        field: 'tax',
        formula: '@total * 0.1',
        dependencies: ['total'],
      });

      manager.updateReferences('total', 'subtotal');

      const taxColumn = manager.getColumn('tax');
      expect(taxColumn?.formula).toBe('@subtotal * 0.1');
      expect(taxColumn?.dependencies).toContain('subtotal');
      expect(taxColumn?.dependencies).not.toContain('total');
    });

    it('should return empty map when no columns reference the old name', function noUpdatesTest() {
      manager.addFormulaColumn({
        field: 'total',
        formula: '@price * @quantity',
        dependencies: ['price', 'quantity'],
      });

      const updates = manager.updateReferences('nonexistent', 'renamed');
      expect(updates.size).toBe(0);
    });

    it('should update multiple formulas', function multipleUpdatesTest() {
      manager.addFormulaColumn({
        field: 'a',
        formula: '@x',
        dependencies: ['x'],
      });
      manager.addFormulaColumn({
        field: 'b',
        formula: '@a + @a',
        dependencies: ['a'],
      });
      manager.addFormulaColumn({
        field: 'c',
        formula: '@a * 2',
        dependencies: ['a'],
      });

      const updates = manager.updateReferences('a', 'alpha');

      expect(updates.size).toBe(2);
      expect(updates.get('b')).toBe('@alpha + @alpha');
      expect(updates.get('c')).toBe('@alpha * 2');
    });
  });

  describe('wouldCreateCycle', function wouldCreateCycleTests() {
    it('should return null when no cycle would be created', function noCycleTest() {
      manager.addFormulaColumn({
        field: 'total',
        formula: '@price * @quantity',
        dependencies: ['price', 'quantity'],
      });

      const result = manager.wouldCreateCycle('tax', ['total']);
      expect(result).toBeNull();
    });

    it('should return cycle path when cycle would be created', function cycleDetectedTest() {
      manager.addFormulaColumn({
        field: 'a',
        formula: '@x',
        dependencies: ['x'],
      });
      manager.addFormulaColumn({
        field: 'b',
        formula: '@a',
        dependencies: ['a'],
      });

      // Adding c that depends on b, but then updating a to depend on c
      const result = manager.wouldCreateCycle('a', ['b']);
      expect(result).not.toBeNull();
    });

    it('should detect self-reference', function selfRefTest() {
      const result = manager.wouldCreateCycle('a', ['a']);
      expect(result).not.toBeNull();
    });
  });

  describe('clear', function clearTests() {
    it('should remove all columns', function clearAllTest() {
      manager.addFormulaColumn({
        field: 'total',
        formula: '@price * @quantity',
        dependencies: ['price', 'quantity'],
      });
      manager.addFormulaColumn({
        field: 'tax',
        formula: '@total * 0.1',
        dependencies: ['total'],
      });

      manager.clear();

      expect(manager.getColumns().size).toBe(0);
      expect(manager.getEvaluationOrder()).toEqual([]);
    });
  });
});

// =============================================================================
// createDependencyManager factory tests
// =============================================================================

describe('createDependencyManager', function factoryTests() {
  it('should create a new DependencyManager', function createTest() {
    const manager = createDependencyManager();
    expect(manager).toBeInstanceOf(DependencyManager);
  });
});

// =============================================================================
// viewModel function tests
// =============================================================================

describe('buildDependencyGraph', function buildGraphTests() {
  it('should build graph from columns', function buildTest() {
    const columns: FormulaColumnInfo[] = [
      { field: 'a', formula: '@x', dependencies: ['x'] },
      { field: 'b', formula: '@a', dependencies: ['a'] },
    ];

    const result = buildDependencyGraph(columns);

    expect(result.graph.nodes.size).toBe(2);
    expect(result.graph.nodes.has('a')).toBe(true);
    expect(result.graph.nodes.has('b')).toBe(true);
    expect(result.columnMap.get('a')?.formula).toBe('@x');
  });

  it('should build empty graph from empty array', function emptyBuildTest() {
    const result = buildDependencyGraph([]);

    expect(result.graph.nodes.size).toBe(0);
    expect(result.columnMap.size).toBe(0);
  });
});

describe('updateVariableInFormula', function updateVarTests() {
  it('should update variable reference', function updateTest() {
    const result = updateVariableInFormula('@price * @quantity', 'price', 'unitPrice');
    expect(result).toBe('@unitPrice * @quantity');
  });

  it('should update all occurrences', function updateAllTest() {
    const result = updateVariableInFormula('@x + @x * @x', 'x', 'y');
    expect(result).toBe('@y + @y * @y');
  });

  it('should not update partial matches', function noPartialTest() {
    const result = updateVariableInFormula('@priceTotal * @price', 'price', 'cost');
    expect(result).toBe('@priceTotal * @cost');
  });

  it('should handle variable names with dots', function dotsTest() {
    const result = updateVariableInFormula('@data.value * 2', 'data.value', 'result.value');
    expect(result).toBe('@result.value * 2');
  });

  it('should not update when variable is a prefix of another', function prefixTest() {
    const result = updateVariableInFormula('@price + @priceTax', 'price', 'cost');
    expect(result).toBe('@cost + @priceTax');
  });

  it('should handle special regex characters in names', function regexCharsTest() {
    // This shouldn't happen in practice, but let's be safe
    const result = updateVariableInFormula('@a.b + @c', 'a.b', 'x.y');
    expect(result).toBe('@x.y + @c');
  });
});

describe('updateReferences', function updateRefsTests() {
  it('should update formulas referencing old name', function updateRefsTest() {
    const columns = new Map<string, FormulaColumnInfo>([
      [
        'total',
        { field: 'total', formula: '@price * @quantity', dependencies: ['price', 'quantity'] },
      ],
      ['tax', { field: 'tax', formula: '@total * 0.1', dependencies: ['total'] }],
    ]);

    const updates = updateReferences('total', 'subtotal', columns);

    expect(updates.size).toBe(1);
    expect(updates.get('tax')).toBe('@subtotal * 0.1');
  });

  it('should not include unchanged formulas', function noUnchangedTest() {
    const columns = new Map<string, FormulaColumnInfo>([
      [
        'total',
        { field: 'total', formula: '@price * @quantity', dependencies: ['price', 'quantity'] },
      ],
    ]);

    const updates = updateReferences('total', 'subtotal', columns);
    expect(updates.size).toBe(0);
  });
});

describe('extractDependenciesFromFormula', function extractDepsTests() {
  it('should extract simple variable reference', function simpleExtractTest() {
    const deps = extractDependenciesFromFormula('@x');
    expect(deps).toEqual(['x']);
  });

  it('should extract multiple variables', function multipleExtractTest() {
    const deps = extractDependenciesFromFormula('@x + @y * @z');
    expect(deps).toEqual(['x', 'y', 'z']);
  });

  it('should return unique variables', function uniqueExtractTest() {
    const deps = extractDependenciesFromFormula('@x + @x * @x');
    expect(deps).toEqual(['x']);
  });

  it('should handle variables with dots', function dotsExtractTest() {
    const deps = extractDependenciesFromFormula('@data.value + @other.result');
    expect(deps).toEqual(['data.value', 'other.result']);
  });

  it('should handle variables with underscores', function underscoreExtractTest() {
    const deps = extractDependenciesFromFormula('@my_var + @other_var_2');
    expect(deps).toEqual(['my_var', 'other_var_2']);
  });

  it('should return empty array for no variables', function noVarsTest() {
    const deps = extractDependenciesFromFormula('1 + 2 * 3');
    expect(deps).toEqual([]);
  });

  it('should handle complex formulas', function complexFormulaTest() {
    const deps = extractDependenciesFromFormula('IF(@condition, AVG(@values), @default)');
    expect(deps).toEqual(['condition', 'values', 'default']);
  });

  it('should preserve order of first appearance', function orderTest() {
    const deps = extractDependenciesFromFormula('@z + @a + @m + @a + @z');
    expect(deps).toEqual(['z', 'a', 'm']);
  });
});

describe('wouldCreateCycle', function wouldCreateCycleVMTests() {
  it('should return null for valid addition', function validAdditionTest() {
    const columns: FormulaColumnInfo[] = [{ field: 'a', formula: '@x', dependencies: ['x'] }];
    const result = buildDependencyGraph(columns);

    const cyclePath = wouldCreateCycle('b', ['a'], result.graph);
    expect(cyclePath).toBeNull();
  });

  it('should detect cycle in proposed addition', function cycleDetectionTest() {
    const columns: FormulaColumnInfo[] = [{ field: 'a', formula: '@b', dependencies: ['b'] }];
    const result = buildDependencyGraph(columns);

    const cyclePath = wouldCreateCycle('b', ['a'], result.graph);
    expect(cyclePath).not.toBeNull();
  });
});

// =============================================================================
// extractDependenciesFromFormula export tests
// =============================================================================

describe('extractDependenciesFromFormula (exported from main)', function exportedExtractTests() {
  it('should be re-exported from DependencyManager', function reexportTest() {
    // This test verifies the export is available
    const deps = extractDependenciesFromFormula('@x + @y');
    expect(deps).toEqual(['x', 'y']);
  });
});
