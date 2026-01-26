/**
 * Pure logic for formula autocomplete completion generation.
 *
 * This module contains pure functions for:
 * - Generating variable completions from VariableProvider
 * - Generating function completions from FunctionRegistry
 * - Determining trigger conditions for autocomplete
 *
 * All functions are side-effect free and depend only on their inputs.
 *
 * @module
 */

import type { VariableProvider } from '../../core/types/context.ts';
import type { VariableInfo, ValueType } from '../../core/types/values.ts';
import type { FunctionInfo, FunctionRegistry, ParamDef } from '../../core/types/functions.ts';

/**
 * Completion item for the formula autocomplete.
 *
 * This interface is designed to be compatible with CodeMirror's
 * Completion interface while remaining framework-agnostic for testing.
 */
export interface FormulaCompletion {
  /**
   * Display text shown in the completion popup.
   */
  readonly label: string;

  /**
   * Type of completion for styling.
   * - 'variable' for variable references
   * - 'function' for function names
   */
  readonly type: 'variable' | 'function';

  /**
   * Description or tooltip text shown alongside the completion.
   */
  readonly info?: string | undefined;

  /**
   * Text to insert when the completion is accepted.
   * If not provided, the label is used.
   */
  readonly apply?: string | undefined;

  /**
   * Additional type information shown after the label.
   * For variables: the type (e.g., "number")
   * For functions: the signature (e.g., "(values)")
   */
  readonly detail?: string | undefined;

  /**
   * Boost value for sorting completions.
   * Higher values appear first. Default is 0.
   */
  readonly boost?: number | undefined;
}

/**
 * Formats a ValueType for display in autocomplete.
 *
 * Converts the hierarchical type (e.g., 'number.float') to a
 * user-friendly display string (e.g., 'number').
 *
 * @param valueType - The value type to format
 * @returns User-friendly type string
 *
 * @example
 * ```typescript
 * formatValueType('number.float'); // 'number'
 * formatValueType('string.text');  // 'string'
 * formatValueType('boolean.boolean'); // 'boolean'
 * ```
 */
export function formatValueType(valueType: ValueType): string {
  const dotIndex = valueType.indexOf('.');
  if (dotIndex === -1) {
    return valueType;
  }
  return valueType.substring(0, dotIndex);
}

/**
 * Creates a completion item for a variable.
 *
 * @param variableInfo - The variable information
 * @returns A FormulaCompletion for the variable
 *
 * @example
 * ```typescript
 * const completion = createVariableCompletion({
 *   name: 'score',
 *   type: 'number.float',
 *   nullable: true,
 *   description: 'Test score'
 * });
 * // Returns: { label: '@score', type: 'variable', detail: 'number', ... }
 * ```
 */
export function createVariableCompletion(variableInfo: VariableInfo): FormulaCompletion {
  const typeDisplay = formatValueType(variableInfo.type);

  return {
    label: '@' + variableInfo.name,
    type: 'variable',
    detail: typeDisplay,
    info: variableInfo.description,
    apply: '@' + variableInfo.name,
  };
}

/**
 * Formats a function signature for display.
 *
 * Creates a compact signature string showing parameter names.
 *
 * @param params - The function parameters
 * @param isVariadic - Whether the function accepts variable arguments
 * @returns Signature string (e.g., "(condition, then, else)")
 *
 * @example
 * ```typescript
 * formatFunctionSignature([
 *   { name: 'condition', type: 'boolean.boolean', description: '...' },
 *   { name: 'then_value', type: 'any', description: '...' },
 *   { name: 'else_value', type: 'any', description: '...' },
 * ], false);
 * // Returns: '(condition, then_value, else_value)'
 * ```
 */
export function formatFunctionSignature(
  params: readonly ParamDef[],
  isVariadic: boolean | undefined,
): string {
  if (params.length === 0) {
    return '()';
  }

  const paramNames: string[] = [];
  for (let i = 0; i < params.length; i++) {
    const param = params[i]!;
    let paramStr = param.name;
    if (param.optional) {
      paramStr = '[' + paramStr + ']';
    }
    paramNames.push(paramStr);
  }

  if (isVariadic) {
    paramNames.push('...');
  }

  return '(' + paramNames.join(', ') + ')';
}

/**
 * Creates a completion item for a function.
 *
 * @param functionInfo - The function information
 * @returns A FormulaCompletion for the function
 *
 * @example
 * ```typescript
 * const completion = createFunctionCompletion({
 *   name: 'AVG',
 *   description: 'Calculate arithmetic mean',
 *   params: [{ name: 'values', type: 'number.float', description: '...' }],
 *   returnType: 'number.float',
 *   isAggregation: true
 * });
 * // Returns: { label: 'AVG', type: 'function', detail: '(values)', ... }
 * ```
 */
export function createFunctionCompletion(functionInfo: FunctionInfo): FormulaCompletion {
  const signature = formatFunctionSignature(functionInfo.params, functionInfo.isVariadic);

  // Build info string with description and category
  let infoText = functionInfo.description;
  if (functionInfo.category) {
    infoText = '[' + functionInfo.category + '] ' + infoText;
  }

  return {
    label: functionInfo.name,
    type: 'function',
    detail: signature,
    info: infoText,
    // Apply function name with opening parenthesis
    apply: functionInfo.name + '(',
  };
}

/**
 * Filters and generates variable completions based on a prefix.
 *
 * When the user types '@', this generates completions for all variables.
 * As they continue typing, results are filtered by prefix.
 *
 * @param prefix - The prefix to filter by (without the @ symbol)
 * @param provider - The variable provider containing available variables
 * @returns Array of variable completions matching the prefix
 *
 * @example
 * ```typescript
 * const completions = getVariableCompletions('sc', mockProvider);
 * // Returns completions for variables starting with 'sc' (e.g., 'score')
 * ```
 */
export function getVariableCompletions(
  prefix: string,
  provider: VariableProvider,
): FormulaCompletion[] {
  const variables = provider.getVariables();
  const completions: FormulaCompletion[] = [];
  const lowerPrefix = prefix.toLowerCase();

  for (let i = 0; i < variables.length; i++) {
    const variable = variables[i]!;
    const lowerName = variable.name.toLowerCase();

    // Filter by prefix if one is provided
    if (lowerPrefix.length === 0 || lowerName.startsWith(lowerPrefix)) {
      completions.push(createVariableCompletion(variable));
    }
  }

  return completions;
}

/**
 * Filters and generates function completions based on a prefix.
 *
 * When the user starts typing a letter, this generates completions
 * for functions matching that prefix.
 *
 * @param prefix - The prefix to filter by
 * @param registry - The function registry containing available functions
 * @returns Array of function completions matching the prefix
 *
 * @example
 * ```typescript
 * const completions = getFunctionCompletions('AV', mockRegistry);
 * // Returns completions for functions starting with 'AV' (e.g., 'AVG')
 * ```
 */
export function getFunctionCompletions(
  prefix: string,
  registry: FunctionRegistry,
): FormulaCompletion[] {
  const functions = registry.getAll();
  const completions: FormulaCompletion[] = [];
  const upperPrefix = prefix.toUpperCase();

  for (let i = 0; i < functions.length; i++) {
    const func = functions[i]!;
    const upperName = func.name.toUpperCase();

    // Filter by prefix if one is provided
    if (upperPrefix.length === 0 || upperName.startsWith(upperPrefix)) {
      completions.push(createFunctionCompletion(func));
    }
  }

  return completions;
}

/**
 * Determines if variable completion should be triggered based on context.
 *
 * Variable completion is triggered when:
 * - The cursor is immediately after an '@' character
 * - The cursor is within a variable reference (after @ and within identifier chars)
 *
 * @param textBefore - The text content before the cursor position
 * @returns True if variable completion should be triggered
 *
 * @example
 * ```typescript
 * shouldTriggerVariableCompletion('@'); // true
 * shouldTriggerVariableCompletion('@sco'); // true
 * shouldTriggerVariableCompletion('SUM(@'); // true
 * shouldTriggerVariableCompletion('SUM('); // false
 * ```
 */
export function shouldTriggerVariableCompletion(textBefore: string): boolean {
  if (textBefore.length === 0) {
    return false;
  }

  // Find the last @ symbol
  const atIndex = textBefore.lastIndexOf('@');
  if (atIndex === -1) {
    return false;
  }

  // Check if everything after @ is a valid variable identifier prefix
  const afterAt = textBefore.substring(atIndex + 1);

  // Empty string after @ means just typed @
  if (afterAt.length === 0) {
    return true;
  }

  // Check if the characters after @ form a valid identifier prefix
  return isValidIdentifierPrefix(afterAt);
}

/**
 * Checks if a string is a valid identifier prefix.
 *
 * Valid identifiers start with a letter or underscore and continue
 * with letters, digits, underscores, or dots.
 *
 * @param str - The string to check
 * @returns True if the string is a valid identifier prefix
 */
export function isValidIdentifierPrefix(str: string): boolean {
  if (str.length === 0) {
    return true;
  }

  const firstChar = str.charAt(0);
  if (!isIdentifierStart(firstChar)) {
    return false;
  }

  for (let i = 1; i < str.length; i++) {
    const char = str.charAt(i);
    if (!isIdentifierChar(char)) {
      return false;
    }
  }

  return true;
}

/**
 * Checks if a character can start an identifier.
 *
 * @param char - The character to check
 * @returns True if the character can start an identifier
 */
function isIdentifierStart(char: string): boolean {
  const code = char.charCodeAt(0);
  return (
    (code >= 65 && code <= 90) || // A-Z
    (code >= 97 && code <= 122) || // a-z
    char === '_'
  );
}

/**
 * Checks if a character can continue an identifier.
 *
 * @param char - The character to check
 * @returns True if the character can continue an identifier
 */
function isIdentifierChar(char: string): boolean {
  const code = char.charCodeAt(0);
  return (
    (code >= 65 && code <= 90) || // A-Z
    (code >= 97 && code <= 122) || // a-z
    (code >= 48 && code <= 57) || // 0-9
    char === '_' ||
    char === '.'
  );
}

/**
 * Determines if function completion should be triggered based on context.
 *
 * Function completion is triggered when:
 * - The cursor is at the start of an identifier (letter)
 * - The cursor is within a function name (letters)
 * - Not currently inside a variable reference (after @)
 *
 * @param textBefore - The text content before the cursor position
 * @returns True if function completion should be triggered
 *
 * @example
 * ```typescript
 * shouldTriggerFunctionCompletion('AV'); // true
 * shouldTriggerFunctionCompletion('SUM(@'); // false
 * shouldTriggerFunctionCompletion(''); // false
 * ```
 */
export function shouldTriggerFunctionCompletion(textBefore: string): boolean {
  if (textBefore.length === 0) {
    return false;
  }

  // Don't trigger if we're in a variable reference
  if (shouldTriggerVariableCompletion(textBefore)) {
    return false;
  }

  // Find the start of the current identifier
  let identStart = textBefore.length;
  while (identStart > 0) {
    const char = textBefore.charAt(identStart - 1);
    if (!isIdentifierChar(char)) {
      break;
    }
    identStart--;
  }

  // If we're not in an identifier, don't trigger
  if (identStart === textBefore.length) {
    return false;
  }

  // Check if the identifier starts with a letter (function names must start with letter)
  const firstChar = textBefore.charAt(identStart);
  return isIdentifierStart(firstChar);
}

/**
 * Extracts the variable prefix from text before cursor.
 *
 * @param textBefore - The text content before the cursor position
 * @returns The variable prefix (without @) or empty string if not in variable context
 *
 * @example
 * ```typescript
 * extractVariablePrefix('@sco'); // 'sco'
 * extractVariablePrefix('@'); // ''
 * extractVariablePrefix('SUM('); // ''
 * ```
 */
export function extractVariablePrefix(textBefore: string): string {
  const atIndex = textBefore.lastIndexOf('@');
  if (atIndex === -1) {
    return '';
  }

  const afterAt = textBefore.substring(atIndex + 1);
  if (isValidIdentifierPrefix(afterAt)) {
    return afterAt;
  }

  return '';
}

/**
 * Extracts the function prefix from text before cursor.
 *
 * @param textBefore - The text content before the cursor position
 * @returns The function prefix or empty string if not in function context
 *
 * @example
 * ```typescript
 * extractFunctionPrefix('AV'); // 'AV'
 * extractFunctionPrefix('SUM(@'); // ''
 * extractFunctionPrefix(''); // ''
 * ```
 */
export function extractFunctionPrefix(textBefore: string): string {
  if (!shouldTriggerFunctionCompletion(textBefore)) {
    return '';
  }

  // Find the start of the current identifier
  let identStart = textBefore.length;
  while (identStart > 0) {
    const char = textBefore.charAt(identStart - 1);
    if (!isIdentifierChar(char)) {
      break;
    }
    identStart--;
  }

  return textBefore.substring(identStart);
}

/**
 * Gets the position in the source text where the completion should start.
 *
 * For variables, this is the position of the '@' symbol.
 * For functions, this is the start of the function name.
 *
 * @param textBefore - The text content before the cursor position
 * @param completionType - Whether this is a variable or function completion
 * @returns The starting position for the completion, relative to start of textBefore
 *
 * @example
 * ```typescript
 * getCompletionStartPosition('SUM(@sco', 'variable'); // 4 (position of @)
 * getCompletionStartPosition('AV', 'function'); // 0 (start of AV)
 * ```
 */
export function getCompletionStartPosition(
  textBefore: string,
  completionType: 'variable' | 'function',
): number {
  if (completionType === 'variable') {
    const atIndex = textBefore.lastIndexOf('@');
    return atIndex >= 0 ? atIndex : textBefore.length;
  }

  // For functions, find the start of the identifier
  let identStart = textBefore.length;
  while (identStart > 0) {
    const char = textBefore.charAt(identStart - 1);
    if (!isIdentifierChar(char)) {
      break;
    }
    identStart--;
  }

  return identStart;
}
