/**
 * Main state management hook for the Playground component.
 *
 * This hook manages:
 * - Test variables (add, edit, remove)
 * - Formula editing and validation
 * - Formula evaluation against variables
 * - Aggregation computation
 *
 * The hook automatically re-evaluates when variables change or when
 * validation succeeds on a new formula.
 *
 * @module
 */

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import type { FormulaQEngine } from '../../core/engine.ts';
import type { VariableProvider } from '../../core/types/context.ts';
import type { AggregationCache } from '../../core/formula-evaluator/evaluator.types.ts';
import type { PlaygroundVariable } from '../variable-card/variable-card.types.ts';
import type { ValidationResult } from '../../editor/formula-editor/formula-editor.types.ts';
import type { AggregationResult } from '../aggregation-display/aggregation-display.types.ts';
import {
  createInitialState,
  createVariableProvider,
  createEvaluationContext,
  extractAggregations,
  addVariableToState,
  editVariableInState,
  removeVariableFromState,
  setFormulaInState,
  setValidationResultInState,
  setEvaluationResultInState,
  setIsEvaluatingInState,
  canEvaluate as checkCanEvaluate,
  createEvaluationResult,
  type PlaygroundState,
  type EvaluationResult,
} from './use-playground-state.view-model.ts';
import {
  computeAggregations,
  createAggregationComputeContext,
} from '../../core/formula-evaluator/aggregation-computer.ts';
import { createFunctionRegistry } from '../../core/functions/function-registry.ts';

/**
 * Return type for the usePlaygroundState hook.
 */
export interface UsePlaygroundStateReturn {
  /**
   * The current state containing variables, formula, validation, and evaluation results.
   */
  readonly state: PlaygroundState;

  /**
   * Adds a new variable or replaces an existing variable with the same name.
   *
   * @param variable - The variable to add
   */
  readonly addVariable: (variable: PlaygroundVariable) => void;

  /**
   * Updates an existing variable.
   *
   * @param variable - The updated variable
   */
  readonly editVariable: (variable: PlaygroundVariable) => void;

  /**
   * Removes a variable by name.
   *
   * @param name - The name of the variable to remove
   */
  readonly removeVariable: (name: string) => void;

  /**
   * Updates the formula string.
   *
   * @param formula - The new formula string
   */
  readonly setFormula: (formula: string) => void;

  /**
   * Handles validation result from the FormulaEditor.
   *
   * @param result - The validation result
   */
  readonly handleValidation: (result: ValidationResult) => void;

  /**
   * VariableProvider derived from the current variables.
   * Used by FormulaEditor for autocomplete and validation.
   */
  readonly variableProvider: VariableProvider;

  /**
   * Whether evaluation can currently proceed.
   * True when there are variables and a valid formula.
   */
  readonly canEvaluate: boolean;
}

/**
 * Main state management hook for the Playground.
 *
 * Manages the lifecycle of variables, formula editing, validation,
 * and evaluation. Automatically triggers evaluation when conditions
 * are met (valid formula + variables exist).
 *
 * @param engine - The FormulaQEngine instance to use for evaluation
 * @returns The state and actions for managing the playground
 *
 * @example
 * ```tsx
 * function Playground() {
 *   const engine = useMemo(() => createFormulaEngine(), []);
 *   const {
 *     state,
 *     addVariable,
 *     editVariable,
 *     removeVariable,
 *     setFormula,
 *     handleValidation,
 *     variableProvider,
 *     canEvaluate,
 *   } = usePlaygroundState(engine);
 *
 *   return (
 *     <div>
 *       <VariablePanel
 *         variables={state.variables}
 *         onAdd={addVariable}
 *         onEdit={editVariable}
 *         onDelete={removeVariable}
 *       />
 *       <FormulaEditor
 *         value={state.formula}
 *         onChange={setFormula}
 *         variableProvider={variableProvider}
 *         onValidation={handleValidation}
 *       />
 *       <ResultsPanel
 *         results={state.evaluationResult?.values ?? []}
 *         errors={state.evaluationResult?.errors}
 *         isEvaluating={state.isEvaluating}
 *       />
 *     </div>
 *   );
 * }
 * ```
 */
export function usePlaygroundState(engine: FormulaQEngine): UsePlaygroundStateReturn {
  const [state, setState] = useState<PlaygroundState>(createInitialState);

  // Ref to track if we should evaluate after validation
  const shouldEvaluateRef = useRef(false);

  // Create VariableProvider from current variables (memoized)
  const variableProvider = useMemo(
    function memoizeVariableProvider() {
      return createVariableProvider(state.variables);
    },
    [state.variables],
  );

  // Check if evaluation can proceed
  const canEvaluateNow = checkCanEvaluate(state);

  // Add variable action
  const addVariable = useCallback(function handleAddVariable(variable: PlaygroundVariable): void {
    setState(function updateState(prevState) {
      return addVariableToState(prevState, variable);
    });
    shouldEvaluateRef.current = true;
  }, []);

  // Edit variable action
  const editVariable = useCallback(function handleEditVariable(variable: PlaygroundVariable): void {
    setState(function updateState(prevState) {
      return editVariableInState(prevState, variable);
    });
    shouldEvaluateRef.current = true;
  }, []);

  // Remove variable action
  const removeVariable = useCallback(function handleRemoveVariable(name: string): void {
    setState(function updateState(prevState) {
      return removeVariableFromState(prevState, name);
    });
    shouldEvaluateRef.current = true;
  }, []);

  // Set formula action
  const setFormula = useCallback(function handleSetFormula(formula: string): void {
    setState(function updateState(prevState) {
      return setFormulaInState(prevState, formula);
    });
  }, []);

  // Handle validation result from FormulaEditor
  const handleValidation = useCallback(function handleValidationResult(
    result: ValidationResult,
  ): void {
    setState(function updateState(prevState) {
      return setValidationResultInState(prevState, result);
    });
    if (result.isValid) {
      shouldEvaluateRef.current = true;
    }
  }, []);

  // Evaluation effect - runs when variables change or validation succeeds
  useEffect(
    function evaluationEffect() {
      // Only evaluate if conditions are met and we should evaluate
      if (!shouldEvaluateRef.current) {
        return;
      }

      if (!checkCanEvaluate(state)) {
        return;
      }

      // Clear the flag
      shouldEvaluateRef.current = false;

      // Start evaluation
      runEvaluation(engine, state, setState);
    },
    [engine, state, state.variables, state.validationResult],
  );

  return {
    state,
    addVariable,
    editVariable,
    removeVariable,
    setFormula,
    handleValidation,
    variableProvider,
    canEvaluate: canEvaluateNow,
  };
}

/**
 * Runs the evaluation asynchronously.
 *
 * @param engine - The FormulaQEngine to use
 * @param state - The current state
 * @param setState - The state setter function
 */
async function runEvaluation(
  engine: FormulaQEngine,
  state: PlaygroundState,
  setState: React.Dispatch<React.SetStateAction<PlaygroundState>>,
): Promise<void> {
  const validatedAST = state.validationResult?.validatedAST;
  if (validatedAST === undefined) {
    return;
  }

  // Set evaluating flag
  setState(function updateState(prevState) {
    return setIsEvaluatingInState(prevState, true);
  });

  try {
    // Create evaluation context from variables
    const evalContext = createEvaluationContext(state.variables);

    // Create aggregation compute context
    const registry = createFunctionRegistry({ includeDefaults: true });
    const aggContext = createAggregationComputeContext(evalContext, registry);

    // Compute aggregations first
    const aggResult = await computeAggregations(validatedAST.root, aggContext);

    // Convert aggregation cache to the format needed for extraction
    const aggregationCache: AggregationCache = aggResult.cache;

    // Extract aggregation results for display
    const aggregationResults: AggregationResult[] = extractAggregations(
      validatedAST.root,
      aggregationCache,
    );

    // Evaluate the formula with the aggregation cache
    const batchResult = await engine.evaluateBatch(validatedAST, evalContext);

    // Create evaluation result
    const evaluationResult: EvaluationResult = createEvaluationResult(
      batchResult.values,
      batchResult.errors,
      aggregationResults,
    );

    // Update state with results
    setState(function updateState(prevState) {
      return setEvaluationResultInState(prevState, evaluationResult);
    });
  } catch (error) {
    // Evaluation failed - clear results and stop evaluating
    setState(function updateState(prevState) {
      return setEvaluationResultInState(prevState, null);
    });
    // Log error for debugging
    console.error('Evaluation failed:', error);
  }
}

// Re-export types for convenience
export type { PlaygroundState, EvaluationResult } from './use-playground-state.view-model.ts';
