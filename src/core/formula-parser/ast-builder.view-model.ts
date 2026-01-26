/**
 * Pure AST construction logic for building AST nodes from parsed data.
 *
 * This module contains pure functions for creating AST nodes without
 * any Chevrotain dependencies. It can be tested independently of the
 * parser infrastructure.
 *
 * @module
 */

import type {
  ASTNode,
  BinaryOpNode,
  BinaryOperator,
  FunctionCallNode,
  LiteralNode,
  SourceLocation,
  UnaryOpNode,
  UnaryOperator,
  VariableRefNode,
} from '../types/ast.ts';

/**
 * Creates a number literal AST node.
 *
 * @param value - The numeric value
 * @param location - Optional source location
 * @returns A LiteralNode representing the number
 *
 * @example
 * ```typescript
 * const node = createNumberLiteral(42);
 * // { type: 'Literal', valueType: 'number.float', value: 42 }
 * ```
 */
export function createNumberLiteral(
  value: number,
  location?: SourceLocation | undefined,
): LiteralNode {
  return {
    type: 'Literal',
    valueType: 'number.float',
    value,
    location,
  };
}

/**
 * Creates a string literal AST node.
 *
 * @param value - The string value (already unescaped)
 * @param location - Optional source location
 * @returns A LiteralNode representing the string
 *
 * @example
 * ```typescript
 * const node = createStringLiteral('hello');
 * // { type: 'Literal', valueType: 'string.text', value: 'hello' }
 * ```
 */
export function createStringLiteral(
  value: string,
  location?: SourceLocation | undefined,
): LiteralNode {
  return {
    type: 'Literal',
    valueType: 'string.text',
    value,
    location,
  };
}

/**
 * Creates a boolean literal AST node.
 *
 * @param value - The boolean value
 * @param location - Optional source location
 * @returns A LiteralNode representing the boolean
 *
 * @example
 * ```typescript
 * const node = createBooleanLiteral(true);
 * // { type: 'Literal', valueType: 'boolean.boolean', value: true }
 * ```
 */
export function createBooleanLiteral(
  value: boolean,
  location?: SourceLocation | undefined,
): LiteralNode {
  return {
    type: 'Literal',
    valueType: 'boolean.boolean',
    value,
    location,
  };
}

/**
 * Creates a variable reference AST node.
 *
 * @param name - The variable name (without the @ prefix)
 * @param location - Optional source location
 * @returns A VariableRefNode representing the variable reference
 *
 * @example
 * ```typescript
 * const node = createVariableRef('score');
 * // { type: 'VariableRef', name: 'score' }
 * ```
 */
export function createVariableRef(
  name: string,
  location?: SourceLocation | undefined,
): VariableRefNode {
  return {
    type: 'VariableRef',
    name,
    location,
  };
}

/**
 * Creates a binary operation AST node.
 *
 * @param operator - The binary operator
 * @param left - The left operand
 * @param right - The right operand
 * @param location - Optional source location
 * @returns A BinaryOpNode representing the operation
 *
 * @example
 * ```typescript
 * const left = createVariableRef('x');
 * const right = createNumberLiteral(1);
 * const node = createBinaryOp('+', left, right);
 * // { type: 'BinaryOp', operator: '+', left: {...}, right: {...} }
 * ```
 */
export function createBinaryOp(
  operator: BinaryOperator,
  left: ASTNode,
  right: ASTNode,
  location?: SourceLocation | undefined,
): BinaryOpNode {
  return {
    type: 'BinaryOp',
    operator,
    left,
    right,
    location,
  };
}

/**
 * Creates a unary operation AST node.
 *
 * @param operator - The unary operator
 * @param operand - The operand expression
 * @param location - Optional source location
 * @returns A UnaryOpNode representing the operation
 *
 * @example
 * ```typescript
 * const operand = createVariableRef('x');
 * const node = createUnaryOp('-', operand);
 * // { type: 'UnaryOp', operator: '-', operand: {...} }
 * ```
 */
export function createUnaryOp(
  operator: UnaryOperator,
  operand: ASTNode,
  location?: SourceLocation | undefined,
): UnaryOpNode {
  return {
    type: 'UnaryOp',
    operator,
    operand,
    location,
  };
}

/**
 * Creates a function call AST node.
 *
 * @param name - The function name
 * @param args - The function arguments
 * @param location - Optional source location
 * @returns A FunctionCallNode representing the function call
 *
 * @example
 * ```typescript
 * const arg = createVariableRef('score');
 * const node = createFunctionCall('AVG', [arg]);
 * // { type: 'FunctionCall', name: 'AVG', args: [{...}] }
 * ```
 */
export function createFunctionCall(
  name: string,
  args: readonly ASTNode[],
  location?: SourceLocation | undefined,
): FunctionCallNode {
  return {
    type: 'FunctionCall',
    name,
    args,
    location,
  };
}

/**
 * Builds a left-associative binary operation chain from an array of operands and operators.
 *
 * Used for operators like +, -, *, /, %, &, and comparison operators.
 *
 * @param operands - Array of operand AST nodes (at least one)
 * @param operators - Array of operators between operands (length should be operands.length - 1)
 * @returns A single AST node representing the chained operations
 *
 * @example
 * ```typescript
 * // For "a + b - c":
 * const result = buildLeftAssociativeChain([a, b, c], ['+', '-']);
 * // Returns: BinaryOp('-', BinaryOp('+', a, b), c)
 * ```
 */
export function buildLeftAssociativeChain(
  operands: readonly ASTNode[],
  operators: readonly BinaryOperator[],
): ASTNode {
  if (operands.length === 0) {
    throw new Error('Cannot build chain from empty operands array');
  }

  const firstOperand = operands[0];
  if (firstOperand === undefined) {
    throw new Error('First operand is undefined');
  }

  let result: ASTNode = firstOperand;

  for (let i = 0; i < operators.length; i++) {
    const operator = operators[i];
    const rightOperand = operands[i + 1];

    if (operator === undefined || rightOperand === undefined) {
      break;
    }

    // Calculate combined location if both nodes have locations
    let location: SourceLocation | undefined;
    if (result.location && rightOperand.location) {
      location = {
        start: result.location.start,
        end: rightOperand.location.end,
      };
    }

    result = createBinaryOp(operator, result, rightOperand, location);
  }

  return result;
}

/**
 * Builds a right-associative binary operation chain from an array of operands and operators.
 *
 * Used for the exponentiation operator (^) which is right-associative:
 * 2^3^4 should be parsed as 2^(3^4), not (2^3)^4.
 *
 * @param operands - Array of operand AST nodes (at least one)
 * @param operators - Array of operators between operands (length should be operands.length - 1)
 * @returns A single AST node representing the chained operations
 *
 * @example
 * ```typescript
 * // For "a ^ b ^ c":
 * const result = buildRightAssociativeChain([a, b, c], ['^', '^']);
 * // Returns: BinaryOp('^', a, BinaryOp('^', b, c))
 * ```
 */
export function buildRightAssociativeChain(
  operands: readonly ASTNode[],
  operators: readonly BinaryOperator[],
): ASTNode {
  if (operands.length === 0) {
    throw new Error('Cannot build chain from empty operands array');
  }

  if (operands.length === 1) {
    const firstOperand = operands[0];
    if (firstOperand === undefined) {
      throw new Error('First operand is undefined');
    }
    return firstOperand;
  }

  // Start from the rightmost operand and work backwards
  const lastOperand = operands[operands.length - 1];
  if (lastOperand === undefined) {
    throw new Error('Last operand is undefined');
  }

  let result: ASTNode = lastOperand;

  for (let i = operators.length - 1; i >= 0; i--) {
    const operator = operators[i];
    const leftOperand = operands[i];

    if (operator === undefined || leftOperand === undefined) {
      continue;
    }

    // Calculate combined location if both nodes have locations
    let location: SourceLocation | undefined;
    if (leftOperand.location && result.location) {
      location = {
        start: leftOperand.location.start,
        end: result.location.end,
      };
    }

    result = createBinaryOp(operator, leftOperand, result, location);
  }

  return result;
}

/**
 * Creates a source location from start and end offsets.
 *
 * @param start - Starting character offset (inclusive)
 * @param end - Ending character offset (exclusive)
 * @returns A SourceLocation object
 */
export function createLocation(start: number, end: number): SourceLocation {
  return { start, end };
}
