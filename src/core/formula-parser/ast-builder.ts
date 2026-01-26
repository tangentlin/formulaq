/**
 * CST to AST visitor for transforming Chevrotain parse output to AST nodes.
 *
 * This module implements a Chevrotain CST (Concrete Syntax Tree) visitor
 * that transforms the raw parse output into the typed AST nodes used by
 * the rest of the FormulaQ engine.
 *
 * @module
 */

import type { CstNode, IToken } from 'chevrotain';

import type { ASTNode, BinaryOperator, SourceLocation, UnaryOperator } from '../types/ast.ts';
import { parseNumberLiteral, parseStringLiteral, parseVariableRef } from './tokens.ts';
import {
  buildLeftAssociativeChain,
  buildRightAssociativeChain,
  createBooleanLiteral,
  createFunctionCall,
  createLocation,
  createNumberLiteral,
  createStringLiteral,
  createUnaryOp,
  createVariableRef,
} from './ast-builder.view-model.ts';

/**
 * Helper type for accessing CST node children.
 */
type CstChildren = Record<string, (CstNode | IToken)[]>;

/**
 * Safely gets an array of CstNodes from children.
 */
function getCstNodes(children: CstChildren, key: string): CstNode[] {
  const items = children[key];
  if (!items) {
    return [];
  }
  return items as CstNode[];
}

/**
 * Safely gets an array of tokens from children.
 */
function getTokens(children: CstChildren, key: string): IToken[] {
  const items = children[key];
  if (!items) {
    return [];
  }
  return items as IToken[];
}

/**
 * Maps comparison operator tokens to their AST operator representation.
 */
function getComparisonOperator(token: IToken): BinaryOperator {
  const tokenName = token.tokenType.name;
  switch (tokenName) {
    case 'Equal':
      return '==';
    case 'NotEqual':
      return '!=';
    case 'NotEqualAlt':
      return '<>';
    case 'LessThan':
      return '<';
    case 'GreaterThan':
      return '>';
    case 'LessThanOrEqual':
      return '<=';
    case 'GreaterThanOrEqual':
      return '>=';
    default:
      throw new Error(`Unknown comparison operator: ${tokenName}`);
  }
}

/**
 * Maps additive operator tokens to their AST operator representation.
 */
function getAdditiveOperator(token: IToken): BinaryOperator {
  const tokenName = token.tokenType.name;
  switch (tokenName) {
    case 'Plus':
      return '+';
    case 'Minus':
      return '-';
    default:
      throw new Error(`Unknown additive operator: ${tokenName}`);
  }
}

/**
 * Maps multiplicative operator tokens to their AST operator representation.
 */
function getMultiplicativeOperator(token: IToken): BinaryOperator {
  const tokenName = token.tokenType.name;
  switch (tokenName) {
    case 'Multiply':
      return '*';
    case 'Divide':
      return '/';
    case 'Modulo':
      return '%';
    default:
      throw new Error(`Unknown multiplicative operator: ${tokenName}`);
  }
}

/**
 * Maps unary operator tokens to their AST operator representation.
 */
function getUnaryOperator(token: IToken): UnaryOperator {
  const tokenName = token.tokenType.name;
  switch (tokenName) {
    case 'Plus':
      return '+';
    case 'Minus':
      return '-';
    default:
      throw new Error(`Unknown unary operator: ${tokenName}`);
  }
}

/**
 * Creates a source location from a token.
 */
function locationFromToken(token: IToken): SourceLocation {
  const endOffset = token.endOffset ?? token.startOffset;
  return createLocation(token.startOffset, endOffset + 1);
}

/**
 * Creates a source location spanning from one token to another.
 */
function locationFromTokens(startToken: IToken, endToken: IToken): SourceLocation {
  const endOffset = endToken.endOffset ?? endToken.startOffset;
  return createLocation(startToken.startOffset, endOffset + 1);
}

/**
 * AST Builder class that transforms CST nodes into AST nodes.
 *
 * This class is used by the parser to convert the Chevrotain CST
 * output into the strongly-typed AST used by the rest of the engine.
 */
export class ASTBuilder {
  /**
   * Visits an expression CST node and returns the corresponding AST node.
   */
  visitExpression(cstNode: CstNode): ASTNode {
    const children = cstNode.children as CstChildren;
    const comparisonNodes = getCstNodes(children, 'comparisonExpression');

    if (comparisonNodes.length === 0) {
      throw new Error('Expression must have a comparisonExpression child');
    }

    return this.visitComparisonExpression(comparisonNodes[0]!);
  }

  /**
   * Visits a comparison expression CST node.
   * Handles operators: ==, !=, <>, <, >, <=, >=
   */
  visitComparisonExpression(cstNode: CstNode): ASTNode {
    const children = cstNode.children as CstChildren;
    const concatenationNodes = getCstNodes(children, 'concatenationExpression');
    const operatorTokens = getTokens(children, 'comparisonOperator');

    const operands: ASTNode[] = [];
    for (const node of concatenationNodes) {
      operands.push(this.visitConcatenationExpression(node));
    }

    if (operatorTokens.length === 0) {
      return operands[0]!;
    }

    const operators = operatorTokens.map(getComparisonOperator);
    return buildLeftAssociativeChain(operands, operators);
  }

  /**
   * Visits a concatenation expression CST node.
   * Handles the & (string concatenation) operator.
   */
  visitConcatenationExpression(cstNode: CstNode): ASTNode {
    const children = cstNode.children as CstChildren;
    const additiveNodes = getCstNodes(children, 'additiveExpression');
    const ampersandTokens = getTokens(children, 'Ampersand');

    const operands: ASTNode[] = [];
    for (const node of additiveNodes) {
      operands.push(this.visitAdditiveExpression(node));
    }

    if (ampersandTokens.length === 0) {
      return operands[0]!;
    }

    const operators: BinaryOperator[] = [];
    for (let i = 0; i < ampersandTokens.length; i++) {
      operators.push('&');
    }
    return buildLeftAssociativeChain(operands, operators);
  }

  /**
   * Visits an additive expression CST node.
   * Handles operators: +, -
   */
  visitAdditiveExpression(cstNode: CstNode): ASTNode {
    const children = cstNode.children as CstChildren;
    const multiplicativeNodes = getCstNodes(children, 'multiplicativeExpression');
    const operatorTokens = getTokens(children, 'additiveOperator');

    const operands: ASTNode[] = [];
    for (const node of multiplicativeNodes) {
      operands.push(this.visitMultiplicativeExpression(node));
    }

    if (operatorTokens.length === 0) {
      return operands[0]!;
    }

    const operators = operatorTokens.map(getAdditiveOperator);
    return buildLeftAssociativeChain(operands, operators);
  }

  /**
   * Visits a multiplicative expression CST node.
   * Handles operators: *, /, %
   */
  visitMultiplicativeExpression(cstNode: CstNode): ASTNode {
    const children = cstNode.children as CstChildren;
    const exponentiationNodes = getCstNodes(children, 'exponentiationExpression');
    const operatorTokens = getTokens(children, 'multiplicativeOperator');

    const operands: ASTNode[] = [];
    for (const node of exponentiationNodes) {
      operands.push(this.visitExponentiationExpression(node));
    }

    if (operatorTokens.length === 0) {
      return operands[0]!;
    }

    const operators = operatorTokens.map(getMultiplicativeOperator);
    return buildLeftAssociativeChain(operands, operators);
  }

  /**
   * Visits an exponentiation expression CST node.
   * Handles the ^ operator with RIGHT associativity.
   * 2^3^4 = 2^(3^4), not (2^3)^4
   */
  visitExponentiationExpression(cstNode: CstNode): ASTNode {
    const children = cstNode.children as CstChildren;
    const unaryNodes = getCstNodes(children, 'unaryExpression');
    const powerTokens = getTokens(children, 'Power');

    const operands: ASTNode[] = [];
    for (const node of unaryNodes) {
      operands.push(this.visitUnaryExpression(node));
    }

    if (powerTokens.length === 0) {
      return operands[0]!;
    }

    const operators: BinaryOperator[] = [];
    for (let i = 0; i < powerTokens.length; i++) {
      operators.push('^');
    }
    return buildRightAssociativeChain(operands, operators);
  }

  /**
   * Visits a unary expression CST node.
   * Handles unary operators: -, +
   */
  visitUnaryExpression(cstNode: CstNode): ASTNode {
    const children = cstNode.children as CstChildren;
    const operatorTokens = getTokens(children, 'unaryOperator');
    const nestedUnaryNodes = getCstNodes(children, 'unaryExpression');
    const primaryNodes = getCstNodes(children, 'primaryExpression');

    if (operatorTokens.length > 0 && nestedUnaryNodes.length > 0) {
      const operatorToken = operatorTokens[0]!;
      const operator = getUnaryOperator(operatorToken);
      const operand = this.visitUnaryExpression(nestedUnaryNodes[0]!);

      let location: SourceLocation | undefined;
      if (operand.location) {
        location = createLocation(operatorToken.startOffset, operand.location.end);
      } else {
        location = locationFromToken(operatorToken);
      }

      return createUnaryOp(operator, operand, location);
    }

    if (primaryNodes.length > 0) {
      return this.visitPrimaryExpression(primaryNodes[0]!);
    }

    throw new Error('Invalid unary expression: no recognized alternative');
  }

  /**
   * Visits a primary expression CST node.
   * Handles: literals, variable references, function calls, and parenthesized expressions.
   */
  visitPrimaryExpression(cstNode: CstNode): ASTNode {
    const children = cstNode.children as CstChildren;

    // Number literal
    const numberTokens = getTokens(children, 'NumberLiteral');
    if (numberTokens.length > 0) {
      const token = numberTokens[0]!;
      const value = parseNumberLiteral(token.image);
      return createNumberLiteral(value, locationFromToken(token));
    }

    // String literal (double quotes)
    const stringTokens = getTokens(children, 'StringLiteral');
    if (stringTokens.length > 0) {
      const token = stringTokens[0]!;
      const value = parseStringLiteral(token.image);
      return createStringLiteral(value, locationFromToken(token));
    }

    // String literal (single quotes)
    const singleQuoteTokens = getTokens(children, 'SingleQuoteStringLiteral');
    if (singleQuoteTokens.length > 0) {
      const token = singleQuoteTokens[0]!;
      const value = parseStringLiteral(token.image);
      return createStringLiteral(value, locationFromToken(token));
    }

    // Boolean TRUE
    const trueTokens = getTokens(children, 'True');
    if (trueTokens.length > 0) {
      const token = trueTokens[0]!;
      return createBooleanLiteral(true, locationFromToken(token));
    }

    // Boolean FALSE
    const falseTokens = getTokens(children, 'False');
    if (falseTokens.length > 0) {
      const token = falseTokens[0]!;
      return createBooleanLiteral(false, locationFromToken(token));
    }

    // Variable reference
    const variableTokens = getTokens(children, 'VariableRef');
    if (variableTokens.length > 0) {
      const token = variableTokens[0]!;
      const name = parseVariableRef(token.image);
      return createVariableRef(name, locationFromToken(token));
    }

    // Function call
    const functionNodes = getCstNodes(children, 'functionCall');
    if (functionNodes.length > 0) {
      return this.visitFunctionCall(functionNodes[0]!);
    }

    // Parenthesized expression
    const parenNodes = getCstNodes(children, 'parenthesizedExpression');
    if (parenNodes.length > 0) {
      return this.visitParenthesizedExpression(parenNodes[0]!);
    }

    throw new Error('Invalid primary expression: no recognized alternative');
  }

  /**
   * Visits a function call CST node.
   */
  visitFunctionCall(cstNode: CstNode): ASTNode {
    const children = cstNode.children as CstChildren;
    const identifierTokens = getTokens(children, 'Identifier');
    const rightParenTokens = getTokens(children, 'RightParen');
    const argumentListNodes = getCstNodes(children, 'argumentList');

    if (identifierTokens.length === 0) {
      throw new Error('Function call must have an Identifier');
    }

    const nameToken = identifierTokens[0]!;
    const name = nameToken.image;

    const args: ASTNode[] = [];
    if (argumentListNodes.length > 0) {
      const argListChildren = argumentListNodes[0]!.children as CstChildren;
      const expressionNodes = getCstNodes(argListChildren, 'expression');

      for (const exprNode of expressionNodes) {
        const arg = this.visitExpression(exprNode);
        args.push(arg);
      }
    }

    const rightParen = rightParenTokens[0];
    const location = rightParen
      ? locationFromTokens(nameToken, rightParen)
      : locationFromToken(nameToken);

    return createFunctionCall(name, args, location);
  }

  /**
   * Visits a parenthesized expression CST node.
   */
  visitParenthesizedExpression(cstNode: CstNode): ASTNode {
    const children = cstNode.children as CstChildren;
    const leftParenTokens = getTokens(children, 'LeftParen');
    const rightParenTokens = getTokens(children, 'RightParen');
    const expressionNodes = getCstNodes(children, 'expression');

    if (expressionNodes.length === 0) {
      throw new Error('Parenthesized expression must have an expression');
    }

    const innerNode = this.visitExpression(expressionNodes[0]!);

    // Update location to include parentheses
    const leftParen = leftParenTokens[0];
    const rightParen = rightParenTokens[0];

    let location: SourceLocation | undefined;
    if (leftParen && rightParen) {
      location = locationFromTokens(leftParen, rightParen);
    }

    // Return the inner node but with updated location
    return {
      ...innerNode,
      location,
    };
  }
}

/**
 * Creates a new ASTBuilder instance.
 *
 * @returns A new ASTBuilder instance
 */
export function createASTBuilder(): ASTBuilder {
  return new ASTBuilder();
}
