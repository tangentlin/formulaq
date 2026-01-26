/**
 * Type definitions for the VariableCard component.
 *
 * This module defines the props interface and related types for displaying
 * a single test variable in the Playground with edit and delete actions.
 *
 * @module
 */

import type { ValueType } from '../../core/types/values.ts';

/**
 * Represents a test variable in the Playground.
 *
 * Variables are used to provide test data for formula evaluation.
 * Each variable has a name, type, and array of sample values.
 *
 * @example
 * ```typescript
 * const scoreVariable: PlaygroundVariable = {
 *   name: 'score',
 *   type: 'number.float',
 *   values: [85, 92, 78, null, 95],
 * };
 * ```
 */
export interface PlaygroundVariable {
  /**
   * The variable name (without the `@` prefix).
   *
   * Variable names are case-sensitive and should contain only
   * alphanumeric characters, underscores, and periods.
   */
  readonly name: string;

  /**
   * The data type of the variable.
   *
   * All values in the variable should conform to this type.
   */
  readonly type: ValueType;

  /**
   * Array of sample values for testing formulas.
   *
   * Can include null values to test null handling.
   * The number of values determines the number of evaluation rows.
   */
  readonly values: readonly (number | string | boolean | null)[];
}

/**
 * Props for the VariableCard component.
 *
 * The VariableCard displays a single variable in a compact card format
 * with the variable name, type badge, value preview, and action buttons.
 */
export interface VariableCardProps {
  /**
   * The variable to display.
   */
  readonly variable: PlaygroundVariable;

  /**
   * Callback invoked when the user clicks the edit button.
   *
   * The parent component should open the VariableEditor in edit mode.
   *
   * @param variable - The variable to edit
   */
  readonly onEdit: (variable: PlaygroundVariable) => void;

  /**
   * Callback invoked when the user confirms deletion.
   *
   * Called after the user confirms the delete action in the confirmation dialog.
   *
   * @param variableName - The name of the variable to delete
   */
  readonly onDelete: (variableName: string) => void;
}
