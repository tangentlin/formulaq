/**
 * Type definitions for the Playground component.
 *
 * This module defines the props interface for the main Playground component
 * that combines the VariablePanel, FormulaEditor, and ResultsPanel into a
 * three-panel layout for interactive formula testing.
 *
 * @module
 */

import type { PlaygroundVariable } from '../variable-card/variable-card.types.ts';

/**
 * Props for the Playground component.
 *
 * The Playground provides a complete formula testing environment with:
 * - A left panel for managing test variables
 * - A center panel for editing and validating formulas
 * - A right panel for viewing evaluation results and aggregations
 *
 * The component is fully responsive, stacking panels vertically on smaller screens.
 *
 * @example
 * ```tsx
 * // Empty playground
 * <Playground />
 *
 * // With initial variables
 * <Playground
 *   initialVariables={[
 *     { name: 'score', type: 'number.float', values: [85, 92, 78] },
 *     { name: 'name', type: 'string.text', values: ['Alice', 'Bob'] },
 *   ]}
 * />
 *
 * // With initial formula
 * <Playground
 *   initialFormula="@score * 2"
 *   initialVariables={[
 *     { name: 'score', type: 'number.float', values: [85, 92, 78] },
 *   ]}
 * />
 *
 * // With custom title
 * <Playground title="Formula Calculator" />
 * ```
 */
export interface PlaygroundProps {
  /**
   * Initial test variables to populate the playground.
   *
   * These variables will be available in the formula editor
   * for autocomplete and validation, and their values will be
   * used during formula evaluation.
   *
   * @defaultValue []
   */
  readonly initialVariables?: readonly PlaygroundVariable[] | undefined;

  /**
   * Initial formula string to populate the editor.
   *
   * If provided, the formula will be validated immediately
   * and evaluated if variables are also provided.
   *
   * @defaultValue ''
   */
  readonly initialFormula?: string | undefined;

  /**
   * Title displayed in the playground header.
   *
   * @defaultValue 'FormulaQ Playground'
   */
  readonly title?: string | undefined;
}
