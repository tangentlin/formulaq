/**
 * Types for the ProgressOverlay component.
 *
 * @module
 */

/**
 * Props for the ProgressOverlay component.
 *
 * Displays evaluation progress for large datasets with a linear progress bar,
 * row count display, and optional cancel functionality.
 */
export interface ProgressOverlayProps {
  /**
   * Whether the overlay is visible.
   *
   * When false, the overlay is not rendered.
   * The parent component controls fade in/out behavior.
   */
  readonly visible: boolean;

  /**
   * Number of rows that have been processed.
   *
   * Must be a non-negative integer.
   */
  readonly completed: number;

  /**
   * Total number of rows to process.
   *
   * Must be a positive integer greater than zero.
   */
  readonly total: number;

  /**
   * Optional callback invoked when the user clicks the Cancel button.
   *
   * When provided, a Cancel button is displayed below the progress bar.
   * When not provided, no Cancel button is shown.
   */
  readonly onCancel?: (() => void) | undefined;
}
