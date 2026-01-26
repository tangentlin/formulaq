/**
 * Pure logic for type checking in formulas.
 *
 * This module contains the pure functions for inferring types from AST nodes
 * and checking type compatibility for operators. It has no dependencies on
 * classes or error creation, returning plain data structures.
 *
 * @module
 */

import type { ASTNode, BinaryOperator, UnaryOperator, SourceLocation } from '../types/ast.ts';
import type { ValueType } from '../types/values.ts';

/**
 * Input for type inference.
 */
export interface InferTypeInput {
  /**
   * The AST node to infer the type of.
   */
  readonly ast: ASTNode;

  /**
   * Function to get a variable's type.
   */
  readonly getVariableType: (name: string) => ValueType | undefined;
}

/**
 * Result of type inference.
 */
export interface InferTypeResult {
  /**
   * The inferred type of the expression.
   * Undefined if the type cannot be determined (e.g., unknown variable).
   */
  readonly type: ValueType | undefined;

  /**
   * Type errors found during inference.
   */
  readonly errors: readonly TypeErrorInfo[];
}

/**
 * Information about a type error for error creation.
 */
export interface TypeErrorInfo {
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
}

/**
 * Categories of types for compatibility checking.
 */
export type TypeCategory = 'numeric' | 'string' | 'boolean' | 'unknown';

/**
 * Gets the category of a value type.
 *
 * @param valueType - The value type to categorize
 * @returns The type category
 *
 * @example
 * ```typescript
 * getTypeCategory('number.float'); // 'numeric'
 * getTypeCategory('string.text'); // 'string'
 * getTypeCategory('boolean.boolean'); // 'boolean'
 * ```
 */
export function getTypeCategory(valueType: ValueType | undefined): TypeCategory {
  if (valueType === undefined) {
    return 'unknown';
  }

  if (valueType === 'number.integer' || valueType === 'number.float') {
    return 'numeric';
  }

  if (valueType === 'string.text') {
    return 'string';
  }

  if (valueType === 'boolean.boolean') {
    return 'boolean';
  }

  // Exhaustive check - should never reach here
  return 'unknown';
}

/**
 * Checks if a type is numeric.
 *
 * @param valueType - The value type to check
 * @returns true if the type is numeric
 */
export function isNumericType(valueType: ValueType | undefined): boolean {
  return getTypeCategory(valueType) === 'numeric';
}

/**
 * Checks if a type is a string type.
 *
 * @param valueType - The value type to check
 * @returns true if the type is string
 */
export function isStringType(valueType: ValueType | undefined): boolean {
  return getTypeCategory(valueType) === 'string';
}

/**
 * Checks if a type is a boolean type.
 *
 * @param valueType - The value type to check
 * @returns true if the type is boolean
 */
export function isBooleanType(valueType: ValueType | undefined): boolean {
  return getTypeCategory(valueType) === 'boolean';
}

/**
 * Checks if an operator is an arithmetic operator.
 *
 * @param operator - The operator to check
 * @returns true if the operator is arithmetic
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
 * Checks if an operator is a comparison operator.
 *
 * @param operator - The operator to check
 * @returns true if the operator is a comparison operator
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
 * Checks if an operator is the string concatenation operator.
 *
 * @param operator - The operator to check
 * @returns true if the operator is string concatenation
 */
export function isStringConcatOperator(operator: BinaryOperator): boolean {
  return operator === '&';
}

/**
 * Creates an error message for arithmetic operator type mismatch.
 *
 * @param operator - The operator
 * @param actualType - The actual type of the operand
 * @returns Error message
 */
export function createArithmeticTypeError(
  operator: BinaryOperator | UnaryOperator,
  actualType: ValueType | undefined,
): string {
  const typeStr = actualType ?? 'unknown';
  return `Operator '${operator}' requires numeric operands, but got ${typeStr}`;
}

/**
 * Creates an error message for comparison operator type mismatch.
 *
 * @param leftType - The type of the left operand
 * @param rightType - The type of the right operand
 * @returns Error message
 */
export function createComparisonTypeError(
  leftType: ValueType | undefined,
  rightType: ValueType | undefined,
): string {
  const leftStr = leftType ?? 'unknown';
  const rightStr = rightType ?? 'unknown';
  return `Comparison operators require matching types: ${leftStr} vs ${rightStr}`;
}

/**
 * Creates an error message for string concatenation type mismatch.
 *
 * @param actualType - The actual type of the operand
 * @returns Error message
 */
export function createStringConcatTypeError(actualType: ValueType | undefined): string {
  const typeStr = actualType ?? 'unknown';
  return `Operator '&' requires string operands, but got ${typeStr}`;
}

/**
 * Gets the result type for a binary operator.
 *
 * @param operator - The binary operator
 * @returns The result type of the operation
 */
export function getBinaryOperatorResultType(operator: BinaryOperator): ValueType {
  if (isArithmeticOperator(operator)) {
    // All arithmetic operators return number.float per design decision
    return 'number.float';
  }

  if (isComparisonOperator(operator)) {
    // All comparison operators return boolean
    return 'boolean.boolean';
  }

  if (isStringConcatOperator(operator)) {
    // String concatenation returns string
    return 'string.text';
  }

  // Should not reach here if all operators are handled
  return 'number.float';
}

/**
 * Gets the result type for a unary operator.
 *
 * @param _operator - The unary operator
 * @returns The result type of the operation
 */
export function getUnaryOperatorResultType(_operator: UnaryOperator): ValueType {
  // Both unary operators (+ and -) return number.float
  return 'number.float';
}

/**
 * Checks type compatibility for a binary operation.
 *
 * Returns an error info if types are incompatible, undefined otherwise.
 *
 * @param operator - The binary operator
 * @param leftType - The type of the left operand
 * @param rightType - The type of the right operand
 * @param location - Source location for error reporting
 * @returns Error info if incompatible, undefined if compatible
 */
export function checkBinaryOperatorTypes(
  operator: BinaryOperator,
  leftType: ValueType | undefined,
  rightType: ValueType | undefined,
  location: SourceLocation | undefined,
): TypeErrorInfo | undefined {
  const start = location?.start ?? 0;
  const end = location?.end ?? 0;

  // If either type is unknown, we can't verify compatibility
  // The error should come from variable resolution, not type checking
  const leftCategory = getTypeCategory(leftType);
  const rightCategory = getTypeCategory(rightType);

  if (leftCategory === 'unknown' || rightCategory === 'unknown') {
    return undefined;
  }

  if (isArithmeticOperator(operator)) {
    // Both operands must be numeric
    if (!isNumericType(leftType)) {
      return {
        message: createArithmeticTypeError(operator, leftType),
        start,
        end,
      };
    }
    if (!isNumericType(rightType)) {
      return {
        message: createArithmeticTypeError(operator, rightType),
        start,
        end,
      };
    }
    return undefined;
  }

  if (isComparisonOperator(operator)) {
    // Both operands must be of the same category
    if (leftCategory !== rightCategory) {
      return {
        message: createComparisonTypeError(leftType, rightType),
        start,
        end,
      };
    }
    return undefined;
  }

  if (isStringConcatOperator(operator)) {
    // Both operands must be strings
    if (!isStringType(leftType)) {
      return {
        message: createStringConcatTypeError(leftType),
        start,
        end,
      };
    }
    if (!isStringType(rightType)) {
      return {
        message: createStringConcatTypeError(rightType),
        start,
        end,
      };
    }
    return undefined;
  }

  return undefined;
}

/**
 * Checks type compatibility for a unary operation.
 *
 * Returns an error info if types are incompatible, undefined otherwise.
 *
 * @param operator - The unary operator
 * @param operandType - The type of the operand
 * @param location - Source location for error reporting
 * @returns Error info if incompatible, undefined if compatible
 */
export function checkUnaryOperatorTypes(
  operator: UnaryOperator,
  operandType: ValueType | undefined,
  location: SourceLocation | undefined,
): TypeErrorInfo | undefined {
  const start = location?.start ?? 0;
  const end = location?.end ?? 0;

  // If the type is unknown, we can't verify compatibility
  // The error should come from variable resolution, not type checking
  const category = getTypeCategory(operandType);
  if (category === 'unknown') {
    return undefined;
  }

  // Both unary operators (+ and -) require numeric operands
  if (!isNumericType(operandType)) {
    return {
      message: createArithmeticTypeError(operator, operandType),
      start,
      end,
    };
  }

  return undefined;
}

/**
 * Infers the type of an AST node.
 *
 * This is the main entry point for type inference. It recursively traverses
 * the AST, infers types, and collects type errors.
 *
 * @param input - The inference input containing AST and type lookup
 * @returns The inferred type and any type errors
 *
 * @example
 * ```typescript
 * const result = inferType({
 *   ast: parsedAst,
 *   getVariableType: (name) => provider.getVariableType(name),
 * });
 *
 * if (result.errors.length === 0) {
 *   console.log('Type:', result.type);
 * } else {
 *   console.log('Type errors:', result.errors);
 * }
 * ```
 */
export function inferType(input: InferTypeInput): InferTypeResult {
  const errors: TypeErrorInfo[] = [];
  const type = inferTypeRecursive(input.ast, input.getVariableType, errors);

  return {
    type,
    errors,
  };
}

/**
 * Recursive helper for type inference.
 *
 * @param node - Current AST node
 * @param getVariableType - Function to get variable types
 * @param errors - Array to accumulate errors into
 * @returns The inferred type of the node
 */
function inferTypeRecursive(
  node: ASTNode,
  getVariableType: (name: string) => ValueType | undefined,
  errors: TypeErrorInfo[],
): ValueType | undefined {
  switch (node.type) {
    case 'Literal':
      return node.valueType;

    case 'VariableRef':
      return getVariableType(node.name);

    case 'BinaryOp':
      return inferBinaryOpType(node, getVariableType, errors);

    case 'UnaryOp':
      return inferUnaryOpType(node, getVariableType, errors);

    case 'FunctionCall':
      // Function return types will be handled in Step 8 (Function Signature Validation)
      // For now, return undefined to indicate unknown type
      // The actual function validator will provide proper return types
      return undefined;

    default:
      // Exhaustive check - TypeScript will error if a case is missing
      return assertNever(node);
  }
}

/**
 * Infers the type of a binary operation node.
 *
 * @param node - The binary operation node
 * @param getVariableType - Function to get variable types
 * @param errors - Array to accumulate errors into
 * @returns The inferred result type
 */
function inferBinaryOpType(
  node: Extract<ASTNode, { type: 'BinaryOp' }>,
  getVariableType: (name: string) => ValueType | undefined,
  errors: TypeErrorInfo[],
): ValueType | undefined {
  const leftType = inferTypeRecursive(node.left, getVariableType, errors);
  const rightType = inferTypeRecursive(node.right, getVariableType, errors);

  // Check for type compatibility
  const error = checkBinaryOperatorTypes(node.operator, leftType, rightType, node.location);

  if (error !== undefined) {
    errors.push(error);
    // Return the expected result type even on error for continued inference
    return getBinaryOperatorResultType(node.operator);
  }

  return getBinaryOperatorResultType(node.operator);
}

/**
 * Infers the type of a unary operation node.
 *
 * @param node - The unary operation node
 * @param getVariableType - Function to get variable types
 * @param errors - Array to accumulate errors into
 * @returns The inferred result type
 */
function inferUnaryOpType(
  node: Extract<ASTNode, { type: 'UnaryOp' }>,
  getVariableType: (name: string) => ValueType | undefined,
  errors: TypeErrorInfo[],
): ValueType | undefined {
  const operandType = inferTypeRecursive(node.operand, getVariableType, errors);

  // Check for type compatibility
  const error = checkUnaryOperatorTypes(node.operator, operandType, node.location);

  if (error !== undefined) {
    errors.push(error);
  }

  return getUnaryOperatorResultType(node.operator);
}

/**
 * Helper for exhaustive type checking.
 *
 * @param x - Value that should never exist
 * @returns Never
 */
function assertNever(x: never): never {
  throw new Error(`Unexpected node type: ${(x as ASTNode).type}`);
}
