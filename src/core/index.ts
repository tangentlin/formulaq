/**
 * FormulaQ Core
 *
 * Zero-dependency formula engine for parsing, validating, and evaluating expressions.
 *
 * @example
 * ```typescript
 * import { createFormulaEngine, type VariableProvider } from 'formulaq/core';
 *
 * const engine = createFormulaEngine();
 * const ast = engine.parse('@value * 2');
 * const validated = engine.validate(ast, variableProvider);
 * const result = await engine.evaluateBatch(validated, context);
 * ```
 *
 * @packageDocumentation
 */

// Value types
export type { Value, ValueType, RawValue, VariableInfo } from './types/values.ts';

// AST types
export type {
  ASTNode,
  LiteralNode,
  VariableRefNode,
  BinaryOpNode,
  UnaryOpNode,
  FunctionCallNode,
  BinaryOperator,
  UnaryOperator,
  SourceLocation,
  ValidatedAST,
  CachedAggregation,
} from './types/ast.ts';

// Error types
export {
  FormulaError,
  FormulaSyntaxError,
  FormulaSemanticError,
  createDivByZeroError,
  createDomainError,
  createOverflowError,
  createTypeError,
  createNullError,
} from './types/errors.ts';

export type {
  ErrorPosition,
  SyntaxErrorCode,
  SemanticErrorCode,
  RuntimeErrorCode,
  FormulaRuntimeError,
} from './types/errors.ts';

// Context types
export type { VariableProvider, EvaluationContext, EvaluationOptions } from './types/context.ts';

// Result types
export type { BatchResult, BatchResultStats } from './types/results.ts';

export {
  createEmptyBatchResult,
  createBatchResult,
  computeBatchResultStats,
} from './types/results.ts';

// Function types
export type {
  ParamDef,
  ParamTypeSpec,
  FunctionInfo,
  FormulaFunction,
  FunctionEvaluator,
  FunctionRegistry,
} from './types/functions.ts';

// Engine facade
export { createFormulaEngine } from './engine.ts';
export type {
  FormulaQEngine,
  EngineOptions,
  BatchEvaluationOptions,
  RowContext,
  RowEvaluationResult,
} from './engine.ts';

// Version
export const VERSION = '0.1.0';
