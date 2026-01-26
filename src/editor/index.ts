/**
 * FormulaQ Editor
 *
 * React component for editing formulas with syntax highlighting and autocomplete.
 * Built on CodeMirror 6.
 *
 * @example
 * ```tsx
 * import { FormulaEditor } from 'formulaq/editor';
 *
 * function MyComponent() {
 *   const [formula, setFormula] = useState('@value * 2');
 *
 *   return (
 *     <FormulaEditor
 *       value={formula}
 *       onChange={setFormula}
 *       variableProvider={provider}
 *       onValidation={handleValidation}
 *     />
 *   );
 * }
 * ```
 *
 * @packageDocumentation
 */

// FormulaEditor component
export { FormulaEditor } from './formula-editor/formula-editor.tsx';
export type {
  FormulaEditorProps,
  ValidationResult,
} from './formula-editor/formula-editor.types.ts';

// ValidationStatus component
export { ValidationStatus } from './validation-status/validation-status.tsx';
export type {
  ValidationStatusProps,
  ValidationState,
  ErrorPositionInfo,
} from './validation-status/validation-status.types.ts';

// CodeMirror extensions (for advanced usage)
export { formula, formulaLanguage } from './codemirror/formula-language.ts';
export { formulaHighlighting, formulaHighlightStyle } from './codemirror/highlighting.ts';
export { formulaAutocomplete } from './codemirror/autocomplete.ts';
export {
  errorMarkerExtension,
  updateErrors,
  clearErrors,
  setErrors,
} from './codemirror/error-marker.ts';
export type { ErrorPosition } from './codemirror/error-marker.ts';
export type { AutocompleteConfig } from './codemirror/autocomplete.ts';

// Package version
export const VERSION = '0.1.0';
