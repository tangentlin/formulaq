/**
 * Tests for the string functions implementation.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { concatFunction, registerStringFunctions } from './string.ts';
import { concatenateStrings, isValidConcatArgCount } from './string.view-model.ts';
import { createFunctionRegistry, FunctionRegistryImpl } from './function-registry.ts';
import type { Value } from '../types/values.ts';
import type { EvaluationContext } from '../types/context.ts';

/**
 * Creates a string Value for testing.
 */
function createStringValue(value: string | null): Value {
  return { type: 'string.text', value };
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

describe('string.viewModel', () => {
  describe('concatenateStrings', () => {
    it('should concatenate two strings', () => {
      const values = [createStringValue('Hello'), createStringValue('World')];

      const result = concatenateStrings(values);

      expect(result).toBe('HelloWorld');
    });

    it('should concatenate multiple strings', () => {
      const values = [
        createStringValue('a'),
        createStringValue('b'),
        createStringValue('c'),
        createStringValue('d'),
      ];

      const result = concatenateStrings(values);

      expect(result).toBe('abcd');
    });

    it('should concatenate with spaces preserved', () => {
      const values = [
        createStringValue('Hello'),
        createStringValue(' '),
        createStringValue('World'),
      ];

      const result = concatenateStrings(values);

      expect(result).toBe('Hello World');
    });

    it('should return null when any value is null', () => {
      const values = [createStringValue('test'), createStringValue(null)];

      const result = concatenateStrings(values);

      expect(result).toBe(null);
    });

    it('should return null when first value is null', () => {
      const values = [createStringValue(null), createStringValue('test')];

      const result = concatenateStrings(values);

      expect(result).toBe(null);
    });

    it('should return null when middle value is null', () => {
      const values = [createStringValue('a'), createStringValue(null), createStringValue('b')];

      const result = concatenateStrings(values);

      expect(result).toBe(null);
    });

    it('should return null when all values are null', () => {
      const values = [createStringValue(null), createStringValue(null)];

      const result = concatenateStrings(values);

      expect(result).toBe(null);
    });

    it('should preserve empty strings', () => {
      const values = [createStringValue(''), createStringValue('x')];

      const result = concatenateStrings(values);

      expect(result).toBe('x');
    });

    it('should concatenate empty strings correctly', () => {
      const values = [createStringValue('a'), createStringValue(''), createStringValue('b')];

      const result = concatenateStrings(values);

      expect(result).toBe('ab');
    });

    it('should return empty string when all values are empty strings', () => {
      const values = [createStringValue(''), createStringValue('')];

      const result = concatenateStrings(values);

      expect(result).toBe('');
    });

    it('should handle single long string', () => {
      const longString = 'a'.repeat(10000);
      const values = [createStringValue(longString), createStringValue('!')];

      const result = concatenateStrings(values);

      expect(result).toBe(longString + '!');
    });

    it('should handle unicode strings', () => {
      const values = [
        createStringValue('Hello '),
        createStringValue('\u4e16\u754c'),
        createStringValue(' \u{1F600}'),
      ];

      const result = concatenateStrings(values);

      expect(result).toBe('Hello \u4e16\u754c \u{1F600}');
    });

    it('should handle empty array', () => {
      const values: Value[] = [];

      const result = concatenateStrings(values);

      expect(result).toBe('');
    });
  });

  describe('isValidConcatArgCount', () => {
    it('should return true for 2 arguments', () => {
      expect(isValidConcatArgCount(2)).toBe(true);
    });

    it('should return true for more than 2 arguments', () => {
      expect(isValidConcatArgCount(3)).toBe(true);
      expect(isValidConcatArgCount(5)).toBe(true);
      expect(isValidConcatArgCount(100)).toBe(true);
    });

    it('should return false for 1 argument', () => {
      expect(isValidConcatArgCount(1)).toBe(false);
    });

    it('should return false for 0 arguments', () => {
      expect(isValidConcatArgCount(0)).toBe(false);
    });

    it('should return false for negative numbers', () => {
      expect(isValidConcatArgCount(-1)).toBe(false);
    });
  });
});

describe('concatFunction', () => {
  describe('function metadata', () => {
    it('should have correct name', () => {
      expect(concatFunction.name).toBe('CONCAT');
    });

    it('should have correct description', () => {
      expect(concatFunction.description).toBe('Concatenates two or more strings together');
    });

    it('should have string.text return type', () => {
      expect(concatFunction.returnType).toBe('string.text');
    });

    it('should not be an aggregation function', () => {
      expect(concatFunction.isAggregation).toBe(false);
    });

    it('should be variadic', () => {
      expect(concatFunction.isVariadic).toBe(true);
    });

    it('should have minimum 2 arguments', () => {
      expect(concatFunction.minArgs).toBe(2);
    });

    it('should have String category', () => {
      expect(concatFunction.category).toBe('String');
    });

    it('should have two base parameters defined', () => {
      expect(concatFunction.params).toHaveLength(2);
      expect(concatFunction.params[0]!.name).toBe('s1');
      expect(concatFunction.params[0]!.type).toBe('string.text');
      expect(concatFunction.params[1]!.name).toBe('s2');
      expect(concatFunction.params[1]!.type).toBe('string.text');
    });
  });

  describe('evaluate', () => {
    const context = createTestContext();

    it('should concatenate two strings', async () => {
      const args = [createStringValue('Hello'), createStringValue('World')];

      const result = await concatFunction.evaluate(args, context);

      expect(result).toEqual({ type: 'string.text', value: 'HelloWorld' });
    });

    it('should concatenate multiple strings', async () => {
      const args = [
        createStringValue('a'),
        createStringValue('b'),
        createStringValue('c'),
        createStringValue('d'),
      ];

      const result = await concatFunction.evaluate(args, context);

      expect(result).toEqual({ type: 'string.text', value: 'abcd' });
    });

    it('should concatenate with spaces', async () => {
      const args = [createStringValue('Hello'), createStringValue(' '), createStringValue('World')];

      const result = await concatFunction.evaluate(args, context);

      expect(result).toEqual({ type: 'string.text', value: 'Hello World' });
    });

    it('should return null when any argument is null', async () => {
      const args = [createStringValue('test'), createStringValue(null)];

      const result = await concatFunction.evaluate(args, context);

      expect(result).toEqual({ type: 'string.text', value: null });
    });

    it('should return null when first argument is null', async () => {
      const args = [createStringValue(null), createStringValue('test')];

      const result = await concatFunction.evaluate(args, context);

      expect(result).toEqual({ type: 'string.text', value: null });
    });

    it('should preserve empty strings', async () => {
      const args = [createStringValue(''), createStringValue('x')];

      const result = await concatFunction.evaluate(args, context);

      expect(result).toEqual({ type: 'string.text', value: 'x' });
    });

    it('should handle empty string in the middle', async () => {
      const args = [createStringValue('a'), createStringValue(''), createStringValue('b')];

      const result = await concatFunction.evaluate(args, context);

      expect(result).toEqual({ type: 'string.text', value: 'ab' });
    });

    it('should handle many arguments', async () => {
      const args = [];
      for (let i = 0; i < 100; i++) {
        args.push(createStringValue(String(i % 10)));
      }

      const result = await concatFunction.evaluate(args, context);

      expect(result).toBeDefined();
      expect(result!.type).toBe('string.text');
      expect((result!.value as string).length).toBe(100);
    });
  });
});

describe('registerStringFunctions', () => {
  let registry: FunctionRegistryImpl;

  beforeEach(() => {
    registry = createFunctionRegistry();
  });

  it('should register CONCAT function', () => {
    registerStringFunctions(registry);

    expect(registry.hasFunction('CONCAT')).toBe(true);
  });

  it('should register function with correct metadata', () => {
    registerStringFunctions(registry);

    const fn = registry.getFunction('CONCAT');
    expect(fn).toBeDefined();
    expect(fn?.name).toBe('CONCAT');
    expect(fn?.isVariadic).toBe(true);
    expect(fn?.category).toBe('String');
  });

  it('should make function evaluable through registry', async () => {
    registerStringFunctions(registry);

    const fn = registry.getFunction('CONCAT');
    expect(fn?.evaluate).toBeDefined();

    const result = await fn?.evaluate(
      [createStringValue('a'), createStringValue('b')],
      createTestContext(),
    );

    expect(result).toEqual({ type: 'string.text', value: 'ab' });
  });

  it('should be findable by category', () => {
    registerStringFunctions(registry);

    const stringFunctions = registry.getByCategory('String');

    expect(stringFunctions).toHaveLength(1);
    expect(stringFunctions[0]!.name).toBe('CONCAT');
  });
});

describe('CONCAT edge cases', () => {
  const context = createTestContext();

  it('should handle strings with special characters', async () => {
    const args = [
      createStringValue('line1\nline2'),
      createStringValue('\t'),
      createStringValue('tab'),
    ];

    const result = await concatFunction.evaluate(args, context);

    expect(result).toEqual({ type: 'string.text', value: 'line1\nline2\ttab' });
  });

  it('should handle strings with quotes', async () => {
    const args = [
      createStringValue('He said "'),
      createStringValue('Hello'),
      createStringValue('"'),
    ];

    const result = await concatFunction.evaluate(args, context);

    expect(result).toEqual({ type: 'string.text', value: 'He said "Hello"' });
  });

  it('should handle very long strings efficiently', async () => {
    const longString = 'x'.repeat(100000);
    const args = [createStringValue(longString), createStringValue(longString)];

    const startTime = performance.now();
    const result = await concatFunction.evaluate(args, context);
    const duration = performance.now() - startTime;

    expect(result?.value).toHaveLength(200000);
    expect(duration).toBeLessThan(100); // Should complete quickly
  });

  it('should handle strings with null bytes', async () => {
    const args = [createStringValue('before\0after'), createStringValue('!')];

    const result = await concatFunction.evaluate(args, context);

    expect(result).toEqual({ type: 'string.text', value: 'before\0after!' });
  });
});

describe('CONCAT examples from specification', () => {
  const context = createTestContext();

  it('CONCAT("Hello", " ", "World") -> "Hello World"', async () => {
    const args = [createStringValue('Hello'), createStringValue(' '), createStringValue('World')];

    const result = await concatFunction.evaluate(args, context);

    expect(result).toEqual({ type: 'string.text', value: 'Hello World' });
  });

  it('CONCAT("a", "b", "c", "d") -> "abcd"', async () => {
    const args = [
      createStringValue('a'),
      createStringValue('b'),
      createStringValue('c'),
      createStringValue('d'),
    ];

    const result = await concatFunction.evaluate(args, context);

    expect(result).toEqual({ type: 'string.text', value: 'abcd' });
  });

  it('CONCAT("test", null) -> null', async () => {
    const args = [createStringValue('test'), createStringValue(null)];

    const result = await concatFunction.evaluate(args, context);

    expect(result).toEqual({ type: 'string.text', value: null });
  });

  it('CONCAT("", "x") -> "x" (empty string preserved)', async () => {
    const args = [createStringValue(''), createStringValue('x')];

    const result = await concatFunction.evaluate(args, context);

    expect(result).toEqual({ type: 'string.text', value: 'x' });
  });
});
