/**
 * Syntax highlighting theme for the FormulaQ formula language.
 *
 * This module provides the HighlightStyle that defines colors for
 * formula syntax elements. It works with the styleTags defined in
 * highlight.ts to provide complete syntax highlighting.
 *
 * @module
 */

import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags } from '@lezer/highlight';

/**
 * Color constants for FormulaQ syntax highlighting.
 *
 * These colors are designed for a light theme and provide
 * good contrast and visual distinction between element types.
 */
export const HIGHLIGHT_COLORS = {
  /** Variables (@name) - Blue for easy identification of data references */
  variableName: '#2196F3',
  /** Functions - Purple to distinguish from variables */
  function: '#9C27B0',
  /** Numbers - Green for numeric literals */
  number: '#4CAF50',
  /** Strings - Orange for string literals */
  string: '#FF9800',
  /** Booleans - Cyan for TRUE/FALSE */
  bool: '#00BCD4',
  /** Operators - Gray for arithmetic and comparison operators */
  operator: '#616161',
  /** Parentheses - Dark gray for grouping symbols */
  paren: '#424242',
  /** Punctuation (commas) - Dark gray */
  punctuation: '#424242',
} as const;

/**
 * FormulaQ syntax highlight style definition.
 *
 * Maps Lezer highlight tags to specific colors for the formula language.
 * This style is designed for light theme backgrounds.
 *
 * Color assignments:
 * - Variables (@name): Blue (#2196F3) - variableName tag
 * - Functions: Purple (#9C27B0) - function(variableName) tag
 * - Numbers: Green (#4CAF50) - number tag
 * - Strings: Orange (#FF9800) - string tag
 * - Booleans: Cyan (#00BCD4) - bool tag
 * - Operators: Gray (#616161) - operator, arithmeticOperator, compareOperator tags
 * - Parentheses: Dark Gray (#424242) - paren tag
 */
export const formulaHighlightStyle = HighlightStyle.define([
  // Variable references with @ prefix
  { tag: tags.variableName, color: HIGHLIGHT_COLORS.variableName },

  // Function names (uses the function modifier on variableName)
  { tag: tags.function(tags.variableName), color: HIGHLIGHT_COLORS.function },

  // Numeric literals
  { tag: tags.number, color: HIGHLIGHT_COLORS.number },

  // String literals
  { tag: tags.string, color: HIGHLIGHT_COLORS.string },

  // Boolean literals (TRUE, FALSE)
  { tag: tags.bool, color: HIGHLIGHT_COLORS.bool },

  // All operator types
  { tag: tags.operator, color: HIGHLIGHT_COLORS.operator },
  { tag: tags.arithmeticOperator, color: HIGHLIGHT_COLORS.operator },
  { tag: tags.compareOperator, color: HIGHLIGHT_COLORS.operator },

  // Parentheses and punctuation
  { tag: tags.paren, color: HIGHLIGHT_COLORS.paren },
  { tag: tags.punctuation, color: HIGHLIGHT_COLORS.punctuation },
]);

/**
 * CodeMirror extension for FormulaQ syntax highlighting.
 *
 * Use this extension to add formula highlighting to a CodeMirror editor.
 * Should be used in combination with the formula() language extension.
 *
 * @example
 * ```typescript
 * import { EditorView, basicSetup } from 'codemirror';
 * import { formula } from './formula-language';
 * import { formulaHighlighting } from './highlighting';
 *
 * const view = new EditorView({
 *   extensions: [basicSetup, formula(), formulaHighlighting],
 *   parent: document.getElementById('editor'),
 * });
 * ```
 */
export const formulaHighlighting = syntaxHighlighting(formulaHighlightStyle);
