/**
 * Pure evaluation logic for row-level formula evaluation.
 *
 * This module contains the core computation functions for evaluating
 * AST nodes. All functions are pure and side-effect free.
 *
 * @module
 */

import type { Value, ValueType, RawValue } from '../types/values.ts';
import type { BinaryOperator, UnaryOperator } from '../types/ast.ts';

/**
 * Null propagation result.
 *
 * Used internally to track whether null was encountered
 * during binary/unary operations.
 */
export interface NullCheckResult {
  /**
   * Whether any operand was null.
   */
  readonly hasNull: boolean;

  /**
   * The null result value to return if hasNull is true.
   */
  readonly nullResult?: Value | undefined;
}

/**
 * Creates a Value with the specified type and raw value.
 *
 * @param valueType - The type of the value
 * @param rawValue - The raw value
 * @returns A Value object
 */
export function createValue(valueType: ValueType, rawValue: RawValue): Value {
  return { type: valueType, value: rawValue };
}

/**
 * Creates a null Value of the specified type.
 *
 * @param valueType - The type of the null value
 * @returns A Value with null content
 */
export function createNullValue(valueType: ValueType): Value {
  return { type: valueType, value: null };
}

/**
 * Checks if a value is null.
 *
 * @param value - The value to check
 * @returns True if the value is null
 */
export function isNullValue(value: Value | null): boolean {
  if (value === null) {
    return true;
  }
  return value.value === null;
}

/**
 * Extracts a numeric value from a Value.
 *
 * @param value - The Value to extract from
 * @returns The numeric value, or null if not a number or is null
 */
export function extractNumber(value: Value | null): number | null {
  if (value === null) {
    return null;
  }
  if (value.value === null) {
    return null;
  }
  if (typeof value.value !== 'number') {
    return null;
  }
  return value.value;
}

/**
 * Extracts a string value from a Value.
 *
 * @param value - The Value to extract from
 * @returns The string value, or null if not a string or is null
 */
export function extractString(value: Value | null): string | null {
  if (value === null) {
    return null;
  }
  if (value.value === null) {
    return null;
  }
  if (typeof value.value !== 'string') {
    return null;
  }
  return value.value;
}

/**
 * Extracts a boolean value from a Value.
 *
 * @param value - The Value to extract from
 * @returns The boolean value, or null if not a boolean or is null
 */
export function extractBoolean(value: Value | null): boolean | null {
  if (value === null) {
    return null;
  }
  if (value.value === null) {
    return null;
  }
  if (typeof value.value !== 'boolean') {
    return null;
  }
  return value.value;
}

/**
 * Determines the result type for arithmetic operations.
 *
 * @param left - Left operand type
 * @param right - Right operand type
 * @returns The result type (always number.float for mixed types)
 */
export function getArithmeticResultType(_left: ValueType, _right: ValueType): ValueType {
  // If both are integers, still return float for consistency
  // (division can produce non-integers)
  return 'number.float';
}

/**
 * Evaluates an addition operation.
 *
 * @param left - Left operand numeric value
 * @param right - Right operand numeric value
 * @returns The sum
 */
export function evaluateAddition(left: number, right: number): number {
  return left + right;
}

/**
 * Evaluates a subtraction operation.
 *
 * @param left - Left operand numeric value
 * @param right - Right operand numeric value
 * @returns The difference
 */
export function evaluateSubtraction(left: number, right: number): number {
  return left - right;
}

/**
 * Evaluates a multiplication operation.
 *
 * @param left - Left operand numeric value
 * @param right - Right operand numeric value
 * @returns The product
 */
export function evaluateMultiplication(left: number, right: number): number {
  return left * right;
}

/**
 * Result of a division operation.
 */
export interface DivisionResult {
  /**
   * The quotient, or null if division by zero.
   */
  readonly value: number | null;

  /**
   * Whether division by zero occurred.
   */
  readonly divisionByZero: boolean;
}

/**
 * Evaluates a division operation.
 *
 * @param left - Left operand numeric value
 * @param right - Right operand numeric value
 * @returns Division result with potential division by zero flag
 */
export function evaluateDivision(left: number, right: number): DivisionResult {
  if (right === 0) {
    return { value: null, divisionByZero: true };
  }
  return { value: left / right, divisionByZero: false };
}

/**
 * Evaluates a modulo operation.
 *
 * @param left - Left operand numeric value
 * @param right - Right operand numeric value
 * @returns Modulo result with potential division by zero flag
 */
export function evaluateModulo(left: number, right: number): DivisionResult {
  if (right === 0) {
    return { value: null, divisionByZero: true };
  }
  return { value: left % right, divisionByZero: false };
}

/**
 * Evaluates an exponentiation operation.
 *
 * @param base - Base numeric value
 * @param exponent - Exponent numeric value
 * @returns The result of base^exponent
 */
export function evaluateExponentiation(base: number, exponent: number): number {
  return Math.pow(base, exponent);
}

/**
 * Evaluates string concatenation.
 *
 * @param left - Left operand string value
 * @param right - Right operand string value
 * @returns The concatenated string
 */
export function evaluateConcatenation(left: string, right: string): string {
  return left + right;
}

/**
 * Evaluates an equality comparison.
 *
 * @param left - Left operand raw value
 * @param right - Right operand raw value
 * @returns True if values are equal
 */
export function evaluateEquality(left: RawValue, right: RawValue): boolean {
  return left === right;
}

/**
 * Evaluates an inequality comparison.
 *
 * @param left - Left operand raw value
 * @param right - Right operand raw value
 * @returns True if values are not equal
 */
export function evaluateInequality(left: RawValue, right: RawValue): boolean {
  return left !== right;
}

/**
 * Evaluates a less-than comparison.
 *
 * @param left - Left operand numeric value
 * @param right - Right operand numeric value
 * @returns True if left < right
 */
export function evaluateLessThan(left: number, right: number): boolean {
  return left < right;
}

/**
 * Evaluates a greater-than comparison.
 *
 * @param left - Left operand numeric value
 * @param right - Right operand numeric value
 * @returns True if left > right
 */
export function evaluateGreaterThan(left: number, right: number): boolean {
  return left > right;
}

/**
 * Evaluates a less-than-or-equal comparison.
 *
 * @param left - Left operand numeric value
 * @param right - Right operand numeric value
 * @returns True if left <= right
 */
export function evaluateLessThanOrEqual(left: number, right: number): boolean {
  return left <= right;
}

/**
 * Evaluates a greater-than-or-equal comparison.
 *
 * @param left - Left operand numeric value
 * @param right - Right operand numeric value
 * @returns True if left >= right
 */
export function evaluateGreaterThanOrEqual(left: number, right: number): boolean {
  return left >= right;
}

/**
 * Evaluates unary negation.
 *
 * @param operand - Numeric value to negate
 * @returns The negated value
 */
export function evaluateNegation(operand: number): number {
  return -operand;
}

/**
 * Evaluates unary plus (identity).
 *
 * @param operand - Numeric value
 * @returns The same value
 */
export function evaluateUnaryPlus(operand: number): number {
  return operand;
}

/**
 * Determines if an operator is arithmetic.
 *
 * @param operator - The binary operator
 * @returns True if the operator is arithmetic
 */
export function isArithmeticOperator(operator: BinaryOperator): boolean {
  return (
    operator === '+' ||
    operator === '-' ||
    operator === '*' ||
    operator === '/' ||
    operator === '%' ||
    operator === '^'
  );
}

/**
 * Determines if an operator is a comparison.
 *
 * @param operator - The binary operator
 * @returns True if the operator is a comparison
 */
export function isComparisonOperator(operator: BinaryOperator): boolean {
  return (
    operator === '==' ||
    operator === '!=' ||
    operator === '<>' ||
    operator === '<' ||
    operator === '>' ||
    operator === '<=' ||
    operator === '>='
  );
}

/**
 * Determines if an operator is string concatenation.
 *
 * @param operator - The binary operator
 * @returns True if the operator is string concatenation
 */
export function isConcatenationOperator(operator: BinaryOperator): boolean {
  return operator === '&';
}

/**
 * Result type for binary operation evaluation.
 */
export interface BinaryOpEvaluationResult {
  /**
   * The computed value, or null if an error occurred.
   */
  readonly value: Value | null;

  /**
   * Whether a division by zero occurred.
   */
  readonly divisionByZero: boolean;
}

/**
 * Evaluates a binary arithmetic operation.
 *
 * Assumes both operands are valid numbers (null check done beforehand).
 *
 * @param operator - The arithmetic operator
 * @param leftNum - Left operand number
 * @param rightNum - Right operand number
 * @returns The evaluation result
 */
export function evaluateArithmeticOp(
  operator: BinaryOperator,
  leftNum: number,
  rightNum: number,
): BinaryOpEvaluationResult {
  let result: number;
  let divisionByZero = false;

  switch (operator) {
    case '+':
      result = evaluateAddition(leftNum, rightNum);
      break;
    case '-':
      result = evaluateSubtraction(leftNum, rightNum);
      break;
    case '*':
      result = evaluateMultiplication(leftNum, rightNum);
      break;
    case '/': {
      const divResult = evaluateDivision(leftNum, rightNum);
      if (divResult.divisionByZero) {
        return { value: null, divisionByZero: true };
      }
      result = divResult.value!;
      break;
    }
    case '%': {
      const modResult = evaluateModulo(leftNum, rightNum);
      if (modResult.divisionByZero) {
        return { value: null, divisionByZero: true };
      }
      result = modResult.value!;
      break;
    }
    case '^':
      result = evaluateExponentiation(leftNum, rightNum);
      break;
    default:
      // Should not happen for arithmetic operators
      return { value: null, divisionByZero: false };
  }

  return {
    value: createValue('number.float', result),
    divisionByZero,
  };
}

/**
 * Evaluates a comparison operation.
 *
 * @param operator - The comparison operator
 * @param leftVal - Left operand Value
 * @param rightVal - Right operand Value
 * @returns The boolean result
 */
export function evaluateComparisonOp(
  operator: BinaryOperator,
  leftVal: Value,
  rightVal: Value,
): Value {
  const left = leftVal.value;
  const right = rightVal.value;

  let result: boolean;

  switch (operator) {
    case '==':
      result = evaluateEquality(left, right);
      break;
    case '!=':
    case '<>':
      result = evaluateInequality(left, right);
      break;
    case '<': {
      const leftNum = extractNumber(leftVal);
      const rightNum = extractNumber(rightVal);
      if (leftNum === null || rightNum === null) {
        return createNullValue('boolean.boolean');
      }
      result = evaluateLessThan(leftNum, rightNum);
      break;
    }
    case '>': {
      const leftNum = extractNumber(leftVal);
      const rightNum = extractNumber(rightVal);
      if (leftNum === null || rightNum === null) {
        return createNullValue('boolean.boolean');
      }
      result = evaluateGreaterThan(leftNum, rightNum);
      break;
    }
    case '<=': {
      const leftNum = extractNumber(leftVal);
      const rightNum = extractNumber(rightVal);
      if (leftNum === null || rightNum === null) {
        return createNullValue('boolean.boolean');
      }
      result = evaluateLessThanOrEqual(leftNum, rightNum);
      break;
    }
    case '>=': {
      const leftNum = extractNumber(leftVal);
      const rightNum = extractNumber(rightVal);
      if (leftNum === null || rightNum === null) {
        return createNullValue('boolean.boolean');
      }
      result = evaluateGreaterThanOrEqual(leftNum, rightNum);
      break;
    }
    default:
      return createNullValue('boolean.boolean');
  }

  return createValue('boolean.boolean', result);
}

/**
 * Evaluates a unary operation.
 *
 * @param operator - The unary operator
 * @param operandNum - The operand number
 * @returns The result number
 */
export function evaluateUnaryOp(operator: UnaryOperator, operandNum: number): number {
  switch (operator) {
    case '-':
      return evaluateNegation(operandNum);
    case '+':
      return evaluateUnaryPlus(operandNum);
  }
}

/**
 * Coerces a value to string for concatenation.
 *
 * @param value - The value to coerce
 * @returns The string representation, or null if the value is null
 */
export function coerceToString(value: Value | null): string | null {
  if (value === null || value.value === null) {
    return null;
  }

  if (typeof value.value === 'string') {
    return value.value;
  }

  // Convert numbers and booleans to strings
  return String(value.value);
}

/**
 * Infers the result type of a binary operation.
 *
 * @param operator - The binary operator
 * @param leftType - The left operand type
 * @param rightType - The right operand type
 * @returns The inferred result type
 */
export function inferBinaryResultType(
  operator: BinaryOperator,
  leftType: ValueType,
  _rightType: ValueType,
): ValueType {
  if (isArithmeticOperator(operator)) {
    return 'number.float';
  }

  if (isComparisonOperator(operator)) {
    return 'boolean.boolean';
  }

  if (isConcatenationOperator(operator)) {
    return 'string.text';
  }

  // Default fallback
  return leftType;
}

/**
 * Infers the result type of a unary operation.
 *
 * @param operator - The unary operator
 * @param operandType - The operand type
 * @returns The inferred result type (always numeric)
 */
export function inferUnaryResultType(_operator: UnaryOperator, _operandType: ValueType): ValueType {
  // Unary operators always produce floats
  return 'number.float';
}
