/**
 * Types for the ValidationStatus component.
 *
 * @module
 */

/**
 * Validation status states for the formula editor.
 *
 * - idle: No validation has been performed yet or the formula is empty
 * - validating: Validation is in progress
 * - valid: The formula passed validation successfully
 * - invalid: The formula has validation errors
 */
export type ValidationState = 'idle' | 'validating' | 'valid' | 'invalid';

/**
 * Position information for error location in the formula.
 */
export interface ErrorPositionInfo {
  /**
   * Line number (1-based) where the error occurred.
   */
  readonly line: number;

  /**
   * Column number (1-based) where the error occurred.
   */
  readonly column: number;
}

/**
 * Props for the ValidationStatus component.
 *
 * This component displays the current validation state of a formula
 * in a compact status bar format suitable for placement below an editor.
 */
export interface ValidationStatusProps {
  /**
   * Current validation status.
   *
   * - 'idle': Empty or grayed out state (no validation performed)
   * - 'validating': Shows loading indicator with "Validating..." text
   * - 'valid': Shows green checkmark with "Formula is valid" text
   * - 'invalid': Shows red X icon with the error message
   */
  readonly status: ValidationState;

  /**
   * Error message to display when status is 'invalid'.
   *
   * Long messages will be truncated with ellipsis.
   * This prop is only used when status is 'invalid'.
   */
  readonly errorMessage?: string | undefined;

  /**
   * Position in the formula where the error occurred.
   *
   * When provided, displays additional position information
   * like "Line 1, Column 5" to help locate the error.
   * This prop is only used when status is 'invalid'.
   */
  readonly errorPosition?: ErrorPositionInfo | undefined;
}
