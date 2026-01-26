/**
 * Pure logic for function signature validation.
 *
 * This module contains the pure functions for validating function calls
 * against their registered signatures. It has no dependencies on classes
 * or error creation, returning plain data structures.
 *
 * @module
 */

import type { ASTNode, FunctionCallNode, SourceLocation } from '../types/ast.ts';
import type { FunctionInfo, ParamTypeSpec } from '../types/functions.ts';
import type { ValueType } from '../types/values.ts';

/**
 * Input for function validation.
 */
export interface ValidateFunctionInput {
  /**
   * The AST to traverse for function calls.
   */
  readonly ast: ASTNode;

  /**
   * Function to get a function definition by name.
   */
  readonly getFunction: (name: string) => FunctionInfo | undefined;

  /**
   * Function to infer the type of an AST node.
   */
  readonly inferArgumentType: (node: ASTNode) => ValueType | undefined;
}

/**
 * Result of function validation (pure data, no error objects).
 */
export interface ValidateFunctionResult {
  /**
   * Information about function validation errors.
   */
  readonly errors: readonly FunctionValidationErrorInfo[];

  /**
   * Function return types indexed by node location key.
   * Used for type inference of function calls.
   */
  readonly returnTypes: ReadonlyMap<string, ValueType>;
}

/**
 * Information about a function validation error for error creation.
 */
export interface FunctionValidationErrorInfo {
  /**
   * Error message.
   */
  readonly message: string;

  /**
   * Start position in source.
   */
  readonly start: number;

  /**
   * End position in source.
   */
  readonly end: number;

  /**
   * Function name involved in the error.
   */
  readonly functionName: string;

  /**
   * Error code for categorization.
   */
  readonly code: FunctionValidationErrorCode;
}

/**
 * Error codes for function validation errors.
 */
export type FunctionValidationErrorCode =
  | 'UNKNOWN_FUNCTION'
  | 'ARGUMENT_COUNT_MISMATCH'
  | 'ARGUMENT_TYPE_MISMATCH'
  | 'INVALID_AGGREGATION_ARGUMENT';

/**
 * Creates an error message for an unknown function.
 *
 * @param functionName - The name of the unknown function
 * @returns Human-readable error message
 */
export function createUnknownFunctionMessage(functionName: string): string {
  return `Unknown function '${functionName}'`;
}

/**
 * Creates an error message for wrong argument count.
 *
 * @param functionName - The function name
 * @param expected - Expected number of arguments
 * @param actual - Actual number of arguments provided
 * @param isMinimum - Whether expected is a minimum (for variadic/optional)
 * @returns Human-readable error message
 */
export function createArgumentCountMessage(
  functionName: string,
  expected: number,
  actual: number,
  isMinimum: boolean,
): string {
  if (isMinimum) {
    return `Function '${functionName}' requires at least ${expected} argument${expected !== 1 ? 's' : ''}, but got ${actual}`;
  }
  return `Function '${functionName}' requires ${expected} argument${expected !== 1 ? 's' : ''}, but got ${actual}`;
}

/**
 * Creates an error message for argument type mismatch.
 *
 * @param argumentIndex - The 1-based index of the argument
 * @param functionName - The function name
 * @param expectedTypes - Expected type(s)
 * @param actualType - Actual type provided
 * @returns Human-readable error message
 */
export function createArgumentTypeMessage(
  argumentIndex: number,
  functionName: string,
  expectedTypes: readonly string[],
  actualType: string,
): string {
  const expectedStr = expectedTypes.length > 1 ? expectedTypes.join(' or ') : expectedTypes[0];
  return `Argument ${argumentIndex} of '${functionName}' expects ${expectedStr}, but got ${actualType}`;
}

/**
 * Creates an error message for invalid aggregation argument.
 *
 * @param functionName - The aggregation function name
 * @returns Human-readable error message
 */
export function createInvalidAggregationArgumentMessage(functionName: string): string {
  return `Aggregation function '${functionName}' requires a variable reference as first argument`;
}

/**
 * Calculates the minimum number of required arguments for a function.
 *
 * @param functionInfo - The function definition
 * @returns Minimum number of required arguments
 */
export function getMinRequiredArgs(functionInfo: FunctionInfo): number {
  // If minArgs is explicitly set, use it
  if (functionInfo.minArgs !== undefined) {
    return functionInfo.minArgs;
  }

  // Otherwise, count non-optional parameters
  let requiredCount = 0;
  for (const param of functionInfo.params) {
    if (!param.optional) {
      requiredCount += 1;
    }
  }

  return requiredCount;
}

/**
 * Calculates the maximum number of allowed arguments for a function.
 *
 * @param functionInfo - The function definition
 * @returns Maximum number of arguments, or undefined for unlimited
 */
export function getMaxAllowedArgs(functionInfo: FunctionInfo): number | undefined {
  // If maxArgs is explicitly set, use it
  if (functionInfo.maxArgs !== undefined) {
    return functionInfo.maxArgs;
  }

  // Variadic functions have no maximum
  if (functionInfo.isVariadic) {
    return undefined;
  }

  // Otherwise, maximum is the number of parameters
  return functionInfo.params.length;
}

/**
 * Checks if an argument count is valid for a function.
 *
 * @param functionInfo - The function definition
 * @param argCount - Number of arguments provided
 * @returns Object with isValid flag and expected counts
 */
export function checkArgumentCount(
  functionInfo: FunctionInfo,
  argCount: number,
): ArgumentCountCheckResult {
  const minRequired = getMinRequiredArgs(functionInfo);
  const maxAllowed = getMaxAllowedArgs(functionInfo);

  // Determine if there's a range of valid counts (for "at least" wording)
  const hasRange = maxAllowed === undefined || minRequired !== maxAllowed;

  if (argCount < minRequired) {
    return {
      isValid: false,
      isTooFew: true,
      isTooMany: false,
      expected: minRequired,
      isMinimum: hasRange,
    };
  }

  if (maxAllowed !== undefined && argCount > maxAllowed) {
    return {
      isValid: false,
      isTooFew: false,
      isTooMany: true,
      expected: maxAllowed,
      isMinimum: false,
    };
  }

  return {
    isValid: true,
    isTooFew: false,
    isTooMany: false,
    expected: minRequired,
    isMinimum: false,
  };
}

/**
 * Result of checking argument count.
 */
export interface ArgumentCountCheckResult {
  readonly isValid: boolean;
  readonly isTooFew: boolean;
  readonly isTooMany: boolean;
  readonly expected: number;
  readonly isMinimum: boolean;
}

/**
 * Gets the expected types for a parameter at a given index.
 *
 * For variadic functions, returns the last parameter's types for
 * indices beyond the parameter list length.
 *
 * @param functionInfo - The function definition
 * @param argIndex - Zero-based argument index
 * @returns Array of allowed types, or undefined if no constraint
 */
export function getExpectedTypesForArg(
  functionInfo: FunctionInfo,
  argIndex: number,
): readonly ValueType[] | undefined {
  const params = functionInfo.params;

  // If within params array, use that param
  if (argIndex < params.length) {
    const param = params[argIndex];
    if (param !== undefined) {
      return normalizeParamType(param.type);
    }
  }

  // For variadic functions, use the last parameter type
  if (functionInfo.isVariadic && params.length > 0) {
    const lastParam = params[params.length - 1];
    if (lastParam !== undefined) {
      return normalizeParamType(lastParam.type);
    }
  }

  // No type constraint
  return undefined;
}

/**
 * Normalizes a ParamTypeSpec to an array of ValueTypes.
 *
 * @param typeSpec - The parameter type specification
 * @returns Array of allowed types, or undefined for 'any'
 */
export function normalizeParamType(typeSpec: ParamTypeSpec): readonly ValueType[] | undefined {
  if (typeSpec === 'any') {
    return undefined;
  }

  if (Array.isArray(typeSpec)) {
    return typeSpec;
  }

  // Single ValueType - wrap in array
  return [typeSpec as ValueType];
}

/**
 * Checks if an actual type matches the expected types.
 *
 * @param actualType - The actual type of the argument
 * @param expectedTypes - Array of allowed types
 * @returns true if the type matches, false otherwise
 */
export function doesTypeMatch(
  actualType: ValueType | undefined,
  expectedTypes: readonly ValueType[] | undefined,
): boolean {
  // If no type constraint, any type is valid
  if (expectedTypes === undefined) {
    return true;
  }

  // If actual type is unknown, we can't verify - assume valid
  if (actualType === undefined) {
    return true;
  }

  // Check if actual type is in the expected list
  for (const expected of expectedTypes) {
    if (actualType === expected) {
      return true;
    }

    // Allow number.integer to match number.float and vice versa
    if (isNumericCompatible(actualType, expected)) {
      return true;
    }
  }

  return false;
}

/**
 * Checks if two numeric types are compatible.
 *
 * number.integer and number.float are considered compatible.
 *
 * @param type1 - First type
 * @param type2 - Second type
 * @returns true if the types are numerically compatible
 */
function isNumericCompatible(type1: ValueType, type2: ValueType): boolean {
  const numericTypes: readonly ValueType[] = ['number.integer', 'number.float'];
  const isType1Numeric = numericTypes.includes(type1);
  const isType2Numeric = numericTypes.includes(type2);
  return isType1Numeric && isType2Numeric;
}

/**
 * Checks if an AST node is a variable reference.
 *
 * @param node - The AST node to check
 * @returns true if the node is a VariableRef
 */
export function isVariableReference(node: ASTNode): boolean {
  return node.type === 'VariableRef';
}

/**
 * Creates a location key for indexing results by AST node.
 *
 * @param location - Source location of the node
 * @returns String key for the location
 */
export function createLocationKey(location: SourceLocation | undefined): string {
  if (location === undefined) {
    return 'unknown';
  }
  return `${location.start}:${location.end}`;
}

/**
 * Collects all function calls from an AST.
 *
 * @param ast - The AST to traverse
 * @returns Array of function call nodes
 */
export function collectFunctionCalls(ast: ASTNode): FunctionCallNode[] {
  const calls: FunctionCallNode[] = [];
  traverseForFunctionCalls(ast, calls);
  return calls;
}

/**
 * Recursive helper to traverse AST and collect function calls.
 *
 * @param node - Current AST node
 * @param calls - Array to accumulate function calls into
 */
function traverseForFunctionCalls(node: ASTNode, calls: FunctionCallNode[]): void {
  switch (node.type) {
    case 'Literal':
      // Literals have no function calls
      break;

    case 'VariableRef':
      // Variable references have no function calls
      break;

    case 'BinaryOp':
      traverseForFunctionCalls(node.left, calls);
      traverseForFunctionCalls(node.right, calls);
      break;

    case 'UnaryOp':
      traverseForFunctionCalls(node.operand, calls);
      break;

    case 'FunctionCall':
      // Add this function call
      calls.push(node);
      // Also traverse arguments for nested function calls
      for (const arg of node.args) {
        traverseForFunctionCalls(arg, calls);
      }
      break;

    default:
      // Exhaustive check
      assertNever(node);
  }
}

/**
 * Validates a single function call.
 *
 * @param functionCall - The function call node
 * @param getFunction - Function to get function definition
 * @param inferArgumentType - Function to infer argument types
 * @returns Validation result for this function call
 */
export function validateFunctionCall(
  functionCall: FunctionCallNode,
  getFunction: (name: string) => FunctionInfo | undefined,
  inferArgumentType: (node: ASTNode) => ValueType | undefined,
): SingleFunctionValidationResult {
  const errors: FunctionValidationErrorInfo[] = [];
  const location = functionCall.location;
  const start = location?.start ?? 0;
  const end = location?.end ?? 0;

  // Check if function exists
  const functionInfo = getFunction(functionCall.name);
  if (functionInfo === undefined) {
    errors.push({
      message: createUnknownFunctionMessage(functionCall.name),
      start,
      end,
      functionName: functionCall.name,
      code: 'UNKNOWN_FUNCTION',
    });

    return {
      errors,
      returnType: undefined,
    };
  }

  // Check argument count
  const argCountResult = checkArgumentCount(functionInfo, functionCall.args.length);
  if (!argCountResult.isValid) {
    errors.push({
      message: createArgumentCountMessage(
        functionCall.name,
        argCountResult.expected,
        functionCall.args.length,
        argCountResult.isMinimum,
      ),
      start,
      end,
      functionName: functionCall.name,
      code: 'ARGUMENT_COUNT_MISMATCH',
    });

    // Still return the function's return type for continued validation
    return {
      errors,
      returnType: functionInfo.returnType,
    };
  }

  // Check argument types
  for (let i = 0; i < functionCall.args.length; i++) {
    const arg = functionCall.args[i];
    if (arg === undefined) {
      continue;
    }

    const expectedTypes = getExpectedTypesForArg(functionInfo, i);
    const actualType = inferArgumentType(arg);

    if (!doesTypeMatch(actualType, expectedTypes)) {
      const argLocation = arg.location;
      errors.push({
        message: createArgumentTypeMessage(
          i + 1,
          functionCall.name,
          expectedTypes ?? ['any'],
          actualType ?? 'unknown',
        ),
        start: argLocation?.start ?? start,
        end: argLocation?.end ?? end,
        functionName: functionCall.name,
        code: 'ARGUMENT_TYPE_MISMATCH',
      });
    }
  }

  // Check aggregation function first argument
  if (functionInfo.isAggregation && functionCall.args.length > 0) {
    const firstArg = functionCall.args[0];
    if (firstArg !== undefined && !isVariableReference(firstArg)) {
      const argLocation = firstArg.location;
      errors.push({
        message: createInvalidAggregationArgumentMessage(functionCall.name),
        start: argLocation?.start ?? start,
        end: argLocation?.end ?? end,
        functionName: functionCall.name,
        code: 'INVALID_AGGREGATION_ARGUMENT',
      });
    }
  }

  return {
    errors,
    returnType: functionInfo.returnType,
  };
}

/**
 * Result of validating a single function call.
 */
export interface SingleFunctionValidationResult {
  readonly errors: readonly FunctionValidationErrorInfo[];
  readonly returnType: ValueType | undefined;
}

/**
 * Validates all function calls in an AST.
 *
 * This is the main entry point for function validation. It:
 * 1. Collects all function calls from the AST
 * 2. Validates each function call
 * 3. Returns all errors and return type mappings
 *
 * @param input - The validation input
 * @returns Validation result with errors and return types
 *
 * @example
 * ```typescript
 * const result = validateFunctions({
 *   ast: parsedAst,
 *   getFunction: (name) => registry.get(name),
 *   inferArgumentType: (node) => inferType(node).type,
 * });
 *
 * if (result.errors.length === 0) {
 *   console.log('All functions are valid');
 * } else {
 *   console.log('Function errors:', result.errors);
 * }
 * ```
 */
export function validateFunctions(input: ValidateFunctionInput): ValidateFunctionResult {
  const functionCalls = collectFunctionCalls(input.ast);
  const allErrors: FunctionValidationErrorInfo[] = [];
  const returnTypes = new Map<string, ValueType>();

  for (const call of functionCalls) {
    const result = validateFunctionCall(call, input.getFunction, input.inferArgumentType);

    for (const error of result.errors) {
      allErrors.push(error);
    }

    if (result.returnType !== undefined) {
      const key = createLocationKey(call.location);
      returnTypes.set(key, result.returnType);
    }
  }

  return {
    errors: allErrors,
    returnTypes,
  };
}

/**
 * Gets the return type for a function call node.
 *
 * @param functionCall - The function call node
 * @param getFunction - Function to get function definition
 * @returns The return type of the function, or undefined if unknown
 */
export function getFunctionReturnType(
  functionCall: FunctionCallNode,
  getFunction: (name: string) => FunctionInfo | undefined,
): ValueType | undefined {
  const functionInfo = getFunction(functionCall.name);
  return functionInfo?.returnType;
}

/**
 * Helper for exhaustive type checking.
 *
 * @param x - Value that should never exist
 */
function assertNever(x: never): never {
  throw new Error(`Unexpected node type: ${(x as ASTNode).type}`);
}
