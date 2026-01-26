/**
 * Syntax highlighting configuration for the FormulaQ language.
 *
 * This module provides the node property source that maps grammar nodes
 * to highlight tags for CodeMirror syntax highlighting.
 *
 * @module
 */

import type { NodePropSource } from '@lezer/common';
import { styleTags, tags as t } from '@lezer/highlight';

/**
 * Style tags for FormulaQ syntax highlighting.
 *
 * Maps grammar node names to highlight tags:
 * - VariableRef: variableName (blue in most themes)
 * - FunctionName: function (purple in most themes)
 * - Number: number (green in most themes)
 * - String: string (orange in most themes)
 * - Boolean: bool (special color)
 * - Operators: operator (gray in most themes)
 * - Punctuation: paren, punctuation
 */
export const formulaHighlighting: NodePropSource = styleTags({
  // Variable references with @ prefix
  VariableRef: t.variableName,

  // Function names (highlighted as function calls)
  FunctionName: t.function(t.variableName),

  // Literals
  Number: t.number,
  String: t.string,
  Boolean: t.bool,

  // Comparison operators (<=, >=, ==, !=, <>, <, >)
  CompareOp: t.compareOperator,

  // Arithmetic operators (+, -, *, /, %)
  ArithOp: t.arithmeticOperator,

  // Exponentiation operator (^)
  Power: t.arithmeticOperator,

  // String concatenation operator (&)
  Ampersand: t.operator,

  // Punctuation
  '( )': t.paren,
  ',': t.punctuation,
});
