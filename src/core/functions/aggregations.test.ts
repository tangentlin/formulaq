/**
 * Tests for aggregation functions.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  SUM,
  AVG,
  MIN,
  MAX,
  COUNT,
  PERCENTILE,
  AGGREGATION_FUNCTIONS,
  registerAggregationFunctions,
} from './aggregations.ts';
import {
  computeSum,
  computeAvg,
  computeMin,
  computeMax,
  computeCount,
  computePercentile,
} from './aggregations.view-model.ts';
import { createFunctionRegistry, FunctionRegistryImpl } from './function-registry.ts';
import type { Value } from '../types/values.ts';
import type { EvaluationContext } from '../types/context.ts';

/**
 * Creates a Value array from raw numbers.
 */
function createNumberValues(values: Array<number | null>): Value[] {
  return values.map((v) => ({
    type: 'number.float' as const,
    value: v,
  }));
}

/**
 * Creates a Value array from raw strings.
 */
function createStringValues(values: Array<string | null>): Value[] {
  return values.map((v) => ({
    type: 'string.text' as const,
    value: v,
  }));
}

/**
 * Creates a Value array from raw booleans.
 */
function createBooleanValues(values: Array<boolean | null>): Value[] {
  return values.map((v) => ({
    type: 'boolean.boolean' as const,
    value: v,
  }));
}

/**
 * Creates a minimal evaluation context.
 */
function createContext(): EvaluationContext {
  return {
    variables: {},
    rowCount: 0,
  };
}

// ============================================================================
// View Model Tests (Pure Computation Logic)
// ============================================================================

describe('aggregations.viewModel', () => {
  describe('computeSum', () => {
    it('should sum all non-null values', () => {
      expect(computeSum([1, 2, 3, 4, 5])).toBe(15);
    });

    it('should skip null values', () => {
      expect(computeSum([1, null, 3, null, 5])).toBe(9);
    });

    it('should return null for empty array', () => {
      expect(computeSum([])).toBe(null);
    });

    it('should return null when all values are null', () => {
      expect(computeSum([null, null, null])).toBe(null);
    });

    it('should handle single non-null value', () => {
      expect(computeSum([42])).toBe(42);
    });

    it('should handle negative numbers', () => {
      expect(computeSum([-1, -2, 3])).toBe(0);
    });

    it('should handle decimal numbers', () => {
      expect(computeSum([0.1, 0.2, 0.3])).toBeCloseTo(0.6);
    });

    it('should handle large numbers', () => {
      expect(computeSum([1e10, 2e10, 3e10])).toBe(6e10);
    });

    it('should handle zero values', () => {
      expect(computeSum([0, 0, 0])).toBe(0);
    });
  });

  describe('computeAvg', () => {
    it('should average all non-null values', () => {
      expect(computeAvg([2, 4, 6])).toBe(4);
    });

    it('should skip null values in both sum and count', () => {
      expect(computeAvg([2, null, 4])).toBe(3);
    });

    it('should return null for empty array', () => {
      expect(computeAvg([])).toBe(null);
    });

    it('should return null when all values are null', () => {
      expect(computeAvg([null, null])).toBe(null);
    });

    it('should handle single non-null value', () => {
      expect(computeAvg([42])).toBe(42);
    });

    it('should handle negative numbers', () => {
      expect(computeAvg([-10, 10])).toBe(0);
    });

    it('should handle decimal numbers', () => {
      expect(computeAvg([0.1, 0.2, 0.3])).toBeCloseTo(0.2);
    });

    it('should produce non-integer result for integer inputs', () => {
      expect(computeAvg([1, 2])).toBe(1.5);
    });
  });

  describe('computeMin', () => {
    it('should find minimum non-null value', () => {
      expect(computeMin([3, 1, 4, 1, 5])).toBe(1);
    });

    it('should skip null values', () => {
      expect(computeMin([null, 5, null, 2])).toBe(2);
    });

    it('should return null for empty array', () => {
      expect(computeMin([])).toBe(null);
    });

    it('should return null when all values are null', () => {
      expect(computeMin([null, null])).toBe(null);
    });

    it('should handle single non-null value', () => {
      expect(computeMin([42])).toBe(42);
    });

    it('should handle negative numbers', () => {
      expect(computeMin([-3, -1, -4])).toBe(-4);
    });

    it('should handle decimal numbers', () => {
      expect(computeMin([0.3, 0.1, 0.2])).toBeCloseTo(0.1);
    });

    it('should handle all same values', () => {
      expect(computeMin([5, 5, 5])).toBe(5);
    });
  });

  describe('computeMax', () => {
    it('should find maximum non-null value', () => {
      expect(computeMax([3, 1, 4, 1, 5])).toBe(5);
    });

    it('should skip null values', () => {
      expect(computeMax([null, 5, null, 2])).toBe(5);
    });

    it('should return null for empty array', () => {
      expect(computeMax([])).toBe(null);
    });

    it('should return null when all values are null', () => {
      expect(computeMax([null, null])).toBe(null);
    });

    it('should handle single non-null value', () => {
      expect(computeMax([42])).toBe(42);
    });

    it('should handle negative numbers', () => {
      expect(computeMax([-3, -1, -4])).toBe(-1);
    });

    it('should handle decimal numbers', () => {
      expect(computeMax([0.3, 0.1, 0.2])).toBeCloseTo(0.3);
    });

    it('should handle all same values', () => {
      expect(computeMax([5, 5, 5])).toBe(5);
    });
  });

  describe('computeCount', () => {
    it('should count non-null values', () => {
      expect(computeCount([1, 2, 3, 4, 5])).toBe(5);
    });

    it('should skip null values', () => {
      expect(computeCount([1, null, 3, null, 5])).toBe(3);
    });

    it('should return 0 for empty array (not null)', () => {
      expect(computeCount([])).toBe(0);
    });

    it('should return 0 when all values are null (not null)', () => {
      expect(computeCount([null, null, null])).toBe(0);
    });

    it('should count any non-null type', () => {
      expect(computeCount(['a', 'b', null, 'c'])).toBe(3);
      expect(computeCount([true, false, null])).toBe(2);
      expect(computeCount([0, '', false])).toBe(3); // falsy but not null
    });

    it('should handle single null value', () => {
      expect(computeCount([null])).toBe(0);
    });

    it('should handle single non-null value', () => {
      expect(computeCount([42])).toBe(1);
    });
  });

  describe('computePercentile', () => {
    describe('basic functionality', () => {
      it('should return minimum for k=0', () => {
        expect(computePercentile([1, 2, 3, 4, 5], 0)).toBe(1);
      });

      it('should return maximum for k=100', () => {
        expect(computePercentile([1, 2, 3, 4, 5], 100)).toBe(5);
      });

      it('should return median for k=50 with odd count', () => {
        expect(computePercentile([1, 2, 3, 4, 5], 50)).toBe(3);
      });

      it('should interpolate median for k=50 with even count', () => {
        expect(computePercentile([1, 2, 3, 4], 50)).toBe(2.5);
      });

      it('should handle unsorted input', () => {
        expect(computePercentile([5, 3, 1, 4, 2], 50)).toBe(3);
      });
    });

    describe('null handling', () => {
      it('should skip null values', () => {
        expect(computePercentile([1, null, 3, null, 5], 50)).toBe(3);
      });

      it('should return null for empty array', () => {
        expect(computePercentile([], 50)).toBe(null);
      });

      it('should return null when all values are null', () => {
        expect(computePercentile([null, null, null], 50)).toBe(null);
      });
    });

    describe('single value', () => {
      it('should return single value for any k', () => {
        expect(computePercentile([42], 0)).toBe(42);
        expect(computePercentile([42], 50)).toBe(42);
        expect(computePercentile([42], 100)).toBe(42);
      });
    });

    describe('interpolation', () => {
      it('should interpolate for k=25', () => {
        // [1, 2, 3, 4, 5], k=25
        // position = 0.25 * 4 = 1
        // value at index 1 = 2
        expect(computePercentile([1, 2, 3, 4, 5], 25)).toBe(2);
      });

      it('should interpolate for k=75', () => {
        // [1, 2, 3, 4, 5], k=75
        // position = 0.75 * 4 = 3
        // value at index 3 = 4
        expect(computePercentile([1, 2, 3, 4, 5], 75)).toBe(4);
      });

      it('should interpolate between values', () => {
        // [10, 20, 30, 40], k=30
        // position = 0.30 * 3 = 0.9
        // interpolate between index 0 (10) and index 1 (20)
        // result = 10 + 0.9 * (20 - 10) = 19
        expect(computePercentile([10, 20, 30, 40], 30)).toBeCloseTo(19);
      });

      it('should handle fractional positions correctly', () => {
        // [0, 10], k=50
        // position = 0.50 * 1 = 0.5
        // interpolate between 0 and 10 at 0.5 = 5
        expect(computePercentile([0, 10], 50)).toBe(5);
      });
    });

    describe('edge cases for k', () => {
      it('should throw for k < 0', () => {
        expect(() => computePercentile([1, 2, 3], -1)).toThrow(RangeError);
      });

      it('should throw for k > 100', () => {
        expect(() => computePercentile([1, 2, 3], 101)).toThrow(RangeError);
      });

      it('should handle k=0 exactly', () => {
        expect(computePercentile([5, 10, 15], 0)).toBe(5);
      });

      it('should handle k=100 exactly', () => {
        expect(computePercentile([5, 10, 15], 100)).toBe(15);
      });

      it('should handle decimal k values', () => {
        expect(computePercentile([1, 2, 3, 4, 5], 33.33)).toBeDefined();
      });
    });

    describe('negative and decimal values', () => {
      it('should handle negative values', () => {
        expect(computePercentile([-5, -3, -1, 0, 2], 50)).toBe(-1);
      });

      it('should handle decimal values', () => {
        expect(computePercentile([0.1, 0.2, 0.3, 0.4, 0.5], 50)).toBeCloseTo(0.3);
      });

      it('should handle mixed positive and negative', () => {
        expect(computePercentile([-10, 0, 10], 0)).toBe(-10);
        expect(computePercentile([-10, 0, 10], 100)).toBe(10);
      });
    });
  });
});

// ============================================================================
// FormulaFunction Tests
// ============================================================================

describe('Aggregation FormulaFunctions', () => {
  const context = createContext();

  describe('SUM function', () => {
    it('should have correct metadata', () => {
      expect(SUM.name).toBe('SUM');
      expect(SUM.isAggregation).toBe(true);
      expect(SUM.category).toBe('Aggregation');
      expect(SUM.returnType).toBe('number.float');
    });

    it('should sum numeric values', async () => {
      const args = createNumberValues([10, 20, 30]);
      const result = await SUM.evaluate(args, context);

      expect(result).toEqual({ type: 'number.float', value: 60 });
    });

    it('should skip null values', async () => {
      const args = createNumberValues([10, null, 30]);
      const result = await SUM.evaluate(args, context);

      expect(result).toEqual({ type: 'number.float', value: 40 });
    });

    it('should return null for all-null values', async () => {
      const args = createNumberValues([null, null]);
      const result = await SUM.evaluate(args, context);

      expect(result).toEqual({ type: 'number.float', value: null });
    });

    it('should return null for empty array', async () => {
      const result = await SUM.evaluate([], context);

      expect(result).toEqual({ type: 'number.float', value: null });
    });
  });

  describe('AVG function', () => {
    it('should have correct metadata', () => {
      expect(AVG.name).toBe('AVG');
      expect(AVG.isAggregation).toBe(true);
      expect(AVG.category).toBe('Aggregation');
      expect(AVG.returnType).toBe('number.float');
    });

    it('should average numeric values', async () => {
      const args = createNumberValues([10, 20, 30]);
      const result = await AVG.evaluate(args, context);

      expect(result).toEqual({ type: 'number.float', value: 20 });
    });

    it('should skip null values in count', async () => {
      const args = createNumberValues([10, null, 20]);
      const result = await AVG.evaluate(args, context);

      expect(result).toEqual({ type: 'number.float', value: 15 });
    });

    it('should return null for all-null values', async () => {
      const args = createNumberValues([null, null]);
      const result = await AVG.evaluate(args, context);

      expect(result).toEqual({ type: 'number.float', value: null });
    });
  });

  describe('MIN function', () => {
    it('should have correct metadata', () => {
      expect(MIN.name).toBe('MIN');
      expect(MIN.isAggregation).toBe(true);
      expect(MIN.category).toBe('Aggregation');
      expect(MIN.returnType).toBe('number.float');
    });

    it('should find minimum value', async () => {
      const args = createNumberValues([30, 10, 20]);
      const result = await MIN.evaluate(args, context);

      expect(result).toEqual({ type: 'number.float', value: 10 });
    });

    it('should skip null values', async () => {
      const args = createNumberValues([null, 50, 30]);
      const result = await MIN.evaluate(args, context);

      expect(result).toEqual({ type: 'number.float', value: 30 });
    });

    it('should return null for all-null values', async () => {
      const args = createNumberValues([null, null]);
      const result = await MIN.evaluate(args, context);

      expect(result).toEqual({ type: 'number.float', value: null });
    });
  });

  describe('MAX function', () => {
    it('should have correct metadata', () => {
      expect(MAX.name).toBe('MAX');
      expect(MAX.isAggregation).toBe(true);
      expect(MAX.category).toBe('Aggregation');
      expect(MAX.returnType).toBe('number.float');
    });

    it('should find maximum value', async () => {
      const args = createNumberValues([30, 10, 20]);
      const result = await MAX.evaluate(args, context);

      expect(result).toEqual({ type: 'number.float', value: 30 });
    });

    it('should skip null values', async () => {
      const args = createNumberValues([null, 10, 30]);
      const result = await MAX.evaluate(args, context);

      expect(result).toEqual({ type: 'number.float', value: 30 });
    });

    it('should return null for all-null values', async () => {
      const args = createNumberValues([null, null]);
      const result = await MAX.evaluate(args, context);

      expect(result).toEqual({ type: 'number.float', value: null });
    });
  });

  describe('COUNT function', () => {
    it('should have correct metadata', () => {
      expect(COUNT.name).toBe('COUNT');
      expect(COUNT.isAggregation).toBe(true);
      expect(COUNT.category).toBe('Aggregation');
      expect(COUNT.returnType).toBe('number.float');
      expect(COUNT.params[0]!.type).toBe('any');
    });

    it('should count non-null numeric values', async () => {
      const args = createNumberValues([10, 20, 30]);
      const result = await COUNT.evaluate(args, context);

      expect(result).toEqual({ type: 'number.float', value: 3 });
    });

    it('should count non-null string values', async () => {
      const args = createStringValues(['a', 'b', null, 'c']);
      const result = await COUNT.evaluate(args, context);

      expect(result).toEqual({ type: 'number.float', value: 3 });
    });

    it('should count non-null boolean values', async () => {
      const args = createBooleanValues([true, false, null]);
      const result = await COUNT.evaluate(args, context);

      expect(result).toEqual({ type: 'number.float', value: 2 });
    });

    it('should return 0 for all-null values (not null)', async () => {
      const args = createNumberValues([null, null, null]);
      const result = await COUNT.evaluate(args, context);

      expect(result).toEqual({ type: 'number.float', value: 0 });
    });

    it('should return 0 for empty array (not null)', async () => {
      const result = await COUNT.evaluate([], context);

      expect(result).toEqual({ type: 'number.float', value: 0 });
    });
  });

  describe('PERCENTILE function', () => {
    it('should have correct metadata', () => {
      expect(PERCENTILE.name).toBe('PERCENTILE');
      expect(PERCENTILE.isAggregation).toBe(true);
      expect(PERCENTILE.category).toBe('Aggregation');
      expect(PERCENTILE.returnType).toBe('number.float');
      expect(PERCENTILE.params).toHaveLength(2);
      expect(PERCENTILE.minArgs).toBe(2);
      expect(PERCENTILE.maxArgs).toBe(2);
    });

    it('should calculate median (k=50)', async () => {
      const values = createNumberValues([1, 2, 3, 4, 5]);
      const kValue: Value = { type: 'number.float', value: 50 };
      const args = [...values, kValue];

      const result = await PERCENTILE.evaluate(args, context);

      expect(result).toEqual({ type: 'number.float', value: 3 });
    });

    it('should return minimum for k=0', async () => {
      const values = createNumberValues([10, 20, 30]);
      const kValue: Value = { type: 'number.float', value: 0 };
      const args = [...values, kValue];

      const result = await PERCENTILE.evaluate(args, context);

      expect(result).toEqual({ type: 'number.float', value: 10 });
    });

    it('should return maximum for k=100', async () => {
      const values = createNumberValues([10, 20, 30]);
      const kValue: Value = { type: 'number.float', value: 100 };
      const args = [...values, kValue];

      const result = await PERCENTILE.evaluate(args, context);

      expect(result).toEqual({ type: 'number.float', value: 30 });
    });

    it('should skip null values', async () => {
      const values = createNumberValues([null, 10, null, 20, 30]);
      const kValue: Value = { type: 'number.float', value: 50 };
      const args = [...values, kValue];

      const result = await PERCENTILE.evaluate(args, context);

      expect(result).toEqual({ type: 'number.float', value: 20 });
    });

    it('should return null for all-null values', async () => {
      const values = createNumberValues([null, null]);
      const kValue: Value = { type: 'number.float', value: 50 };
      const args = [...values, kValue];

      const result = await PERCENTILE.evaluate(args, context);

      expect(result).toEqual({ type: 'number.float', value: null });
    });

    it('should return null for empty values', async () => {
      const kValue: Value = { type: 'number.float', value: 50 };
      const args = [kValue];

      const result = await PERCENTILE.evaluate(args, context);

      // Only k provided, no values - need at least 2 args
      expect(result).toEqual({ type: 'number.float', value: null });
    });

    it('should return null for invalid k', async () => {
      const values = createNumberValues([1, 2, 3]);
      const kValue: Value = { type: 'number.float', value: 150 };
      const args = [...values, kValue];

      const result = await PERCENTILE.evaluate(args, context);

      expect(result).toEqual({ type: 'number.float', value: null });
    });

    it('should return null for negative k', async () => {
      const values = createNumberValues([1, 2, 3]);
      const kValue: Value = { type: 'number.float', value: -10 };
      const args = [...values, kValue];

      const result = await PERCENTILE.evaluate(args, context);

      expect(result).toEqual({ type: 'number.float', value: null });
    });

    it('should return null for non-numeric k', async () => {
      const values = createNumberValues([1, 2, 3]);
      const kValue: Value = { type: 'string.text', value: 'fifty' };
      const args = [...values, kValue];

      const result = await PERCENTILE.evaluate(args, context);

      expect(result).toEqual({ type: 'number.float', value: null });
    });

    it('should handle null k value', async () => {
      const values = createNumberValues([1, 2, 3]);
      const kValue: Value = { type: 'number.float', value: null };
      const args = [...values, kValue];

      const result = await PERCENTILE.evaluate(args, context);

      expect(result).toEqual({ type: 'number.float', value: null });
    });
  });
});

// ============================================================================
// Registration Tests
// ============================================================================

describe('registerAggregationFunctions', () => {
  let registry: FunctionRegistryImpl;

  beforeEach(() => {
    registry = createFunctionRegistry();
  });

  it('should register all 6 aggregation functions', () => {
    registerAggregationFunctions(registry);

    expect(registry.hasFunction('SUM')).toBe(true);
    expect(registry.hasFunction('AVG')).toBe(true);
    expect(registry.hasFunction('MIN')).toBe(true);
    expect(registry.hasFunction('MAX')).toBe(true);
    expect(registry.hasFunction('COUNT')).toBe(true);
    expect(registry.hasFunction('PERCENTILE')).toBe(true);
  });

  it('should register exactly 6 functions', () => {
    registerAggregationFunctions(registry);

    expect(registry.getFunctions()).toHaveLength(6);
  });

  it('should export AGGREGATION_FUNCTIONS array with 6 functions', () => {
    expect(AGGREGATION_FUNCTIONS).toHaveLength(6);
  });

  it('all registered functions should have isAggregation=true', () => {
    registerAggregationFunctions(registry);

    const functions = registry.getFunctions();
    for (const fn of functions) {
      expect(fn.isAggregation).toBe(true);
    }
  });

  it('all registered functions should have category=Aggregation', () => {
    registerAggregationFunctions(registry);

    const functions = registry.getFunctions();
    for (const fn of functions) {
      expect(fn.category).toBe('Aggregation');
    }
  });

  it('getByCategory should return all aggregation functions', () => {
    registerAggregationFunctions(registry);

    const aggregations = registry.getByCategory('Aggregation');
    expect(aggregations).toHaveLength(6);
  });
});

// ============================================================================
// Edge Case Tests for Non-Numeric Values
// ============================================================================

describe('Aggregation functions with non-numeric values', () => {
  const context = createContext();

  it('SUM should treat non-numeric values as null', async () => {
    const args: Value[] = [
      { type: 'number.float', value: 10 },
      { type: 'string.text', value: 'hello' },
      { type: 'number.float', value: 20 },
    ];

    const result = await SUM.evaluate(args, context);

    expect(result).toEqual({ type: 'number.float', value: 30 });
  });

  it('AVG should treat non-numeric values as null', async () => {
    const args: Value[] = [
      { type: 'number.float', value: 10 },
      { type: 'boolean.boolean', value: true },
      { type: 'number.float', value: 30 },
    ];

    const result = await AVG.evaluate(args, context);

    expect(result).toEqual({ type: 'number.float', value: 20 });
  });

  it('MIN should treat non-numeric values as null', async () => {
    const args: Value[] = [
      { type: 'string.text', value: 'a' },
      { type: 'number.float', value: 50 },
      { type: 'number.float', value: 30 },
    ];

    const result = await MIN.evaluate(args, context);

    expect(result).toEqual({ type: 'number.float', value: 30 });
  });

  it('MAX should treat non-numeric values as null', async () => {
    const args: Value[] = [
      { type: 'number.float', value: 50 },
      { type: 'string.text', value: 'z' },
      { type: 'number.float', value: 30 },
    ];

    const result = await MAX.evaluate(args, context);

    expect(result).toEqual({ type: 'number.float', value: 50 });
  });
});
