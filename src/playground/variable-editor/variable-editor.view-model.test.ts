/**
 * Unit tests for VariableEditor viewModel functions.
 *
 * Tests for:
 * - Identifier validation
 * - Variable name validation
 * - Values parsing (JSON and comma-separated)
 * - Value formatting for input
 * - Type conversion utilities
 *
 * @module
 */

import { describe, it, expect } from 'vitest';
import {
  isValidIdentifier,
  validateVariableName,
  parseValues,
  formatValuesForInput,
  simpleTypeToValueType,
  valueTypeToSimpleType,
  getValuesPlaceholder,
} from './variable-editor.view-model.ts';

describe('isValidIdentifier', function () {
  describe('valid identifiers', function () {
    it('accepts simple lowercase names', function () {
      expect(isValidIdentifier('score')).toBe(true);
      expect(isValidIdentifier('name')).toBe(true);
      expect(isValidIdentifier('x')).toBe(true);
    });

    it('accepts names with uppercase letters', function () {
      expect(isValidIdentifier('Score')).toBe(true);
      expect(isValidIdentifier('myVariable')).toBe(true);
      expect(isValidIdentifier('CONSTANT')).toBe(true);
    });

    it('accepts names with digits (not at start)', function () {
      expect(isValidIdentifier('var1')).toBe(true);
      expect(isValidIdentifier('score123')).toBe(true);
      expect(isValidIdentifier('test2data')).toBe(true);
    });

    it('accepts names with underscores', function () {
      expect(isValidIdentifier('my_var')).toBe(true);
      expect(isValidIdentifier('_hidden')).toBe(false); // underscore at start is invalid
      expect(isValidIdentifier('snake_case_name')).toBe(true);
      expect(isValidIdentifier('a_1_b_2')).toBe(true);
    });
  });

  describe('invalid identifiers', function () {
    it('rejects empty strings', function () {
      expect(isValidIdentifier('')).toBe(false);
    });

    it('rejects names starting with digits', function () {
      expect(isValidIdentifier('1var')).toBe(false);
      expect(isValidIdentifier('123')).toBe(false);
      expect(isValidIdentifier('0score')).toBe(false);
    });

    it('rejects names with spaces', function () {
      expect(isValidIdentifier('my var')).toBe(false);
      expect(isValidIdentifier(' score')).toBe(false);
      expect(isValidIdentifier('score ')).toBe(false);
    });

    it('rejects names with special characters', function () {
      expect(isValidIdentifier('my-var')).toBe(false);
      expect(isValidIdentifier('score!')).toBe(false);
      expect(isValidIdentifier('var@name')).toBe(false);
      expect(isValidIdentifier('test.value')).toBe(false);
    });

    it('rejects names starting with underscore', function () {
      expect(isValidIdentifier('_private')).toBe(false);
    });
  });
});

describe('validateVariableName', function () {
  describe('empty name validation', function () {
    it('returns error for empty string', function () {
      expect(validateVariableName('', [])).toBe('Name is required');
    });

    it('returns error for whitespace-only string', function () {
      expect(validateVariableName('   ', [])).toBe('Name is required');
    });
  });

  describe('space validation', function () {
    it('returns error for names with spaces', function () {
      expect(validateVariableName('my var', [])).toBe('Name cannot contain spaces');
      expect(validateVariableName('hello world', [])).toBe('Name cannot contain spaces');
    });
  });

  describe('first character validation', function () {
    it('returns error for names starting with digit', function () {
      expect(validateVariableName('1var', [])).toBe('Name must start with a letter');
      expect(validateVariableName('123', [])).toBe('Name must start with a letter');
    });

    it('returns error for names starting with underscore', function () {
      expect(validateVariableName('_var', [])).toBe('Name must start with a letter');
    });

    it('returns error for names starting with special character', function () {
      expect(validateVariableName('@var', [])).toBe('Name must start with a letter');
      expect(validateVariableName('-var', [])).toBe('Name must start with a letter');
    });
  });

  describe('character validation', function () {
    it('returns error for names with invalid characters', function () {
      expect(validateVariableName('my-var', [])).toBe(
        'Name can only contain letters, digits, and underscores',
      );
      expect(validateVariableName('var!', [])).toBe(
        'Name can only contain letters, digits, and underscores',
      );
    });
  });

  describe('duplicate validation', function () {
    it('returns error for duplicate names', function () {
      const existingNames = ['score', 'name', 'age'];
      expect(validateVariableName('score', existingNames)).toBe(
        'A variable with this name already exists',
      );
    });

    it('is case-sensitive for duplicates', function () {
      const existingNames = ['score', 'name'];
      expect(validateVariableName('Score', existingNames)).toBeNull();
      expect(validateVariableName('SCORE', existingNames)).toBeNull();
    });

    it('allows current name when editing', function () {
      const existingNames = ['score', 'name', 'age'];
      expect(validateVariableName('score', existingNames, 'score')).toBeNull();
    });

    it('still checks other duplicates when editing', function () {
      const existingNames = ['score', 'name', 'age'];
      expect(validateVariableName('name', existingNames, 'score')).toBe(
        'A variable with this name already exists',
      );
    });
  });

  describe('valid names', function () {
    it('returns null for valid simple names', function () {
      expect(validateVariableName('score', [])).toBeNull();
      expect(validateVariableName('name', [])).toBeNull();
      expect(validateVariableName('x', [])).toBeNull();
    });

    it('returns null for valid complex names', function () {
      expect(validateVariableName('myVariable', [])).toBeNull();
      expect(validateVariableName('snake_case', [])).toBeNull();
      expect(validateVariableName('var123', [])).toBeNull();
    });

    it('trims whitespace before validation', function () {
      expect(validateVariableName('  score  ', [])).toBeNull();
    });
  });
});

describe('parseValues', function () {
  describe('empty input', function () {
    it('returns error for empty string', function () {
      const result = parseValues('', 'number.float');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Values are required');
    });

    it('returns error for whitespace-only string', function () {
      const result = parseValues('   ', 'number.float');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Values are required');
    });
  });

  describe('JSON array format', function () {
    describe('number type', function () {
      it('parses valid number array', function () {
        const result = parseValues('[1, 2, 3]', 'number.float');
        expect(result.success).toBe(true);
        expect(result.values).toEqual([1, 2, 3]);
      });

      it('parses array with null values', function () {
        const result = parseValues('[1, null, 3]', 'number.float');
        expect(result.success).toBe(true);
        expect(result.values).toEqual([1, null, 3]);
      });

      it('parses array with decimals', function () {
        const result = parseValues('[1.5, 2.7, 3.14]', 'number.float');
        expect(result.success).toBe(true);
        expect(result.values).toEqual([1.5, 2.7, 3.14]);
      });

      it('parses array with negative numbers', function () {
        const result = parseValues('[-1, -2.5, 3]', 'number.float');
        expect(result.success).toBe(true);
        expect(result.values).toEqual([-1, -2.5, 3]);
      });

      it('rejects array with string values', function () {
        const result = parseValues('["a", "b"]', 'number.float');
        expect(result.success).toBe(false);
        expect(result.error).toContain('not a valid number');
      });

      it('rejects array with boolean values', function () {
        const result = parseValues('[true, false]', 'number.float');
        expect(result.success).toBe(false);
        expect(result.error).toContain('not a valid number');
      });
    });

    describe('string type', function () {
      it('parses valid string array', function () {
        const result = parseValues('["hello", "world"]', 'string.text');
        expect(result.success).toBe(true);
        expect(result.values).toEqual(['hello', 'world']);
      });

      it('parses array with null values', function () {
        const result = parseValues('["a", null, "b"]', 'string.text');
        expect(result.success).toBe(true);
        expect(result.values).toEqual(['a', null, 'b']);
      });

      it('parses array with empty strings', function () {
        const result = parseValues('["", "test"]', 'string.text');
        expect(result.success).toBe(true);
        expect(result.values).toEqual(['', 'test']);
      });

      it('rejects array with number values', function () {
        const result = parseValues('[1, 2, 3]', 'string.text');
        expect(result.success).toBe(false);
        expect(result.error).toContain('not a valid string');
      });
    });

    describe('boolean type', function () {
      it('parses valid boolean array', function () {
        const result = parseValues('[true, false, true]', 'boolean.boolean');
        expect(result.success).toBe(true);
        expect(result.values).toEqual([true, false, true]);
      });

      it('parses array with null values', function () {
        const result = parseValues('[true, null, false]', 'boolean.boolean');
        expect(result.success).toBe(true);
        expect(result.values).toEqual([true, null, false]);
      });

      it('rejects array with string values', function () {
        const result = parseValues('["true", "false"]', 'boolean.boolean');
        expect(result.success).toBe(false);
        expect(result.error).toContain('not a valid boolean');
      });
    });

    describe('error cases', function () {
      it('returns error for invalid JSON', function () {
        const result = parseValues('[1, 2, 3', 'number.float');
        expect(result.success).toBe(false);
        expect(result.error).toBe('Invalid JSON array format');
      });

      it('returns error for empty array', function () {
        const result = parseValues('[]', 'number.float');
        expect(result.success).toBe(false);
        expect(result.error).toBe('At least one value is required');
      });

      it('returns error for non-array JSON', function () {
        const result = parseValues('[{"a": 1}]', 'number.float');
        expect(result.success).toBe(false);
        expect(result.error).toContain('not a valid number');
      });
    });
  });

  describe('comma-separated format', function () {
    describe('number type', function () {
      it('parses comma-separated numbers', function () {
        const result = parseValues('1, 2, 3', 'number.float');
        expect(result.success).toBe(true);
        expect(result.values).toEqual([1, 2, 3]);
      });

      it('parses without spaces', function () {
        const result = parseValues('1,2,3', 'number.float');
        expect(result.success).toBe(true);
        expect(result.values).toEqual([1, 2, 3]);
      });

      it('parses with null keyword', function () {
        const result = parseValues('1, null, 3', 'number.float');
        expect(result.success).toBe(true);
        expect(result.values).toEqual([1, null, 3]);
      });

      it('parses NULL (case-insensitive)', function () {
        const result = parseValues('1, NULL, 3', 'number.float');
        expect(result.success).toBe(true);
        expect(result.values).toEqual([1, null, 3]);
      });

      it('parses decimals', function () {
        const result = parseValues('1.5, 2.7, 3.14', 'number.float');
        expect(result.success).toBe(true);
        expect(result.values).toEqual([1.5, 2.7, 3.14]);
      });

      it('rejects invalid number strings', function () {
        const result = parseValues('1, abc, 3', 'number.float');
        expect(result.success).toBe(false);
        expect(result.error).toContain('abc');
        expect(result.error).toContain('not a valid number');
      });

      it('handles trailing comma', function () {
        const result = parseValues('1, 2, 3,', 'number.float');
        expect(result.success).toBe(true);
        expect(result.values).toEqual([1, 2, 3]);
      });
    });

    describe('string type', function () {
      it('parses quoted strings', function () {
        const result = parseValues('"hello", "world"', 'string.text');
        expect(result.success).toBe(true);
        expect(result.values).toEqual(['hello', 'world']);
      });

      it('parses unquoted strings', function () {
        const result = parseValues('hello, world', 'string.text');
        expect(result.success).toBe(true);
        expect(result.values).toEqual(['hello', 'world']);
      });

      it('parses single-quoted strings', function () {
        const result = parseValues("'hello', 'world'", 'string.text');
        expect(result.success).toBe(true);
        expect(result.values).toEqual(['hello', 'world']);
      });

      it('parses with null keyword', function () {
        const result = parseValues('hello, null, world', 'string.text');
        expect(result.success).toBe(true);
        expect(result.values).toEqual(['hello', null, 'world']);
      });
    });

    describe('boolean type', function () {
      it('parses true and false', function () {
        const result = parseValues('true, false, true', 'boolean.boolean');
        expect(result.success).toBe(true);
        expect(result.values).toEqual([true, false, true]);
      });

      it('parses case-insensitive', function () {
        const result = parseValues('TRUE, FALSE, True', 'boolean.boolean');
        expect(result.success).toBe(true);
        expect(result.values).toEqual([true, false, true]);
      });

      it('parses with null', function () {
        const result = parseValues('true, null, false', 'boolean.boolean');
        expect(result.success).toBe(true);
        expect(result.values).toEqual([true, null, false]);
      });

      it('rejects invalid boolean strings', function () {
        const result = parseValues('true, yes, false', 'boolean.boolean');
        expect(result.success).toBe(false);
        expect(result.error).toContain('yes');
        expect(result.error).toContain('not a valid boolean');
      });
    });

    describe('error cases', function () {
      it('returns error for single empty value', function () {
        const result = parseValues(',', 'number.float');
        expect(result.success).toBe(false);
        expect(result.error).toBe('At least one value is required');
      });
    });
  });

  describe('integer type', function () {
    it('works the same as float for parsing', function () {
      const result = parseValues('[1, 2, 3]', 'number.integer');
      expect(result.success).toBe(true);
      expect(result.values).toEqual([1, 2, 3]);
    });
  });
});

describe('formatValuesForInput', function () {
  it('formats empty array as empty string', function () {
    expect(formatValuesForInput([])).toBe('');
  });

  it('formats number array', function () {
    expect(formatValuesForInput([1, 2, 3])).toBe('1, 2, 3');
  });

  it('formats array with decimals', function () {
    expect(formatValuesForInput([1.5, 2.7, 3.14])).toBe('1.5, 2.7, 3.14');
  });

  it('formats array with null', function () {
    expect(formatValuesForInput([1, null, 3])).toBe('1, null, 3');
  });

  it('formats string array with quotes', function () {
    expect(formatValuesForInput(['hello', 'world'])).toBe('"hello", "world"');
  });

  it('formats boolean array', function () {
    expect(formatValuesForInput([true, false, true])).toBe('true, false, true');
  });

  it('formats mixed null values', function () {
    expect(formatValuesForInput(['a', null, 'b'])).toBe('"a", null, "b"');
  });

  it('formats single value', function () {
    expect(formatValuesForInput([42])).toBe('42');
    expect(formatValuesForInput(['test'])).toBe('"test"');
    expect(formatValuesForInput([true])).toBe('true');
  });
});

describe('simpleTypeToValueType', function () {
  it('converts number to number.float', function () {
    expect(simpleTypeToValueType('number')).toBe('number.float');
  });

  it('converts string to string.text', function () {
    expect(simpleTypeToValueType('string')).toBe('string.text');
  });

  it('converts boolean to boolean.boolean', function () {
    expect(simpleTypeToValueType('boolean')).toBe('boolean.boolean');
  });
});

describe('valueTypeToSimpleType', function () {
  it('converts number.float to number', function () {
    expect(valueTypeToSimpleType('number.float')).toBe('number');
  });

  it('converts number.integer to number', function () {
    expect(valueTypeToSimpleType('number.integer')).toBe('number');
  });

  it('converts string.text to string', function () {
    expect(valueTypeToSimpleType('string.text')).toBe('string');
  });

  it('converts boolean.boolean to boolean', function () {
    expect(valueTypeToSimpleType('boolean.boolean')).toBe('boolean');
  });
});

describe('getValuesPlaceholder', function () {
  it('returns number placeholder for number types', function () {
    const placeholder = getValuesPlaceholder('number.float');
    expect(placeholder).toContain('1, 2, 3');
    expect(placeholder).toContain('[1, 2, null, 4]');
  });

  it('returns string placeholder for string type', function () {
    const placeholder = getValuesPlaceholder('string.text');
    expect(placeholder).toContain('"a", "b", "c"');
  });

  it('returns boolean placeholder for boolean type', function () {
    const placeholder = getValuesPlaceholder('boolean.boolean');
    expect(placeholder).toContain('true, false');
  });
});
