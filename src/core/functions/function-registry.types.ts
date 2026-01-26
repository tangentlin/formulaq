/**
 * Registry-specific types for the FormulaQ function registry.
 *
 * This module extends the base function types with registry-specific
 * configuration and error types.
 *
 * @module
 */

/**
 * Error thrown when attempting to register a function with a name
 * that already exists in the registry.
 */
export class DuplicateFunctionError extends Error {
  /**
   * The name of the function that was attempted to be registered.
   */
  public readonly functionName: string;

  /**
   * Creates a new DuplicateFunctionError.
   *
   * @param functionName - The name of the duplicate function
   */
  constructor(functionName: string) {
    super(`Function "${functionName}" is already registered`);
    this.name = 'DuplicateFunctionError';
    this.functionName = functionName;

    // Maintains proper stack trace for where error was thrown (only in V8)
    const errorConstructor = Error as unknown as {
      captureStackTrace?: (target: Error, constructor: unknown) => void;
    };
    if (typeof errorConstructor.captureStackTrace === 'function') {
      errorConstructor.captureStackTrace(this, DuplicateFunctionError);
    }
  }
}

/**
 * Options for creating a new FunctionRegistry instance.
 */
export interface FunctionRegistryOptions {
  /**
   * Whether to register default built-in functions.
   *
   * When true, the registry will be pre-populated with
   * standard FormulaQ functions (SUM, AVG, IF, etc.)
   *
   * @defaultValue false
   */
  readonly includeDefaults?: boolean | undefined;
}
