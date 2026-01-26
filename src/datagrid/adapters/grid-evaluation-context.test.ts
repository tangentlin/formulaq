/**
 * Tests for GridEvaluationContext adapter.
 *
 * These tests verify:
 * - Row data is correctly converted to EvaluationContext
 * - Cell values are properly converted to FormulaQ Values
 * - Null/undefined/empty cell values are handled correctly
 * - rowCount is set correctly
 * - Formula column results can be merged
 * - Type inference and conversion works correctly
 *
 * @module
 */

import { describe, expect, it } from 'vitest';
import type { GridColDef } from '@mui/x-data-grid';
import type { Value } from '../../core/types/values.ts';
import {
  createGridEvaluationContext,
  createGridEvaluationContextWithOptions,
  type GridRowModel,
} from './grid-evaluation-context.ts';
import {
  handleNullCell,
  inferValueType,
  convertCellValue,
  extractColumnValues,
  inferColumnType,
  buildVariablesRecord,
  mergeFormulaResults,
  type ColumnInfo,
} from './grid-evaluation-context.view-model.ts';

// =============================================================================
// handleNullCell tests
// =============================================================================

describe('handleNullCell', function handleNullCellTests() {
  it('should return true for null', function nullTest() {
    const result = handleNullCell(null);
    expect(result).toBe(true);
  });

  it('should return true for undefined', function undefinedTest() {
    const result = handleNullCell(undefined);
    expect(result).toBe(true);
  });

  it('should return true for empty string', function emptyStringTest() {
    const result = handleNullCell('');
    expect(result).toBe(true);
  });

  it('should return false for zero', function zeroTest() {
    const result = handleNullCell(0);
    expect(result).toBe(false);
  });

  it('should return false for false boolean', function falseTest() {
    const result = handleNullCell(false);
    expect(result).toBe(false);
  });

  it('should return false for non-empty string', function stringTest() {
    const result = handleNullCell('hello');
    expect(result).toBe(false);
  });

  it('should return false for positive number', function positiveTest() {
    const result = handleNullCell(42);
    expect(result).toBe(false);
  });

  it('should return false for negative number', function negativeTest() {
    const result = handleNullCell(-10);
    expect(result).toBe(false);
  });

  it('should return false for true boolean', function trueTest() {
    const result = handleNullCell(true);
    expect(result).toBe(false);
  });

  it('should return false for whitespace-only string', function whitespaceTest() {
    const result = handleNullCell('   ');
    expect(result).toBe(false);
  });

  it('should return false for NaN', function nanTest() {
    const result = handleNullCell(NaN);
    expect(result).toBe(false);
  });

  it('should return false for objects', function objectTest() {
    const result = handleNullCell({});
    expect(result).toBe(false);
  });

  it('should return false for arrays', function arrayTest() {
    const result = handleNullCell([]);
    expect(result).toBe(false);
  });
});

// =============================================================================
// inferValueType tests
// =============================================================================

describe('inferValueType', function inferValueTypeTests() {
  it('should infer number.float for integers', function integerTest() {
    const result = inferValueType(42);
    expect(result).toBe('number.float');
  });

  it('should infer number.float for floats', function floatTest() {
    const result = inferValueType(3.14);
    expect(result).toBe('number.float');
  });

  it('should infer number.float for negative numbers', function negativeTest() {
    const result = inferValueType(-100);
    expect(result).toBe('number.float');
  });

  it('should infer number.float for NaN', function nanTest() {
    const result = inferValueType(NaN);
    expect(result).toBe('number.float');
  });

  it('should infer number.float for Infinity', function infinityTest() {
    const result = inferValueType(Infinity);
    expect(result).toBe('number.float');
  });

  it('should infer string.text for strings', function stringTest() {
    const result = inferValueType('hello');
    expect(result).toBe('string.text');
  });

  it('should infer boolean.boolean for true', function trueTest() {
    const result = inferValueType(true);
    expect(result).toBe('boolean.boolean');
  });

  it('should infer boolean.boolean for false', function falseTest() {
    const result = inferValueType(false);
    expect(result).toBe('boolean.boolean');
  });

  it('should default to string.text for objects', function objectTest() {
    const result = inferValueType({ key: 'value' });
    expect(result).toBe('string.text');
  });

  it('should default to string.text for arrays', function arrayTest() {
    const result = inferValueType([1, 2, 3]);
    expect(result).toBe('string.text');
  });

  it('should default to string.text for dates', function dateTest() {
    const result = inferValueType(new Date());
    expect(result).toBe('string.text');
  });
});

// =============================================================================
// convertCellValue tests
// =============================================================================

describe('convertCellValue', function convertCellValueTests() {
  describe('null handling', function nullHandlingTests() {
    it('should convert null to null value', function nullTest() {
      const result = convertCellValue(null, 'number.float');
      expect(result.type).toBe('number.float');
      expect(result.value).toBe(null);
    });

    it('should convert undefined to null value', function undefinedTest() {
      const result = convertCellValue(undefined, 'string.text');
      expect(result.type).toBe('string.text');
      expect(result.value).toBe(null);
    });

    it('should convert empty string to null value', function emptyStringTest() {
      const result = convertCellValue('', 'boolean.boolean');
      expect(result.type).toBe('boolean.boolean');
      expect(result.value).toBe(null);
    });
  });

  describe('number conversion', function numberConversionTests() {
    it('should convert number to number value', function numberTest() {
      const result = convertCellValue(42, 'number.float');
      expect(result.type).toBe('number.float');
      expect(result.value).toBe(42);
    });

    it('should convert float to number value', function floatTest() {
      const result = convertCellValue(3.14159, 'number.float');
      expect(result.type).toBe('number.float');
      expect(result.value).toBe(3.14159);
    });

    it('should convert negative number', function negativeTest() {
      const result = convertCellValue(-100.5, 'number.float');
      expect(result.type).toBe('number.float');
      expect(result.value).toBe(-100.5);
    });

    it('should convert string to number if parseable', function stringNumberTest() {
      const result = convertCellValue('42.5', 'number.float');
      expect(result.type).toBe('number.float');
      expect(result.value).toBe(42.5);
    });

    it('should convert unparseable string to null', function unparseableTest() {
      const result = convertCellValue('not a number', 'number.float');
      expect(result.type).toBe('number.float');
      expect(result.value).toBe(null);
    });

    it('should handle number.integer type', function integerTypeTest() {
      const result = convertCellValue(42, 'number.integer');
      expect(result.type).toBe('number.integer');
      expect(result.value).toBe(42);
    });

    it('should handle zero', function zeroTest() {
      const result = convertCellValue(0, 'number.float');
      expect(result.type).toBe('number.float');
      expect(result.value).toBe(0);
    });
  });

  describe('string conversion', function stringConversionTests() {
    it('should convert string to string value', function stringTest() {
      const result = convertCellValue('hello', 'string.text');
      expect(result.type).toBe('string.text');
      expect(result.value).toBe('hello');
    });

    it('should convert number to string', function numberToStringTest() {
      const result = convertCellValue(42, 'string.text');
      expect(result.type).toBe('string.text');
      expect(result.value).toBe('42');
    });

    it('should convert boolean to string', function booleanToStringTest() {
      const result = convertCellValue(true, 'string.text');
      expect(result.type).toBe('string.text');
      expect(result.value).toBe('true');
    });

    it('should preserve whitespace in strings', function whitespaceTest() {
      const result = convertCellValue('  hello world  ', 'string.text');
      expect(result.type).toBe('string.text');
      expect(result.value).toBe('  hello world  ');
    });
  });

  describe('boolean conversion', function booleanConversionTests() {
    it('should convert true to boolean value', function trueTest() {
      const result = convertCellValue(true, 'boolean.boolean');
      expect(result.type).toBe('boolean.boolean');
      expect(result.value).toBe(true);
    });

    it('should convert false to boolean value', function falseTest() {
      const result = convertCellValue(false, 'boolean.boolean');
      expect(result.type).toBe('boolean.boolean');
      expect(result.value).toBe(false);
    });

    it('should convert string "true" to true', function stringTrueTest() {
      const result = convertCellValue('true', 'boolean.boolean');
      expect(result.type).toBe('boolean.boolean');
      expect(result.value).toBe(true);
    });

    it('should convert string "false" to false', function stringFalseTest() {
      const result = convertCellValue('false', 'boolean.boolean');
      expect(result.type).toBe('boolean.boolean');
      expect(result.value).toBe(false);
    });

    it('should convert 1 to true', function oneTest() {
      const result = convertCellValue(1, 'boolean.boolean');
      expect(result.type).toBe('boolean.boolean');
      expect(result.value).toBe(true);
    });

    it('should convert 0 to false', function zeroTest() {
      const result = convertCellValue(0, 'boolean.boolean');
      expect(result.type).toBe('boolean.boolean');
      expect(result.value).toBe(false);
    });

    it('should convert other values to null', function otherTest() {
      const result = convertCellValue('yes', 'boolean.boolean');
      expect(result.type).toBe('boolean.boolean');
      expect(result.value).toBe(null);
    });
  });
});

// =============================================================================
// extractColumnValues tests
// =============================================================================

describe('extractColumnValues', function extractColumnValuesTests() {
  it('should extract values for a column', function basicTest() {
    const rows = [
      { id: 1, price: 10.5 },
      { id: 2, price: 20.0 },
      { id: 3, price: 30.0 },
    ];

    const result = extractColumnValues(rows, 'price', 'number.float');

    expect(result).toHaveLength(3);
    expect(result[0]!.value).toBe(10.5);
    expect(result[1]!.value).toBe(20.0);
    expect(result[2]!.value).toBe(30.0);
  });

  it('should handle null values in column', function nullValuesTest() {
    const rows = [
      { id: 1, price: 10.5 },
      { id: 2, price: null },
      { id: 3, price: undefined },
    ];

    const result = extractColumnValues(rows, 'price', 'number.float');

    expect(result).toHaveLength(3);
    expect(result[0]!.value).toBe(10.5);
    expect(result[1]!.value).toBe(null);
    expect(result[2]!.value).toBe(null);
  });

  it('should handle missing field in rows', function missingFieldTest() {
    const rows = [{ id: 1 }, { id: 2, price: 20.0 }, { id: 3 }];

    const result = extractColumnValues(rows, 'price', 'number.float');

    expect(result).toHaveLength(3);
    expect(result[0]!.value).toBe(null);
    expect(result[1]!.value).toBe(20.0);
    expect(result[2]!.value).toBe(null);
  });

  it('should handle empty rows array', function emptyRowsTest() {
    const rows: Record<string, unknown>[] = [];

    const result = extractColumnValues(rows, 'price', 'number.float');

    expect(result).toHaveLength(0);
  });

  it('should extract string column', function stringColumnTest() {
    const rows = [{ name: 'Alice' }, { name: 'Bob' }, { name: '' }];

    const result = extractColumnValues(rows, 'name', 'string.text');

    expect(result).toHaveLength(3);
    expect(result[0]!.value).toBe('Alice');
    expect(result[1]!.value).toBe('Bob');
    expect(result[2]!.value).toBe(null); // Empty string is null
  });

  it('should extract boolean column', function booleanColumnTest() {
    const rows = [{ active: true }, { active: false }, { active: null }];

    const result = extractColumnValues(rows, 'active', 'boolean.boolean');

    expect(result).toHaveLength(3);
    expect(result[0]!.value).toBe(true);
    expect(result[1]!.value).toBe(false);
    expect(result[2]!.value).toBe(null);
  });
});

// =============================================================================
// inferColumnType tests
// =============================================================================

describe('inferColumnType', function inferColumnTypeTests() {
  it('should infer number type from first non-null value', function numberTest() {
    const rows = [{ price: null }, { price: 42.5 }, { price: 100 }];

    const result = inferColumnType(rows, 'price');

    expect(result).toBe('number.float');
  });

  it('should infer string type from first non-null value', function stringTest() {
    const rows = [{ name: undefined }, { name: 'Alice' }, { name: 'Bob' }];

    const result = inferColumnType(rows, 'name');

    expect(result).toBe('string.text');
  });

  it('should infer boolean type from first non-null value', function booleanTest() {
    const rows = [{ active: '' }, { active: true }, { active: false }];

    const result = inferColumnType(rows, 'active');

    expect(result).toBe('boolean.boolean');
  });

  it('should default to string.text if all values are null', function allNullTest() {
    const rows = [{ value: null }, { value: undefined }, { value: '' }];

    const result = inferColumnType(rows, 'value');

    expect(result).toBe('string.text');
  });

  it('should default to string.text for empty rows', function emptyRowsTest() {
    const rows: Record<string, unknown>[] = [];

    const result = inferColumnType(rows, 'anyField');

    expect(result).toBe('string.text');
  });
});

// =============================================================================
// buildVariablesRecord tests
// =============================================================================

describe('buildVariablesRecord', function buildVariablesRecordTests() {
  it('should build variables record from rows and columns', function basicTest() {
    const rows = [
      { price: 10.5, name: 'A' },
      { price: 20.0, name: 'B' },
    ];
    const columns: ColumnInfo[] = [
      { field: 'price', type: 'number.float' },
      { field: 'name', type: 'string.text' },
    ];

    const result = buildVariablesRecord(rows, columns);

    expect(Object.keys(result)).toHaveLength(2);
    expect(result['price']).toHaveLength(2);
    expect(result['name']).toHaveLength(2);
    expect(result['price']![0]!.value).toBe(10.5);
    expect(result['price']![1]!.value).toBe(20.0);
    expect(result['name']![0]!.value).toBe('A');
    expect(result['name']![1]!.value).toBe('B');
  });

  it('should handle empty rows', function emptyRowsTest() {
    const rows: Record<string, unknown>[] = [];
    const columns: ColumnInfo[] = [{ field: 'price', type: 'number.float' }];

    const result = buildVariablesRecord(rows, columns);

    expect(Object.keys(result)).toHaveLength(1);
    expect(result['price']).toHaveLength(0);
  });

  it('should handle empty columns', function emptyColumnsTest() {
    const rows = [{ price: 10.5 }, { price: 20.0 }];
    const columns: ColumnInfo[] = [];

    const result = buildVariablesRecord(rows, columns);

    expect(Object.keys(result)).toHaveLength(0);
  });

  it('should handle mixed null and non-null values', function mixedNullsTest() {
    const rows = [{ value: 1 }, { value: null }, { value: 3 }];
    const columns: ColumnInfo[] = [{ field: 'value', type: 'number.float' }];

    const result = buildVariablesRecord(rows, columns);

    expect(result['value']![0]!.value).toBe(1);
    expect(result['value']![1]!.value).toBe(null);
    expect(result['value']![2]!.value).toBe(3);
  });
});

// =============================================================================
// mergeFormulaResults tests
// =============================================================================

describe('mergeFormulaResults', function mergeFormulaResultsTests() {
  it('should merge formula results into variables', function basicTest() {
    const variables: Record<string, Value[]> = {
      price: [{ type: 'number.float', value: 10.5 }],
    };
    const formulaResults = new Map<string, Value[]>([
      ['total', [{ type: 'number.float', value: 21.0 }]],
    ]);

    const result = mergeFormulaResults(variables, formulaResults);

    expect(Object.keys(result)).toHaveLength(2);
    expect(result['price']![0]!.value).toBe(10.5);
    expect(result['total']![0]!.value).toBe(21.0);
  });

  it('should not modify original variables', function immutabilityTest() {
    const variables: Record<string, Value[]> = {
      price: [{ type: 'number.float', value: 10.5 }],
    };
    const formulaResults = new Map<string, Value[]>([
      ['total', [{ type: 'number.float', value: 21.0 }]],
    ]);

    const result = mergeFormulaResults(variables, formulaResults);

    expect(result).not.toBe(variables);
    expect(Object.keys(variables)).toHaveLength(1);
  });

  it('should handle empty formula results', function emptyFormulaTest() {
    const variables: Record<string, Value[]> = {
      price: [{ type: 'number.float', value: 10.5 }],
    };
    const formulaResults = new Map<string, Value[]>();

    const result = mergeFormulaResults(variables, formulaResults);

    expect(Object.keys(result)).toHaveLength(1);
  });

  it('should handle empty variables', function emptyVariablesTest() {
    const variables: Record<string, Value[]> = {};
    const formulaResults = new Map<string, Value[]>([
      ['total', [{ type: 'number.float', value: 21.0 }]],
    ]);

    const result = mergeFormulaResults(variables, formulaResults);

    expect(Object.keys(result)).toHaveLength(1);
    expect(result['total']![0]!.value).toBe(21.0);
  });

  it('should override existing variables with formula results', function overrideTest() {
    const variables: Record<string, Value[]> = {
      computed: [{ type: 'number.float', value: 10.0 }],
    };
    const formulaResults = new Map<string, Value[]>([
      ['computed', [{ type: 'number.float', value: 20.0 }]],
    ]);

    const result = mergeFormulaResults(variables, formulaResults);

    expect(result['computed']![0]!.value).toBe(20.0);
  });

  it('should handle multiple formula results', function multipleFormulaTest() {
    const variables: Record<string, Value[]> = {
      price: [{ type: 'number.float', value: 10.0 }],
    };
    const formulaResults = new Map<string, Value[]>([
      ['total', [{ type: 'number.float', value: 100.0 }]],
      ['tax', [{ type: 'number.float', value: 10.0 }]],
      ['grand', [{ type: 'number.float', value: 110.0 }]],
    ]);

    const result = mergeFormulaResults(variables, formulaResults);

    expect(Object.keys(result)).toHaveLength(4);
  });
});

// =============================================================================
// createGridEvaluationContext tests
// =============================================================================

describe('createGridEvaluationContext', function createContextTests() {
  it('should create context from columns and rows', function basicTest() {
    const columns: GridColDef[] = [
      { field: 'price', type: 'number' },
      { field: 'name', type: 'string' },
    ];
    const rows: GridRowModel[] = [
      { id: 1, price: 10.5, name: 'A' },
      { id: 2, price: 20.0, name: 'B' },
    ];

    const context = createGridEvaluationContext({ columns, rows });

    expect(context.rowCount).toBe(2);
    expect(context.variables['price']).toHaveLength(2);
    expect(context.variables['name']).toHaveLength(2);
    expect(context.variables['price']![0]!.value).toBe(10.5);
    expect(context.variables['name']![1]!.value).toBe('B');
  });

  it('should set rowCount correctly', function rowCountTest() {
    const columns: GridColDef[] = [{ field: 'x', type: 'number' }];
    const rows: GridRowModel[] = [{ x: 1 }, { x: 2 }, { x: 3 }, { x: 4 }, { x: 5 }];

    const context = createGridEvaluationContext({ columns, rows });

    expect(context.rowCount).toBe(5);
  });

  it('should handle empty rows', function emptyRowsTest() {
    const columns: GridColDef[] = [{ field: 'price', type: 'number' }];
    const rows: GridRowModel[] = [];

    const context = createGridEvaluationContext({ columns, rows });

    expect(context.rowCount).toBe(0);
    expect(context.variables['price']).toHaveLength(0);
  });

  it('should handle null cell values', function nullCellsTest() {
    const columns: GridColDef[] = [{ field: 'price', type: 'number' }];
    const rows: GridRowModel[] = [{ price: 10.5 }, { price: null }, { price: undefined }];

    const context = createGridEvaluationContext({ columns, rows });

    expect(context.variables['price']![0]!.value).toBe(10.5);
    expect(context.variables['price']![1]!.value).toBe(null);
    expect(context.variables['price']![2]!.value).toBe(null);
  });

  it('should filter out action columns', function actionColumnsTest() {
    const columns: GridColDef[] = [
      { field: 'price', type: 'number' },
      { field: 'actions', type: 'actions' },
    ];
    const rows: GridRowModel[] = [{ price: 10.5 }];

    const context = createGridEvaluationContext({ columns, rows });

    expect(context.variables['price']).toBeDefined();
    expect(context.variables['actions']).toBeUndefined();
  });

  it('should map column types correctly', function typeMapTest() {
    const columns: GridColDef[] = [
      { field: 'num', type: 'number' },
      { field: 'str', type: 'string' },
      { field: 'bool', type: 'boolean' },
      { field: 'select', type: 'singleSelect' },
      { field: 'date', type: 'date' },
    ];
    const rows: GridRowModel[] = [
      { num: 42, str: 'hello', bool: true, select: 'opt1', date: '2024-01-01' },
    ];

    const context = createGridEvaluationContext({ columns, rows });

    expect(context.variables['num']![0]!.type).toBe('number.float');
    expect(context.variables['str']![0]!.type).toBe('string.text');
    expect(context.variables['bool']![0]!.type).toBe('boolean.boolean');
    expect(context.variables['select']![0]!.type).toBe('string.text');
    expect(context.variables['date']![0]!.type).toBe('string.text');
  });

  it('should merge formula results when provided', function formulaResultsTest() {
    const columns: GridColDef[] = [{ field: 'price', type: 'number' }];
    const rows: GridRowModel[] = [{ price: 10.5 }, { price: 20.0 }];
    const formulaResults = new Map<string, Value[]>([
      [
        'doubled',
        [
          { type: 'number.float', value: 21.0 },
          { type: 'number.float', value: 40.0 },
        ],
      ],
    ]);

    const context = createGridEvaluationContext({ columns, rows, formulaResults });

    expect(context.variables['price']).toBeDefined();
    expect(context.variables['doubled']).toBeDefined();
    expect(context.variables['doubled']![0]!.value).toBe(21.0);
    expect(context.variables['doubled']![1]!.value).toBe(40.0);
  });

  it('should handle default column type (no type specified)', function defaultTypeTest() {
    const columns: GridColDef[] = [{ field: 'data' }];
    const rows: GridRowModel[] = [{ data: 'some text' }];

    const context = createGridEvaluationContext({ columns, rows });

    expect(context.variables['data']![0]!.type).toBe('string.text');
    expect(context.variables['data']![0]!.value).toBe('some text');
  });

  it('should handle boolean values correctly', function booleanValuesTest() {
    const columns: GridColDef[] = [{ field: 'active', type: 'boolean' }];
    const rows: GridRowModel[] = [{ active: true }, { active: false }, { active: null }];

    const context = createGridEvaluationContext({ columns, rows });

    expect(context.variables['active']![0]!.value).toBe(true);
    expect(context.variables['active']![1]!.value).toBe(false);
    expect(context.variables['active']![2]!.value).toBe(null);
  });

  it('should not set signal and onProgress by default', function noOptionsTest() {
    const columns: GridColDef[] = [{ field: 'x', type: 'number' }];
    const rows: GridRowModel[] = [{ x: 1 }];

    const context = createGridEvaluationContext({ columns, rows });

    expect(context.signal).toBeUndefined();
    expect(context.onProgress).toBeUndefined();
  });
});

// =============================================================================
// createGridEvaluationContextWithOptions tests
// =============================================================================

describe('createGridEvaluationContextWithOptions', function createContextWithOptionsTests() {
  it('should create context with signal', function signalTest() {
    const columns: GridColDef[] = [{ field: 'x', type: 'number' }];
    const rows: GridRowModel[] = [{ x: 1 }];
    const controller = new AbortController();

    const context = createGridEvaluationContextWithOptions({ columns, rows }, controller.signal);

    expect(context.signal).toBe(controller.signal);
  });

  it('should create context with onProgress callback', function onProgressTest() {
    const columns: GridColDef[] = [{ field: 'x', type: 'number' }];
    const rows: GridRowModel[] = [{ x: 1 }];
    const progressCallback = function testProgress(_completed: number, _total: number): void {
      // No-op for testing
    };

    const context = createGridEvaluationContextWithOptions(
      { columns, rows },
      undefined,
      progressCallback,
    );

    expect(context.onProgress).toBe(progressCallback);
  });

  it('should create context with both signal and onProgress', function bothOptionsTest() {
    const columns: GridColDef[] = [{ field: 'x', type: 'number' }];
    const rows: GridRowModel[] = [{ x: 1 }];
    const controller = new AbortController();
    const progressCallback = function testProgress(_completed: number, _total: number): void {
      // No-op
    };

    const context = createGridEvaluationContextWithOptions(
      { columns, rows },
      controller.signal,
      progressCallback,
    );

    expect(context.signal).toBe(controller.signal);
    expect(context.onProgress).toBe(progressCallback);
  });

  it('should still build variables correctly', function variablesTest() {
    const columns: GridColDef[] = [{ field: 'price', type: 'number' }];
    const rows: GridRowModel[] = [{ price: 10.5 }, { price: 20.0 }];

    const context = createGridEvaluationContextWithOptions({ columns, rows }, undefined, undefined);

    expect(context.rowCount).toBe(2);
    expect(context.variables['price']![0]!.value).toBe(10.5);
    expect(context.variables['price']![1]!.value).toBe(20.0);
  });
});

// =============================================================================
// Integration tests
// =============================================================================

describe('integration: GridEvaluationContext with realistic data', function integrationTests() {
  it('should work with a typical e-commerce grid', function ecommerceTest() {
    const columns: GridColDef[] = [
      { field: 'id', type: 'number' },
      { field: 'productName', type: 'string' },
      { field: 'price', type: 'number' },
      { field: 'quantity', type: 'number' },
      { field: 'inStock', type: 'boolean' },
      { field: 'actions', type: 'actions' },
    ];

    const rows: GridRowModel[] = [
      { id: 1, productName: 'Widget A', price: 10.5, quantity: 100, inStock: true },
      { id: 2, productName: 'Widget B', price: 25.0, quantity: 0, inStock: false },
      { id: 3, productName: 'Widget C', price: null, quantity: 50, inStock: true },
    ];

    const context = createGridEvaluationContext({ columns, rows });

    // Verify row count
    expect(context.rowCount).toBe(3);

    // Verify all data columns are included
    expect(Object.keys(context.variables)).toHaveLength(5);

    // Verify actions column is excluded
    expect(context.variables['actions']).toBeUndefined();

    // Verify values
    expect(context.variables['price']![0]!.value).toBe(10.5);
    expect(context.variables['price']![2]!.value).toBe(null);
    expect(context.variables['inStock']![0]!.value).toBe(true);
    expect(context.variables['inStock']![1]!.value).toBe(false);
  });

  it('should handle formula column dependencies', function formulaDependenciesTest() {
    const columns: GridColDef[] = [
      { field: 'price', type: 'number' },
      { field: 'quantity', type: 'number' },
    ];

    const rows: GridRowModel[] = [
      { price: 10.0, quantity: 2 },
      { price: 25.0, quantity: 1 },
    ];

    // First formula: total = price * quantity
    const firstFormulaResults = new Map<string, Value[]>([
      [
        'total',
        [
          { type: 'number.float', value: 20.0 },
          { type: 'number.float', value: 25.0 },
        ],
      ],
    ]);

    const context1 = createGridEvaluationContext({
      columns,
      rows,
      formulaResults: firstFormulaResults,
    });

    // Verify first formula result is available
    expect(context1.variables['total']).toBeDefined();
    expect(context1.variables['total']![0]!.value).toBe(20.0);

    // Second formula: grandTotal = total + 10 (would use context1.variables.total)
    // This shows how formulas can chain
    const secondFormulaResults = new Map<string, Value[]>([
      [
        'total',
        [
          { type: 'number.float', value: 20.0 },
          { type: 'number.float', value: 25.0 },
        ],
      ],
      [
        'grandTotal',
        [
          { type: 'number.float', value: 30.0 },
          { type: 'number.float', value: 35.0 },
        ],
      ],
    ]);

    const context2 = createGridEvaluationContext({
      columns,
      rows,
      formulaResults: secondFormulaResults,
    });

    expect(context2.variables['grandTotal']![0]!.value).toBe(30.0);
    expect(context2.variables['grandTotal']![1]!.value).toBe(35.0);
  });

  it('should handle large dataset with mixed types', function largeDatasetTest() {
    const columns: GridColDef[] = [
      { field: 'id', type: 'number' },
      { field: 'value', type: 'number' },
      { field: 'label', type: 'string' },
      { field: 'active', type: 'boolean' },
    ];

    // Create 100 rows
    const rows: GridRowModel[] = [];
    for (let i = 0; i < 100; i++) {
      rows.push({
        id: i,
        value: i % 10 === 0 ? null : i * 1.5,
        label: 'Item ' + String(i),
        active: i % 2 === 0,
      });
    }

    const context = createGridEvaluationContext({ columns, rows });

    // Verify row count
    expect(context.rowCount).toBe(100);

    // Verify all variables have 100 values
    expect(context.variables['id']).toHaveLength(100);
    expect(context.variables['value']).toHaveLength(100);
    expect(context.variables['label']).toHaveLength(100);
    expect(context.variables['active']).toHaveLength(100);

    // Spot check some values
    expect(context.variables['id']![0]!.value).toBe(0);
    expect(context.variables['id']![99]!.value).toBe(99);
    expect(context.variables['value']![0]!.value).toBe(null); // 0 % 10 === 0
    expect(context.variables['value']![1]!.value).toBe(1.5);
    expect(context.variables['active']![0]!.value).toBe(true); // 0 % 2 === 0
    expect(context.variables['active']![1]!.value).toBe(false);
  });

  it('should handle edge case with empty string values', function emptyStringEdgeTest() {
    const columns: GridColDef[] = [{ field: 'name', type: 'string' }, { field: 'description' }];

    const rows: GridRowModel[] = [
      { name: 'Valid', description: 'Has description' },
      { name: '', description: '' },
      { name: '  ', description: '  ' },
    ];

    const context = createGridEvaluationContext({ columns, rows });

    // Empty string is treated as null
    expect(context.variables['name']![0]!.value).toBe('Valid');
    expect(context.variables['name']![1]!.value).toBe(null);
    // Whitespace-only strings are NOT null
    expect(context.variables['name']![2]!.value).toBe('  ');

    expect(context.variables['description']![0]!.value).toBe('Has description');
    expect(context.variables['description']![1]!.value).toBe(null);
    expect(context.variables['description']![2]!.value).toBe('  ');
  });
});
