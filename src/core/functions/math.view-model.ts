/**
 * Pure math computation logic for math functions.
 *
 * This module contains the core mathematical operations without any
 * FormulaQ-specific types or side effects, making them easy to test
 * and reason about.
 *
 * @module
 */

/**
 * Result of a math operation that can fail due to domain errors.
 *
 * A null result indicates a domain error (e.g., LOG of a non-positive number).
 */
export type MathResult = number | null;

/**
 * Computes the natural logarithm (base e) of a value.
 *
 * Domain: x > 0
 * - Returns null for x <= 0 (domain error)
 * - Returns null for null input
 *
 * @param x - The input value
 * @returns The natural logarithm, or null for domain errors
 *
 * @example
 * ```typescript
 * computeNaturalLog(Math.E) // 1
 * computeNaturalLog(1)      // 0
 * computeNaturalLog(0)      // null (domain error)
 * computeNaturalLog(-1)     // null (domain error)
 * computeNaturalLog(null)   // null
 * ```
 */
export function computeNaturalLog(x: number | null): MathResult {
  if (x === null) {
    return null;
  }

  if (x <= 0) {
    return null;
  }

  return Math.log(x);
}

/**
 * Computes the base-10 logarithm of a value.
 *
 * Domain: x > 0
 * - Returns null for x <= 0 (domain error)
 * - Returns null for null input
 *
 * @param x - The input value
 * @returns The base-10 logarithm, or null for domain errors
 *
 * @example
 * ```typescript
 * computeLog10(10)    // 1
 * computeLog10(100)   // 2
 * computeLog10(1)     // 0
 * computeLog10(0)     // null (domain error)
 * computeLog10(-1)    // null (domain error)
 * computeLog10(null)  // null
 * ```
 */
export function computeLog10(x: number | null): MathResult {
  if (x === null) {
    return null;
  }

  if (x <= 0) {
    return null;
  }

  return Math.log10(x);
}

/**
 * Checks if a number is an integer.
 *
 * @param n - The number to check
 * @returns True if the number is an integer
 */
function isInteger(n: number): boolean {
  return Number.isInteger(n);
}

/**
 * Computes base raised to the power of exponent.
 *
 * Handles special cases:
 * - POWER(x, 0) = 1 for any x (including 0^0 = 1 by convention)
 * - POWER(0, negative) = null (domain error, would be infinity/undefined)
 * - POWER(negative, non-integer) = null (would produce complex result)
 * - Returns null for null inputs
 *
 * @param base - The base value
 * @param exponent - The exponent value
 * @returns The result of base^exponent, or null for domain errors
 *
 * @example
 * ```typescript
 * computePower(2, 3)       // 8
 * computePower(10, 2)      // 100
 * computePower(4, 0.5)     // 2
 * computePower(5, 0)       // 1
 * computePower(0, 0)       // 1 (by convention)
 * computePower(0, -1)      // null (domain error)
 * computePower(-2, 0.5)    // null (would be complex)
 * computePower(null, 2)    // null
 * computePower(2, null)    // null
 * ```
 */
export function computePower(base: number | null, exponent: number | null): MathResult {
  if (base === null || exponent === null) {
    return null;
  }

  // x^0 = 1 for any x (including 0^0 = 1 by convention)
  if (exponent === 0) {
    return 1;
  }

  // 0^negative is undefined (would be 1/0 = infinity)
  if (base === 0 && exponent < 0) {
    return null;
  }

  // Negative base with non-integer exponent produces complex result
  if (base < 0 && !isInteger(exponent)) {
    return null;
  }

  const result = Math.pow(base, exponent);

  // Handle edge cases like overflow/underflow
  if (!Number.isFinite(result)) {
    return null;
  }

  return result;
}
