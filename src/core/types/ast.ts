/**
 * Abstract Syntax Tree (AST) node types for parsed formulas.
 *
 * The AST represents the structure of a parsed formula and is used
 * by the validator and evaluator to process the formula.
 *
 * @module
 */

import type { ValueType, Value } from './values.ts';

/**
 * Binary operators supported in formulas.
 *
 * Operators are grouped by category:
 * - Arithmetic: `+`, `-`, `*`, `/`, `^`, `%`
 * - String: `&` (concatenation)
 * - Comparison: `==`, `!=`, `<>`, `<`, `>`, `<=`, `>=`
 */
export type BinaryOperator =
  | '+'
  | '-'
  | '*'
  | '/'
  | '^'
  | '%'
  | '&'
  | '=='
  | '!='
  | '<>'
  | '<'
  | '>'
  | '<='
  | '>=';

/**
 * Unary operators supported in formulas.
 *
 * - `-` Numeric negation
 * - `+` Unary plus (no-op, returns value unchanged)
 *
 * @remarks
 * Logical NOT is implemented as a function, not an operator.
 */
export type UnaryOperator = '-' | '+';

/**
 * Source location information for AST nodes.
 *
 * Used for error reporting and editor integration.
 */
export interface SourceLocation {
  /**
   * Starting character offset (0-based, inclusive).
   */
  readonly start: number;

  /**
   * Ending character offset (0-based, exclusive).
   */
  readonly end: number;
}

/**
 * Base interface for all AST nodes.
 *
 * Every node has a type discriminator and optional location info.
 */
interface BaseNode {
  /**
   * Optional source location for error reporting.
   */
  readonly location?: SourceLocation | undefined;
}

/**
 * Represents a literal value (number, string, or boolean).
 *
 * @example
 * ```typescript
 * // Parsing "42" produces:
 * const node: LiteralNode = {
 *   type: 'Literal',
 *   valueType: 'number.integer',
 *   value: 42
 * };
 *
 * // Parsing '"hello"' produces:
 * const stringNode: LiteralNode = {
 *   type: 'Literal',
 *   valueType: 'string.text',
 *   value: 'hello'
 * };
 * ```
 */
export interface LiteralNode extends BaseNode {
  readonly type: 'Literal';

  /**
   * The type of the literal value.
   */
  readonly valueType: ValueType;

  /**
   * The literal value.
   * Can be null for explicit null literals (if supported in future).
   */
  readonly value: number | string | boolean | null;
}

/**
 * Represents a reference to a variable using the `@` prefix.
 *
 * @example
 * ```typescript
 * // Parsing "@score" produces:
 * const node: VariableRefNode = {
 *   type: 'VariableRef',
 *   name: 'score'
 * };
 *
 * // Parsing "@result_data.minimized_affinity" produces:
 * const nestedNode: VariableRefNode = {
 *   type: 'VariableRef',
 *   name: 'result_data.minimized_affinity'
 * };
 * ```
 */
export interface VariableRefNode extends BaseNode {
  readonly type: 'VariableRef';

  /**
   * The variable name (without the `@` prefix).
   *
   * Periods in the name are part of the identifier, not property access.
   */
  readonly name: string;
}

/**
 * Represents a binary operation between two expressions.
 *
 * @example
 * ```typescript
 * // Parsing "@x + @y" produces:
 * const node: BinaryOpNode = {
 *   type: 'BinaryOp',
 *   operator: '+',
 *   left: { type: 'VariableRef', name: 'x' },
 *   right: { type: 'VariableRef', name: 'y' }
 * };
 * ```
 */
export interface BinaryOpNode extends BaseNode {
  readonly type: 'BinaryOp';

  /**
   * The binary operator.
   */
  readonly operator: BinaryOperator;

  /**
   * The left operand expression.
   */
  readonly left: ASTNode;

  /**
   * The right operand expression.
   */
  readonly right: ASTNode;
}

/**
 * Represents a unary operation on an expression.
 *
 * @example
 * ```typescript
 * // Parsing "-@x" produces:
 * const node: UnaryOpNode = {
 *   type: 'UnaryOp',
 *   operator: '-',
 *   operand: { type: 'VariableRef', name: 'x' }
 * };
 * ```
 */
export interface UnaryOpNode extends BaseNode {
  readonly type: 'UnaryOp';

  /**
   * The unary operator.
   */
  readonly operator: UnaryOperator;

  /**
   * The operand expression.
   */
  readonly operand: ASTNode;
}

/**
 * Represents a function call with arguments.
 *
 * @example
 * ```typescript
 * // Parsing "AVG(@score)" produces:
 * const node: FunctionCallNode = {
 *   type: 'FunctionCall',
 *   name: 'AVG',
 *   args: [{ type: 'VariableRef', name: 'score' }]
 * };
 *
 * // Parsing "IF(@x > 0, @x, 0)" produces a nested structure
 * ```
 */
export interface FunctionCallNode extends BaseNode {
  readonly type: 'FunctionCall';

  /**
   * The function name (case-sensitive).
   */
  readonly name: string;

  /**
   * The argument expressions.
   * Can be empty for zero-argument functions.
   */
  readonly args: readonly ASTNode[];
}

/**
 * Union type of all possible AST node types.
 *
 * Use the `type` discriminator to narrow to a specific node type:
 *
 * @example
 * ```typescript
 * function processNode(node: ASTNode): void {
 *   switch (node.type) {
 *     case 'Literal':
 *       console.log('Literal:', node.value);
 *       break;
 *     case 'VariableRef':
 *       console.log('Variable:', node.name);
 *       break;
 *     case 'BinaryOp':
 *       console.log('Binary:', node.operator);
 *       break;
 *     case 'UnaryOp':
 *       console.log('Unary:', node.operator);
 *       break;
 *     case 'FunctionCall':
 *       console.log('Function:', node.name);
 *       break;
 *   }
 * }
 * ```
 */
export type ASTNode = LiteralNode | VariableRefNode | BinaryOpNode | UnaryOpNode | FunctionCallNode;

/**
 * Represents an AST that has passed semantic validation.
 *
 * Contains the validated AST root along with metadata extracted
 * during validation, such as dependencies and aggregation information.
 *
 * @example
 * ```typescript
 * const validated: ValidatedAST = {
 *   root: parsedAst,
 *   resultType: 'number.float',
 *   dependencies: ['score', 'weight'],
 *   hasAggregations: true,
 *   aggregations: ['AVG']
 * };
 * ```
 */
export interface ValidatedAST {
  /**
   * The validated AST root node.
   */
  readonly root: ASTNode;

  /**
   * The inferred result type of the entire expression.
   */
  readonly resultType: ValueType;

  /**
   * List of variable names referenced in the formula.
   * Names do not include the `@` prefix.
   */
  readonly dependencies: readonly string[];

  /**
   * Whether the formula contains any aggregation function calls.
   * Used to determine if aggregation pre-computation is needed.
   */
  readonly hasAggregations: boolean;

  /**
   * List of aggregation function names used in the formula.
   * Examples: ['AVG', 'SUM', 'MAX']
   */
  readonly aggregations: readonly string[];
}

/**
 * Information about a cached aggregation result.
 *
 * Used internally by the evaluator to store pre-computed
 * aggregation values.
 */
export interface CachedAggregation {
  /**
   * The function name (e.g., 'AVG', 'SUM').
   */
  readonly functionName: string;

  /**
   * The variable name being aggregated.
   */
  readonly variableName: string;

  /**
   * The computed aggregation result.
   */
  readonly result: Value;
}
