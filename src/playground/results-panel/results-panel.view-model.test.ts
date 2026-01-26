/**
 * Unit tests for ResultsPanel viewModel functions.
 *
 * Tests for:
 * - Value formatting
 * - Statistics calculation
 * - Min/max computation
 *
 * @module
 */

import { describe, it, expect } from 'vitest';
import type { Value } from '../../core/types/values';
import type { FormulaRuntimeError } from '../../core/types/errors';
import {
  formatNumber,
  formatString,
  formatBoolean,
  formatValueForDisplay,
  createFormattedResult,
  createErrorRowSet,
  getMinMax,
  countNulls,
  calculateStatistics,
  hasNumericResults,
  formatStatisticValue,
} from './results-panel.view-model';

/**
 * Helper to create a numeric Value.
 */
function numericValue(value: number | null): Value {
  return { type: 'number.float', value };
}

/**
 * Helper to create a string Value.
 */
function stringValue(value: string | null): Value {
  return { type: 'string.text', value };
}

/**
 * Helper to create a boolean Value.
 */
function booleanValue(value: boolean | null): Value {
  return { type: 'boolean.boolean', value };
}

/**
 * Helper to create a runtime error.
 */
function runtimeError(rowIndex: number): FormulaRuntimeError {
  return {
    rowIndex,
    code: 'DIV_BY_ZERO',
    message: 'Division by zero',
  };
}

describe('formatNumber', function () {
  it('formats integers without decimal places', function () {
    expect(formatNumber(42)).toBe('42');
    expect(formatNumber(0)).toBe('0');
    expect(formatNumber(-100)).toBe('-100');
  });

  it('formats decimals with reasonable precision', function () {
    expect(formatNumber(3.14159265359)).toMatch(/^3\.14159/);
    expect(formatNumber(0.1 + 0.2)).toMatch(/^0\.3/);
  });

  it('formats very small numbers in exponential notation', function () {
    expect(formatNumber(1e-10)).toMatch(/e-/);
    expect(formatNumber(0.0000001)).toMatch(/e-/);
  });

  it('formats very large numbers in exponential notation', function () {
    expect(formatNumber(1e15)).toMatch(/e\+/);
    expect(formatNumber(1000000000000)).toMatch(/e\+/);
  });

  it('handles special values', function () {
    expect(formatNumber(NaN)).toBe('NaN');
    expect(formatNumber(Infinity)).toBe('Infinity');
    expect(formatNumber(-Infinity)).toBe('-Infinity');
  });

  it('handles negative zero', function () {
    expect(formatNumber(-0)).toBe('0');
  });
});

describe('formatString', function () {
  it('wraps strings in double quotes', function () {
    expect(formatString('hello')).toBe('"hello"');
    expect(formatString('world')).toBe('"world"');
  });

  it('handles empty strings', function () {
    expect(formatString('')).toBe('""');
  });

  it('preserves internal quotes', function () {
    expect(formatString('with "quotes"')).toBe('"with "quotes""');
  });
});

describe('formatBoolean', function () {
  it('formats true as TRUE', function () {
    expect(formatBoolean(true)).toBe('TRUE');
  });

  it('formats false as FALSE', function () {
    expect(formatBoolean(false)).toBe('FALSE');
  });
});

describe('formatValueForDisplay', function () {
  it('formats numeric values', function () {
    expect(formatValueForDisplay(numericValue(42))).toBe('42');
    expect(formatValueForDisplay(numericValue(3.14))).toMatch(/^3\.14/);
  });

  it('formats string values', function () {
    expect(formatValueForDisplay(stringValue('hello'))).toBe('"hello"');
  });

  it('formats boolean values', function () {
    expect(formatValueForDisplay(booleanValue(true))).toBe('TRUE');
    expect(formatValueForDisplay(booleanValue(false))).toBe('FALSE');
  });

  it('formats null values', function () {
    expect(formatValueForDisplay(numericValue(null))).toBe('null');
    expect(formatValueForDisplay(stringValue(null))).toBe('null');
    expect(formatValueForDisplay(booleanValue(null))).toBe('null');
  });

  it('formats integer type values', function () {
    const intValue: Value = { type: 'number.integer', value: 42 };
    expect(formatValueForDisplay(intValue)).toBe('42');
  });
});

describe('createFormattedResult', function () {
  it('creates result for normal value', function () {
    const errorSet = new Set<number>();
    const result = createFormattedResult(numericValue(42), 0, errorSet);

    expect(result.display).toBe('42');
    expect(result.isNull).toBe(false);
    expect(result.isError).toBe(false);
  });

  it('creates result for null value', function () {
    const errorSet = new Set<number>();
    const result = createFormattedResult(numericValue(null), 0, errorSet);

    expect(result.display).toBe('null');
    expect(result.isNull).toBe(true);
    expect(result.isError).toBe(false);
  });

  it('creates result for error row', function () {
    const errorSet = new Set<number>([1]);
    const result = createFormattedResult(numericValue(null), 1, errorSet);

    expect(result.display).toBe('null');
    expect(result.isNull).toBe(false);
    expect(result.isError).toBe(true);
  });

  it('error takes precedence over null flag', function () {
    const errorSet = new Set<number>([0]);
    const result = createFormattedResult(numericValue(null), 0, errorSet);

    expect(result.isNull).toBe(false);
    expect(result.isError).toBe(true);
  });
});

describe('createErrorRowSet', function () {
  it('creates empty set for no errors', function () {
    const set = createErrorRowSet([]);
    expect(set.size).toBe(0);
  });

  it('creates set with error row indices', function () {
    const errors = [runtimeError(0), runtimeError(5), runtimeError(10)];
    const set = createErrorRowSet(errors);

    expect(set.size).toBe(3);
    expect(set.has(0)).toBe(true);
    expect(set.has(5)).toBe(true);
    expect(set.has(10)).toBe(true);
    expect(set.has(1)).toBe(false);
  });
});

describe('getMinMax', function () {
  it('returns null for empty array', function () {
    const result = getMinMax([]);
    expect(result.min).toBeNull();
    expect(result.max).toBeNull();
  });

  it('returns min and max for numeric values', function () {
    const values = [numericValue(10), numericValue(5), numericValue(20)];
    const result = getMinMax(values);

    expect(result.min).toBe(5);
    expect(result.max).toBe(20);
  });

  it('handles negative values', function () {
    const values = [numericValue(-10), numericValue(5), numericValue(-20)];
    const result = getMinMax(values);

    expect(result.min).toBe(-20);
    expect(result.max).toBe(5);
  });

  it('skips null values', function () {
    const values = [numericValue(null), numericValue(10), numericValue(null), numericValue(20)];
    const result = getMinMax(values);

    expect(result.min).toBe(10);
    expect(result.max).toBe(20);
  });

  it('returns null for all-null values', function () {
    const values = [numericValue(null), numericValue(null)];
    const result = getMinMax(values);

    expect(result.min).toBeNull();
    expect(result.max).toBeNull();
  });

  it('returns null for non-numeric types', function () {
    const values = [stringValue('hello'), stringValue('world')];
    const result = getMinMax(values);

    expect(result.min).toBeNull();
    expect(result.max).toBeNull();
  });

  it('handles single value', function () {
    const values = [numericValue(42)];
    const result = getMinMax(values);

    expect(result.min).toBe(42);
    expect(result.max).toBe(42);
  });

  it('skips NaN and Infinity', function () {
    const values = [numericValue(NaN), numericValue(10), numericValue(Infinity), numericValue(20)];
    const result = getMinMax(values);

    expect(result.min).toBe(10);
    expect(result.max).toBe(20);
  });
});

describe('countNulls', function () {
  it('returns 0 for empty array', function () {
    expect(countNulls([])).toBe(0);
  });

  it('returns 0 for array with no nulls', function () {
    const values = [numericValue(1), numericValue(2), numericValue(3)];
    expect(countNulls(values)).toBe(0);
  });

  it('counts null values', function () {
    const values = [numericValue(1), numericValue(null), numericValue(2), numericValue(null)];
    expect(countNulls(values)).toBe(2);
  });

  it('returns length for all-null array', function () {
    const values = [numericValue(null), numericValue(null), numericValue(null)];
    expect(countNulls(values)).toBe(3);
  });
});

describe('calculateStatistics', function () {
  it('returns correct statistics for numeric values', function () {
    const values = [numericValue(10), numericValue(20), numericValue(30)];
    const stats = calculateStatistics(values);

    expect(stats.count).toBe(3);
    expect(stats.min).toBe(10);
    expect(stats.max).toBe(30);
    expect(stats.nullCount).toBe(0);
    expect(stats.errorCount).toBe(0);
  });

  it('calculates null count correctly', function () {
    const values = [numericValue(10), numericValue(null), numericValue(20)];
    const stats = calculateStatistics(values);

    expect(stats.nullCount).toBe(1);
  });

  it('calculates error count correctly', function () {
    const values = [numericValue(10), numericValue(null), numericValue(20)];
    const errors = [runtimeError(1)];
    const stats = calculateStatistics(values, errors);

    expect(stats.errorCount).toBe(1);
  });

  it('excludes error rows from null count', function () {
    const values = [numericValue(10), numericValue(null), numericValue(null)];
    const errors = [runtimeError(1)];
    const stats = calculateStatistics(values, errors);

    expect(stats.nullCount).toBe(1);
    expect(stats.errorCount).toBe(1);
  });

  it('handles empty array', function () {
    const stats = calculateStatistics([]);

    expect(stats.count).toBe(0);
    expect(stats.min).toBeNull();
    expect(stats.max).toBeNull();
    expect(stats.nullCount).toBe(0);
    expect(stats.errorCount).toBe(0);
  });

  it('handles undefined errors', function () {
    const values = [numericValue(10), numericValue(null)];
    const stats = calculateStatistics(values, undefined);

    expect(stats.errorCount).toBe(0);
    expect(stats.nullCount).toBe(1);
  });
});

describe('hasNumericResults', function () {
  it('returns false for empty array', function () {
    expect(hasNumericResults([])).toBe(false);
  });

  it('returns true for number.float type', function () {
    const values = [numericValue(42)];
    expect(hasNumericResults(values)).toBe(true);
  });

  it('returns true for number.integer type', function () {
    const values: Value[] = [{ type: 'number.integer', value: 42 }];
    expect(hasNumericResults(values)).toBe(true);
  });

  it('returns false for string type', function () {
    const values = [stringValue('hello')];
    expect(hasNumericResults(values)).toBe(false);
  });

  it('returns false for boolean type', function () {
    const values = [booleanValue(true)];
    expect(hasNumericResults(values)).toBe(false);
  });
});

describe('formatStatisticValue', function () {
  it('formats null as dash', function () {
    expect(formatStatisticValue(null)).toBe('-');
  });

  it('formats numbers using formatNumber', function () {
    expect(formatStatisticValue(42)).toBe('42');
    expect(formatStatisticValue(3.14)).toMatch(/^3\.14/);
  });
});
