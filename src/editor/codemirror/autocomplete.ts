/**
 * CodeMirror autocomplete extension for the FormulaQ formula language.
 *
 * This module provides autocomplete functionality for:
 * - Variable references (triggered by @)
 * - Function names (triggered by typing letters)
 *
 * @module
 */

import type { Extension } from '@codemirror/state';
import type { CompletionContext, CompletionResult, Completion } from '@codemirror/autocomplete';
import { autocompletion } from '@codemirror/autocomplete';
import type { VariableProvider } from '../../core/types/context.ts';
import type { FunctionRegistry } from '../../core/types/functions.ts';
import {
  shouldTriggerVariableCompletion,
  shouldTriggerFunctionCompletion,
  extractVariablePrefix,
  extractFunctionPrefix,
  getCompletionStartPosition,
  getVariableCompletions,
  getFunctionCompletions,
  type FormulaCompletion,
} from './autocomplete.view-model.ts';

/**
 * Configuration options for formula autocomplete.
 */
export interface AutocompleteConfig {
  /**
   * Provider for available variables.
   *
   * Used to generate variable completion suggestions.
   */
  readonly variableProvider: VariableProvider;

  /**
   * Registry of available functions.
   *
   * Used to generate function completion suggestions.
   */
  readonly functionRegistry: FunctionRegistry;
}

/**
 * Converts a FormulaCompletion to a CodeMirror Completion.
 *
 * Maps the framework-agnostic FormulaCompletion interface to
 * CodeMirror's Completion type.
 *
 * @param fc - The FormulaCompletion to convert
 * @returns A CodeMirror Completion object
 */
function toCodeMirrorCompletion(fc: FormulaCompletion): Completion {
  // Build completion object, only including defined properties
  // to satisfy exactOptionalPropertyTypes
  const completion: Completion = {
    label: fc.label,
    type: fc.type,
  };

  if (fc.detail !== undefined) {
    completion.detail = fc.detail;
  }

  if (fc.info !== undefined) {
    completion.info = fc.info;
  }

  if (fc.boost !== undefined) {
    completion.boost = fc.boost;
  }

  // Set the apply property if different from label
  if (fc.apply !== undefined && fc.apply !== fc.label) {
    completion.apply = fc.apply;
  }

  return completion;
}

/**
 * Creates a completion source for variable references.
 *
 * This source is activated when the user types '@' and provides
 * completions for all available variables from the VariableProvider.
 *
 * @param config - The autocomplete configuration
 * @returns A completion source function for variables
 */
function createVariableCompletionSource(
  config: AutocompleteConfig,
): (context: CompletionContext) => CompletionResult | null {
  return function variableCompletionSource(context: CompletionContext): CompletionResult | null {
    const textBefore = context.state.sliceDoc(0, context.pos);

    // Check if we should trigger variable completion
    if (!shouldTriggerVariableCompletion(textBefore)) {
      return null;
    }

    // Extract the prefix for filtering
    const prefix = extractVariablePrefix(textBefore);

    // Get the start position for replacement
    const startOffset = getCompletionStartPosition(textBefore, 'variable');

    // Get completions from the view model
    const formulaCompletions = getVariableCompletions(prefix, config.variableProvider);

    // If no completions, return null
    if (formulaCompletions.length === 0) {
      return null;
    }

    // Convert to CodeMirror completions
    const options: Completion[] = [];
    for (let i = 0; i < formulaCompletions.length; i++) {
      options.push(toCodeMirrorCompletion(formulaCompletions[i]!));
    }

    return {
      from: startOffset,
      to: context.pos,
      options: options,
      validFor: /^@?[a-zA-Z_][a-zA-Z0-9_.]*$/,
    };
  };
}

/**
 * Creates a completion source for function names.
 *
 * This source is activated when the user types letters that could
 * be the start of a function name, and provides completions for
 * all available functions from the FunctionRegistry.
 *
 * @param config - The autocomplete configuration
 * @returns A completion source function for functions
 */
function createFunctionCompletionSource(
  config: AutocompleteConfig,
): (context: CompletionContext) => CompletionResult | null {
  return function functionCompletionSource(context: CompletionContext): CompletionResult | null {
    const textBefore = context.state.sliceDoc(0, context.pos);

    // Check if we should trigger function completion
    if (!shouldTriggerFunctionCompletion(textBefore)) {
      return null;
    }

    // Extract the prefix for filtering
    const prefix = extractFunctionPrefix(textBefore);

    // Get the start position for replacement
    const startOffset = getCompletionStartPosition(textBefore, 'function');

    // Get completions from the view model
    const formulaCompletions = getFunctionCompletions(prefix, config.functionRegistry);

    // If no completions, return null
    if (formulaCompletions.length === 0) {
      return null;
    }

    // Convert to CodeMirror completions
    const options: Completion[] = [];
    for (let i = 0; i < formulaCompletions.length; i++) {
      options.push(toCodeMirrorCompletion(formulaCompletions[i]!));
    }

    return {
      from: startOffset,
      to: context.pos,
      options: options,
      validFor: /^[a-zA-Z_][a-zA-Z0-9_]*$/,
    };
  };
}

/**
 * Creates a CodeMirror autocomplete extension for formula editing.
 *
 * This extension provides:
 * - Variable autocomplete triggered by '@'
 * - Function autocomplete triggered by letters
 * - Keyboard navigation (up/down arrows)
 * - Tab to accept completion
 * - Escape to dismiss
 *
 * @param config - Configuration with variable provider and function registry
 * @returns A CodeMirror extension that adds autocomplete functionality
 *
 * @example
 * ```typescript
 * import { EditorView, basicSetup } from 'codemirror';
 * import { formulaAutocomplete } from './autocomplete';
 * import { createFunctionRegistry } from 'formulaq/core';
 *
 * const registry = createFunctionRegistry({ includeDefaults: true });
 * const provider = {
 *   getVariables: () => [{ name: 'score', type: 'number.float', nullable: true }],
 *   hasVariable: (name) => name === 'score',
 *   getVariableType: (name) => name === 'score' ? 'number.float' : undefined,
 *   isNullable: () => true,
 * };
 *
 * const view = new EditorView({
 *   extensions: [
 *     basicSetup,
 *     formulaAutocomplete({ variableProvider: provider, functionRegistry: registry }),
 *   ],
 *   parent: document.getElementById('editor'),
 * });
 * ```
 */
export function formulaAutocomplete(config: AutocompleteConfig): Extension {
  const variableSource = createVariableCompletionSource(config);
  const functionSource = createFunctionCompletionSource(config);

  return autocompletion({
    override: [variableSource, functionSource],
    // Show completions as soon as the trigger character is typed
    activateOnTyping: true,
    // Default icon mappings work well with our type values
    icons: true,
    // Keep completions open while navigating
    closeOnBlur: true,
    // Maximum number of options to show
    maxRenderedOptions: 50,
    // Default selection behavior
    defaultKeymap: true,
  });
}

/**
 * Re-export types from viewModel for convenience.
 */
export type { FormulaCompletion } from './autocomplete.view-model.ts';
