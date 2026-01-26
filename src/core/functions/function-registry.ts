/**
 * Function registry for storing and looking up formula function definitions.
 *
 * The registry provides O(1) lookup of functions by name and supports
 * case-sensitive function name matching.
 *
 * @module
 */

import type {
  FormulaFunction,
  FunctionInfo,
  FunctionRegistry as IFunctionRegistry,
} from '../types/functions.ts';
import { DuplicateFunctionError, type FunctionRegistryOptions } from './function-registry.types.ts';
import { registerAggregationFunctions } from './aggregations.ts';
import { registerMathFunctions } from './math.ts';
import { registerLogicalFunctions } from './logical.ts';
import { registerStringFunctions } from './string.ts';

/**
 * Implementation of the FunctionRegistry interface.
 *
 * Uses a Map internally for O(1) lookup performance.
 * Function names are case-sensitive (AVG !== avg).
 *
 * @example
 * ```typescript
 * const registry = createFunctionRegistry();
 *
 * registry.registerFunction({
 *   name: 'DOUBLE',
 *   description: 'Doubles a number',
 *   params: [{ name: 'x', type: 'number.float', description: 'Value to double' }],
 *   returnType: 'number.float',
 *   isAggregation: false,
 *   async evaluate(args) {
 *     const value = args[0]?.value;
 *     if (value === null || typeof value !== 'number') {
 *       return { type: 'number.float', value: null };
 *     }
 *     return { type: 'number.float', value: value * 2 };
 *   }
 * });
 *
 * const fn = registry.getFunction('DOUBLE');
 * ```
 */
export class FunctionRegistryImpl implements IFunctionRegistry {
  /**
   * Internal map storing functions by name.
   */
  private readonly functions: Map<string, FormulaFunction>;

  /**
   * Creates a new FunctionRegistry instance.
   *
   * Use the factory function `createFunctionRegistry` instead of
   * instantiating directly.
   */
  constructor() {
    this.functions = new Map<string, FormulaFunction>();
  }

  /**
   * Registers a new function in the registry.
   *
   * @param fn - The function definition to register
   * @throws DuplicateFunctionError if a function with the same name exists
   *
   * @example
   * ```typescript
   * registry.registerFunction({
   *   name: 'ABS',
   *   description: 'Returns absolute value',
   *   params: [{ name: 'x', type: 'number.float', description: 'Input value' }],
   *   returnType: 'number.float',
   *   isAggregation: false,
   *   evaluate: async (args) => {
   *     const value = args[0]?.value as number | null;
   *     if (value === null) return { type: 'number.float', value: null };
   *     return { type: 'number.float', value: Math.abs(value) };
   *   }
   * });
   * ```
   */
  public register(fn: FormulaFunction): void {
    if (this.functions.has(fn.name)) {
      throw new DuplicateFunctionError(fn.name);
    }
    this.functions.set(fn.name, fn);
  }

  /**
   * Retrieves a function by its name.
   *
   * @param name - The function name (case-sensitive)
   * @returns The function definition, or undefined if not found
   *
   * @example
   * ```typescript
   * const sumFn = registry.getFunction('SUM');
   * if (sumFn) {
   *   const result = await sumFn.evaluate(args, context);
   * }
   * ```
   */
  public get(name: string): FormulaFunction | undefined {
    return this.functions.get(name);
  }

  /**
   * Checks if a function with the given name exists in the registry.
   *
   * @param name - The function name (case-sensitive)
   * @returns True if the function is registered, false otherwise
   *
   * @example
   * ```typescript
   * if (registry.hasFunction('CUSTOM_FUNC')) {
   *   // Function exists
   * }
   * ```
   */
  public has(name: string): boolean {
    return this.functions.has(name);
  }

  /**
   * Returns metadata for all registered functions.
   *
   * This method returns FunctionInfo objects (without the evaluate function)
   * suitable for use in autocomplete and documentation.
   *
   * @returns Array of function metadata for all registered functions
   *
   * @example
   * ```typescript
   * const allFunctions = registry.getFunctions();
   * for (const fn of allFunctions) {
   *   console.log(`${fn.name}: ${fn.description}`);
   * }
   * ```
   */
  public getAll(): FunctionInfo[] {
    const result: FunctionInfo[] = [];
    for (const fn of this.functions.values()) {
      result.push(extractFunctionInfo(fn));
    }
    return result;
  }

  /**
   * Returns metadata for functions in a specific category.
   *
   * @param category - The category to filter by
   * @returns Array of function metadata in the specified category
   *
   * @example
   * ```typescript
   * const mathFunctions = registry.getByCategory('Math');
   * ```
   */
  public getByCategory(category: string): FunctionInfo[] {
    const result: FunctionInfo[] = [];
    for (const fn of this.functions.values()) {
      if (fn.category === category) {
        result.push(extractFunctionInfo(fn));
      }
    }
    return result;
  }

  // Legacy method names for backward compatibility with task requirements

  /**
   * Alias for register() - adds a function to the registry.
   *
   * @param fn - The function definition to register
   * @throws DuplicateFunctionError if a function with the same name exists
   */
  public registerFunction(fn: FormulaFunction): void {
    this.register(fn);
  }

  /**
   * Alias for get() - retrieves a function by name.
   *
   * @param name - The function name (case-sensitive)
   * @returns The function definition, or undefined if not found
   */
  public getFunction(name: string): FormulaFunction | undefined {
    return this.get(name);
  }

  /**
   * Alias for getAll() - returns all registered functions.
   *
   * @returns Array of all registered FormulaFunction objects
   */
  public getFunctions(): FormulaFunction[] {
    return Array.from(this.functions.values());
  }

  /**
   * Alias for has() - checks if a function exists.
   *
   * @param name - The function name (case-sensitive)
   * @returns True if the function is registered
   */
  public hasFunction(name: string): boolean {
    return this.has(name);
  }
}

/**
 * Extracts FunctionInfo from a FormulaFunction.
 *
 * This removes the evaluate function, returning only the metadata
 * suitable for autocomplete and documentation.
 *
 * @param fn - The full function definition
 * @returns Function metadata without the evaluate implementation
 */
function extractFunctionInfo(fn: FormulaFunction): FunctionInfo {
  return {
    name: fn.name,
    description: fn.description,
    params: fn.params,
    returnType: fn.returnType,
    isAggregation: fn.isAggregation,
    isVariadic: fn.isVariadic,
    minArgs: fn.minArgs,
    maxArgs: fn.maxArgs,
    category: fn.category,
  };
}

/**
 * Creates a new FunctionRegistry instance.
 *
 * This is the recommended way to create a registry. The returned
 * instance is empty unless includeDefaults is true.
 *
 * @param options - Optional configuration for the registry
 * @returns A new FunctionRegistry instance
 *
 * @example
 * ```typescript
 * // Create an empty registry
 * const registry = createFunctionRegistry();
 *
 * // Create a registry with default functions (once implemented)
 * const defaultRegistry = createFunctionRegistry({ includeDefaults: true });
 * ```
 */
export function createFunctionRegistry(options?: FunctionRegistryOptions): FunctionRegistryImpl {
  const registry = new FunctionRegistryImpl();

  if (options?.includeDefaults) {
    registerDefaultFunctions(registry);
  }

  return registry;
}

/**
 * Registers all default built-in functions in the registry.
 *
 * Includes all functions from:
 * - Aggregation: SUM, AVG, MIN, MAX, COUNT, PERCENTILE
 * - Math: LOG, LOG10, POWER
 * - Logical: IF, AND, OR, NOT, IFNULL
 * - String: CONCAT
 *
 * @param registry - The registry to populate with default functions
 */
function registerDefaultFunctions(registry: FunctionRegistryImpl): void {
  registerAggregationFunctions(registry);
  registerMathFunctions(registry);
  registerLogicalFunctions(registry);
  registerStringFunctions(registry);
}
