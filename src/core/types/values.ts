/**
 * Core value types for the FormulaQ type system.
 *
 * This module defines the fundamental data types used throughout the formula engine,
 * including the hierarchical type system and value representation.
 *
 * @module
 */

/**
 * Hierarchical type system for values in FormulaQ.
 *
 * Types follow a `category.subtype` naming convention:
 * - `number.integer` - Whole numbers (42, -7, 0)
 * - `number.float` - IEEE 754 double-precision floats (3.14, -1e10)
 * - `string.text` - UTF-8 text strings
 * - `boolean.boolean` - True or false values
 *
 * @remarks
 * The `string.smiles` type is intentionally excluded from the MVP.
 * All number literals default to `number.float` as per the implementation plan.
 */
export type ValueType = 'number.integer' | 'number.float' | 'string.text' | 'boolean.boolean';

/**
 * Represents the raw JavaScript value that can be stored in a Value.
 *
 * - `number` for numeric types (integer and float)
 * - `string` for text types
 * - `boolean` for boolean type
 * - `null` for missing or undefined values
 */
export type RawValue = number | string | boolean | null;

/**
 * A typed value in the FormulaQ system.
 *
 * Every value carries its type information along with the actual data.
 * The `value` field can be `null` to represent missing data.
 *
 * @example
 * ```typescript
 * const intValue: Value = { type: 'number.integer', value: 42 };
 * const nullValue: Value = { type: 'number.float', value: null };
 * const textValue: Value = { type: 'string.text', value: 'hello' };
 * ```
 */
export interface Value {
  /**
   * The type of this value.
   */
  readonly type: ValueType;

  /**
   * The actual value. Can be `null` to represent missing data.
   *
   * The runtime type should match the declared `type`:
   * - `number.integer` or `number.float` -> `number | null`
   * - `string.text` -> `string | null`
   * - `boolean.boolean` -> `boolean | null`
   */
  readonly value: RawValue;
}

/**
 * Metadata about a variable available for use in formulas.
 *
 * This information is used by:
 * - The validator for type checking
 * - The editor for autocomplete suggestions
 * - The UI for displaying variable information
 *
 * @example
 * ```typescript
 * const scoreVariable: VariableInfo = {
 *   name: 'score',
 *   type: 'number.float',
 *   nullable: true,
 *   description: 'Test score (0-100)',
 *   group: 'Metrics'
 * };
 * ```
 */
export interface VariableInfo {
  /**
   * The variable name (without the `@` prefix).
   *
   * Variable names are case-sensitive and can contain:
   * - Alphanumeric characters
   * - Underscores (`_`)
   * - Periods (`.`) as part of the identifier
   */
  readonly name: string;

  /**
   * The data type of the variable.
   */
  readonly type: ValueType;

  /**
   * Whether this variable can contain null values.
   *
   * When true, the evaluator will handle null propagation
   * for operations involving this variable.
   */
  readonly nullable: boolean;

  /**
   * Optional human-readable description.
   *
   * Displayed in autocomplete tooltips and documentation.
   */
  readonly description?: string | undefined;

  /**
   * Optional grouping for organizing variables in autocomplete.
   *
   * Common groups: "Columns", "Test Variables", "Computed"
   */
  readonly group?: string | undefined;
}
