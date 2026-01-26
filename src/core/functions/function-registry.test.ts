/**
 * Tests for the FunctionRegistry implementation.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { FunctionRegistryImpl, createFunctionRegistry } from './function-registry.ts';
import { DuplicateFunctionError } from './function-registry.types.ts';
import type { FormulaFunction } from '../types/functions.ts';

/**
 * Creates a minimal test function for registry testing.
 */
function createTestFunction(
  name: string,
  options?: Partial<Omit<FormulaFunction, 'name' | 'evaluate'>>,
): FormulaFunction {
  return {
    name,
    description: options?.description ?? `Test function ${name}`,
    params: options?.params ?? [],
    returnType: options?.returnType ?? 'number.float',
    isAggregation: options?.isAggregation ?? false,
    isVariadic: options?.isVariadic,
    minArgs: options?.minArgs,
    maxArgs: options?.maxArgs,
    category: options?.category,
    evaluate: async function testEvaluate() {
      return { type: 'number.float' as const, value: 0 };
    },
  };
}

describe('FunctionRegistry', () => {
  let registry: FunctionRegistryImpl;

  beforeEach(() => {
    registry = createFunctionRegistry();
  });

  describe('registerFunction', () => {
    it('should register a function successfully', () => {
      const fn = createTestFunction('SUM');

      registry.registerFunction(fn);

      expect(registry.hasFunction('SUM')).toBe(true);
    });

    it('should register multiple functions', () => {
      const sum = createTestFunction('SUM');
      const avg = createTestFunction('AVG');
      const max = createTestFunction('MAX');

      registry.registerFunction(sum);
      registry.registerFunction(avg);
      registry.registerFunction(max);

      expect(registry.hasFunction('SUM')).toBe(true);
      expect(registry.hasFunction('AVG')).toBe(true);
      expect(registry.hasFunction('MAX')).toBe(true);
    });

    it('should throw DuplicateFunctionError when registering duplicate function', () => {
      const fn1 = createTestFunction('DUPLICATE');
      const fn2 = createTestFunction('DUPLICATE');

      registry.registerFunction(fn1);

      expect(() => registry.registerFunction(fn2)).toThrow(DuplicateFunctionError);
      expect(() => registry.registerFunction(fn2)).toThrow(
        'Function "DUPLICATE" is already registered',
      );
    });

    it('should include function name in DuplicateFunctionError', () => {
      const fn1 = createTestFunction('MY_FUNC');
      registry.registerFunction(fn1);

      try {
        registry.registerFunction(createTestFunction('MY_FUNC'));
        expect.fail('Should have thrown DuplicateFunctionError');
      } catch (error) {
        expect(error).toBeInstanceOf(DuplicateFunctionError);
        expect((error as DuplicateFunctionError).functionName).toBe('MY_FUNC');
      }
    });
  });

  describe('getFunction', () => {
    it('should return the registered function', () => {
      const fn = createTestFunction('GET_TEST', {
        description: 'A test function for get',
      });

      registry.registerFunction(fn);

      const retrieved = registry.getFunction('GET_TEST');
      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('GET_TEST');
      expect(retrieved?.description).toBe('A test function for get');
    });

    it('should return undefined for non-existent function', () => {
      const result = registry.getFunction('NON_EXISTENT');
      expect(result).toBeUndefined();
    });

    it('should be case-sensitive (AVG !== avg)', () => {
      const avgUpper = createTestFunction('AVG');
      registry.registerFunction(avgUpper);

      expect(registry.getFunction('AVG')).toBeDefined();
      expect(registry.getFunction('avg')).toBeUndefined();
      expect(registry.getFunction('Avg')).toBeUndefined();
      expect(registry.getFunction('aVg')).toBeUndefined();
    });

    it('should return function with evaluate method', async () => {
      const fn = createTestFunction('EVAL_TEST');
      registry.registerFunction(fn);

      const retrieved = registry.getFunction('EVAL_TEST');
      expect(retrieved?.evaluate).toBeDefined();
      expect(typeof retrieved?.evaluate).toBe('function');

      const result = await retrieved?.evaluate([], {
        variables: {},
        rowCount: 0,
      });
      expect(result).toEqual({ type: 'number.float', value: 0 });
    });
  });

  describe('hasFunction', () => {
    it('should return true for registered function', () => {
      registry.registerFunction(createTestFunction('EXISTS'));
      expect(registry.hasFunction('EXISTS')).toBe(true);
    });

    it('should return false for non-existent function', () => {
      expect(registry.hasFunction('DOES_NOT_EXIST')).toBe(false);
    });

    it('should be case-sensitive', () => {
      registry.registerFunction(createTestFunction('CASE_TEST'));

      expect(registry.hasFunction('CASE_TEST')).toBe(true);
      expect(registry.hasFunction('case_test')).toBe(false);
      expect(registry.hasFunction('Case_Test')).toBe(false);
    });
  });

  describe('getFunctions', () => {
    it('should return empty array for empty registry', () => {
      const functions = registry.getFunctions();
      expect(functions).toEqual([]);
    });

    it('should return all registered functions', () => {
      registry.registerFunction(createTestFunction('FUNC_A'));
      registry.registerFunction(createTestFunction('FUNC_B'));
      registry.registerFunction(createTestFunction('FUNC_C'));

      const functions = registry.getFunctions();
      expect(functions).toHaveLength(3);

      const names = functions.map((fn) => fn.name);
      expect(names).toContain('FUNC_A');
      expect(names).toContain('FUNC_B');
      expect(names).toContain('FUNC_C');
    });

    it('should return functions with all metadata', () => {
      const fn = createTestFunction('FULL_META', {
        description: 'Full metadata function',
        params: [{ name: 'x', type: 'number.float', description: 'Input value' }],
        returnType: 'string.text',
        isAggregation: true,
        isVariadic: false,
        minArgs: 1,
        maxArgs: 3,
        category: 'Test',
      });

      registry.registerFunction(fn);

      const functions = registry.getFunctions();
      expect(functions).toHaveLength(1);

      const retrieved = functions[0]!;
      expect(retrieved.name).toBe('FULL_META');
      expect(retrieved.description).toBe('Full metadata function');
      expect(retrieved.params).toHaveLength(1);
      expect(retrieved.returnType).toBe('string.text');
      expect(retrieved.isAggregation).toBe(true);
      expect(retrieved.isVariadic).toBe(false);
      expect(retrieved.minArgs).toBe(1);
      expect(retrieved.maxArgs).toBe(3);
      expect(retrieved.category).toBe('Test');
    });
  });

  describe('getAll (interface method)', () => {
    it('should return FunctionInfo objects without evaluate', () => {
      const fn = createTestFunction('INFO_TEST');
      registry.registerFunction(fn);

      const infos = registry.getAll();
      expect(infos).toHaveLength(1);

      const info = infos[0]!;
      expect(info.name).toBe('INFO_TEST');
      // FunctionInfo should not have evaluate property
      expect('evaluate' in info).toBe(false);
    });
  });

  describe('getByCategory', () => {
    beforeEach(() => {
      registry.registerFunction(createTestFunction('SUM', { category: 'Aggregation' }));
      registry.registerFunction(createTestFunction('AVG', { category: 'Aggregation' }));
      registry.registerFunction(createTestFunction('LOG', { category: 'Math' }));
      registry.registerFunction(createTestFunction('IF', { category: 'Logical' }));
      registry.registerFunction(createTestFunction('UNCATEGORIZED'));
    });

    it('should return functions in specified category', () => {
      const aggregations = registry.getByCategory('Aggregation');
      expect(aggregations).toHaveLength(2);

      const names = aggregations.map((fn) => fn.name);
      expect(names).toContain('SUM');
      expect(names).toContain('AVG');
    });

    it('should return empty array for non-existent category', () => {
      const result = registry.getByCategory('NonExistent');
      expect(result).toEqual([]);
    });

    it('should not include functions without category', () => {
      const logical = registry.getByCategory('Logical');
      expect(logical).toHaveLength(1);
      expect(logical[0]!.name).toBe('IF');
    });
  });

  describe('createFunctionRegistry factory', () => {
    it('should create empty registry by default', () => {
      const reg = createFunctionRegistry();
      expect(reg.getFunctions()).toEqual([]);
    });

    it('should create empty registry when includeDefaults is false', () => {
      const reg = createFunctionRegistry({ includeDefaults: false });
      expect(reg.getFunctions()).toEqual([]);
    });

    it('should create registry with defaults when includeDefaults is true', () => {
      const reg = createFunctionRegistry({ includeDefaults: true });
      expect(reg).toBeDefined();
      expect(reg).toBeInstanceOf(FunctionRegistryImpl);

      // Verify default functions are registered
      const functions = reg.getFunctions();
      expect(functions.length).toBeGreaterThan(0);

      // Check for representative functions from each category
      expect(reg.hasFunction('SUM')).toBe(true); // Aggregation
      expect(reg.hasFunction('LOG')).toBe(true); // Math
      expect(reg.hasFunction('IF')).toBe(true); // Logical
      expect(reg.hasFunction('CONCAT')).toBe(true); // String
    });

    it('should return FunctionRegistryImpl instance', () => {
      const reg = createFunctionRegistry();
      expect(reg).toBeInstanceOf(FunctionRegistryImpl);
    });
  });

  describe('case sensitivity', () => {
    it('should allow registering functions with different cases', () => {
      registry.registerFunction(createTestFunction('sum'));
      registry.registerFunction(createTestFunction('SUM'));
      registry.registerFunction(createTestFunction('Sum'));

      expect(registry.getFunctions()).toHaveLength(3);
      expect(registry.getFunction('sum')).toBeDefined();
      expect(registry.getFunction('SUM')).toBeDefined();
      expect(registry.getFunction('Sum')).toBeDefined();
    });

    it('should maintain case in function names', () => {
      registry.registerFunction(createTestFunction('MyCustomFunction'));

      const fn = registry.getFunction('MyCustomFunction');
      expect(fn?.name).toBe('MyCustomFunction');
    });
  });

  describe('DuplicateFunctionError', () => {
    it('should have correct name property', () => {
      const error = new DuplicateFunctionError('TEST');
      expect(error.name).toBe('DuplicateFunctionError');
    });

    it('should have correct message', () => {
      const error = new DuplicateFunctionError('TEST');
      expect(error.message).toBe('Function "TEST" is already registered');
    });

    it('should have functionName property', () => {
      const error = new DuplicateFunctionError('MY_FUNCTION');
      expect(error.functionName).toBe('MY_FUNCTION');
    });

    it('should be instanceof Error', () => {
      const error = new DuplicateFunctionError('TEST');
      expect(error).toBeInstanceOf(Error);
    });
  });

  describe('interface compatibility', () => {
    it('should implement register as alias for registerFunction', () => {
      const fn = createTestFunction('ALIAS_TEST');
      registry.register(fn);
      expect(registry.hasFunction('ALIAS_TEST')).toBe(true);
    });

    it('should implement get as alias for getFunction', () => {
      const fn = createTestFunction('GET_ALIAS');
      registry.registerFunction(fn);
      expect(registry.get('GET_ALIAS')).toBeDefined();
    });

    it('should implement has as alias for hasFunction', () => {
      const fn = createTestFunction('HAS_ALIAS');
      registry.registerFunction(fn);
      expect(registry.has('HAS_ALIAS')).toBe(true);
    });
  });
});
