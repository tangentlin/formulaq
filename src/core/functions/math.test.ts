/**
 * Tests for math functions (LOG, LOG10, POWER).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { computeNaturalLog, computeLog10, computePower } from './math.view-model.ts';
import {
  LOG_FUNCTION,
  LOG10_FUNCTION,
  POWER_FUNCTION,
  MATH_FUNCTIONS,
  registerMathFunctions,
} from './math.ts';
import { createFunctionRegistry } from './function-registry.ts';
import type { Value } from '../types/values.ts';
import type { EvaluationContext } from '../types/context.ts';

/**
 * Helper to create a float Value.
 */
function floatVal(n: number | null): Value {
  return { type: 'number.float', value: n };
}

/**
 * Helper to create an integer Value.
 */
function intVal(n: number | null): Value {
  return { type: 'number.integer', value: n };
}

/**
 * Creates a minimal evaluation context for testing.
 */
function createTestContext(): EvaluationContext {
  return {
    variables: {},
    rowCount: 0,
  };
}

describe('math.viewModel', () => {
  describe('computeNaturalLog', () => {
    it('should compute natural log of positive numbers', () => {
      expect(computeNaturalLog(1)).toBe(0);
      expect(computeNaturalLog(Math.E)).toBeCloseTo(1, 10);
      expect(computeNaturalLog(Math.E * Math.E)).toBeCloseTo(2, 10);
    });

    it('should handle fractional positive numbers', () => {
      expect(computeNaturalLog(0.5)).toBeCloseTo(Math.log(0.5), 10);
      expect(computeNaturalLog(0.1)).toBeCloseTo(Math.log(0.1), 10);
    });

    it('should return null for zero (domain error)', () => {
      expect(computeNaturalLog(0)).toBeNull();
    });

    it('should return null for negative numbers (domain error)', () => {
      expect(computeNaturalLog(-1)).toBeNull();
      expect(computeNaturalLog(-100)).toBeNull();
      expect(computeNaturalLog(-0.5)).toBeNull();
    });

    it('should return null for null input', () => {
      expect(computeNaturalLog(null)).toBeNull();
    });

    it('should handle very large numbers', () => {
      expect(computeNaturalLog(1e100)).toBeCloseTo(Math.log(1e100), 5);
    });

    it('should handle very small positive numbers', () => {
      expect(computeNaturalLog(1e-100)).toBeCloseTo(Math.log(1e-100), 5);
    });
  });

  describe('computeLog10', () => {
    it('should compute base-10 log of powers of 10', () => {
      expect(computeLog10(1)).toBe(0);
      expect(computeLog10(10)).toBeCloseTo(1, 10);
      expect(computeLog10(100)).toBeCloseTo(2, 10);
      expect(computeLog10(1000)).toBeCloseTo(3, 10);
    });

    it('should compute base-10 log of fractional powers of 10', () => {
      expect(computeLog10(0.1)).toBeCloseTo(-1, 10);
      expect(computeLog10(0.01)).toBeCloseTo(-2, 10);
    });

    it('should handle arbitrary positive numbers', () => {
      expect(computeLog10(2)).toBeCloseTo(Math.log10(2), 10);
      expect(computeLog10(50)).toBeCloseTo(Math.log10(50), 10);
    });

    it('should return null for zero (domain error)', () => {
      expect(computeLog10(0)).toBeNull();
    });

    it('should return null for negative numbers (domain error)', () => {
      expect(computeLog10(-1)).toBeNull();
      expect(computeLog10(-10)).toBeNull();
      expect(computeLog10(-0.1)).toBeNull();
    });

    it('should return null for null input', () => {
      expect(computeLog10(null)).toBeNull();
    });

    it('should handle very large numbers', () => {
      expect(computeLog10(1e100)).toBeCloseTo(100, 5);
    });

    it('should handle very small positive numbers', () => {
      expect(computeLog10(1e-100)).toBeCloseTo(-100, 5);
    });
  });

  describe('computePower', () => {
    it('should compute integer powers', () => {
      expect(computePower(2, 3)).toBe(8);
      expect(computePower(10, 2)).toBe(100);
      expect(computePower(3, 4)).toBe(81);
      expect(computePower(5, 1)).toBe(5);
    });

    it('should compute fractional powers (roots)', () => {
      expect(computePower(4, 0.5)).toBeCloseTo(2, 10);
      expect(computePower(27, 1 / 3)).toBeCloseTo(3, 10);
      expect(computePower(16, 0.25)).toBeCloseTo(2, 10);
    });

    it('should compute negative exponents', () => {
      expect(computePower(2, -1)).toBeCloseTo(0.5, 10);
      expect(computePower(10, -2)).toBeCloseTo(0.01, 10);
      expect(computePower(5, -1)).toBeCloseTo(0.2, 10);
    });

    it('should handle x^0 = 1 for any x', () => {
      expect(computePower(5, 0)).toBe(1);
      expect(computePower(1, 0)).toBe(1);
      expect(computePower(-5, 0)).toBe(1);
      expect(computePower(100, 0)).toBe(1);
      expect(computePower(0.5, 0)).toBe(1);
    });

    it('should return 1 for 0^0 (by convention)', () => {
      expect(computePower(0, 0)).toBe(1);
    });

    it('should handle 0 as base with positive exponent', () => {
      expect(computePower(0, 1)).toBe(0);
      expect(computePower(0, 2)).toBe(0);
      expect(computePower(0, 0.5)).toBe(0);
    });

    it('should return null for 0^negative (domain error)', () => {
      expect(computePower(0, -1)).toBeNull();
      expect(computePower(0, -2)).toBeNull();
      expect(computePower(0, -0.5)).toBeNull();
    });

    it('should handle negative base with integer exponent', () => {
      expect(computePower(-2, 3)).toBe(-8);
      expect(computePower(-2, 2)).toBe(4);
      expect(computePower(-3, 3)).toBe(-27);
      expect(computePower(-10, 0)).toBe(1);
    });

    it('should return null for negative base with non-integer exponent (complex result)', () => {
      expect(computePower(-2, 0.5)).toBeNull();
      expect(computePower(-4, 0.5)).toBeNull();
      expect(computePower(-1, 0.5)).toBeNull();
      expect(computePower(-8, 1 / 3)).toBeNull();
    });

    it('should return null for null base', () => {
      expect(computePower(null, 2)).toBeNull();
    });

    it('should return null for null exponent', () => {
      expect(computePower(2, null)).toBeNull();
    });

    it('should return null for both null', () => {
      expect(computePower(null, null)).toBeNull();
    });

    it('should handle 1^x = 1 for any finite x', () => {
      expect(computePower(1, 100)).toBe(1);
      expect(computePower(1, -100)).toBe(1);
      expect(computePower(1, 0.5)).toBe(1);
    });

    it('should return null for overflow (infinity result)', () => {
      expect(computePower(10, 1000)).toBeNull();
      expect(computePower(2, 2000)).toBeNull();
    });
  });
});

describe('LOG_FUNCTION', () => {
  it('should have correct metadata', () => {
    expect(LOG_FUNCTION.name).toBe('LOG');
    expect(LOG_FUNCTION.description).toContain('natural logarithm');
    expect(LOG_FUNCTION.returnType).toBe('number.float');
    expect(LOG_FUNCTION.isAggregation).toBe(false);
    expect(LOG_FUNCTION.category).toBe('Math');
    expect(LOG_FUNCTION.params).toHaveLength(1);
    expect(LOG_FUNCTION.params[0]!.name).toBe('x');
    expect(LOG_FUNCTION.minArgs).toBe(1);
    expect(LOG_FUNCTION.maxArgs).toBe(1);
  });

  it('should compute natural log of positive float value', async () => {
    const result = await LOG_FUNCTION.evaluate([floatVal(Math.E)], createTestContext());
    expect(result).not.toBeNull();
    expect(result!.type).toBe('number.float');
    expect(result!.value).toBeCloseTo(1, 10);
  });

  it('should compute natural log of positive integer value', async () => {
    const result = await LOG_FUNCTION.evaluate([intVal(1)], createTestContext());
    expect(result).not.toBeNull();
    expect(result!.type).toBe('number.float');
    expect(result!.value).toBe(0);
  });

  it('should return null value for zero input', async () => {
    const result = await LOG_FUNCTION.evaluate([floatVal(0)], createTestContext());
    expect(result).not.toBeNull();
    expect(result!.type).toBe('number.float');
    expect(result!.value).toBeNull();
  });

  it('should return null value for negative input', async () => {
    const result = await LOG_FUNCTION.evaluate([floatVal(-5)], createTestContext());
    expect(result).not.toBeNull();
    expect(result!.value).toBeNull();
  });

  it('should return null value for null input', async () => {
    const result = await LOG_FUNCTION.evaluate([floatVal(null)], createTestContext());
    expect(result).not.toBeNull();
    expect(result!.type).toBe('number.float');
    expect(result!.value).toBeNull();
  });

  it('should return null value for missing argument', async () => {
    const result = await LOG_FUNCTION.evaluate([], createTestContext());
    expect(result).not.toBeNull();
    expect(result!.value).toBeNull();
  });
});

describe('LOG10_FUNCTION', () => {
  it('should have correct metadata', () => {
    expect(LOG10_FUNCTION.name).toBe('LOG10');
    expect(LOG10_FUNCTION.description).toContain('base-10 logarithm');
    expect(LOG10_FUNCTION.returnType).toBe('number.float');
    expect(LOG10_FUNCTION.isAggregation).toBe(false);
    expect(LOG10_FUNCTION.category).toBe('Math');
    expect(LOG10_FUNCTION.params).toHaveLength(1);
    expect(LOG10_FUNCTION.params[0]!.name).toBe('x');
    expect(LOG10_FUNCTION.minArgs).toBe(1);
    expect(LOG10_FUNCTION.maxArgs).toBe(1);
  });

  it('should compute base-10 log of power of 10', async () => {
    const result = await LOG10_FUNCTION.evaluate([floatVal(100)], createTestContext());
    expect(result).not.toBeNull();
    expect(result!.type).toBe('number.float');
    expect(result!.value).toBeCloseTo(2, 10);
  });

  it('should compute base-10 log of integer value', async () => {
    const result = await LOG10_FUNCTION.evaluate([intVal(10)], createTestContext());
    expect(result).not.toBeNull();
    expect(result!.type).toBe('number.float');
    expect(result!.value).toBeCloseTo(1, 10);
  });

  it('should return null value for zero input', async () => {
    const result = await LOG10_FUNCTION.evaluate([floatVal(0)], createTestContext());
    expect(result).not.toBeNull();
    expect(result!.value).toBeNull();
  });

  it('should return null value for negative input', async () => {
    const result = await LOG10_FUNCTION.evaluate([floatVal(-10)], createTestContext());
    expect(result).not.toBeNull();
    expect(result!.value).toBeNull();
  });

  it('should return null value for null input', async () => {
    const result = await LOG10_FUNCTION.evaluate([floatVal(null)], createTestContext());
    expect(result).not.toBeNull();
    expect(result!.value).toBeNull();
  });
});

describe('POWER_FUNCTION', () => {
  it('should have correct metadata', () => {
    expect(POWER_FUNCTION.name).toBe('POWER');
    expect(POWER_FUNCTION.description).toContain('power');
    expect(POWER_FUNCTION.returnType).toBe('number.float');
    expect(POWER_FUNCTION.isAggregation).toBe(false);
    expect(POWER_FUNCTION.category).toBe('Math');
    expect(POWER_FUNCTION.params).toHaveLength(2);
    expect(POWER_FUNCTION.params[0]!.name).toBe('base');
    expect(POWER_FUNCTION.params[1]!.name).toBe('exponent');
    expect(POWER_FUNCTION.minArgs).toBe(2);
    expect(POWER_FUNCTION.maxArgs).toBe(2);
  });

  it('should compute integer power', async () => {
    const result = await POWER_FUNCTION.evaluate([floatVal(2), floatVal(3)], createTestContext());
    expect(result).not.toBeNull();
    expect(result!.type).toBe('number.float');
    expect(result!.value).toBe(8);
  });

  it('should compute square root via power 0.5', async () => {
    const result = await POWER_FUNCTION.evaluate(
      [floatVal(16), floatVal(0.5)],
      createTestContext(),
    );
    expect(result).not.toBeNull();
    expect(result!.value).toBeCloseTo(4, 10);
  });

  it('should return 1 for x^0', async () => {
    const result = await POWER_FUNCTION.evaluate([floatVal(100), floatVal(0)], createTestContext());
    expect(result).not.toBeNull();
    expect(result!.value).toBe(1);
  });

  it('should return 1 for 0^0', async () => {
    const result = await POWER_FUNCTION.evaluate([floatVal(0), floatVal(0)], createTestContext());
    expect(result).not.toBeNull();
    expect(result!.value).toBe(1);
  });

  it('should return null value for 0^negative', async () => {
    const result = await POWER_FUNCTION.evaluate([floatVal(0), floatVal(-1)], createTestContext());
    expect(result).not.toBeNull();
    expect(result!.value).toBeNull();
  });

  it('should return null value for negative base with non-integer exponent', async () => {
    const result = await POWER_FUNCTION.evaluate(
      [floatVal(-4), floatVal(0.5)],
      createTestContext(),
    );
    expect(result).not.toBeNull();
    expect(result!.value).toBeNull();
  });

  it('should compute negative base with integer exponent', async () => {
    const result = await POWER_FUNCTION.evaluate([floatVal(-2), floatVal(3)], createTestContext());
    expect(result).not.toBeNull();
    expect(result!.value).toBe(-8);
  });

  it('should return null value for null base', async () => {
    const result = await POWER_FUNCTION.evaluate(
      [floatVal(null), floatVal(2)],
      createTestContext(),
    );
    expect(result).not.toBeNull();
    expect(result!.value).toBeNull();
  });

  it('should return null value for null exponent', async () => {
    const result = await POWER_FUNCTION.evaluate(
      [floatVal(2), floatVal(null)],
      createTestContext(),
    );
    expect(result).not.toBeNull();
    expect(result!.value).toBeNull();
  });

  it('should return null value for missing base argument', async () => {
    const result = await POWER_FUNCTION.evaluate([], createTestContext());
    expect(result).not.toBeNull();
    expect(result!.value).toBeNull();
  });

  it('should return null value for missing exponent argument', async () => {
    const result = await POWER_FUNCTION.evaluate([floatVal(2)], createTestContext());
    expect(result).not.toBeNull();
    expect(result!.value).toBeNull();
  });

  it('should work with integer values', async () => {
    const result = await POWER_FUNCTION.evaluate([intVal(3), intVal(4)], createTestContext());
    expect(result).not.toBeNull();
    expect(result!.value).toBe(81);
  });
});

describe('MATH_FUNCTIONS', () => {
  it('should contain all three math functions', () => {
    expect(MATH_FUNCTIONS).toHaveLength(3);
    const names = MATH_FUNCTIONS.map((fn) => fn.name);
    expect(names).toContain('LOG');
    expect(names).toContain('LOG10');
    expect(names).toContain('POWER');
  });

  it('should all have category Math', () => {
    for (const fn of MATH_FUNCTIONS) {
      expect(fn.category).toBe('Math');
    }
  });

  it('should all have isAggregation false', () => {
    for (const fn of MATH_FUNCTIONS) {
      expect(fn.isAggregation).toBe(false);
    }
  });

  it('should all return number.float', () => {
    for (const fn of MATH_FUNCTIONS) {
      expect(fn.returnType).toBe('number.float');
    }
  });
});

describe('registerMathFunctions', () => {
  it('should register all math functions in the registry', () => {
    const registry = createFunctionRegistry();

    expect(registry.hasFunction('LOG')).toBe(false);
    expect(registry.hasFunction('LOG10')).toBe(false);
    expect(registry.hasFunction('POWER')).toBe(false);

    registerMathFunctions(registry);

    expect(registry.hasFunction('LOG')).toBe(true);
    expect(registry.hasFunction('LOG10')).toBe(true);
    expect(registry.hasFunction('POWER')).toBe(true);
  });

  it('should make functions retrievable after registration', () => {
    const registry = createFunctionRegistry();
    registerMathFunctions(registry);

    const logFn = registry.getFunction('LOG');
    const log10Fn = registry.getFunction('LOG10');
    const powerFn = registry.getFunction('POWER');

    expect(logFn).toBeDefined();
    expect(log10Fn).toBeDefined();
    expect(powerFn).toBeDefined();

    expect(logFn!.name).toBe('LOG');
    expect(log10Fn!.name).toBe('LOG10');
    expect(powerFn!.name).toBe('POWER');
  });

  it('should make functions evaluable after registration', async () => {
    const registry = createFunctionRegistry();
    registerMathFunctions(registry);

    const powerFn = registry.getFunction('POWER');
    const result = await powerFn!.evaluate([floatVal(2), floatVal(10)], createTestContext());

    expect(result).not.toBeNull();
    expect(result!.value).toBe(1024);
  });

  it('should add functions to getByCategory Math', () => {
    const registry = createFunctionRegistry();
    registerMathFunctions(registry);

    const mathFunctions = registry.getByCategory('Math');
    expect(mathFunctions).toHaveLength(3);

    const names = mathFunctions.map((fn) => fn.name);
    expect(names).toContain('LOG');
    expect(names).toContain('LOG10');
    expect(names).toContain('POWER');
  });
});

describe('integration: edge cases', () => {
  let registry: ReturnType<typeof createFunctionRegistry>;

  beforeEach(() => {
    registry = createFunctionRegistry();
    registerMathFunctions(registry);
  });

  it('LOG and LOG10 should have consistent relationship for base 10', async () => {
    const x = 50;
    const logFn = registry.getFunction('LOG')!;
    const log10Fn = registry.getFunction('LOG10')!;

    const logResult = await logFn.evaluate([floatVal(x)], createTestContext());
    const log10Result = await log10Fn.evaluate([floatVal(x)], createTestContext());

    // LOG10(x) = LOG(x) / LOG(10)
    const expectedLog10 = (logResult!.value as number) / Math.log(10);
    expect(log10Result!.value).toBeCloseTo(expectedLog10, 10);
  });

  it('POWER and LOG should be inverse operations', async () => {
    const base = Math.E;
    const exponent = 5;
    const logFn = registry.getFunction('LOG')!;
    const powerFn = registry.getFunction('POWER')!;

    const powerResult = await powerFn.evaluate(
      [floatVal(base), floatVal(exponent)],
      createTestContext(),
    );
    const logResult = await logFn.evaluate([powerResult as Value], createTestContext());

    expect(logResult!.value).toBeCloseTo(exponent, 10);
  });

  it('POWER and LOG10 should be inverse operations for base 10', async () => {
    const exponent = 3.5;
    const log10Fn = registry.getFunction('LOG10')!;
    const powerFn = registry.getFunction('POWER')!;

    const powerResult = await powerFn.evaluate(
      [floatVal(10), floatVal(exponent)],
      createTestContext(),
    );
    const log10Result = await log10Fn.evaluate([powerResult as Value], createTestContext());

    expect(log10Result!.value).toBeCloseTo(exponent, 10);
  });
});
