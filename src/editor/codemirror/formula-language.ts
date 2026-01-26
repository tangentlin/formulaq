/**
 * CodeMirror language extension for the FormulaQ formula language.
 *
 * This module provides the Lezer-based language support for syntax highlighting,
 * incremental parsing, and editor features for formula editing.
 *
 * @module
 */

import { LRLanguage, LanguageSupport } from '@codemirror/language';
import { parser } from './parser';

/**
 * FormulaQ language definition for CodeMirror.
 *
 * Uses the Lezer parser generated from formula.grammar to provide:
 * - Incremental parsing for responsive editing
 * - Syntax tree for highlighting and code analysis
 * - Error recovery for partial/invalid input
 */
export const formulaLanguage = LRLanguage.define({
  parser,
  languageData: {
    // No comment tokens in FormulaQ MVP
    commentTokens: {},
    // Bracket matching for parentheses
    closeBrackets: { brackets: ['(', '"', "'"] },
  },
});

/**
 * Creates a LanguageSupport instance for FormulaQ.
 *
 * Use this function to add formula language support to a CodeMirror editor.
 *
 * @returns LanguageSupport instance with FormulaQ language and related extensions
 *
 * @example
 * ```typescript
 * import { EditorView, basicSetup } from 'codemirror';
 * import { formula } from './formula-language';
 *
 * const view = new EditorView({
 *   extensions: [basicSetup, formula()],
 *   parent: document.getElementById('editor'),
 * });
 * ```
 */
export function formula(): LanguageSupport {
  return new LanguageSupport(formulaLanguage);
}

/**
 * Re-export the parser for direct access when needed.
 *
 * This can be useful for testing or when you need to parse
 * formula strings outside of an editor context.
 */
export { parser } from './parser';
