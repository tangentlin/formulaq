/**
 * Pure computation logic for aggregation functions.
 *
 * These functions operate on arrays of nullable numbers and implement
 * the core mathematical operations without any dependencies on the
 * formula engine's type system.
 *
 * @module
 */

/**
 * Computes the sum of non-null values.
 *
 * @param values - Array of nullable numbers
 * @returns Sum of non-null values, or null if all values are null
 *
 * @example
 * ```typescript
 * computeSum([1, 2, 3, null, 4]) // => 10
 * computeSum([null, null]) // => null
 * computeSum([]) // => null
 * ```
 */
export function computeSum(values: ReadonlyArray<number | null>): number | null {
  let sum = 0;
  let hasNonNull = false;

  for (let i = 0; i < values.length; i++) {
    const value = values[i];
    if (value !== null && value !== undefined) {
      sum += value;
      hasNonNull = true;
    }
  }

  if (!hasNonNull) {
    return null;
  }

  return sum;
}

/**
 * Computes the arithmetic mean of non-null values.
 *
 * @param values - Array of nullable numbers
 * @returns Average of non-null values, or null if all values are null
 *
 * @example
 * ```typescript
 * computeAvg([1, 2, 3, 4, 5]) // => 3
 * computeAvg([2, null, 4]) // => 3 (skips null)
 * computeAvg([null]) // => null
 * ```
 */
export function computeAvg(values: ReadonlyArray<number | null>): number | null {
  let sum = 0;
  let count = 0;

  for (let i = 0; i < values.length; i++) {
    const value = values[i];
    if (value !== null && value !== undefined) {
      sum += value;
      count += 1;
    }
  }

  if (count === 0) {
    return null;
  }

  return sum / count;
}

/**
 * Finds the minimum non-null value.
 *
 * @param values - Array of nullable numbers
 * @returns Minimum non-null value, or null if all values are null
 *
 * @example
 * ```typescript
 * computeMin([3, 1, 4, 1, 5]) // => 1
 * computeMin([null, 5, null, 2]) // => 2
 * computeMin([null, null]) // => null
 * ```
 */
export function computeMin(values: ReadonlyArray<number | null>): number | null {
  let min: number | null = null;

  for (let i = 0; i < values.length; i++) {
    const value = values[i];
    if (value !== null && value !== undefined) {
      if (min === null || value < min) {
        min = value;
      }
    }
  }

  return min;
}

/**
 * Finds the maximum non-null value.
 *
 * @param values - Array of nullable numbers
 * @returns Maximum non-null value, or null if all values are null
 *
 * @example
 * ```typescript
 * computeMax([3, 1, 4, 1, 5]) // => 5
 * computeMax([null, 5, null, 2]) // => 5
 * computeMax([null, null]) // => null
 * ```
 */
export function computeMax(values: ReadonlyArray<number | null>): number | null {
  let max: number | null = null;

  for (let i = 0; i < values.length; i++) {
    const value = values[i];
    if (value !== null && value !== undefined) {
      if (max === null || value > max) {
        max = value;
      }
    }
  }

  return max;
}

/**
 * Counts non-null values.
 *
 * Unlike other aggregations, COUNT returns 0 (not null) when all values are null.
 *
 * @param values - Array of any nullable values
 * @returns Count of non-null values (always a number, never null)
 *
 * @example
 * ```typescript
 * computeCount([1, 2, 3, null, 4]) // => 4
 * computeCount([null, null]) // => 0
 * computeCount([]) // => 0
 * ```
 */
export function computeCount(values: ReadonlyArray<unknown>): number {
  let count = 0;

  for (let i = 0; i < values.length; i++) {
    if (values[i] !== null) {
      count += 1;
    }
  }

  return count;
}

/**
 * Computes the k-th percentile of non-null values.
 *
 * Uses linear interpolation for non-integer positions:
 * - k=0 returns the minimum value
 * - k=100 returns the maximum value
 * - For k between 0 and 100, interpolates between adjacent values
 *
 * The algorithm follows the "R-7" method (Excel's PERCENTILE.INC):
 * 1. Sort non-null values
 * 2. Calculate position: p = k/100 * (n-1)
 * 3. For fractional positions, linearly interpolate
 *
 * @param values - Array of nullable numbers
 * @param k - Percentile to compute (0-100)
 * @returns The k-th percentile, or null if all values are null
 * @throws RangeError if k is outside [0, 100]
 *
 * @example
 * ```typescript
 * computePercentile([1, 2, 3, 4, 5], 50) // => 3 (median)
 * computePercentile([1, 2, 3, 4, 5], 0) // => 1 (minimum)
 * computePercentile([1, 2, 3, 4, 5], 100) // => 5 (maximum)
 * computePercentile([10, 20, null, 40], 50) // => 20 (ignores null)
 * ```
 */
export function computePercentile(values: ReadonlyArray<number | null>, k: number): number | null {
  if (k < 0 || k > 100) {
    throw new RangeError(`Percentile k must be between 0 and 100, got ${k}`);
  }

  // Filter out nulls and collect non-null values
  const nonNullValues: number[] = [];
  for (let i = 0; i < values.length; i++) {
    const value = values[i];
    if (value !== null && value !== undefined) {
      nonNullValues.push(value);
    }
  }

  const n = nonNullValues.length;
  if (n === 0) {
    return null;
  }

  // Sort values in ascending order
  nonNullValues.sort(compareNumbers);

  // Handle edge cases
  if (n === 1) {
    return nonNullValues[0]!;
  }

  // Calculate position using R-7 method (Excel PERCENTILE.INC)
  // position = k/100 * (n-1)
  const position = (k / 100) * (n - 1);

  // Get the floor and ceiling indices
  const lowerIndex = Math.floor(position);
  const upperIndex = Math.ceil(position);

  // If position is an integer, return the value at that position
  if (lowerIndex === upperIndex) {
    return nonNullValues[lowerIndex]!;
  }

  // Linear interpolation between adjacent values
  const lowerValue = nonNullValues[lowerIndex]!;
  const upperValue = nonNullValues[upperIndex]!;
  const fraction = position - lowerIndex;

  return lowerValue + fraction * (upperValue - lowerValue);
}

/**
 * Numeric comparison function for sorting.
 *
 * @param a - First number
 * @param b - Second number
 * @returns Negative if a < b, positive if a > b, zero if equal
 */
function compareNumbers(a: number, b: number): number {
  return a - b;
}
