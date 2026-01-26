/**
 * Type definitions for the VariablePanel component.
 *
 * This module defines the props interface for the left panel container
 * that displays the list of test variables in the Playground.
 *
 * @module
 */

import type { PlaygroundVariable } from '../variable-card/variable-card.types.ts';

/**
 * Props for the VariablePanel component.
 *
 * The VariablePanel displays a list of test variables in a scrollable panel
 * with a header containing an "Add" button. It manages opening the VariableEditor
 * dialog for adding and editing variables.
 */
export interface VariablePanelProps {
  /**
   * The list of variables to display.
   *
   * Each variable is rendered as a VariableCard with edit and delete actions.
   */
  readonly variables: readonly PlaygroundVariable[];

  /**
   * Callback invoked when a new variable is added.
   *
   * Called after the user completes the add form in the VariableEditor dialog.
   *
   * @param variable - The new variable to add
   */
  readonly onAddVariable: (variable: PlaygroundVariable) => void;

  /**
   * Callback invoked when an existing variable is edited.
   *
   * Called after the user saves changes in the VariableEditor dialog.
   *
   * @param variable - The updated variable
   */
  readonly onEditVariable: (variable: PlaygroundVariable) => void;

  /**
   * Callback invoked when a variable is deleted.
   *
   * Called after the user confirms deletion in the VariableCard.
   *
   * @param variableName - The name of the variable to delete
   */
  readonly onDeleteVariable: (variableName: string) => void;
}
