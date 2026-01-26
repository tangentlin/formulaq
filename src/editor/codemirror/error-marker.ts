/**
 * Error marker extension for CodeMirror.
 *
 * This module provides the error underline extension that displays red wavy underlines
 * for formula errors, along with tooltips showing error messages on hover.
 *
 * @module
 */

import {
  EditorView,
  Decoration,
  type DecorationSet,
  ViewPlugin,
  type ViewUpdate,
  hoverTooltip,
  type Tooltip,
} from '@codemirror/view';
import { StateField, StateEffect, type StateEffectType, type Extension } from '@codemirror/state';

/**
 * Position information for an error in the formula.
 *
 * Used to mark error locations in the editor with underlines and tooltips.
 */
export interface ErrorPosition {
  /**
   * Starting character offset (0-based, inclusive).
   */
  readonly start: number;

  /**
   * Ending character offset (0-based, exclusive).
   */
  readonly end: number;

  /**
   * Human-readable error message to display in the tooltip.
   */
  readonly message: string;
}

/**
 * State effect to set the list of errors in the editor.
 *
 * Dispatch this effect to update the error decorations.
 *
 * @example
 * ```typescript
 * view.dispatch({
 *   effects: setErrors.of([
 *     { start: 5, end: 10, message: 'Unknown variable' }
 *   ])
 * });
 * ```
 */
export const setErrors: StateEffectType<ErrorPosition[]> = StateEffect.define<ErrorPosition[]>();

/**
 * State field that holds the current list of errors.
 *
 * Errors are stored in this field and used to generate decorations
 * and tooltips.
 */
export const errorState: StateField<ErrorPosition[]> = StateField.define<ErrorPosition[]>({
  create(): ErrorPosition[] {
    return [];
  },

  update(errors: ErrorPosition[], transaction): ErrorPosition[] {
    for (const effect of transaction.effects) {
      if (effect.is(setErrors)) {
        return effect.value;
      }
    }
    return errors;
  },
});

/**
 * CSS class for the error underline decoration.
 */
const ERROR_UNDERLINE_CLASS = 'cm-error-underline';

/**
 * Decoration mark for error underlines.
 */
const errorDecoration = Decoration.mark({
  class: ERROR_UNDERLINE_CLASS,
});

/**
 * Creates a DecorationSet from a list of error positions.
 *
 * @param errors - List of error positions to decorate
 * @param docLength - Length of the document
 * @returns DecorationSet with error underlines
 */
function createDecorations(errors: ErrorPosition[], docLength: number): DecorationSet {
  const decorations: Array<{ from: number; to: number }> = [];

  for (const error of errors) {
    // Clamp positions to valid document range
    const from = Math.max(0, Math.min(error.start, docLength));
    const to = Math.max(from, Math.min(error.end, docLength));

    // Only add decoration if there's a valid range
    if (from < to) {
      decorations.push({ from, to });
    }
  }

  // Sort by position (required by CodeMirror)
  decorations.sort(function compareDecorations(a, b) {
    return a.from - b.from || a.to - b.to;
  });

  // Build decoration set
  const builder = [];
  for (const item of decorations) {
    builder.push(errorDecoration.range(item.from, item.to));
  }

  return Decoration.set(builder);
}

/**
 * View plugin that generates decorations from the error state.
 *
 * This plugin watches the error state field and creates appropriate
 * Decoration instances for each error.
 */
const errorDecorationPlugin = ViewPlugin.fromClass(
  class ErrorDecorationPlugin {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      const errors = view.state.field(errorState);
      this.decorations = createDecorations(errors, view.state.doc.length);
    }

    update(update: ViewUpdate): void {
      // Check if errors changed or document changed
      const oldErrors = update.startState.field(errorState);
      const newErrors = update.state.field(errorState);

      if (oldErrors !== newErrors || update.docChanged) {
        this.decorations = createDecorations(newErrors, update.state.doc.length);
      }
    }
  },
  {
    decorations: function getDecorations(plugin) {
      return plugin.decorations;
    },
  },
);

/**
 * Creates a hover tooltip extension for error messages.
 *
 * Shows the error message when the user hovers over an underlined error.
 *
 * @returns Hover tooltip extension
 */
function errorTooltipExtension(): Extension {
  return hoverTooltip(function createErrorTooltip(view: EditorView, pos: number): Tooltip | null {
    const errors = view.state.field(errorState);

    // Find error at this position
    for (const error of errors) {
      if (pos >= error.start && pos <= error.end) {
        return {
          pos: error.start,
          end: error.end,
          above: true,
          create(): { dom: HTMLElement } {
            const dom = document.createElement('div');
            dom.className = 'cm-error-tooltip';
            dom.textContent = error.message;
            return { dom };
          },
        };
      }
    }

    return null;
  });
}

/**
 * Theme extension with error marker styles.
 *
 * Provides the CSS for error underlines and tooltips.
 */
const errorMarkerTheme = {
  '&': {},
  [`& .${ERROR_UNDERLINE_CLASS}`]: {
    textDecoration: 'underline wavy #f44336',
    textUnderlineOffset: '3px',
  },
  '& .cm-error-tooltip': {
    backgroundColor: '#ffebee',
    border: '1px solid #f44336',
    borderRadius: '4px',
    padding: '4px 8px',
    fontSize: '12px',
    color: '#c62828',
    maxWidth: '300px',
    wordWrap: 'break-word' as const,
  },
};

/**
 * Creates the complete error marker extension for CodeMirror.
 *
 * This extension provides:
 * - Red wavy underlines for error positions
 * - Tooltips showing error messages on hover
 * - A state field for managing errors
 *
 * @returns Extension array to add to CodeMirror
 *
 * @example
 * ```typescript
 * import { EditorView, basicSetup } from 'codemirror';
 * import { errorMarkerExtension, setErrors } from './error-marker';
 *
 * const view = new EditorView({
 *   extensions: [basicSetup, errorMarkerExtension()],
 *   parent: document.getElementById('editor'),
 * });
 *
 * // Add errors
 * view.dispatch({
 *   effects: setErrors.of([
 *     { start: 0, end: 5, message: 'Unknown variable @foo' }
 *   ])
 * });
 * ```
 */
export function errorMarkerExtension(): Extension {
  return [
    errorState,
    errorDecorationPlugin,
    errorTooltipExtension(),
    EditorView.theme(errorMarkerTheme),
  ];
}

/**
 * Helper function to update errors in an editor view.
 *
 * This is a convenience function that dispatches the setErrors effect.
 *
 * @param view - The CodeMirror EditorView
 * @param errors - The list of errors to display
 *
 * @example
 * ```typescript
 * updateErrors(view, [
 *   { start: 0, end: 5, message: 'Unknown variable @foo' }
 * ]);
 * ```
 */
export function updateErrors(view: EditorView, errors: ErrorPosition[]): void {
  view.dispatch({
    effects: setErrors.of(errors),
  });
}

/**
 * Clears all errors from the editor.
 *
 * @param view - The CodeMirror EditorView
 *
 * @example
 * ```typescript
 * clearErrors(view);
 * ```
 */
export function clearErrors(view: EditorView): void {
  view.dispatch({
    effects: setErrors.of([]),
  });
}
