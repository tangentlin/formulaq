/**
 * Type definitions for the VariableEditor component.
 *
 * This module defines the props interface and related types for the form
 * used to add or edit test variables in the Playground.
 *
 * @module
 */

import type { PlaygroundVariable } from '../variable-card/variable-card.types.ts';

/**
 * Props for the VariableEditor component.
 *
 * The VariableEditor provides a form for creating new variables or editing
 * existing ones. It handles name validation, type selection, and value parsing.
 */
export interface VariableEditorProps {
  /**
   * The mode of the editor.
   *
   * - 'add': Creating a new variable (form starts empty)
   * - 'edit': Editing an existing variable (form is pre-populated)
   */
  readonly mode: 'add' | 'edit';

  /**
   * The variable to edit when in 'edit' mode.
   *
   * Must be provided when mode is 'edit'. The form will be pre-populated
   * with this variable's data.
   */
  readonly variable?: PlaygroundVariable | undefined;

  /**
   * List of existing variable names to prevent duplicates.
   *
   * When in 'add' mode, the new name must not be in this list.
   * When in 'edit' mode, the name can match the current variable's name
   * but cannot match any other existing name.
   */
  readonly existingNames: readonly string[];

  /**
   * Callback invoked when the user saves the variable.
   *
   * Called with the complete variable data after validation passes.
   *
   * @param variable - The variable to save
   */
  readonly onSave: (variable: PlaygroundVariable) => void;

  /**
   * Callback invoked when the user cancels the editor.
   *
   * The parent component should close the editor form.
   */
  readonly onCancel: () => void;
}

/**
 * Result of parsing a values input string.
 *
 * Contains either the parsed values array or an error message.
 */
export interface ParseResult<T> {
  /**
   * Whether the parsing was successful.
   */
  readonly success: boolean;

  /**
   * The parsed values if successful.
   */
  readonly values?: T | undefined;

  /**
   * The error message if parsing failed.
   */
  readonly error?: string | undefined;
}
