/**
 * Pure view model logic for the VariableEditor component.
 *
 * Contains stateless functions for:
 * - Variable name validation
 * - Values input parsing (JSON array or comma-separated)
 * - Type-specific value validation
 * - Formatting values for input display
 *
 * @module
 */

import type { ValueType } from '../../core/types/values.ts';
import type { ParseResult } from './variable-editor.types.ts';

/**
 * Regular expression for valid identifier characters.
 *
 * Valid identifiers:
 * - Must start with a letter (a-z, A-Z)
 * - Can contain letters, digits (0-9), and underscores (_)
 */
const IDENTIFIER_PATTERN = /^[a-zA-Z][a-zA-Z0-9_]*$/;

/**
 * Checks if a string is a valid identifier.
 *
 * A valid identifier:
 * - Starts with a letter (a-z, A-Z)
 * - Contains only letters, digits, and underscores
 * - Has no spaces
 *
 * @param name - The name to validate
 * @returns True if the name is a valid identifier
 *
 * @example
 * ```typescript
 * isValidIdentifier('score');     // true
 * isValidIdentifier('my_var');    // true
 * isValidIdentifier('var123');    // true
 * isValidIdentifier('123var');    // false (starts with digit)
 * isValidIdentifier('my var');    // false (contains space)
 * isValidIdentifier('my-var');    // false (contains hyphen)
 * isValidIdentifier('');          // false (empty)
 * ```
 */
export function isValidIdentifier(name: string): boolean {
  if (name.length === 0) {
    return false;
  }

  return IDENTIFIER_PATTERN.test(name);
}

/**
 * Validates a variable name and returns an error message if invalid.
 *
 * Checks for:
 * - Non-empty name
 * - Valid identifier characters (letters, digits, underscores)
 * - Name starts with a letter
 * - No duplicates among existing names
 *
 * @param name - The variable name to validate
 * @param existingNames - List of existing variable names
 * @param currentName - The current name (for edit mode, to allow keeping same name)
 * @returns Error message if invalid, or null if valid
 *
 * @example
 * ```typescript
 * validateVariableName('score', ['name', 'age']);      // null (valid)
 * validateVariableName('', []);                         // 'Name is required'
 * validateVariableName('123abc', []);                   // 'Name must start with a letter'
 * validateVariableName('my var', []);                   // 'Name cannot contain spaces'
 * validateVariableName('score', ['score', 'name']);     // 'A variable with this name already exists'
 * validateVariableName('score', ['score'], 'score');    // null (valid, same as current)
 * ```
 */
export function validateVariableName(
  name: string,
  existingNames: readonly string[],
  currentName?: string | undefined,
): string | null {
  const trimmedName = name.trim();

  if (trimmedName.length === 0) {
    return 'Name is required';
  }

  if (trimmedName.includes(' ')) {
    return 'Name cannot contain spaces';
  }

  const firstChar = trimmedName.charAt(0);
  if (!/^[a-zA-Z]$/.test(firstChar)) {
    return 'Name must start with a letter';
  }

  if (!isValidIdentifier(trimmedName)) {
    return 'Name can only contain letters, digits, and underscores';
  }

  // Check for duplicates (case-sensitive)
  const isDuplicate = existingNames.some(function checkDuplicate(existingName) {
    if (existingName === currentName) {
      return false;
    }
    return existingName === trimmedName;
  });

  if (isDuplicate) {
    return 'A variable with this name already exists';
  }

  return null;
}

/**
 * Attempts to parse a string as JSON.
 *
 * @param input - The input string to parse
 * @returns The parsed value or undefined if parsing fails
 */
function tryParseJson(input: string): unknown | undefined {
  try {
    return JSON.parse(input);
  } catch {
    return undefined;
  }
}

/**
 * Validates that a value matches the expected type.
 *
 * @param value - The value to validate
 * @param type - The expected ValueType
 * @returns True if the value matches the type
 */
function isValueOfType(value: unknown, type: ValueType): boolean {
  if (value === null) {
    return true;
  }

  switch (type) {
    case 'number.integer':
    case 'number.float':
      return typeof value === 'number' && !Number.isNaN(value);

    case 'string.text':
      return typeof value === 'string';

    case 'boolean.boolean':
      return typeof value === 'boolean';

    default:
      return false;
  }
}

/**
 * Gets the expected type name for error messages.
 *
 * @param type - The ValueType
 * @returns Human-readable type name
 */
function getTypeName(type: ValueType): string {
  switch (type) {
    case 'number.integer':
    case 'number.float':
      return 'number';
    case 'string.text':
      return 'string';
    case 'boolean.boolean':
      return 'boolean';
    default:
      return 'unknown';
  }
}

/**
 * Parses a single comma-separated value based on type.
 *
 * @param token - The trimmed string token
 * @param type - The expected ValueType
 * @returns The parsed value or undefined if parsing fails
 */
function parseToken(token: string, type: ValueType): number | string | boolean | null | undefined {
  const trimmed = token.trim();

  if (trimmed === '' || trimmed.toLowerCase() === 'null') {
    return null;
  }

  switch (type) {
    case 'number.integer':
    case 'number.float': {
      const num = Number(trimmed);
      if (Number.isNaN(num)) {
        return undefined;
      }
      return num;
    }

    case 'string.text':
      // Handle quoted strings
      if (
        (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
        (trimmed.startsWith("'") && trimmed.endsWith("'"))
      ) {
        return trimmed.slice(1, -1);
      }
      return trimmed;

    case 'boolean.boolean': {
      const lower = trimmed.toLowerCase();
      if (lower === 'true') {
        return true;
      }
      if (lower === 'false') {
        return false;
      }
      return undefined;
    }

    default:
      return undefined;
  }
}

/**
 * Parses comma-separated values.
 *
 * @param input - The input string with comma-separated values
 * @param type - The expected ValueType
 * @returns ParseResult with values array or error
 */
function parseCommaSeparated(
  input: string,
  type: ValueType,
): ParseResult<(number | string | boolean | null)[]> {
  const tokens = input.split(',');
  const values: (number | string | boolean | null)[] = [];
  const typeName = getTypeName(type);

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (token === undefined) {
      continue;
    }

    const trimmed = token.trim();
    if (trimmed === '' && tokens.length === 1) {
      // Empty input
      return {
        success: false,
        error: 'At least one value is required',
      };
    }

    if (trimmed === '') {
      // Skip empty tokens from trailing commas
      continue;
    }

    const parsed = parseToken(trimmed, type);
    if (parsed === undefined) {
      return {
        success: false,
        error: `Value "${trimmed}" is not a valid ${typeName}`,
      };
    }

    values.push(parsed);
  }

  if (values.length === 0) {
    return {
      success: false,
      error: 'At least one value is required',
    };
  }

  return {
    success: true,
    values,
  };
}

/**
 * Parses a JSON array of values.
 *
 * @param jsonArray - The parsed JSON array
 * @param type - The expected ValueType
 * @returns ParseResult with values array or error
 */
function parseJsonArray(
  jsonArray: unknown[],
  type: ValueType,
): ParseResult<(number | string | boolean | null)[]> {
  const values: (number | string | boolean | null)[] = [];
  const typeName = getTypeName(type);

  if (jsonArray.length === 0) {
    return {
      success: false,
      error: 'At least one value is required',
    };
  }

  for (let i = 0; i < jsonArray.length; i++) {
    const item = jsonArray[i];

    if (!isValueOfType(item, type)) {
      const valueStr = JSON.stringify(item);
      return {
        success: false,
        error: `Value ${valueStr} at index ${i} is not a valid ${typeName}`,
      };
    }

    values.push(item as number | string | boolean | null);
  }

  return {
    success: true,
    values,
  };
}

/**
 * Parses a values input string into an array of typed values.
 *
 * Accepts two formats:
 * 1. JSON array: `[1, 2, 3, null, 5]`
 * 2. Comma-separated: `1, 2, 3, null, 5`
 *
 * All values must match the specified type or be null.
 *
 * @param input - The input string to parse
 * @param type - The expected ValueType for all values
 * @returns ParseResult with values array or error message
 *
 * @example
 * ```typescript
 * // JSON array format
 * parseValues('[1, 2, 3]', 'number.float');
 * // { success: true, values: [1, 2, 3] }
 *
 * // Comma-separated format
 * parseValues('1, 2, 3', 'number.float');
 * // { success: true, values: [1, 2, 3] }
 *
 * // With null values
 * parseValues('[1, null, 3]', 'number.float');
 * // { success: true, values: [1, null, 3] }
 *
 * // Type mismatch
 * parseValues('["a", "b"]', 'number.float');
 * // { success: false, error: 'Value "a" at index 0 is not a valid number' }
 * ```
 */
export function parseValues(
  input: string,
  type: ValueType,
): ParseResult<(number | string | boolean | null)[]> {
  const trimmed = input.trim();

  if (trimmed.length === 0) {
    return {
      success: false,
      error: 'Values are required',
    };
  }

  // Try JSON array first
  if (trimmed.startsWith('[')) {
    const parsed = tryParseJson(trimmed);

    if (parsed === undefined) {
      return {
        success: false,
        error: 'Invalid JSON array format',
      };
    }

    if (!Array.isArray(parsed)) {
      return {
        success: false,
        error: 'Input must be a JSON array',
      };
    }

    return parseJsonArray(parsed, type);
  }

  // Fall back to comma-separated
  return parseCommaSeparated(trimmed, type);
}

/**
 * Formats a values array for display in the input field.
 *
 * Produces a comma-separated format for simplicity.
 *
 * @param values - The array of values to format
 * @returns Formatted string representation
 *
 * @example
 * ```typescript
 * formatValuesForInput([1, 2, 3]);
 * // '1, 2, 3'
 *
 * formatValuesForInput([1, null, 3]);
 * // '1, null, 3'
 *
 * formatValuesForInput(['hello', 'world']);
 * // '"hello", "world"'
 *
 * formatValuesForInput([true, false]);
 * // 'true, false'
 * ```
 */
export function formatValuesForInput(
  values: readonly (number | string | boolean | null)[],
): string {
  if (values.length === 0) {
    return '';
  }

  const formatted = values.map(function formatSingleValue(value) {
    if (value === null) {
      return 'null';
    }

    if (typeof value === 'string') {
      return `"${value}"`;
    }

    if (typeof value === 'boolean') {
      return value ? 'true' : 'false';
    }

    return String(value);
  });

  return formatted.join(', ');
}

/**
 * Converts a simple type string to a ValueType.
 *
 * @param simpleType - The simple type string ('number', 'string', 'boolean')
 * @returns The corresponding ValueType
 */
export function simpleTypeToValueType(simpleType: 'number' | 'string' | 'boolean'): ValueType {
  switch (simpleType) {
    case 'number':
      return 'number.float';
    case 'string':
      return 'string.text';
    case 'boolean':
      return 'boolean.boolean';
  }
}

/**
 * Converts a ValueType to a simple type string.
 *
 * @param valueType - The ValueType to convert
 * @returns The simple type string
 */
export function valueTypeToSimpleType(valueType: ValueType): 'number' | 'string' | 'boolean' {
  switch (valueType) {
    case 'number.integer':
    case 'number.float':
      return 'number';
    case 'string.text':
      return 'string';
    case 'boolean.boolean':
      return 'boolean';
  }
}

/**
 * Gets the placeholder text for the values input based on type.
 *
 * @param type - The ValueType
 * @returns Placeholder text with example values
 */
export function getValuesPlaceholder(type: ValueType): string {
  switch (type) {
    case 'number.integer':
    case 'number.float':
      return 'e.g., 1, 2, 3 or [1, 2, null, 4]';
    case 'string.text':
      return 'e.g., "a", "b", "c" or ["a", "b", null]';
    case 'boolean.boolean':
      return 'e.g., true, false or [true, false, null]';
    default:
      return 'Enter values separated by commas';
  }
}
