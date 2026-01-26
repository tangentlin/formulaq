/**
 * Pure string logic for FormulaQ string functions.
 *
 * This module contains the business logic for string operations,
 * separated from the function registration infrastructure.
 *
 * @module
 */

import type { Value } from '../types/values.ts';

/**
 * Concatenates an array of string values into a single string.
 *
 * Null handling:
 * - If ANY value in the array is null, returns null
 * - Empty strings are preserved and concatenated normally
 *
 * @param values - Array of string values to concatenate
 * @returns The concatenated string, or null if any input is null
 *
 * @example
 * ```typescript
 * concatenateStrings([
 *   { type: 'string.text', value: 'Hello' },
 *   { type: 'string.text', value: ' ' },
 *   { type: 'string.text', value: 'World' }
 * ]);
 * // Returns 'Hello World'
 *
 * concatenateStrings([
 *   { type: 'string.text', value: 'test' },
 *   { type: 'string.text', value: null }
 * ]);
 * // Returns null
 *
 * concatenateStrings([
 *   { type: 'string.text', value: '' },
 *   { type: 'string.text', value: 'x' }
 * ]);
 * // Returns 'x' (empty string preserved)
 * ```
 */
export function concatenateStrings(values: readonly Value[]): string | null {
  const parts: string[] = [];

  for (let i = 0; i < values.length; i++) {
    const current = values[i];
    if (current === undefined) {
      return null;
    }

    const rawValue = current.value;

    // Null in ANY position results in null output
    if (rawValue === null) {
      return null;
    }

    // Convert value to string
    // For string.text types, value should already be a string
    // For other types that might be passed (if type validation is bypassed),
    // we convert to string as a safety measure
    if (typeof rawValue === 'string') {
      parts.push(rawValue);
    } else {
      parts.push(String(rawValue));
    }
  }

  return parts.join('');
}

/**
 * Checks if the provided values meet the minimum argument requirement for CONCAT.
 *
 * @param argCount - Number of arguments provided
 * @returns True if the argument count is valid (2 or more)
 *
 * @example
 * ```typescript
 * isValidConcatArgCount(2); // true
 * isValidConcatArgCount(5); // true
 * isValidConcatArgCount(1); // false
 * isValidConcatArgCount(0); // false
 * ```
 */
export function isValidConcatArgCount(argCount: number): boolean {
  return argCount >= 2;
}
