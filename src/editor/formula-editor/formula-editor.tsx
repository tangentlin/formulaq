/**
 * FormulaEditor component for editing and validating formulas.
 *
 * This is the main editor component that combines CodeMirror with
 * formula language support, syntax highlighting, autocomplete,
 * error markers, and validation status display.
 *
 * @module
 */

import { Box, IconButton, Tooltip } from '@mui/material';
import MenuBookOutlinedIcon from '@mui/icons-material/MenuBookOutlined';
import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { EditorView, keymap, placeholder as placeholderExt } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { EditorState, Compartment } from '@codemirror/state';
import { bracketMatching } from '@codemirror/language';

import { formula } from '../codemirror/formula-language.ts';
import { formulaHighlighting } from '../codemirror/highlighting.ts';
import { formulaAutocomplete } from '../codemirror/autocomplete.ts';
import { errorMarkerExtension, updateErrors, clearErrors } from '../codemirror/error-marker.ts';
import { ValidationStatus } from '../validation-status/validation-status.tsx';
import { FunctionBrowserDialog } from '../function-browser/function-browser-dialog.tsx';

import { createFunctionRegistry } from '../../core/functions/function-registry.ts';
import { parse } from '../../core/formula-parser/parser.ts';
import { Validator } from '../../core/formula-validator/validator.ts';
import type { FunctionRegistry } from '../../core/types/functions.ts';
import type { FormulaError } from '../../core/types/errors.ts';

import type { FormulaEditorProps, ValidationResult } from './formula-editor.types.ts';
import {
  createValidationDebouncer,
  errorsToMarkerPositions,
  getValidationStatus,
  getErrorMessage,
  getErrorPosition,
  normalizeHeight,
} from './formula-editor.view-model.ts';

/**
 * Default debounce delay for validation in milliseconds.
 */
const DEFAULT_VALIDATION_DEBOUNCE_MS = 300;

/**
 * Default height for the editor.
 */
const DEFAULT_HEIGHT = '100px';

/**
 * FormulaEditor component providing a complete formula editing experience.
 *
 * Features:
 * - Syntax highlighting for formula language elements
 * - Autocomplete for variables (triggered by @) and functions
 * - Debounced validation with error markers in the editor
 * - Visual validation status feedback below the editor
 *
 * @param props - Component props
 * @returns The rendered FormulaEditor component
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const [formula, setFormula] = useState('');
 *   const variableProvider = useMemo(() => createMyVariableProvider(), []);
 *
 *   function handleValidation(result: ValidationResult) {
 *     if (result.isValid) {
 *       console.log('Valid formula!', result.validatedAST);
 *     } else {
 *       console.log('Errors:', result.errors);
 *     }
 *   }
 *
 *   return (
 *     <FormulaEditor
 *       value={formula}
 *       onChange={setFormula}
 *       variableProvider={variableProvider}
 *       onValidation={handleValidation}
 *     />
 *   );
 * }
 * ```
 */
export function FormulaEditor(props: FormulaEditorProps): React.ReactElement {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const editableCompartment = useRef(new Compartment());

  // Track validation state
  const [validationResult, setValidationResult] = useState<ValidationResult | undefined>(undefined);
  const [isValidating, setIsValidating] = useState(false);
  const [functionBrowserOpen, setFunctionBrowserOpen] = useState(false);

  // Get props with defaults
  const debounceMs = props.validationDebounceMs ?? DEFAULT_VALIDATION_DEBOUNCE_MS;
  const height = normalizeHeight(props.height ?? DEFAULT_HEIGHT);
  const disabled = props.disabled ?? false;
  const placeholderText = props.placeholder ?? '';
  const showHelpButton = props.showHelpButton ?? false;

  // Create or use the function registry
  const functionRegistry = useMemo(
    function getFunctionRegistry(): FunctionRegistry {
      if (props.functionRegistry !== undefined) {
        return props.functionRegistry;
      }
      return createFunctionRegistry({ includeDefaults: true });
    },
    [props.functionRegistry],
  );

  // Validation function
  const performValidation = useCallback(
    function performValidation(formulaText: string): void {
      // Empty formula is considered idle, not invalid
      if (formulaText.trim() === '') {
        const result: ValidationResult = { isValid: true };
        setValidationResult(result);
        setIsValidating(false);

        // Clear error markers
        if (viewRef.current) {
          clearErrors(viewRef.current);
        }

        // Notify parent
        if (props.onValidation) {
          props.onValidation(result);
        }
        return;
      }

      try {
        // Parse the formula
        const ast = parse(formulaText);

        // Validate the AST
        const validator = new Validator(props.variableProvider, functionRegistry);
        const validatorResult = validator.validate(ast);

        if (validatorResult.success) {
          // Validation succeeded
          const result: ValidationResult = {
            isValid: true,
            validatedAST: validatorResult.ast,
          };
          setValidationResult(result);

          // Clear error markers
          if (viewRef.current) {
            clearErrors(viewRef.current);
          }

          // Notify parent
          if (props.onValidation) {
            props.onValidation(result);
          }
        } else {
          // Validation failed with semantic errors
          const result: ValidationResult = {
            isValid: false,
            errors: validatorResult.errors,
          };
          setValidationResult(result);

          // Update error markers
          if (viewRef.current) {
            const markerPositions = errorsToMarkerPositions(validatorResult.errors, formulaText);
            updateErrors(viewRef.current, markerPositions);
          }

          // Notify parent
          if (props.onValidation) {
            props.onValidation(result);
          }
        }
      } catch (error) {
        // Parse or validation error (likely syntax error)
        const formulaError = error as FormulaError;
        const result: ValidationResult = {
          isValid: false,
          errors: [formulaError],
        };
        setValidationResult(result);

        // Update error markers
        if (viewRef.current) {
          const markerPositions = errorsToMarkerPositions([formulaError], formulaText);
          updateErrors(viewRef.current, markerPositions);
        }

        // Notify parent
        if (props.onValidation) {
          props.onValidation(result);
        }
      }

      setIsValidating(false);
    },
    [props.variableProvider, functionRegistry, props.onValidation],
  );

  // Create the validation debouncer
  const debouncer = useMemo(
    function createDebouncer() {
      return createValidationDebouncer(debounceMs, performValidation);
    },
    [debounceMs, performValidation],
  );

  // Cleanup debouncer on unmount
  useEffect(
    function cleanupDebouncer() {
      return function cleanup() {
        debouncer.cancel();
      };
    },
    [debouncer],
  );

  // Initialize CodeMirror editor
  useEffect(
    function initializeEditor() {
      if (!containerRef.current) return;

      // Destroy any existing editor
      if (viewRef.current) {
        viewRef.current.destroy();
        viewRef.current = null;
      }

      // Build extensions array
      const extensions = [
        keymap.of([...defaultKeymap, ...historyKeymap]),
        history(),
        bracketMatching(),
        formula(),
        formulaHighlighting,
        formulaAutocomplete({
          variableProvider: props.variableProvider,
          functionRegistry: functionRegistry,
        }),
        errorMarkerExtension(),
        editableCompartment.current.of(EditorView.editable.of(!disabled)),
        EditorView.updateListener.of(function handleUpdate(update) {
          if (update.docChanged) {
            const newValue = update.state.doc.toString();

            // Notify parent of change
            props.onChange(newValue);

            // Set validating state and schedule validation
            if (newValue.trim() !== '') {
              setIsValidating(true);
            }
            debouncer.validate(newValue);
          }
        }),
        EditorView.theme({
          '&': {
            fontSize: '14px',
            fontFamily: '"Roboto Mono", "Consolas", "Monaco", monospace',
          },
          '.cm-content': {
            padding: '8px 12px',
            minHeight: height,
          },
          '.cm-scroller': {
            minHeight: height,
          },
          '&.cm-focused': {
            outline: 'none',
          },
        }),
      ];

      // Add placeholder if provided
      if (placeholderText) {
        extensions.push(placeholderExt(placeholderText));
      }

      // Create the editor state
      const startState = EditorState.create({
        doc: props.value,
        extensions: extensions,
      });

      // Create the editor view
      const view = new EditorView({
        state: startState,
        parent: containerRef.current,
      });

      viewRef.current = view;

      // Perform initial validation
      if (props.value.trim() !== '') {
        setIsValidating(true);
        debouncer.validate(props.value);
      }

      return function cleanup() {
        view.destroy();
      };
    },
    [props.variableProvider, functionRegistry, placeholderText, height],
  );
  // Note: We intentionally exclude props.value, props.onChange, debouncer, and disabled
  // from deps to avoid recreating the editor on every change.
  // Value sync is handled separately below.

  // Sync external value changes to the editor
  useEffect(
    function syncExternalValue() {
      const view = viewRef.current;
      if (!view) return;

      const currentValue = view.state.doc.toString();
      if (currentValue !== props.value) {
        view.dispatch({
          changes: {
            from: 0,
            to: currentValue.length,
            insert: props.value,
          },
        });
      }
    },
    [props.value],
  );

  // Update editable state when disabled changes
  useEffect(
    function updateEditableState() {
      const view = viewRef.current;
      if (!view) return;

      view.dispatch({
        effects: editableCompartment.current.reconfigure(EditorView.editable.of(!disabled)),
      });
    },
    [disabled],
  );

  // Compute validation status display props
  const validationStatus = getValidationStatus(
    validationResult,
    isValidating,
    props.value.trim() === '',
  );
  const errorMessage = getErrorMessage(validationResult);
  const errorPosition = getErrorPosition(validationResult, props.value);

  // Function browser handlers
  const handleOpenFunctionBrowser = useCallback(function handleOpenFunctionBrowser(): void {
    setFunctionBrowserOpen(true);
  }, []);

  const handleCloseFunctionBrowser = useCallback(function handleCloseFunctionBrowser(): void {
    setFunctionBrowserOpen(false);
  }, []);

  const handleInsertFunction = useCallback(
    function handleInsertFunction(template: string): void {
      const view = viewRef.current;
      if (view === null) {
        // If no editor, just append to value
        props.onChange(props.value + template);
        return;
      }

      // Insert at cursor position
      const selection = view.state.selection.main;
      view.dispatch({
        changes: {
          from: selection.from,
          to: selection.to,
          insert: template,
        },
        selection: {
          anchor: selection.from + template.length,
        },
      });

      // Focus the editor
      view.focus();
    },
    [props.onChange, props.value],
  );

  return (
    <Box sx={{ display: 'flex', gap: 1 }}>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          border: 1,
          borderColor: disabled ? 'action.disabled' : 'divider',
          borderRadius: 1,
          overflow: 'hidden',
          backgroundColor: disabled ? 'action.disabledBackground' : 'background.paper',
          opacity: disabled ? 0.7 : 1,
        }}
      >
        <Box
          ref={containerRef}
          sx={{
            flexGrow: 1,
            '& .cm-editor': {
              cursor: disabled ? 'not-allowed' : 'text',
            },
          }}
        />
        <ValidationStatus
          status={validationStatus}
          errorMessage={errorMessage}
          errorPosition={errorPosition}
        />
      </Box>

      {showHelpButton && (
        <Tooltip title="Browse functions">
          <IconButton
            onClick={handleOpenFunctionBrowser}
            disabled={disabled}
            size="small"
            sx={{
              alignSelf: 'flex-start',
              mt: 0.5,
              border: 1,
              borderColor: 'divider',
              borderRadius: 1,
            }}
            aria-label="Open function browser"
          >
            <MenuBookOutlinedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      )}

      <FunctionBrowserDialog
        open={functionBrowserOpen}
        onClose={handleCloseFunctionBrowser}
        functionRegistry={functionRegistry}
        onInsert={handleInsertFunction}
      />
    </Box>
  );
}
