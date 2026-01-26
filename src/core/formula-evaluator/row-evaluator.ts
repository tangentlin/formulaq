/**
 * Row-level formula evaluator.
 *
 * Evaluates a parsed and validated AST for a single row,
 * producing a Value result with proper null propagation
 * and runtime error handling.
 *
 * @module
 */

import type { ASTNode, FunctionCallNode, VariableRefNode } from '../types/ast.ts';
import type { Value } from '../types/values.ts';
import type { FormulaRuntimeError } from '../types/errors.ts';
import type { FunctionRegistry } from '../types/functions.ts';
import type { EvaluationContext } from '../types/context.ts';
import type { RowContext, RowEvaluationResult, AggregationCache } from './evaluator.types.ts';
import { createAggregationCacheKey } from './evaluator.types.ts';
import {
  createValue,
  createNullValue,
  isNullValue,
  extractNumber,
  isArithmeticOperator,
  isComparisonOperator,
  isConcatenationOperator,
  evaluateArithmeticOp,
  evaluateComparisonOp,
  evaluateUnaryOp,
  coerceToString,
} from './row-evaluator.view-model.ts';

/**
 * Evaluates an AST node for a single row.
 *
 * This is the main entry point for row-level evaluation.
 * It recursively evaluates the AST, handling:
 * - Literal values (returned directly)
 * - Variable references (looked up in row context)
 * - Binary operations (with null propagation and error handling)
 * - Unary operations (with null propagation)
 * - Function calls (delegated to function registry)
 *
 * @param node - The AST node to evaluate
 * @param rowContext - The row context providing variable values
 * @param functionRegistry - The function registry for function calls
 * @param fullContext - The full evaluation context (for aggregation functions)
 * @param aggregationCache - Cache of pre-computed aggregation results
 * @returns The evaluation result with value and optional error
 *
 * @example
 * ```typescript
 * const result = await evaluateRow(
 *   parsedAST,
 *   rowContext,
 *   functionRegistry,
 *   fullContext,
 *   aggregationCache
 * );
 *
 * if (result.error) {
 *   console.log(`Error: ${result.error.message}`);
 * } else {
 *   console.log(`Result: ${result.value.value}`);
 * }
 * ```
 */
export async function evaluateRow(
  node: ASTNode,
  rowContext: RowContext,
  functionRegistry: FunctionRegistry,
  fullContext?: EvaluationContext,
  aggregationCache?: AggregationCache,
): Promise<RowEvaluationResult> {
  const result = await evaluateNode(
    node,
    rowContext,
    functionRegistry,
    fullContext,
    aggregationCache,
  );

  if (result.error !== undefined) {
    return result;
  }

  return { value: result.value };
}

/**
 * Recursively evaluates an AST node.
 *
 * @param node - The AST node to evaluate
 * @param rowContext - The row context providing variable values
 * @param functionRegistry - The function registry for function calls
 * @param fullContext - The full evaluation context (for aggregation functions)
 * @param aggregationCache - Cache of pre-computed aggregation results
 * @returns The evaluation result
 */
async function evaluateNode(
  node: ASTNode,
  rowContext: RowContext,
  functionRegistry: FunctionRegistry,
  fullContext?: EvaluationContext,
  aggregationCache?: AggregationCache,
): Promise<RowEvaluationResult> {
  switch (node.type) {
    case 'Literal':
      return evaluateLiteral(node);

    case 'VariableRef':
      return evaluateVariableRef(node, rowContext);

    case 'BinaryOp':
      return evaluateBinaryOp(
        node.operator,
        node.left,
        node.right,
        rowContext,
        functionRegistry,
        fullContext,
        aggregationCache,
      );

    case 'UnaryOp':
      return evaluateUnaryOpNode(
        node.operator,
        node.operand,
        rowContext,
        functionRegistry,
        fullContext,
        aggregationCache,
      );

    case 'FunctionCall':
      return evaluateFunctionCall(
        node,
        rowContext,
        functionRegistry,
        fullContext,
        aggregationCache,
      );
  }
}

/**
 * Evaluates a literal node.
 *
 * @param node - The literal node
 * @returns The literal value wrapped in a RowEvaluationResult
 */
function evaluateLiteral(node: { valueType: string; value: unknown }): RowEvaluationResult {
  const value: Value = {
    type: node.valueType as Value['type'],
    value: node.value as Value['value'],
  };
  return { value };
}

/**
 * Evaluates a variable reference node.
 *
 * @param node - The variable reference node
 * @param rowContext - The row context to look up the variable
 * @returns The variable value for this row
 */
function evaluateVariableRef(node: VariableRefNode, rowContext: RowContext): RowEvaluationResult {
  const value = rowContext.getVariable(node.name);

  if (value === null) {
    // Variable not found - return null with a default type
    // This should not happen if validation passed, but handle gracefully
    return {
      value: createNullValue('number.float'),
    };
  }

  return { value };
}

/**
 * Evaluates a binary operation.
 *
 * @param operator - The binary operator
 * @param leftNode - The left operand AST node
 * @param rightNode - The right operand AST node
 * @param rowContext - The row context
 * @param functionRegistry - The function registry
 * @param fullContext - The full evaluation context
 * @param aggregationCache - The aggregation cache
 * @returns The evaluation result
 */
async function evaluateBinaryOp(
  operator: string,
  leftNode: ASTNode,
  rightNode: ASTNode,
  rowContext: RowContext,
  functionRegistry: FunctionRegistry,
  fullContext?: EvaluationContext,
  aggregationCache?: AggregationCache,
): Promise<RowEvaluationResult> {
  // Evaluate both operands
  const leftResult = await evaluateNode(
    leftNode,
    rowContext,
    functionRegistry,
    fullContext,
    aggregationCache,
  );

  if (leftResult.error !== undefined) {
    return leftResult;
  }

  const rightResult = await evaluateNode(
    rightNode,
    rowContext,
    functionRegistry,
    fullContext,
    aggregationCache,
  );

  if (rightResult.error !== undefined) {
    return rightResult;
  }

  const leftValue = leftResult.value;
  const rightValue = rightResult.value;

  const binaryOp = operator as import('../types/ast.ts').BinaryOperator;

  // Null propagation: if either operand is null, result is null
  if (isNullValue(leftValue) || isNullValue(rightValue)) {
    return createNullResultForOperator(binaryOp);
  }

  // Handle arithmetic operators
  if (isArithmeticOperator(binaryOp)) {
    const leftNum = extractNumber(leftValue);
    const rightNum = extractNumber(rightValue);

    if (leftNum === null || rightNum === null) {
      return { value: createNullValue('number.float') };
    }

    const result = evaluateArithmeticOp(binaryOp, leftNum, rightNum);

    if (result.divisionByZero) {
      const error: FormulaRuntimeError = {
        rowIndex: rowContext.rowIndex,
        code: 'DIV_BY_ZERO',
        message: 'Division by zero',
      };
      return {
        value: createNullValue('number.float'),
        error,
      };
    }

    if (result.value === null) {
      return { value: createNullValue('number.float') };
    }

    return { value: result.value };
  }

  // Handle comparison operators
  if (isComparisonOperator(binaryOp)) {
    const result = evaluateComparisonOp(binaryOp, leftValue, rightValue);
    return { value: result };
  }

  // Handle string concatenation
  if (isConcatenationOperator(binaryOp)) {
    const leftStr = coerceToString(leftValue);
    const rightStr = coerceToString(rightValue);

    if (leftStr === null || rightStr === null) {
      return { value: createNullValue('string.text') };
    }

    return { value: createValue('string.text', leftStr + rightStr) };
  }

  // Unknown operator - should not happen after validation
  return { value: createNullValue('number.float') };
}

/**
 * Creates a null result value appropriate for the given operator.
 *
 * @param operator - The binary operator
 * @returns A null result with the appropriate type
 */
function createNullResultForOperator(
  operator: import('../types/ast.ts').BinaryOperator,
): RowEvaluationResult {
  if (isArithmeticOperator(operator)) {
    return { value: createNullValue('number.float') };
  }

  if (isComparisonOperator(operator)) {
    return { value: createNullValue('boolean.boolean') };
  }

  if (isConcatenationOperator(operator)) {
    return { value: createNullValue('string.text') };
  }

  return { value: createNullValue('number.float') };
}

/**
 * Evaluates a unary operation.
 *
 * @param operator - The unary operator
 * @param operandNode - The operand AST node
 * @param rowContext - The row context
 * @param functionRegistry - The function registry
 * @param fullContext - The full evaluation context
 * @param aggregationCache - The aggregation cache
 * @returns The evaluation result
 */
async function evaluateUnaryOpNode(
  operator: string,
  operandNode: ASTNode,
  rowContext: RowContext,
  functionRegistry: FunctionRegistry,
  fullContext?: EvaluationContext,
  aggregationCache?: AggregationCache,
): Promise<RowEvaluationResult> {
  const operandResult = await evaluateNode(
    operandNode,
    rowContext,
    functionRegistry,
    fullContext,
    aggregationCache,
  );

  if (operandResult.error !== undefined) {
    return operandResult;
  }

  const operandValue = operandResult.value;

  // Null propagation
  if (isNullValue(operandValue)) {
    return { value: createNullValue('number.float') };
  }

  const operandNum = extractNumber(operandValue);

  if (operandNum === null) {
    return { value: createNullValue('number.float') };
  }

  const unaryOp = operator as import('../types/ast.ts').UnaryOperator;
  const result = evaluateUnaryOp(unaryOp, operandNum);

  return { value: createValue('number.float', result) };
}

/**
 * Evaluates a function call.
 *
 * @param node - The function call node
 * @param rowContext - The row context
 * @param functionRegistry - The function registry
 * @param fullContext - The full evaluation context
 * @param aggregationCache - The aggregation cache
 * @returns The evaluation result
 */
async function evaluateFunctionCall(
  node: FunctionCallNode,
  rowContext: RowContext,
  functionRegistry: FunctionRegistry,
  fullContext?: EvaluationContext,
  aggregationCache?: AggregationCache,
): Promise<RowEvaluationResult> {
  const fn = functionRegistry.get(node.name);

  if (fn === undefined) {
    // Function not found - should be caught by validator
    // Return null gracefully
    return {
      value: createNullValue('number.float'),
    };
  }

  // For aggregation functions, check the cache first
  if (fn.isAggregation && aggregationCache !== undefined) {
    const cachedValue = getAggregationFromCache(node, aggregationCache);
    if (cachedValue !== undefined) {
      return { value: cachedValue };
    }
  }

  // Evaluate all arguments
  const evaluatedArgs: Value[] = [];

  for (const argNode of node.args) {
    // For aggregation functions, if the argument is a variable reference,
    // pass it as a special marker
    if (fn.isAggregation && argNode.type === 'VariableRef') {
      // Pass the variable name as a string value so the aggregation
      // function can access the full array
      evaluatedArgs.push(createValue('string.text', argNode.name));
    } else {
      const argResult = await evaluateNode(
        argNode,
        rowContext,
        functionRegistry,
        fullContext,
        aggregationCache,
      );

      if (argResult.error !== undefined) {
        return {
          value: createNullValue(fn.returnType),
          error: argResult.error,
        };
      }

      evaluatedArgs.push(argResult.value);
    }
  }

  // Create evaluation context for the function
  const context: import('../types/context.ts').EvaluationContext = fullContext ?? {
    variables: {},
    rowCount: 1,
    currentIndex: rowContext.rowIndex,
  };

  // Call the function
  try {
    const result = await fn.evaluate(evaluatedArgs, context);

    if (result === null) {
      return { value: createNullValue(fn.returnType) };
    }

    return { value: result };
  } catch {
    // Function threw an error - convert to runtime error
    const error: FormulaRuntimeError = {
      rowIndex: rowContext.rowIndex,
      code: 'DOMAIN_ERROR',
      message: `Error in function ${node.name}`,
      details: { functionName: node.name },
    };
    return {
      value: createNullValue(fn.returnType),
      error,
    };
  }
}

/**
 * Gets an aggregation result from the cache.
 *
 * @param node - The function call node
 * @param cache - The aggregation cache
 * @returns The cached value, or undefined if not cached
 */
function getAggregationFromCache(
  node: FunctionCallNode,
  cache: AggregationCache,
): Value | undefined {
  // For aggregation functions, the first argument should be a variable reference
  const firstArg = node.args[0];

  if (firstArg === undefined) {
    return undefined;
  }

  if (firstArg.type !== 'VariableRef') {
    return undefined;
  }

  const cacheKey = createAggregationCacheKey(node.name, firstArg.name);
  return cache.get(cacheKey);
}
