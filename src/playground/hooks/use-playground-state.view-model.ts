/**
 * Pure state transition logic for the Playground state hook.
 *
 * This module contains all pure functions for:
 * - Creating VariableProvider from PlaygroundVariables
 * - Creating EvaluationContext from PlaygroundVariables
 * - Extracting aggregation results from AST and cache
 * - Calculating row counts
 * - State transition helpers
 *
 * @module
 */

import type { VariableProvider, EvaluationContext } from '../../core/types/context.ts';
import type { Value, ValueType, VariableInfo } from '../../core/types/values.ts';
import type { ASTNode, FunctionCallNode } from '../../core/types/ast.ts';
import type { FormulaRuntimeError } from '../../core/types/errors.ts';
import type { AggregationCache } from '../../core/formula-evaluator/evaluator.types.ts';
import type { PlaygroundVariable } from '../variable-card/variable-card.types.ts';
import type { AggregationResult } from '../aggregation-display/aggregation-display.types.ts';
import type { ValidationResult } from '../../editor/formula-editor/formula-editor.types.ts';

/**
 * State shape for the Playground.
 *
 * Contains all state needed to manage variables, formulas, and evaluation results.
 */
export interface PlaygroundState {
  /**
   * The list of test variables defined by the user.
   */
  readonly variables: readonly PlaygroundVariable[];

  /**
   * The current formula string in the editor.
   */
  readonly formula: string;

  /**
   * Result of validating the current formula.
   * Null if formula is empty or hasn't been validated yet.
   */
  readonly validationResult: ValidationResult | null;

  /**
   * Result of evaluating the formula against the variables.
   * Null if formula hasn't been evaluated yet.
   */
  readonly evaluationResult: EvaluationResult | null;

  /**
   * Whether evaluation is currently in progress.
   */
  readonly isEvaluating: boolean;
}

/**
 * Result of evaluating a formula.
 *
 * Contains the computed values, any runtime errors, and aggregation results.
 */
export interface EvaluationResult {
  /**
   * Computed values, one per row.
   */
  readonly values: readonly Value[];

  /**
   * Runtime errors that occurred during evaluation.
   */
  readonly errors: readonly FormulaRuntimeError[];

  /**
   * Aggregation function results extracted from the formula.
   */
  readonly aggregations: readonly AggregationResult[];
}

/**
 * Creates the initial state for the Playground.
 *
 * @returns The initial PlaygroundState
 */
export function createInitialState(): PlaygroundState {
  return {
    variables: [],
    formula: '',
    validationResult: null,
    evaluationResult: null,
    isEvaluating: false,
  };
}

/**
 * Creates a VariableProvider from an array of PlaygroundVariables.
 *
 * The VariableProvider is used for:
 * - Autocomplete suggestions in the editor
 * - Type checking during validation
 * - Unknown variable detection
 *
 * @param variables - The playground variables to convert
 * @returns A VariableProvider for the given variables
 */
export function createVariableProvider(variables: readonly PlaygroundVariable[]): VariableProvider {
  const variableMap = new Map<string, PlaygroundVariable>();

  for (const variable of variables) {
    variableMap.set(variable.name, variable);
  }

  return {
    getVariables(): VariableInfo[] {
      const result: VariableInfo[] = [];

      for (const variable of variables) {
        const hasNulls = checkHasNulls(variable.values);

        result.push({
          name: variable.name,
          type: variable.type,
          nullable: hasNulls,
          group: 'Test Variables',
        });
      }

      return result;
    },

    hasVariable(name: string): boolean {
      return variableMap.has(name);
    },

    getVariableType(name: string): ValueType | undefined {
      const variable = variableMap.get(name);
      return variable?.type;
    },

    isNullable(name: string): boolean {
      const variable = variableMap.get(name);
      if (variable === undefined) {
        return true;
      }
      return checkHasNulls(variable.values);
    },
  };
}

/**
 * Creates an EvaluationContext from an array of PlaygroundVariables.
 *
 * The EvaluationContext provides the actual values for formula evaluation.
 *
 * @param variables - The playground variables to convert
 * @returns An EvaluationContext for the given variables
 */
export function createEvaluationContext(
  variables: readonly PlaygroundVariable[],
): EvaluationContext {
  const variableData: Record<string, Value[]> = {};
  let rowCount = 0;

  for (const variable of variables) {
    const values = convertToValues(variable.values, variable.type);
    variableData[variable.name] = values;

    // Track max row count across all variables
    if (values.length > rowCount) {
      rowCount = values.length;
    }
  }

  return {
    variables: variableData,
    rowCount,
  };
}

/**
 * Calculates the row count from the variables.
 *
 * The row count is the maximum length of any variable's values array.
 *
 * @param variables - The playground variables
 * @returns The number of rows (max length of any variable's values)
 */
export function calculateRowCount(variables: readonly PlaygroundVariable[]): number {
  let maxLength = 0;

  for (const variable of variables) {
    if (variable.values.length > maxLength) {
      maxLength = variable.values.length;
    }
  }

  return maxLength;
}

/**
 * Extracts aggregation results from an AST and aggregation cache.
 *
 * Walks the AST to find aggregation function calls and matches them
 * with their computed values from the cache.
 *
 * @param ast - The AST to extract aggregations from
 * @param cache - The cache containing computed aggregation values
 * @returns Array of aggregation results with expressions and values
 */
export function extractAggregations(ast: ASTNode, cache: AggregationCache): AggregationResult[] {
  const results: AggregationResult[] = [];
  const seen = new Set<string>();

  collectAggregationResults(ast, cache, results, seen);

  return results;
}

/**
 * Recursively collects aggregation results from an AST node.
 *
 * @param node - The current AST node
 * @param cache - The aggregation cache
 * @param results - Array to collect results into
 * @param seen - Set of already-seen expressions to avoid duplicates
 */
function collectAggregationResults(
  node: ASTNode,
  cache: AggregationCache,
  results: AggregationResult[],
  seen: Set<string>,
): void {
  switch (node.type) {
    case 'Literal':
    case 'VariableRef':
      // These don't contain aggregations
      return;

    case 'BinaryOp':
      collectAggregationResults(node.left, cache, results, seen);
      collectAggregationResults(node.right, cache, results, seen);
      return;

    case 'UnaryOp':
      collectAggregationResults(node.operand, cache, results, seen);
      return;

    case 'FunctionCall':
      // Check if this function call is an aggregation in the cache
      const aggregationResult = tryExtractAggregationResult(node, cache, seen);
      if (aggregationResult !== null) {
        results.push(aggregationResult);
      }

      // Also check arguments for nested aggregations
      for (const arg of node.args) {
        collectAggregationResults(arg, cache, results, seen);
      }
      return;
  }
}

/**
 * Attempts to extract an aggregation result from a function call node.
 *
 * @param node - The function call node
 * @param cache - The aggregation cache
 * @param seen - Set of already-seen expressions
 * @returns The aggregation result if found, null otherwise
 */
function tryExtractAggregationResult(
  node: FunctionCallNode,
  cache: AggregationCache,
  seen: Set<string>,
): AggregationResult | null {
  // First argument should be a variable reference for aggregation functions
  if (node.args.length === 0) {
    return null;
  }

  const firstArg = node.args[0];
  if (firstArg === undefined || firstArg.type !== 'VariableRef') {
    return null;
  }

  // Build the cache key
  const cacheKey = `${node.name}:${firstArg.name}`;

  // Check if we have this aggregation cached
  const cachedValue = cache.get(cacheKey);
  if (cachedValue === undefined) {
    return null;
  }

  // Build the expression string
  const expression = buildAggregationExpression(node);

  // Skip if already seen
  if (seen.has(expression)) {
    return null;
  }

  seen.add(expression);

  return {
    expression,
    value: cachedValue,
  };
}

/**
 * Builds a human-readable expression string for an aggregation call.
 *
 * @param node - The function call node
 * @returns The expression string (e.g., "AVG(@score)")
 */
function buildAggregationExpression(node: FunctionCallNode): string {
  const args = node.args.map(function formatArg(arg): string {
    switch (arg.type) {
      case 'VariableRef':
        return `@${arg.name}`;
      case 'Literal':
        if (typeof arg.value === 'string') {
          return `"${arg.value}"`;
        }
        return String(arg.value);
      default:
        return '...';
    }
  });

  return `${node.name}(${args.join(', ')})`;
}

/**
 * Converts raw values to typed Value objects.
 *
 * @param values - The raw values from a PlaygroundVariable
 * @param type - The type of the values
 * @returns Array of typed Value objects
 */
function convertToValues(
  values: readonly (number | string | boolean | null)[],
  type: ValueType,
): Value[] {
  const result: Value[] = [];

  for (const rawValue of values) {
    result.push({
      type,
      value: rawValue,
    });
  }

  return result;
}

/**
 * Checks if an array of values contains any null values.
 *
 * @param values - The values to check
 * @returns True if any value is null
 */
function checkHasNulls(values: readonly (number | string | boolean | null)[]): boolean {
  for (const value of values) {
    if (value === null) {
      return true;
    }
  }
  return false;
}

/**
 * Adds a variable to the state, replacing any existing variable with the same name.
 *
 * @param state - The current state
 * @param variable - The variable to add
 * @returns The new state with the variable added
 */
export function addVariableToState(
  state: PlaygroundState,
  variable: PlaygroundVariable,
): PlaygroundState {
  // Check if variable with same name exists
  const existingIndex = findVariableIndex(state.variables, variable.name);

  if (existingIndex >= 0) {
    // Replace existing variable
    const newVariables = [...state.variables];
    newVariables[existingIndex] = variable;
    return {
      ...state,
      variables: newVariables,
      evaluationResult: null, // Clear results when variables change
    };
  }

  // Add new variable
  return {
    ...state,
    variables: [...state.variables, variable],
    evaluationResult: null,
  };
}

/**
 * Updates an existing variable in the state.
 *
 * @param state - The current state
 * @param variable - The updated variable
 * @returns The new state with the variable updated
 */
export function editVariableInState(
  state: PlaygroundState,
  variable: PlaygroundVariable,
): PlaygroundState {
  const index = findVariableIndex(state.variables, variable.name);

  if (index < 0) {
    // Variable not found, add it
    return addVariableToState(state, variable);
  }

  const newVariables = [...state.variables];
  newVariables[index] = variable;

  return {
    ...state,
    variables: newVariables,
    evaluationResult: null,
  };
}

/**
 * Removes a variable from the state by name.
 *
 * @param state - The current state
 * @param name - The name of the variable to remove
 * @returns The new state with the variable removed
 */
export function removeVariableFromState(state: PlaygroundState, name: string): PlaygroundState {
  const newVariables = state.variables.filter(function filterVariable(v) {
    return v.name !== name;
  });

  return {
    ...state,
    variables: newVariables,
    evaluationResult: null,
  };
}

/**
 * Updates the formula in the state.
 *
 * @param state - The current state
 * @param formula - The new formula string
 * @returns The new state with the formula updated
 */
export function setFormulaInState(state: PlaygroundState, formula: string): PlaygroundState {
  return {
    ...state,
    formula,
    validationResult: null,
    evaluationResult: null,
  };
}

/**
 * Updates the validation result in the state.
 *
 * @param state - The current state
 * @param validationResult - The new validation result
 * @returns The new state with the validation result updated
 */
export function setValidationResultInState(
  state: PlaygroundState,
  validationResult: ValidationResult | null,
): PlaygroundState {
  return {
    ...state,
    validationResult,
  };
}

/**
 * Updates the evaluation result in the state.
 *
 * @param state - The current state
 * @param evaluationResult - The new evaluation result
 * @returns The new state with the evaluation result updated
 */
export function setEvaluationResultInState(
  state: PlaygroundState,
  evaluationResult: EvaluationResult | null,
): PlaygroundState {
  return {
    ...state,
    evaluationResult,
    isEvaluating: false,
  };
}

/**
 * Sets the evaluating flag in the state.
 *
 * @param state - The current state
 * @param isEvaluating - Whether evaluation is in progress
 * @returns The new state with the flag updated
 */
export function setIsEvaluatingInState(
  state: PlaygroundState,
  isEvaluating: boolean,
): PlaygroundState {
  return {
    ...state,
    isEvaluating,
  };
}

/**
 * Finds the index of a variable by name.
 *
 * @param variables - The variables array to search
 * @param name - The name to find
 * @returns The index of the variable, or -1 if not found
 */
function findVariableIndex(variables: readonly PlaygroundVariable[], name: string): number {
  for (let i = 0; i < variables.length; i++) {
    const variable = variables[i];
    if (variable !== undefined && variable.name === name) {
      return i;
    }
  }
  return -1;
}

/**
 * Checks if evaluation can proceed.
 *
 * Evaluation requires:
 * 1. At least one variable defined
 * 2. A valid formula (validation succeeded)
 *
 * @param state - The current state
 * @returns True if evaluation can proceed
 */
export function canEvaluate(state: PlaygroundState): boolean {
  // Need at least one variable
  if (state.variables.length === 0) {
    return false;
  }

  // Formula must be non-empty
  if (state.formula.trim() === '') {
    return false;
  }

  // Validation must have succeeded
  if (state.validationResult === null) {
    return false;
  }

  if (!state.validationResult.isValid) {
    return false;
  }

  return true;
}

/**
 * Creates an empty EvaluationResult.
 *
 * @returns An empty evaluation result
 */
export function createEmptyEvaluationResult(): EvaluationResult {
  return {
    values: [],
    errors: [],
    aggregations: [],
  };
}

/**
 * Creates an EvaluationResult from batch evaluation output.
 *
 * @param values - The computed values
 * @param errors - The runtime errors
 * @param aggregations - The aggregation results
 * @returns The evaluation result
 */
export function createEvaluationResult(
  values: readonly Value[],
  errors: readonly FormulaRuntimeError[],
  aggregations: readonly AggregationResult[],
): EvaluationResult {
  return {
    values,
    errors,
    aggregations,
  };
}
