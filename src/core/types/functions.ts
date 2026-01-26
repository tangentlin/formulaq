/**
 * Function definition types for the FormulaQ function registry.
 *
 * These types define how functions are registered, validated, and evaluated.
 *
 * @module
 */

import type { Value, ValueType } from './values.ts';
import type { EvaluationContext } from './context.ts';

/**
 * Type specification for function parameters.
 *
 * - A single ValueType means the parameter must be that exact type
 * - An array of ValueTypes means any of those types is acceptable
 * - 'any' means any type is acceptable
 */
export type ParamTypeSpec = ValueType | readonly ValueType[] | 'any';

/**
 * Definition of a function parameter.
 *
 * Used for:
 * - Validation of argument types and count
 * - Autocomplete hints in the editor
 * - Documentation generation
 *
 * @example
 * ```typescript
 * const ifParams: ParamDef[] = [
 *   { name: 'condition', type: 'boolean.boolean', description: 'Condition to evaluate' },
 *   { name: 'then_value', type: 'any', description: 'Value if condition is true' },
 *   { name: 'else_value', type: 'any', description: 'Value if condition is false' },
 * ];
 * ```
 */
export interface ParamDef {
  /**
   * Parameter name for documentation.
   */
  readonly name: string;

  /**
   * Allowed type(s) for this parameter.
   *
   * - Single ValueType: exact type required
   * - Array of ValueTypes: any of the types accepted
   * - 'any': any type accepted
   */
  readonly type: ParamTypeSpec;

  /**
   * Human-readable description for autocomplete/documentation.
   */
  readonly description: string;

  /**
   * Whether this parameter is optional.
   *
   * Optional parameters must come after required parameters.
   *
   * @defaultValue false
   */
  readonly optional?: boolean | undefined;

  /**
   * Default value for optional parameters.
   *
   * Only applicable when `optional` is true.
   */
  readonly defaultValue?: Value | undefined;
}

/**
 * Metadata about a registered function.
 *
 * Used for autocomplete and documentation without exposing
 * the evaluation implementation.
 *
 * @example
 * ```typescript
 * const avgInfo: FunctionInfo = {
 *   name: 'AVG',
 *   description: 'Calculate arithmetic mean of values',
 *   params: [{ name: 'values', type: ['number.integer', 'number.float'], description: 'Numeric values' }],
 *   returnType: 'number.float',
 *   isAggregation: true,
 *   category: 'Aggregation',
 * };
 * ```
 */
export interface FunctionInfo {
  /**
   * Unique function name (case-sensitive).
   */
  readonly name: string;

  /**
   * Human-readable description for autocomplete/documentation.
   */
  readonly description: string;

  /**
   * Parameter definitions.
   *
   * Order matters: parameters are matched positionally.
   */
  readonly params: readonly ParamDef[];

  /**
   * Return type of the function.
   */
  readonly returnType: ValueType;

  /**
   * Whether this is an aggregation function.
   *
   * Aggregation functions:
   * - Receive the full variable array, not individual values
   * - Are computed once before row-level evaluation
   * - Their results are cached and broadcast to all rows
   */
  readonly isAggregation: boolean;

  /**
   * Whether this function accepts variable number of arguments.
   *
   * When true, the last parameter definition is repeated.
   * Examples: AND, OR, CONCAT
   *
   * @defaultValue false
   */
  readonly isVariadic?: boolean | undefined;

  /**
   * Minimum number of arguments required.
   *
   * For variadic functions, this overrides the count derived from params.
   */
  readonly minArgs?: number | undefined;

  /**
   * Maximum number of arguments allowed.
   *
   * For variadic functions, undefined means no maximum.
   */
  readonly maxArgs?: number | undefined;

  /**
   * Category for organizing in autocomplete.
   *
   * Examples: 'Aggregation', 'Math', 'Logical', 'String'
   */
  readonly category?: string | undefined;
}

/**
 * Function evaluation signature.
 *
 * @param args - Evaluated argument values for the current row
 * @param context - Full evaluation context with all variable data
 * @returns Promise resolving to the result value, or null for errors
 */
export type FunctionEvaluator = (
  args: readonly Value[],
  context: EvaluationContext,
) => Promise<Value | null>;

/**
 * Complete function definition including evaluation logic.
 *
 * This interface extends FunctionInfo with the actual evaluation
 * implementation. It's used internally by the function registry.
 *
 * @example
 * ```typescript
 * const avgFunction: FormulaFunction = {
 *   name: 'AVG',
 *   description: 'Calculate arithmetic mean of values',
 *   params: [{
 *     name: 'values',
 *     type: ['number.integer', 'number.float'],
 *     description: 'Numeric values to average'
 *   }],
 *   returnType: 'number.float',
 *   isAggregation: true,
 *   category: 'Aggregation',
 *
 *   async evaluate(args, context) {
 *     const varName = args[0]?.value as string;
 *     const values = context.variables[varName];
 *     if (!values) return { type: 'number.float', value: null };
 *
 *     const nonNull = values.filter(v => v.value !== null);
 *     if (nonNull.length === 0) return { type: 'number.float', value: null };
 *
 *     const sum = nonNull.reduce((acc, v) => acc + (v.value as number), 0);
 *     return { type: 'number.float', value: sum / nonNull.length };
 *   }
 * };
 * ```
 */
export interface FormulaFunction extends FunctionInfo {
  /**
   * The evaluation function.
   *
   * For row-level functions:
   * - `args` contains evaluated Values for the current row
   *
   * For aggregation functions:
   * - `args` may contain variable reference names as strings
   * - Use `context.variables[name]` to access full arrays
   *
   * The function should return a Promise that resolves to:
   * - A Value with the result
   * - null if an error occurred (errors should be logged separately)
   */
  readonly evaluate: FunctionEvaluator;
}

/**
 * Interface for the function registry.
 *
 * Manages registration and lookup of formula functions.
 */
export interface FunctionRegistry {
  /**
   * Registers a new function.
   *
   * @param fn - The function definition to register
   * @throws If a function with the same name already exists
   */
  register(fn: FormulaFunction): void;

  /**
   * Gets a function by name.
   *
   * @param name - Function name (case-sensitive)
   * @returns The function definition, or undefined if not found
   */
  get(name: string): FormulaFunction | undefined;

  /**
   * Checks if a function exists.
   *
   * @param name - Function name (case-sensitive)
   * @returns True if the function is registered
   */
  has(name: string): boolean;

  /**
   * Gets metadata for all registered functions.
   *
   * Used for autocomplete. Returns FunctionInfo (without evaluate)
   * to avoid exposing implementation details.
   *
   * @returns Array of function metadata
   */
  getAll(): FunctionInfo[];

  /**
   * Gets functions in a specific category.
   *
   * @param category - Category name to filter by
   * @returns Array of function metadata in that category
   */
  getByCategory(category: string): FunctionInfo[];
}
