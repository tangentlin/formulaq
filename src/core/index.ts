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

// Types will be exported here as they are implemented
// export type { Value, ValueType, VariableInfo } from './types/values';
// export type { ASTNode, ValidatedAST } from './types/ast';
// export type { FormulaError, SyntaxError, SemanticError } from './types/errors';
// export type { VariableProvider, EvaluationContext } from './types/context';
// export type { BatchResult, RuntimeError } from './types/results';
// export type { FormulaFunction, ParamDef } from './types/functions';

// Engine will be exported here
// export { createFormulaEngine } from './engine';
// export type { FormulaQEngine } from './engine';

// Placeholder export to make the module valid
export const VERSION = '0.1.0';
