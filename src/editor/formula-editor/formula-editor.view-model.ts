/**
 * View model for the FormulaEditor component.
 *
 * This module contains pure functions for validation orchestration,
 * error position conversion, and validation status determination.
 *
 * @module
 */

import type { FormulaError } from '../../core/types/errors.ts';
import type { ErrorPosition as MarkerErrorPosition } from '../codemirror/error-marker.ts';
import type {
  ValidationState,
  ErrorPositionInfo,
} from '../validation-status/validation-status.types.ts';
import type { ValidationResult } from './formula-editor.types.ts';

/**
 * Interface for a debouncer that can schedule and cancel validation.
 */
export interface ValidationDebouncer {
  /**
   * Schedules validation for the given formula.
   *
   * If called again before the delay, the previous scheduled
   * validation is cancelled.
   *
   * @param formula - The formula string to validate
   */
  readonly validate: (formula: string) => void;

  /**
   * Cancels any pending validation.
   */
  readonly cancel: () => void;
}

/**
 * Creates a validation debouncer.
 *
 * The debouncer delays validation calls and cancels pending validations
 * when new ones are scheduled. This prevents excessive validation during
 * rapid typing.
 *
 * @param delayMs - The debounce delay in milliseconds
 * @param onValidate - Callback invoked with the formula to validate
 * @returns A ValidationDebouncer object
 *
 * @example
 * ```typescript
 * const debouncer = createValidationDebouncer(300, function handleValidation(formula) {
 *   const result = validateFormula(formula);
 *   setValidationResult(result);
 * });
 *
 * // On every change, call debouncer.validate
 * function handleChange(value: string) {
 *   debouncer.validate(value);
 * }
 *
 * // On unmount, cancel pending validations
 * debouncer.cancel();
 * ```
 */
export function createValidationDebouncer(
  delayMs: number,
  onValidate: (formula: string) => void,
): ValidationDebouncer {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  function validate(formula: string): void {
    // Cancel any pending validation
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }

    // Schedule new validation
    timeoutId = setTimeout(function runValidation() {
      timeoutId = null;
      onValidate(formula);
    }, delayMs);
  }

  function cancel(): void {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  }

  return {
    validate,
    cancel,
  };
}

/**
 * Converts a FormulaError position to a marker error position.
 *
 * Clamps positions to the formula string length to handle edge cases.
 *
 * @param error - The FormulaError with position information
 * @param formula - The formula string for length validation
 * @returns A MarkerErrorPosition for use with the error marker extension
 */
export function errorToMarkerPosition(error: FormulaError, formula: string): MarkerErrorPosition {
  const position = error.position;
  const formulaLength = formula.length;

  // Default to start of formula if no position
  if (position === undefined) {
    return {
      start: 0,
      end: Math.min(1, formulaLength),
      message: error.message,
    };
  }

  // Clamp positions to valid range
  const start = Math.max(0, Math.min(position.start, formulaLength));
  const end = Math.max(start, Math.min(position.end, formulaLength));

  // Ensure we have at least one character marked
  const adjustedEnd = end <= start ? Math.min(start + 1, formulaLength) : end;

  return {
    start,
    end: adjustedEnd,
    message: error.message,
  };
}

/**
 * Converts multiple FormulaErrors to marker error positions.
 *
 * @param errors - Array of FormulaErrors
 * @param formula - The formula string
 * @returns Array of marker error positions
 */
export function errorsToMarkerPositions(
  errors: readonly FormulaError[],
  formula: string,
): MarkerErrorPosition[] {
  const result: MarkerErrorPosition[] = [];
  for (let i = 0; i < errors.length; i++) {
    const error = errors[i];
    if (error !== undefined) {
      result.push(errorToMarkerPosition(error, formula));
    }
  }
  return result;
}

/**
 * Determines the validation status from a validation result.
 *
 * @param result - The validation result, or undefined if no validation has occurred
 * @param isValidating - Whether validation is currently in progress
 * @param isEmpty - Whether the formula is empty
 * @returns The ValidationState for the status component
 */
export function getValidationStatus(
  result: ValidationResult | undefined,
  isValidating: boolean,
  isEmpty: boolean,
): ValidationState {
  // Show idle if formula is empty
  if (isEmpty) {
    return 'idle';
  }

  // Show validating if in progress
  if (isValidating) {
    return 'validating';
  }

  // Show idle if no validation has been performed
  if (result === undefined) {
    return 'idle';
  }

  // Show valid or invalid based on result
  return result.isValid ? 'valid' : 'invalid';
}

/**
 * Extracts error message from a validation result.
 *
 * Returns the message from the first error, or undefined if no errors.
 *
 * @param result - The validation result
 * @returns The error message, or undefined
 */
export function getErrorMessage(result: ValidationResult | undefined): string | undefined {
  if (result === undefined || result.isValid) {
    return undefined;
  }

  const errors = result.errors;
  if (errors === undefined || errors.length === 0) {
    return undefined;
  }

  const firstError = errors[0];
  return firstError?.message;
}

/**
 * Converts a character offset to line/column position.
 *
 * Lines and columns are 1-based for display purposes.
 *
 * @param offset - The character offset (0-based)
 * @param text - The full text to analyze
 * @returns The line and column position (1-based)
 */
export function offsetToLineColumn(offset: number, text: string): ErrorPositionInfo {
  let line = 1;
  let column = 1;
  const clampedOffset = Math.min(offset, text.length);

  for (let i = 0; i < clampedOffset; i++) {
    const char = text[i];
    if (char === '\n') {
      line++;
      column = 1;
    } else {
      column++;
    }
  }

  return { line, column };
}

/**
 * Extracts error position info from a validation result.
 *
 * Converts the first error's position to line/column format.
 *
 * @param result - The validation result
 * @param formula - The formula string for position calculation
 * @returns The error position info, or undefined
 */
export function getErrorPosition(
  result: ValidationResult | undefined,
  formula: string,
): ErrorPositionInfo | undefined {
  if (result === undefined || result.isValid) {
    return undefined;
  }

  const errors = result.errors;
  if (errors === undefined || errors.length === 0) {
    return undefined;
  }

  const firstError = errors[0];
  if (firstError === undefined || firstError.position === undefined) {
    return undefined;
  }

  return offsetToLineColumn(firstError.position.start, formula);
}

/**
 * Normalizes a height value to a CSS string.
 *
 * @param height - The height value (string or number)
 * @returns A CSS height string
 */
export function normalizeHeight(height: string | number | undefined): string {
  if (height === undefined) {
    return '100px';
  }

  if (typeof height === 'number') {
    return `${height}px`;
  }

  return height;
}
