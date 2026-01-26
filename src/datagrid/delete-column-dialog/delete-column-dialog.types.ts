/**
 * Types for the DeleteColumnDialog component.
 *
 * @module
 */

/**
 * Props for the DeleteColumnDialog component.
 *
 * A confirmation dialog for deleting formula columns. When the column
 * has dependents (other columns that reference it), deletion is blocked
 * and the dependent columns are listed. When there are no dependents,
 * a simple confirmation is shown.
 */
export interface DeleteColumnDialogProps {
  /**
   * Whether the dialog is open.
   *
   * When true, the dialog is displayed.
   * When false, the dialog is hidden.
   */
  readonly open: boolean;

  /**
   * The name of the column being deleted.
   *
   * Displayed in the confirmation message with an @ prefix.
   */
  readonly columnName: string;

  /**
   * Columns that depend on this one.
   *
   * If this array is not empty, deletion is blocked and these
   * column names are listed as blockers. The Delete button is
   * disabled when dependents exist.
   */
  readonly dependentColumns: readonly string[];

  /**
   * Callback invoked when the user confirms deletion.
   *
   * Only callable when there are no dependent columns.
   */
  readonly onConfirm: () => void;

  /**
   * Callback invoked when the user cancels the dialog.
   *
   * Called when the user clicks Cancel, presses Escape,
   * or clicks the close button (X).
   */
  readonly onCancel: () => void;
}
