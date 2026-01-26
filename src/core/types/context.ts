/**
 * Context interfaces for variable resolution and evaluation.
 *
 * These interfaces decouple the formula engine from specific data sources,
 * enabling use across different contexts (DataGrid, Playground, Batch processor).
 *
 * @module
 */

import type { Value, ValueType, VariableInfo } from './values.ts';

/**
 * Provides metadata about available variables at parse/validation time.
 *
 * This interface is used for:
 * - Autocomplete suggestions in the editor
 * - Type checking during validation
 * - Unknown variable detection
 *
 * Implementations should be created for each data context (DataGrid, Playground, etc.)
 *
 * @example
 * ```typescript
 * class PlaygroundVariableProvider implements VariableProvider {
 *   private variables: Map<string, VariableInfo>;
 *
 *   constructor(vars: VariableInfo[]) {
 *     this.variables = new Map(vars.map(v => [v.name, v]));
 *   }
 *
 *   getVariables(): VariableInfo[] {
 *     return Array.from(this.variables.values());
 *   }
 *
 *   hasVariable(name: string): boolean {
 *     return this.variables.has(name);
 *   }
 *
 *   getVariableType(name: string): ValueType | undefined {
 *     const info = this.variables.get(name);
 *     return info?.type;
 *   }
 *
 *   isNullable(name: string): boolean {
 *     const info = this.variables.get(name);
 *     return info?.nullable ?? true;
 *   }
 * }
 * ```
 */
export interface VariableProvider {
  /**
   * Lists all available variable names with their metadata.
   *
   * Used for autocomplete suggestions. The returned array should include
   * all variables that can be referenced in formulas.
   *
   * @returns Array of variable metadata objects
   */
  getVariables(): VariableInfo[];

  /**
   * Checks if a variable with the given name exists.
   *
   * Used during validation to detect unknown variable references.
   *
   * @param name - Variable name (without @ prefix)
   * @returns True if the variable exists, false otherwise
   */
  hasVariable(name: string): boolean;

  /**
   * Gets the type information for a variable.
   *
   * Used for type checking during validation.
   *
   * @param name - Variable name (without @ prefix)
   * @returns The variable's type, or undefined if the variable doesn't exist
   */
  getVariableType(name: string): ValueType | undefined;

  /**
   * Checks if a variable can contain null values.
   *
   * Used to determine null propagation behavior during evaluation.
   *
   * @param name - Variable name (without @ prefix)
   * @returns True if the variable is nullable, false otherwise
   */
  isNullable(name: string): boolean;
}

/**
 * Provides variable values for formula evaluation.
 *
 * All variables are represented as arrays to support both row-level and
 * aggregation operations uniformly.
 *
 * @example
 * ```typescript
 * // Scalar mode (single value evaluation)
 * const scalarContext: EvaluationContext = {
 *   variables: {
 *     x: [{ type: 'number.integer', value: 10 }],
 *     y: [{ type: 'number.integer', value: 20 }],
 *   },
 *   currentIndex: 0,
 *   rowCount: 1,
 * };
 *
 * // Batch mode (DataGrid evaluation)
 * const batchContext: EvaluationContext = {
 *   variables: {
 *     score: [
 *       { type: 'number.float', value: 85.5 },
 *       { type: 'number.float', value: 92.0 },
 *       { type: 'number.float', value: null },
 *     ],
 *   },
 *   rowCount: 3,
 *   signal: abortController.signal,
 *   onProgress: (done, total) => console.log(`${done}/${total}`),
 * };
 * ```
 */
export interface EvaluationContext {
  /**
   * Variable values indexed by variable name.
   *
   * Each key is a variable name (without @ prefix).
   * Each value is an array of Values for that variable.
   *
   * For row-level evaluation: access `variables[name][currentIndex]`
   * For aggregations: access `variables[name]` (full array)
   */
  readonly variables: Readonly<Record<string, readonly Value[]>>;

  /**
   * Current row index for row-level operations.
   *
   * Used when evaluating formulas row-by-row.
   * If undefined, only aggregations can be evaluated (aggregation-only formulas).
   */
  readonly currentIndex?: number | undefined;

  /**
   * Total number of rows in the dataset.
   *
   * Should equal the length of each variable array in `variables`.
   */
  readonly rowCount: number;

  /**
   * Abort signal for cancellation support.
   *
   * Long-running evaluations should check this periodically
   * and stop if the signal is aborted.
   */
  readonly signal?: AbortSignal | undefined;

  /**
   * Progress callback for long operations.
   *
   * Called after processing each chunk of rows.
   *
   * @param completed - Number of rows processed so far
   * @param total - Total number of rows to process
   */
  readonly onProgress?: ((completed: number, total: number) => void) | undefined;
}

/**
 * Options for batch evaluation.
 *
 * Controls chunking, progress reporting, and cancellation behavior.
 */
export interface EvaluationOptions {
  /**
   * Number of rows to process in each chunk.
   *
   * Lower values give more responsive progress updates and
   * better cancellation responsiveness, but may be slower overall.
   *
   * @defaultValue 1000
   */
  readonly chunkSize?: number | undefined;

  /**
   * Delay in milliseconds between chunks.
   *
   * Use 0 (default) for maximum speed with setTimeout(0) for yielding.
   * Use 16 for ~60fps UI responsiveness.
   *
   * @defaultValue 0
   */
  readonly delayMs?: number | undefined;

  /**
   * Abort signal for cancellation.
   *
   * When aborted, evaluation will stop after the current chunk
   * and return partial results.
   */
  readonly signal?: AbortSignal | undefined;

  /**
   * Progress callback called after each chunk.
   *
   * @param completed - Number of rows processed
   * @param total - Total number of rows
   */
  readonly onProgress?: ((completed: number, total: number) => void) | undefined;
}
