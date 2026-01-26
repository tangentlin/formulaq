/**
 * Pure logic functions for logical operations.
 *
 * This module contains the core computation logic for logical functions,
 * separated from the FormulaFunction wrappers for testability.
 *
 * @module
 */

import type { Value } from '../types/values.ts';

/**
 * Evaluates the IF condition and returns the appropriate branch value.
 *
 * @param condition - The condition value (boolean or null)
 * @param thenValue - Value to return if condition is true
 * @param elseValue - Value to return if condition is false
 * @returns The thenValue if condition is true, elseValue if false, null if condition is null
 */
export function evaluateIf(
  condition: Value | null,
  thenValue: Value | null,
  elseValue: Value | null,
): Value | null {
  if (condition === null) {
    return null;
  }

  if (condition.value === null) {
    return null;
  }

  if (condition.value === true) {
    return thenValue;
  }

  return elseValue;
}

/**
 * Result of evaluating AND with short-circuit behavior.
 */
export interface AndResult {
  /**
   * The result value. True if all values are true, false if any is false, null if null encountered.
   */
  readonly result: boolean | null;

  /**
   * The index at which evaluation stopped (for short-circuit tracking).
   */
  readonly stoppedAtIndex: number;
}

/**
 * Evaluates AND with short-circuit behavior.
 *
 * Returns true if ALL values are true.
 * Returns false if ANY value is false (short-circuits).
 * Returns null if null is encountered and no false was found.
 *
 * @param values - Array of boolean values to AND together
 * @returns The AND result with short-circuit information
 */
export function evaluateAnd(values: readonly (Value | null)[]): AndResult {
  let foundNull = false;

  for (let i = 0; i < values.length; i++) {
    const value = values[i];

    if (value === undefined || value === null || value.value === null) {
      foundNull = true;
      continue;
    }

    if (value.value === false) {
      return { result: false, stoppedAtIndex: i };
    }
  }

  if (foundNull) {
    return { result: null, stoppedAtIndex: values.length - 1 };
  }

  return { result: true, stoppedAtIndex: values.length - 1 };
}

/**
 * Result of evaluating OR with short-circuit behavior.
 */
export interface OrResult {
  /**
   * The result value. True if any value is true, false if all are false, null if null present with no true.
   */
  readonly result: boolean | null;

  /**
   * The index at which evaluation stopped (for short-circuit tracking).
   */
  readonly stoppedAtIndex: number;
}

/**
 * Evaluates OR with short-circuit behavior.
 *
 * Returns true if ANY value is true (short-circuits).
 * Returns false if ALL values are false.
 * Returns null if null is encountered and no true was found.
 *
 * @param values - Array of boolean values to OR together
 * @returns The OR result with short-circuit information
 */
export function evaluateOr(values: readonly (Value | null)[]): OrResult {
  let foundNull = false;

  for (let i = 0; i < values.length; i++) {
    const value = values[i];

    if (value === undefined || value === null || value.value === null) {
      foundNull = true;
      continue;
    }

    if (value.value === true) {
      return { result: true, stoppedAtIndex: i };
    }
  }

  if (foundNull) {
    return { result: null, stoppedAtIndex: values.length - 1 };
  }

  return { result: false, stoppedAtIndex: values.length - 1 };
}

/**
 * Evaluates NOT on a boolean value.
 *
 * @param value - The boolean value to negate
 * @returns The negated value, or null if input is null
 */
export function evaluateNot(value: Value | null): boolean | null {
  if (value === null || value.value === null) {
    return null;
  }

  return !value.value;
}

/**
 * Evaluates IFNULL coalescing.
 *
 * @param value - The primary value to check
 * @param defaultValue - The fallback value if primary is null
 * @returns The value if not null, otherwise the defaultValue
 */
export function evaluateIfNull(value: Value | null, defaultValue: Value | null): Value | null {
  if (value === null || value.value === null) {
    return defaultValue;
  }

  return value;
}
