/**
 * Tests for the logical functions implementation.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { Value } from '../types/values.ts';
import type { EvaluationContext } from '../types/context.ts';
import { createFunctionRegistry, FunctionRegistryImpl } from './function-registry.ts';
import {
  ifFunction,
  andFunction,
  orFunction,
  notFunction,
  ifNullFunction,
  registerLogicalFunctions,
} from './logical.ts';
import {
  evaluateAnd,
  evaluateIf,
  evaluateIfNull,
  evaluateNot,
  evaluateOr,
} from './logical.view-model.ts';

/**
 * Creates a boolean Value.
 */
function boolVal(value: boolean | null): Value {
  return { type: 'boolean.boolean', value };
}

/**
 * Creates a number Value.
 */
function numVal(value: number | null): Value {
  return { type: 'number.float', value };
}

/**
 * Creates a string Value.
 */
function strVal(value: string | null): Value {
  return { type: 'string.text', value };
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

describe('logical.viewModel', () => {
  describe('evaluateIf', () => {
    it('should return thenValue when condition is true', () => {
      const result = evaluateIf(boolVal(true), strVal('yes'), strVal('no'));
      expect(result).toEqual(strVal('yes'));
    });

    it('should return elseValue when condition is false', () => {
      const result = evaluateIf(boolVal(false), strVal('yes'), strVal('no'));
      expect(result).toEqual(strVal('no'));
    });

    it('should return null when condition value is null', () => {
      const result = evaluateIf(boolVal(null), strVal('yes'), strVal('no'));
      expect(result).toBeNull();
    });

    it('should return null when condition is null', () => {
      const result = evaluateIf(null, strVal('yes'), strVal('no'));
      expect(result).toBeNull();
    });

    it('should handle numeric branch values', () => {
      const result = evaluateIf(boolVal(true), numVal(1), numVal(0));
      expect(result).toEqual(numVal(1));
    });

    it('should handle null branch values', () => {
      const result = evaluateIf(boolVal(true), null, strVal('no'));
      expect(result).toBeNull();
    });
  });

  describe('evaluateAnd', () => {
    it('should return true when all values are true', () => {
      const result = evaluateAnd([boolVal(true), boolVal(true)]);
      expect(result.result).toBe(true);
    });

    it('should return false when any value is false', () => {
      const result = evaluateAnd([boolVal(true), boolVal(false), boolVal(true)]);
      expect(result.result).toBe(false);
    });

    it('should short-circuit on first false', () => {
      const result = evaluateAnd([boolVal(true), boolVal(false), boolVal(true)]);
      expect(result.stoppedAtIndex).toBe(1);
    });

    it('should return null when null is present and no false found', () => {
      const result = evaluateAnd([boolVal(true), boolVal(null)]);
      expect(result.result).toBeNull();
    });

    it('should return false even if null is present after false', () => {
      const result = evaluateAnd([boolVal(false), boolVal(null)]);
      expect(result.result).toBe(false);
      expect(result.stoppedAtIndex).toBe(0);
    });

    it('should handle multiple true values', () => {
      const result = evaluateAnd([boolVal(true), boolVal(true), boolVal(true), boolVal(true)]);
      expect(result.result).toBe(true);
      expect(result.stoppedAtIndex).toBe(3);
    });

    it('should handle null Value object', () => {
      const result = evaluateAnd([boolVal(true), null as unknown as Value]);
      expect(result.result).toBeNull();
    });
  });

  describe('evaluateOr', () => {
    it('should return true when any value is true', () => {
      const result = evaluateOr([boolVal(false), boolVal(true)]);
      expect(result.result).toBe(true);
    });

    it('should return false when all values are false', () => {
      const result = evaluateOr([boolVal(false), boolVal(false)]);
      expect(result.result).toBe(false);
    });

    it('should short-circuit on first true', () => {
      const result = evaluateOr([boolVal(true), boolVal(false)]);
      expect(result.stoppedAtIndex).toBe(0);
    });

    it('should return null when null is present and no true found', () => {
      const result = evaluateOr([boolVal(false), boolVal(null)]);
      expect(result.result).toBeNull();
    });

    it('should return true even if null is present after true', () => {
      const result = evaluateOr([boolVal(true), boolVal(null)]);
      expect(result.result).toBe(true);
      expect(result.stoppedAtIndex).toBe(0);
    });

    it('should handle multiple false values', () => {
      const result = evaluateOr([boolVal(false), boolVal(false), boolVal(false), boolVal(false)]);
      expect(result.result).toBe(false);
      expect(result.stoppedAtIndex).toBe(3);
    });
  });

  describe('evaluateNot', () => {
    it('should return false when input is true', () => {
      const result = evaluateNot(boolVal(true));
      expect(result).toBe(false);
    });

    it('should return true when input is false', () => {
      const result = evaluateNot(boolVal(false));
      expect(result).toBe(true);
    });

    it('should return null when input value is null', () => {
      const result = evaluateNot(boolVal(null));
      expect(result).toBeNull();
    });

    it('should return null when input is null', () => {
      const result = evaluateNot(null);
      expect(result).toBeNull();
    });
  });

  describe('evaluateIfNull', () => {
    it('should return value when value is not null', () => {
      const result = evaluateIfNull(numVal(5), numVal(0));
      expect(result).toEqual(numVal(5));
    });

    it('should return default when value is null', () => {
      const result = evaluateIfNull(numVal(null), numVal(0));
      expect(result).toEqual(numVal(0));
    });

    it('should return default when value object is null', () => {
      const result = evaluateIfNull(null, numVal(0));
      expect(result).toEqual(numVal(0));
    });

    it('should treat empty string as not null', () => {
      const result = evaluateIfNull(strVal(''), strVal('default'));
      expect(result).toEqual(strVal(''));
    });

    it('should treat zero as not null', () => {
      const result = evaluateIfNull(numVal(0), numVal(999));
      expect(result).toEqual(numVal(0));
    });

    it('should treat false as not null', () => {
      const result = evaluateIfNull(boolVal(false), boolVal(true));
      expect(result).toEqual(boolVal(false));
    });
  });
});

describe('IF function', () => {
  const context = createContext();

  it('should have correct metadata', () => {
    expect(ifFunction.name).toBe('IF');
    expect(ifFunction.isAggregation).toBe(false);
    expect(ifFunction.category).toBe('Logical');
    expect(ifFunction.params).toHaveLength(3);
  });

  it('should return thenValue when condition is true', async () => {
    const result = await ifFunction.evaluate([boolVal(true), strVal('yes'), strVal('no')], context);
    expect(result).toEqual(strVal('yes'));
  });

  it('should return elseValue when condition is false', async () => {
    const result = await ifFunction.evaluate(
      [boolVal(false), strVal('yes'), strVal('no')],
      context,
    );
    expect(result).toEqual(strVal('no'));
  });

  it('should return null when condition is null', async () => {
    const result = await ifFunction.evaluate([boolVal(null), strVal('yes'), strVal('no')], context);
    expect(result).toBeNull();
  });

  it('should handle numeric values', async () => {
    const result = await ifFunction.evaluate([boolVal(true), numVal(100), numVal(0)], context);
    expect(result).toEqual(numVal(100));
  });

  it('should handle missing arguments gracefully', async () => {
    const result = await ifFunction.evaluate([boolVal(true)], context);
    expect(result).toBeNull();
  });
});

describe('AND function', () => {
  const context = createContext();

  it('should have correct metadata', () => {
    expect(andFunction.name).toBe('AND');
    expect(andFunction.isAggregation).toBe(false);
    expect(andFunction.isVariadic).toBe(true);
    expect(andFunction.minArgs).toBe(2);
    expect(andFunction.category).toBe('Logical');
  });

  it('should return true when all values are true', async () => {
    const result = await andFunction.evaluate(
      [boolVal(true), boolVal(true), boolVal(true)],
      context,
    );
    expect(result).toEqual(boolVal(true));
  });

  it('should return false when any value is false', async () => {
    const result = await andFunction.evaluate(
      [boolVal(true), boolVal(false), boolVal(true)],
      context,
    );
    expect(result).toEqual(boolVal(false));
  });

  it('should return null when null is present and no false found', async () => {
    const result = await andFunction.evaluate(
      [boolVal(true), boolVal(null), boolVal(true)],
      context,
    );
    expect(result).toEqual(boolVal(null));
  });

  it('should short-circuit: false before null returns false', async () => {
    const result = await andFunction.evaluate([boolVal(false), boolVal(null)], context);
    expect(result).toEqual(boolVal(false));
  });

  it('should work with two arguments', async () => {
    const result = await andFunction.evaluate([boolVal(true), boolVal(true)], context);
    expect(result).toEqual(boolVal(true));
  });

  it('should work with many arguments', async () => {
    const result = await andFunction.evaluate(
      [boolVal(true), boolVal(true), boolVal(true), boolVal(true), boolVal(true)],
      context,
    );
    expect(result).toEqual(boolVal(true));
  });
});

describe('OR function', () => {
  const context = createContext();

  it('should have correct metadata', () => {
    expect(orFunction.name).toBe('OR');
    expect(orFunction.isAggregation).toBe(false);
    expect(orFunction.isVariadic).toBe(true);
    expect(orFunction.minArgs).toBe(2);
    expect(orFunction.category).toBe('Logical');
  });

  it('should return true when any value is true', async () => {
    const result = await orFunction.evaluate(
      [boolVal(false), boolVal(true), boolVal(false)],
      context,
    );
    expect(result).toEqual(boolVal(true));
  });

  it('should return false when all values are false', async () => {
    const result = await orFunction.evaluate(
      [boolVal(false), boolVal(false), boolVal(false)],
      context,
    );
    expect(result).toEqual(boolVal(false));
  });

  it('should return null when null is present and no true found', async () => {
    const result = await orFunction.evaluate(
      [boolVal(false), boolVal(null), boolVal(false)],
      context,
    );
    expect(result).toEqual(boolVal(null));
  });

  it('should short-circuit: true before null returns true', async () => {
    const result = await orFunction.evaluate([boolVal(true), boolVal(null)], context);
    expect(result).toEqual(boolVal(true));
  });

  it('should work with two arguments', async () => {
    const result = await orFunction.evaluate([boolVal(false), boolVal(true)], context);
    expect(result).toEqual(boolVal(true));
  });

  it('should work with many arguments', async () => {
    const result = await orFunction.evaluate(
      [boolVal(false), boolVal(false), boolVal(false), boolVal(false), boolVal(true)],
      context,
    );
    expect(result).toEqual(boolVal(true));
  });
});

describe('NOT function', () => {
  const context = createContext();

  it('should have correct metadata', () => {
    expect(notFunction.name).toBe('NOT');
    expect(notFunction.isAggregation).toBe(false);
    expect(notFunction.category).toBe('Logical');
    expect(notFunction.params).toHaveLength(1);
  });

  it('should return false when input is true', async () => {
    const result = await notFunction.evaluate([boolVal(true)], context);
    expect(result).toEqual(boolVal(false));
  });

  it('should return true when input is false', async () => {
    const result = await notFunction.evaluate([boolVal(false)], context);
    expect(result).toEqual(boolVal(true));
  });

  it('should return null when input is null', async () => {
    const result = await notFunction.evaluate([boolVal(null)], context);
    expect(result).toEqual(boolVal(null));
  });

  it('should handle missing argument', async () => {
    const result = await notFunction.evaluate([], context);
    expect(result).toEqual(boolVal(null));
  });
});

describe('IFNULL function', () => {
  const context = createContext();

  it('should have correct metadata', () => {
    expect(ifNullFunction.name).toBe('IFNULL');
    expect(ifNullFunction.isAggregation).toBe(false);
    expect(ifNullFunction.category).toBe('Logical');
    expect(ifNullFunction.params).toHaveLength(2);
  });

  it('should return value when not null', async () => {
    const result = await ifNullFunction.evaluate([numVal(5), numVal(0)], context);
    expect(result).toEqual(numVal(5));
  });

  it('should return default when value is null', async () => {
    const result = await ifNullFunction.evaluate([numVal(null), numVal(0)], context);
    expect(result).toEqual(numVal(0));
  });

  it('should treat empty string as not null', async () => {
    const result = await ifNullFunction.evaluate([strVal(''), strVal('default')], context);
    expect(result).toEqual(strVal(''));
  });

  it('should treat zero as not null', async () => {
    const result = await ifNullFunction.evaluate([numVal(0), numVal(999)], context);
    expect(result).toEqual(numVal(0));
  });

  it('should treat false as not null', async () => {
    const result = await ifNullFunction.evaluate([boolVal(false), boolVal(true)], context);
    expect(result).toEqual(boolVal(false));
  });

  it('should handle string values', async () => {
    const result = await ifNullFunction.evaluate([strVal(null), strVal('fallback')], context);
    expect(result).toEqual(strVal('fallback'));
  });
});

describe('registerLogicalFunctions', () => {
  let registry: FunctionRegistryImpl;

  beforeEach(() => {
    registry = createFunctionRegistry();
  });

  it('should register all logical functions', () => {
    registerLogicalFunctions(registry);

    expect(registry.hasFunction('IF')).toBe(true);
    expect(registry.hasFunction('AND')).toBe(true);
    expect(registry.hasFunction('OR')).toBe(true);
    expect(registry.hasFunction('NOT')).toBe(true);
    expect(registry.hasFunction('IFNULL')).toBe(true);
  });

  it('should register exactly 5 functions', () => {
    registerLogicalFunctions(registry);

    const functions = registry.getFunctions();
    expect(functions).toHaveLength(5);
  });

  it('should register functions with logical category', () => {
    registerLogicalFunctions(registry);

    const logicalFunctions = registry.getByCategory('Logical');
    expect(logicalFunctions).toHaveLength(5);
  });

  it('should allow retrieval and execution of registered functions', async () => {
    registerLogicalFunctions(registry);

    const ifFn = registry.getFunction('IF');
    expect(ifFn).toBeDefined();

    const result = await ifFn!.evaluate([boolVal(true), strVal('a'), strVal('b')], createContext());
    expect(result).toEqual(strVal('a'));
  });
});

describe('truth tables', () => {
  const context = createContext();

  describe('AND truth table', () => {
    const truthTable = [
      { a: true, b: true, expected: true },
      { a: true, b: false, expected: false },
      { a: false, b: true, expected: false },
      { a: false, b: false, expected: false },
    ];

    for (const row of truthTable) {
      it(`AND(${row.a}, ${row.b}) = ${row.expected}`, async () => {
        const result = await andFunction.evaluate([boolVal(row.a), boolVal(row.b)], context);
        expect(result).toEqual(boolVal(row.expected));
      });
    }
  });

  describe('OR truth table', () => {
    const truthTable = [
      { a: true, b: true, expected: true },
      { a: true, b: false, expected: true },
      { a: false, b: true, expected: true },
      { a: false, b: false, expected: false },
    ];

    for (const row of truthTable) {
      it(`OR(${row.a}, ${row.b}) = ${row.expected}`, async () => {
        const result = await orFunction.evaluate([boolVal(row.a), boolVal(row.b)], context);
        expect(result).toEqual(boolVal(row.expected));
      });
    }
  });

  describe('NOT truth table', () => {
    const truthTable = [
      { input: true, expected: false },
      { input: false, expected: true },
    ];

    for (const row of truthTable) {
      it(`NOT(${row.input}) = ${row.expected}`, async () => {
        const result = await notFunction.evaluate([boolVal(row.input)], context);
        expect(result).toEqual(boolVal(row.expected));
      });
    }
  });
});

describe('null handling edge cases', () => {
  const context = createContext();

  describe('AND with nulls', () => {
    it('AND(null, null) = null', async () => {
      const result = await andFunction.evaluate([boolVal(null), boolVal(null)], context);
      expect(result).toEqual(boolVal(null));
    });

    it('AND(true, null, true) = null', async () => {
      const result = await andFunction.evaluate(
        [boolVal(true), boolVal(null), boolVal(true)],
        context,
      );
      expect(result).toEqual(boolVal(null));
    });

    it('AND(null, false) = false (null skipped, false found)', async () => {
      const result = await andFunction.evaluate([boolVal(null), boolVal(false)], context);
      expect(result).toEqual(boolVal(false));
    });
  });

  describe('OR with nulls', () => {
    it('OR(null, null) = null', async () => {
      const result = await orFunction.evaluate([boolVal(null), boolVal(null)], context);
      expect(result).toEqual(boolVal(null));
    });

    it('OR(false, null, false) = null', async () => {
      const result = await orFunction.evaluate(
        [boolVal(false), boolVal(null), boolVal(false)],
        context,
      );
      expect(result).toEqual(boolVal(null));
    });

    it('OR(null, true) = true (null skipped, true found)', async () => {
      const result = await orFunction.evaluate([boolVal(null), boolVal(true)], context);
      expect(result).toEqual(boolVal(true));
    });
  });
});

describe('short-circuit behavior verification', () => {
  describe('AND short-circuits', () => {
    it('should stop evaluating after finding false', () => {
      const result = evaluateAnd([boolVal(true), boolVal(false), boolVal(true), boolVal(true)]);

      expect(result.result).toBe(false);
      expect(result.stoppedAtIndex).toBe(1);
    });

    it('should evaluate all when all are true', () => {
      const result = evaluateAnd([boolVal(true), boolVal(true), boolVal(true)]);

      expect(result.result).toBe(true);
      expect(result.stoppedAtIndex).toBe(2);
    });
  });

  describe('OR short-circuits', () => {
    it('should stop evaluating after finding true', () => {
      const result = evaluateOr([boolVal(false), boolVal(true), boolVal(false), boolVal(false)]);

      expect(result.result).toBe(true);
      expect(result.stoppedAtIndex).toBe(1);
    });

    it('should evaluate all when all are false', () => {
      const result = evaluateOr([boolVal(false), boolVal(false), boolVal(false)]);

      expect(result.result).toBe(false);
      expect(result.stoppedAtIndex).toBe(2);
    });
  });
});
