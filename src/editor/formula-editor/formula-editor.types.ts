/**
 * Type definitions for the FormulaEditor component.
 *
 * This module defines the props interface and related types for the
 * main formula editor component that integrates CodeMirror with
 * formula language support, validation, and autocomplete.
 *
 * @module
 */

import type { VariableProvider } from '../../core/types/context.ts';
import type { FunctionRegistry } from '../../core/types/functions.ts';
import type { ValidatedAST } from '../../core/types/ast.ts';
import type { FormulaError } from '../../core/types/errors.ts';

/**
 * Result of formula validation.
 *
 * Contains information about whether the formula is valid,
 * the validated AST if successful, and any errors encountered.
 */
export interface ValidationResult {
  /**
   * Whether the formula passed validation successfully.
   */
  readonly isValid: boolean;

  /**
   * The validated AST with type information and metadata.
   *
   * Only present when isValid is true.
   */
  readonly validatedAST?: ValidatedAST | undefined;

  /**
   * Validation errors encountered.
   *
   * Present when isValid is false.
   */
  readonly errors?: readonly FormulaError[] | undefined;
}

/**
 * Props for the FormulaEditor component.
 *
 * The FormulaEditor provides a complete formula editing experience with:
 * - Syntax highlighting for the formula language
 * - Autocomplete for variables and functions
 * - Debounced validation with error markers
 * - Visual validation status feedback
 */
export interface FormulaEditorProps {
  /**
   * The current formula string value.
   *
   * This is a controlled component - the value must be managed externally.
   */
  readonly value: string;

  /**
   * Callback invoked when the formula value changes.
   *
   * Called on every change to the editor content.
   *
   * @param value - The new formula string
   */
  readonly onChange: (value: string) => void;

  /**
   * Provider for available variables.
   *
   * Used for autocomplete suggestions and validation.
   * The variables available here will be shown when the user types @.
   */
  readonly variableProvider: VariableProvider;

  /**
   * Registry of available functions.
   *
   * Used for autocomplete suggestions and validation.
   * If not provided, a default registry with built-in functions is used.
   */
  readonly functionRegistry?: FunctionRegistry | undefined;

  /**
   * Callback invoked when validation completes.
   *
   * Called after the debounce period when the formula has been validated.
   *
   * @param result - The validation result
   */
  readonly onValidation?: ((result: ValidationResult) => void) | undefined;

  /**
   * Debounce delay in milliseconds for validation.
   *
   * Validation is triggered after the user stops typing for this duration.
   *
   * @defaultValue 300
   */
  readonly validationDebounceMs?: number | undefined;

  /**
   * Placeholder text shown when the editor is empty.
   */
  readonly placeholder?: string | undefined;

  /**
   * Whether the editor is disabled.
   *
   * When disabled, the editor is read-only and appears grayed out.
   */
  readonly disabled?: boolean | undefined;

  /**
   * Height of the editor.
   *
   * Can be a CSS string (e.g., '100px', '10rem') or a number (pixels).
   *
   * @defaultValue '100px'
   */
  readonly height?: string | number | undefined;
}
