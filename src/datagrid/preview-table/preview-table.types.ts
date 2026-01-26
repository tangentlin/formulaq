/**
 * Types for the PreviewTable component.
 *
 * The PreviewTable displays a preview of formula evaluation results
 * alongside referenced variable columns.
 *
 * @module
 */

/**
 * Column definition for the preview table.
 *
 * Describes a column to display, which may be either a
 * referenced variable column or the formula result column.
 */
export interface PreviewColumn {
  /**
   * The field name (matches the field in PreviewRow).
   */
  readonly field: string;

  /**
   * The display name shown in the column header.
   */
  readonly headerName: string;

  /**
   * Whether this column represents the formula result.
   *
   * Result columns are highlighted with a different background color
   * to distinguish them from input variable columns.
   */
  readonly isResult?: boolean | undefined;
}

/**
 * Row data for the preview table.
 *
 * Contains an id and dynamic fields matching the column definitions.
 * Field values can be any type that appears in the data.
 */
export interface PreviewRow {
  /**
   * Unique identifier for the row.
   */
  readonly id: number;

  /**
   * Dynamic fields matching column definitions.
   * Values can be numbers, strings, booleans, or null.
   */
  readonly [field: string]: number | string | boolean | null | undefined;
}

/**
 * Props for the PreviewTable component.
 *
 * Displays a compact table showing referenced variable columns
 * and the formula result column for the first 10 rows.
 */
export interface PreviewTableProps {
  /**
   * Columns to display in the preview table.
   *
   * Typically includes referenced variable columns and a result column.
   * The result column should have `isResult: true` for highlighting.
   */
  readonly columns: readonly PreviewColumn[];

  /**
   * Row data for the preview (typically first 10 rows).
   *
   * Each row has an id and field values matching the column definitions.
   * Values can be numbers, strings, booleans, or null.
   */
  readonly rows: readonly PreviewRow[];

  /**
   * The field name of the result column.
   *
   * @deprecated Use `isResult` property on the column definition instead.
   * Kept for backwards compatibility.
   */
  readonly resultColumn?: string | undefined;

  /**
   * Map of row indices to error messages.
   *
   * Used to display error indicators with tooltips for rows
   * that encountered evaluation errors.
   */
  readonly errors?: ReadonlyMap<number, string> | undefined;
}
