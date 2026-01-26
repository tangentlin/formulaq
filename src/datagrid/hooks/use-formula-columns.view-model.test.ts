/**
 * Tests for use-formula-columns.view-model.ts
 *
 * @module
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { GridColDef } from '@mui/x-data-grid';
import type { Value } from '../../core/types/values.ts';
import {
  createDependencyManager,
  type DependencyManager,
} from '../dependency/dependency-manager.ts';
import {
  type FormulaColumn,
  createInitialState,
  createFormulaColumnDef,
  mergeColumnsWithFormulas,
  getEvaluationOrder,
  shouldReEvaluate,
  addFormulaToState,
  editFormulaInState,
  removeFormulaFromState,
  renameColumnInState,
  setProgressInState,
  setIsEvaluatingInState,
  setSingleFormulaResultInState,
  getBlockingColumns,
  buildPreviewData,
  createVariableProviderFromColumns,
  getFormulaColumnFields,
  getFormula,
  getFormulaResultsFromState,
  allFormulasEvaluated,
  createRowsWithFormulaResults,
  setFormulaResultsInState,
} from './use-formula-columns.view-model.ts';

describe('createInitialState', function () {
  it('creates empty state when no initial columns provided', function () {
    const state = createInitialState();

    expect(state.formulaColumns.size).toBe(0);
    expect(state.formulaResults.size).toBe(0);
    expect(state.isEvaluating).toBe(false);
    expect(state.progress).toBe(null);
  });

  it('populates state with initial formula columns', function () {
    const initialColumns: FormulaColumn[] = [
      { field: 'total', formula: '@price * @quantity', headerName: 'Total' },
      { field: 'tax', formula: '@total * 0.1' },
    ];

    const state = createInitialState(initialColumns);

    expect(state.formulaColumns.size).toBe(2);
    expect(state.formulaColumns.get('total')?.formula).toBe('@price * @quantity');
    expect(state.formulaColumns.get('total')?.headerName).toBe('Total');
    expect(state.formulaColumns.get('tax')?.formula).toBe('@total * 0.1');
    expect(state.formulaColumns.get('tax')?.headerName).toBe(undefined);
  });
});

describe('createFormulaColumnDef', function () {
  it('creates a GridColDef with correct properties', function () {
    const formula: FormulaColumn = {
      field: 'total',
      formula: '@price * @quantity',
      headerName: 'Total',
    };
    const results: Value[] = [
      { type: 'number.float', value: 100 },
      { type: 'number.float', value: 200 },
    ];

    const colDef = createFormulaColumnDef(formula, results);

    expect(colDef.field).toBe('total');
    expect(colDef.headerName).toBe('Total');
    expect(colDef.type).toBe('number');
    expect(colDef.editable).toBe(false);
    expect(colDef.description).toBe('Formula: @price * @quantity');
  });

  it('uses field as headerName when headerName is not provided', function () {
    const formula: FormulaColumn = {
      field: 'total',
      formula: '@price * @quantity',
    };

    const colDef = createFormulaColumnDef(formula, []);

    expect(colDef.headerName).toBe('total');
  });

  it('infers number type from numeric results', function () {
    const formula: FormulaColumn = { field: 'num', formula: '@x' };
    const results: Value[] = [{ type: 'number.float', value: 42 }];

    const colDef = createFormulaColumnDef(formula, results);

    expect(colDef.type).toBe('number');
  });

  it('infers boolean type from boolean results', function () {
    const formula: FormulaColumn = { field: 'flag', formula: '@x > 0' };
    const results: Value[] = [{ type: 'boolean.boolean', value: true }];

    const colDef = createFormulaColumnDef(formula, results);

    expect(colDef.type).toBe('boolean');
  });

  it('infers string type from string results', function () {
    const formula: FormulaColumn = { field: 'label', formula: '@x' };
    const results: Value[] = [{ type: 'string.text', value: 'hello' }];

    const colDef = createFormulaColumnDef(formula, results);

    expect(colDef.type).toBe('string');
  });

  it('defaults to number type when all results are null', function () {
    const formula: FormulaColumn = { field: 'nulls', formula: '@x' };
    const results: Value[] = [
      { type: 'number.float', value: null },
      { type: 'number.float', value: null },
    ];

    const colDef = createFormulaColumnDef(formula, results);

    expect(colDef.type).toBe('number');
  });
});

describe('mergeColumnsWithFormulas', function () {
  it('appends formula columns after base columns', function () {
    const baseColumns: GridColDef[] = [{ field: 'price' }, { field: 'quantity' }];
    const formulaColumns: GridColDef[] = [{ field: 'total' }];

    const merged = mergeColumnsWithFormulas(baseColumns, formulaColumns);

    expect(merged.length).toBe(3);
    expect(merged[0]?.field).toBe('price');
    expect(merged[1]?.field).toBe('quantity');
    expect(merged[2]?.field).toBe('total');
  });

  it('sorts formula columns alphabetically', function () {
    const baseColumns: GridColDef[] = [{ field: 'id' }];
    const formulaColumns: GridColDef[] = [{ field: 'zeta' }, { field: 'alpha' }, { field: 'beta' }];

    const merged = mergeColumnsWithFormulas(baseColumns, formulaColumns);

    expect(merged[1]?.field).toBe('alpha');
    expect(merged[2]?.field).toBe('beta');
    expect(merged[3]?.field).toBe('zeta');
  });

  it('handles empty arrays', function () {
    expect(mergeColumnsWithFormulas([], [])).toEqual([]);
    expect(mergeColumnsWithFormulas([{ field: 'x' }], [])).toEqual([{ field: 'x' }]);
    expect(mergeColumnsWithFormulas([], [{ field: 'y' }])).toEqual([{ field: 'y' }]);
  });
});

describe('getEvaluationOrder', function () {
  let dependencyManager: DependencyManager;

  beforeEach(function () {
    dependencyManager = createDependencyManager();
  });

  it('returns formulas in dependency order', function () {
    const formulas: FormulaColumn[] = [
      { field: 'tax', formula: '@total * 0.1' },
      { field: 'total', formula: '@price * @quantity' },
    ];

    const order = getEvaluationOrder(formulas, dependencyManager);

    // total should come before tax since tax depends on total
    const totalIndex = order.indexOf('total');
    const taxIndex = order.indexOf('tax');
    expect(totalIndex).toBeLessThan(taxIndex);
  });

  it('handles formulas with no inter-dependencies', function () {
    const formulas: FormulaColumn[] = [
      { field: 'a', formula: '@x + 1' },
      { field: 'b', formula: '@y + 2' },
    ];

    const order = getEvaluationOrder(formulas, dependencyManager);

    expect(order.length).toBe(2);
    expect(order).toContain('a');
    expect(order).toContain('b');
  });

  it('returns empty array for empty input', function () {
    const order = getEvaluationOrder([], dependencyManager);

    expect(order).toEqual([]);
  });
});

describe('shouldReEvaluate', function () {
  it('returns false for same reference', function () {
    const rows = [{ id: 1, x: 10 }];

    expect(shouldReEvaluate(rows, rows)).toBe(false);
  });

  it('returns true for different references with same content', function () {
    const rows1 = [{ id: 1, x: 10 }];
    const rows2 = [{ id: 1, x: 10 }];

    expect(shouldReEvaluate(rows1, rows2)).toBe(true);
  });

  it('returns true for different lengths', function () {
    const rows1 = [{ id: 1 }];
    const rows2 = [{ id: 1 }, { id: 2 }];

    expect(shouldReEvaluate(rows1, rows2)).toBe(true);
  });

  it('returns true when a row reference changes', function () {
    const row1 = { id: 1, x: 10 };
    const row2 = { id: 2, x: 20 };
    const rows1 = [row1, row2];
    const rows2 = [row1, { ...row2 }];

    expect(shouldReEvaluate(rows1, rows2)).toBe(true);
  });

  it('returns false when all row references are the same', function () {
    const row1 = { id: 1, x: 10 };
    const row2 = { id: 2, x: 20 };
    const rows1 = [row1, row2];
    const rows2 = [row1, row2];

    expect(shouldReEvaluate(rows1, rows2)).toBe(false);
  });
});

describe('state manipulation functions', function () {
  describe('addFormulaToState', function () {
    it('adds a new formula column', function () {
      const state = createInitialState();

      const newState = addFormulaToState(state, 'total', '@price * @quantity', 'Total');

      expect(newState.formulaColumns.size).toBe(1);
      expect(newState.formulaColumns.get('total')?.formula).toBe('@price * @quantity');
      expect(newState.formulaColumns.get('total')?.headerName).toBe('Total');
    });

    it('replaces existing formula with same field', function () {
      const initialState = createInitialState([{ field: 'total', formula: '@price + @quantity' }]);

      const newState = addFormulaToState(initialState, 'total', '@price * @quantity');

      expect(newState.formulaColumns.size).toBe(1);
      expect(newState.formulaColumns.get('total')?.formula).toBe('@price * @quantity');
    });
  });

  describe('editFormulaInState', function () {
    it('updates an existing formula', function () {
      const state = createInitialState([{ field: 'total', formula: '@price + @quantity' }]);

      const newState = editFormulaInState(state, 'total', '@price * @quantity');

      expect(newState.formulaColumns.get('total')?.formula).toBe('@price * @quantity');
    });

    it('adds formula if field does not exist', function () {
      const state = createInitialState();

      const newState = editFormulaInState(state, 'newField', '@x + 1');

      expect(newState.formulaColumns.get('newField')?.formula).toBe('@x + 1');
    });
  });

  describe('removeFormulaFromState', function () {
    it('removes a formula column', function () {
      const state = createInitialState([
        { field: 'total', formula: '@price * @quantity' },
        { field: 'tax', formula: '@total * 0.1' },
      ]);

      const newState = removeFormulaFromState(state, 'total');

      expect(newState.formulaColumns.size).toBe(1);
      expect(newState.formulaColumns.has('total')).toBe(false);
      expect(newState.formulaColumns.has('tax')).toBe(true);
    });

    it('also removes the results for that column', function () {
      let state = createInitialState([{ field: 'total', formula: '@x' }]);
      state = setSingleFormulaResultInState(state, 'total', [{ type: 'number.float', value: 100 }]);

      const newState = removeFormulaFromState(state, 'total');

      expect(newState.formulaResults.has('total')).toBe(false);
    });
  });

  describe('renameColumnInState', function () {
    it('updates formulas that reference the renamed column', function () {
      const state = createInitialState([{ field: 'total', formula: '@price * @quantity' }]);
      const dependencyManager = createDependencyManager();
      dependencyManager.addFormulaColumn({
        field: 'total',
        formula: '@price * @quantity',
        dependencies: ['price', 'quantity'],
      });

      const newState = renameColumnInState(state, 'price', 'unitPrice', dependencyManager);

      expect(newState.formulaColumns.get('total')?.formula).toBe('@unitPrice * @quantity');
    });

    it('returns unchanged state when no formulas reference the column', function () {
      const state = createInitialState([{ field: 'total', formula: '@price * @quantity' }]);
      const dependencyManager = createDependencyManager();
      dependencyManager.addFormulaColumn({
        field: 'total',
        formula: '@price * @quantity',
        dependencies: ['price', 'quantity'],
      });

      const newState = renameColumnInState(state, 'nonexistent', 'newName', dependencyManager);

      expect(newState).toBe(state);
    });
  });

  describe('setProgressInState', function () {
    it('sets progress and isEvaluating flag', function () {
      const state = createInitialState();

      const newState = setProgressInState(state, 50, 100);

      expect(newState.isEvaluating).toBe(true);
      expect(newState.progress).toEqual({ completed: 50, total: 100 });
    });
  });

  describe('setIsEvaluatingInState', function () {
    it('sets evaluating flag to true', function () {
      const state = createInitialState();

      const newState = setIsEvaluatingInState(state, true);

      expect(newState.isEvaluating).toBe(true);
    });

    it('clears progress when setting to false', function () {
      let state = createInitialState();
      state = setProgressInState(state, 50, 100);

      const newState = setIsEvaluatingInState(state, false);

      expect(newState.isEvaluating).toBe(false);
      expect(newState.progress).toBe(null);
    });
  });

  describe('setSingleFormulaResultInState', function () {
    it('sets results for a single formula column', function () {
      const state = createInitialState([{ field: 'total', formula: '@x' }]);
      const results: Value[] = [
        { type: 'number.float', value: 100 },
        { type: 'number.float', value: 200 },
      ];

      const newState = setSingleFormulaResultInState(state, 'total', results);

      expect(newState.formulaResults.get('total')).toEqual(results);
    });
  });

  describe('setFormulaResultsInState', function () {
    it('sets all formula results and clears evaluating state', function () {
      let state = createInitialState([{ field: 'total', formula: '@x' }]);
      state = setIsEvaluatingInState(state, true);

      const results = new Map<string, readonly Value[]>();
      results.set('total', [{ type: 'number.float', value: 100 }]);

      const newState = setFormulaResultsInState(state, results);

      expect(newState.formulaResults).toBe(results);
      expect(newState.isEvaluating).toBe(false);
      expect(newState.progress).toBe(null);
    });
  });
});

describe('getBlockingColumns', function () {
  it('returns columns that depend on the given column', function () {
    const dependencyManager = createDependencyManager();
    dependencyManager.addFormulaColumn({
      field: 'total',
      formula: '@price * @quantity',
      dependencies: ['price', 'quantity'],
    });
    dependencyManager.addFormulaColumn({
      field: 'tax',
      formula: '@total * 0.1',
      dependencies: ['total'],
    });

    const blockers = getBlockingColumns('total', dependencyManager);

    expect(blockers).toEqual(['tax']);
  });

  it('returns empty array when no columns depend on it', function () {
    const dependencyManager = createDependencyManager();
    dependencyManager.addFormulaColumn({
      field: 'total',
      formula: '@price * @quantity',
      dependencies: ['price', 'quantity'],
    });

    const blockers = getBlockingColumns('tax', dependencyManager);

    expect(blockers).toEqual([]);
  });
});

describe('buildPreviewData', function () {
  it('builds preview with referenced variables and result', function () {
    const rows = [
      { id: 1, price: 10, quantity: 2 },
      { id: 2, price: 25, quantity: 1 },
    ];
    const results: Value[] = [
      { type: 'number.float', value: 20 },
      { type: 'number.float', value: 25 },
    ];

    const preview = buildPreviewData('@price * @quantity', rows, results);

    expect(preview.columns.length).toBe(3);
    expect(preview.columns[0]?.field).toBe('price');
    expect(preview.columns[0]?.headerName).toBe('@price');
    expect(preview.columns[1]?.field).toBe('quantity');
    expect(preview.columns[2]?.field).toBe('result');
    expect(preview.columns[2]?.isResult).toBe(true);

    expect(preview.rows.length).toBe(2);
    expect(preview.rows[0]?.['price']).toBe(10);
    expect(preview.rows[0]?.['result']).toBe(20);
  });

  it('limits rows to specified limit', function () {
    const rows = Array.from({ length: 20 }, function createRow(_, i) {
      return { id: i, x: i };
    });
    const results = rows.map(function createResult(r) {
      return { type: 'number.float' as const, value: r.x * 2 };
    });

    const preview = buildPreviewData('@x * 2', rows, results, 5);

    expect(preview.rows.length).toBe(5);
  });

  it('handles null values in rows', function () {
    const rows = [
      { id: 1, x: null },
      { id: 2, x: 10 },
    ];
    const results: Value[] = [
      { type: 'number.float', value: null },
      { type: 'number.float', value: 20 },
    ];

    const preview = buildPreviewData('@x * 2', rows, results);

    expect(preview.rows[0]?.['x']).toBe(null);
    expect(preview.rows[0]?.['result']).toBe(null);
    expect(preview.rows[1]?.['result']).toBe(20);
  });
});

describe('createVariableProviderFromColumns', function () {
  it('creates provider from base columns', function () {
    const baseColumns: GridColDef[] = [
      { field: 'price', type: 'number' },
      { field: 'name', type: 'string' },
      { field: 'active', type: 'boolean' },
    ];

    const provider = createVariableProviderFromColumns(baseColumns, new Map());

    expect(provider.hasVariable('price')).toBe(true);
    expect(provider.hasVariable('name')).toBe(true);
    expect(provider.hasVariable('active')).toBe(true);
    expect(provider.getVariableType('price')).toBe('number.float');
    expect(provider.getVariableType('name')).toBe('string.text');
    expect(provider.getVariableType('active')).toBe('boolean.boolean');
  });

  it('includes formula columns', function () {
    const baseColumns: GridColDef[] = [{ field: 'x', type: 'number' }];
    const formulaColumns = new Map<string, FormulaColumn>();
    formulaColumns.set('total', { field: 'total', formula: '@x * 2' });

    const provider = createVariableProviderFromColumns(baseColumns, formulaColumns);

    expect(provider.hasVariable('total')).toBe(true);
    expect(provider.getVariableType('total')).toBe('number.float');
  });

  it('skips action columns', function () {
    const baseColumns: GridColDef[] = [
      { field: 'actions', type: 'actions' },
      { field: 'price', type: 'number' },
    ];

    const provider = createVariableProviderFromColumns(baseColumns, new Map());

    expect(provider.hasVariable('actions')).toBe(false);
    expect(provider.hasVariable('price')).toBe(true);
  });

  it('getVariables returns all variables', function () {
    const baseColumns: GridColDef[] = [
      { field: 'price', type: 'number' },
      { field: 'quantity', type: 'number' },
    ];

    const provider = createVariableProviderFromColumns(baseColumns, new Map());
    const variables = provider.getVariables();

    expect(variables.length).toBe(2);
    expect(
      variables.some(function matchPrice(v) {
        return v.name === 'price';
      }),
    ).toBe(true);
    expect(
      variables.some(function matchQty(v) {
        return v.name === 'quantity';
      }),
    ).toBe(true);
  });

  it('isNullable returns true for all columns', function () {
    const baseColumns: GridColDef[] = [{ field: 'x', type: 'number' }];

    const provider = createVariableProviderFromColumns(baseColumns, new Map());

    expect(provider.isNullable('x')).toBe(true);
    expect(provider.isNullable('nonexistent')).toBe(true);
  });
});

describe('helper functions', function () {
  describe('getFormulaColumnFields', function () {
    it('returns all formula column field names', function () {
      const state = createInitialState([
        { field: 'a', formula: '@x' },
        { field: 'b', formula: '@y' },
      ]);

      const fields = getFormulaColumnFields(state);

      expect(fields).toContain('a');
      expect(fields).toContain('b');
      expect(fields.length).toBe(2);
    });
  });

  describe('getFormula', function () {
    it('returns formula column by field', function () {
      const state = createInitialState([{ field: 'total', formula: '@x * 2' }]);

      const formula = getFormula(state, 'total');

      expect(formula?.formula).toBe('@x * 2');
    });

    it('returns undefined for non-existent field', function () {
      const state = createInitialState();

      const formula = getFormula(state, 'nonexistent');

      expect(formula).toBe(undefined);
    });
  });

  describe('getFormulaResultsFromState', function () {
    it('returns results for formula', function () {
      let state = createInitialState([{ field: 'total', formula: '@x' }]);
      const results: Value[] = [{ type: 'number.float', value: 100 }];
      state = setSingleFormulaResultInState(state, 'total', results);

      const fetched = getFormulaResultsFromState(state, 'total');

      expect(fetched).toEqual(results);
    });

    it('returns empty array for missing formula', function () {
      const state = createInitialState();

      const results = getFormulaResultsFromState(state, 'nonexistent');

      expect(results).toEqual([]);
    });
  });

  describe('allFormulasEvaluated', function () {
    it('returns true when all formulas have results', function () {
      let state = createInitialState([
        { field: 'a', formula: '@x' },
        { field: 'b', formula: '@y' },
      ]);
      state = setSingleFormulaResultInState(state, 'a', []);
      state = setSingleFormulaResultInState(state, 'b', []);

      expect(allFormulasEvaluated(state)).toBe(true);
    });

    it('returns false when some formulas are missing results', function () {
      let state = createInitialState([
        { field: 'a', formula: '@x' },
        { field: 'b', formula: '@y' },
      ]);
      state = setSingleFormulaResultInState(state, 'a', []);

      expect(allFormulasEvaluated(state)).toBe(false);
    });

    it('returns true for empty formula columns', function () {
      const state = createInitialState();

      expect(allFormulasEvaluated(state)).toBe(true);
    });
  });

  describe('createRowsWithFormulaResults', function () {
    it('merges formula results into row data', function () {
      const rows = [
        { id: 1, x: 10 },
        { id: 2, x: 20 },
      ];
      const formulaResults = new Map<string, readonly Value[]>();
      formulaResults.set('doubled', [
        { type: 'number.float', value: 20 },
        { type: 'number.float', value: 40 },
      ]);

      const result = createRowsWithFormulaResults(rows, formulaResults);

      expect(result[0]?.['doubled']).toBe(20);
      expect(result[1]?.['doubled']).toBe(40);
      expect(result[0]?.['x']).toBe(10);
    });

    it('preserves original row data', function () {
      const rows = [{ id: 1, x: 10, y: 'hello' }];
      const formulaResults = new Map<string, readonly Value[]>();
      formulaResults.set('total', [{ type: 'number.float', value: 100 }]);

      const result = createRowsWithFormulaResults(rows, formulaResults);

      expect(result[0]?.['id']).toBe(1);
      expect(result[0]?.['x']).toBe(10);
      expect(result[0]?.['y']).toBe('hello');
      expect(result[0]?.['total']).toBe(100);
    });

    it('handles null values in formula results', function () {
      const rows = [{ id: 1, x: 10 }];
      const formulaResults = new Map<string, readonly Value[]>();
      formulaResults.set('total', [{ type: 'number.float', value: null }]);

      const result = createRowsWithFormulaResults(rows, formulaResults);

      expect(result[0]?.['total']).toBe(null);
    });
  });
});
