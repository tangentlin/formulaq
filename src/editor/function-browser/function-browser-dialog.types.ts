/**
 * Type definitions for the FunctionBrowserDialog component.
 *
 * This module defines the props interface and related types for the
 * function browser dialog that provides a searchable, categorized
 * view of all available functions.
 *
 * @module
 */

import type { FunctionRegistry, FunctionInfo } from '../../core/types/functions.ts';

/**
 * Available function categories for filtering.
 */
export type FunctionCategory = 'All' | 'Aggregation' | 'Math' | 'Logical' | 'String';

/**
 * List of all function categories.
 */
export const FUNCTION_CATEGORIES: readonly FunctionCategory[] = [
  'All',
  'Aggregation',
  'Math',
  'Logical',
  'String',
];

/**
 * Props for the FunctionBrowserDialog component.
 *
 * The dialog provides a searchable, categorized list of available functions
 * with detailed documentation and examples.
 */
export interface FunctionBrowserDialogProps {
  /**
   * Whether the dialog is open.
   */
  readonly open: boolean;

  /**
   * Callback invoked when the dialog should close.
   */
  readonly onClose: () => void;

  /**
   * Registry of available functions.
   *
   * Used to get the list of functions to display.
   */
  readonly functionRegistry: FunctionRegistry;

  /**
   * Callback invoked when a function is inserted.
   *
   * Receives the function template (e.g., "SUM(") to be inserted
   * at the cursor position in the formula editor.
   *
   * @param template - The function template to insert
   */
  readonly onInsert?: ((template: string) => void) | undefined;
}

/**
 * State for the function browser dialog.
 */
export interface FunctionBrowserState {
  /**
   * Current search query.
   */
  readonly searchQuery: string;

  /**
   * Currently selected category filter.
   */
  readonly selectedCategory: FunctionCategory;

  /**
   * Currently selected function (if any).
   */
  readonly selectedFunction: FunctionInfo | null;
}

/**
 * Initial state for the function browser dialog.
 */
export const INITIAL_FUNCTION_BROWSER_STATE: FunctionBrowserState = {
  searchQuery: '',
  selectedCategory: 'All',
  selectedFunction: null,
};

/**
 * Filters functions based on search query and category.
 *
 * @param functions - Array of function info to filter
 * @param searchQuery - Search query to filter by name or description
 * @param category - Category to filter by
 * @returns Filtered array of function info
 */
export function filterFunctions(
  functions: readonly FunctionInfo[],
  searchQuery: string,
  category: FunctionCategory,
): readonly FunctionInfo[] {
  const lowerQuery = searchQuery.toLowerCase().trim();
  const result: FunctionInfo[] = [];

  for (let i = 0; i < functions.length; i++) {
    const fn = functions[i]!;

    // Filter by category
    if (category !== 'All') {
      const fnCategory = fn.category ?? '';
      if (fnCategory.toLowerCase() !== category.toLowerCase()) {
        continue;
      }
    }

    // Filter by search query
    if (lowerQuery.length > 0) {
      const nameMatch = fn.name.toLowerCase().includes(lowerQuery);
      const descMatch = fn.description.toLowerCase().includes(lowerQuery);
      if (!nameMatch && !descMatch) {
        continue;
      }
    }

    result.push(fn);
  }

  return result;
}

/**
 * Formats a function signature for display.
 *
 * @param fn - The function info
 * @returns Formatted signature string (e.g., "SUM(values)")
 */
export function formatSignature(fn: FunctionInfo): string {
  const params = fn.params;
  const paramNames: string[] = [];

  for (let i = 0; i < params.length; i++) {
    const param = params[i]!;
    let paramStr = param.name;
    if (param.optional) {
      paramStr = '[' + paramStr + ']';
    }
    paramNames.push(paramStr);
  }

  if (fn.isVariadic) {
    paramNames.push('...');
  }

  return fn.name + '(' + paramNames.join(', ') + ')';
}
