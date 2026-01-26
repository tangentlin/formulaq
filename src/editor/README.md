# FormulaQ Editor

A React component for editing formula expressions with syntax highlighting, autocomplete, and real-time validation. Built on CodeMirror 6.

## Installation

```typescript
import { FormulaEditor } from 'formulaq/editor';
```

## Quick Start

```tsx
import { useState } from 'react';
import { FormulaEditor } from 'formulaq/editor';
import type { VariableProvider } from 'formulaq/core';

function MyComponent() {
  const [formula, setFormula] = useState('@price * @quantity');

  const variableProvider: VariableProvider = {
    getVariables: () => [
      { name: 'price', type: 'number.float', nullable: true, description: 'Product price' },
      { name: 'quantity', type: 'number.float', nullable: true, description: 'Order quantity' },
    ],
    hasVariable: (name) => ['price', 'quantity'].includes(name),
    getVariableType: (name) => 'number.float',
    isNullable: () => true,
  };

  return (
    <FormulaEditor
      value={formula}
      onChange={setFormula}
      variableProvider={variableProvider}
      onValidation={(result) => {
        if (result.isValid) {
          console.log('Valid! AST:', result.validatedAST);
        } else {
          console.log('Errors:', result.errors);
        }
      }}
    />
  );
}
```

## API Reference

### FormulaEditor Component

The main formula editor component with integrated validation and autocomplete.

#### Props

| Prop                   | Type                                 | Required | Default          | Description                   |
| ---------------------- | ------------------------------------ | -------- | ---------------- | ----------------------------- |
| `value`                | `string`                             | Yes      | -                | The current formula string    |
| `onChange`             | `(value: string) => void`            | Yes      | -                | Called on every change        |
| `variableProvider`     | `VariableProvider`                   | Yes      | -                | Provides variable metadata    |
| `functionRegistry`     | `FunctionRegistry`                   | No       | Default registry | Custom function registry      |
| `onValidation`         | `(result: ValidationResult) => void` | No       | -                | Called after validation       |
| `validationDebounceMs` | `number`                             | No       | `300`            | Debounce delay for validation |
| `placeholder`          | `string`                             | No       | -                | Placeholder text              |
| `disabled`             | `boolean`                            | No       | `false`          | Disable editing               |
| `height`               | `string \| number`                   | No       | `'100px'`        | Editor height                 |

#### Example with All Props

```tsx
<FormulaEditor
  value={formula}
  onChange={setFormula}
  variableProvider={variableProvider}
  functionRegistry={customRegistry}
  onValidation={handleValidation}
  validationDebounceMs={500}
  placeholder="Enter a formula (e.g., @price * @quantity)"
  disabled={isLoading}
  height="150px"
/>
```

### ValidationResult

The result object passed to `onValidation`.

```typescript
interface ValidationResult {
  // Whether the formula is valid
  isValid: boolean;

  // The validated AST (only when isValid is true)
  validatedAST?: ValidatedAST;

  // Validation errors (only when isValid is false)
  errors?: FormulaError[];
}
```

#### Handling Validation Results

```tsx
function handleValidation(result: ValidationResult) {
  if (result.isValid) {
    // Access the validated AST
    console.log('Result type:', result.validatedAST?.resultType);
    console.log('Dependencies:', result.validatedAST?.dependencies);
    console.log('Has aggregations:', result.validatedAST?.hasAggregations);

    // Enable save button, run preview, etc.
    setCanSave(true);
  } else {
    // Handle errors
    for (const error of result.errors ?? []) {
      console.log('Error:', error.message);
      console.log('Position:', error.position);
    }
    setCanSave(false);
  }
}
```

## Features

### Syntax Highlighting

The editor provides syntax highlighting for:

- **Variables** (`@name`) - Blue
- **Functions** - Purple
- **Numbers** - Green
- **Strings** - Orange
- **Operators** - Gray

### Autocomplete

Autocomplete is triggered automatically:

- **Variables**: Typing `@` shows available variables
- **Functions**: Typing letters shows matching functions

```tsx
// Variables shown when typing @
const variableProvider: VariableProvider = {
  getVariables: () => [
    { name: 'price', type: 'number.float', nullable: true, description: 'Product price' },
    { name: 'quantity', type: 'number.integer', nullable: false, description: 'Order quantity' },
    { name: 'discount', type: 'number.float', nullable: true, group: 'Pricing' },
  ],
  // ... other methods
};
```

Autocomplete shows:

- Variable name and type
- Optional description
- Grouping (if provided)

### Error Markers

Validation errors are shown as:

- Red wavy underlines in the editor
- Error message in the status bar below
- Tooltip on hover over the error

### Keyboard Shortcuts

| Shortcut               | Action                         |
| ---------------------- | ------------------------------ |
| `Ctrl/Cmd + Z`         | Undo                           |
| `Ctrl/Cmd + Shift + Z` | Redo                           |
| `Tab`                  | Accept autocomplete suggestion |
| `Escape`               | Close autocomplete             |
| `Up/Down`              | Navigate autocomplete          |

## ValidationStatus Component

A standalone component for displaying validation status.

```tsx
import { ValidationStatus, type ValidationState } from 'formulaq/editor';

<ValidationStatus
  status="valid" // 'idle' | 'validating' | 'valid' | 'invalid'
  errorMessage="Unknown variable @foo"
  errorPosition={{ line: 1, column: 15 }}
/>;
```

### Props

| Prop            | Type                | Description                 |
| --------------- | ------------------- | --------------------------- |
| `status`        | `ValidationState`   | Current validation status   |
| `errorMessage`  | `string`            | Error message to display    |
| `errorPosition` | `ErrorPositionInfo` | Position info for the error |

### Validation States

| State        | Display                                 |
| ------------ | --------------------------------------- |
| `idle`       | No status shown                         |
| `validating` | "Validating..." with spinner            |
| `valid`      | Green checkmark with "Formula is valid" |
| `invalid`    | Red X with error message                |

## CodeMirror Extensions

For advanced usage, you can access the underlying CodeMirror extensions.

### Formula Language

```typescript
import { formula, formulaLanguage } from 'formulaq/editor';

// Create a CodeMirror editor with formula language
const extensions = [
  formula(), // Full formula language support
];
```

### Syntax Highlighting

```typescript
import { formulaHighlighting, formulaHighlightStyle } from 'formulaq/editor';

// Add highlighting to your editor
const extensions = [
  formulaHighlighting, // Default formula highlighting
];
```

### Autocomplete

```typescript
import { formulaAutocomplete, type AutocompleteConfig } from 'formulaq/editor';

const config: AutocompleteConfig = {
  variableProvider: myProvider,
  functionRegistry: myRegistry,
};

const extensions = [formulaAutocomplete(config)];
```

### Error Markers

```typescript
import { errorMarkerExtension, updateErrors, clearErrors, setErrors } from 'formulaq/editor';

// Add error marker support to your editor
const extensions = [errorMarkerExtension()];

// Update errors programmatically
updateErrors(editorView, [{ from: 0, to: 5, message: 'Unknown variable' }]);

// Clear all errors
clearErrors(editorView);
```

## Styling

### Height Customization

```tsx
// Fixed height
<FormulaEditor height="200px" ... />

// Responsive height
<FormulaEditor height="calc(100vh - 300px)" ... />

// Numeric (pixels)
<FormulaEditor height={150} ... />
```

### Custom Container Styling

The editor is wrapped in a MUI Box. You can style the container:

```tsx
<Box sx={{ maxWidth: 600, margin: '0 auto' }}>
  <FormulaEditor ... />
</Box>
```

### Theme Integration

The editor uses MUI theme colors for:

- Border colors
- Background colors
- Disabled state styling

The syntax highlighting theme is designed to work with light themes.

## Integration Examples

### With Form Validation

```tsx
import { useForm } from 'react-hook-form';

function FormulaForm() {
  const { register, handleSubmit, setError, clearErrors } = useForm();
  const [formula, setFormula] = useState('');
  const [validatedAST, setValidatedAST] = useState<ValidatedAST | null>(null);

  function handleValidation(result: ValidationResult) {
    if (result.isValid) {
      clearErrors('formula');
      setValidatedAST(result.validatedAST ?? null);
    } else {
      setError('formula', { message: result.errors?.[0]?.message });
      setValidatedAST(null);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <FormulaEditor
        value={formula}
        onChange={setFormula}
        variableProvider={provider}
        onValidation={handleValidation}
      />
      <Button type="submit" disabled={!validatedAST}>
        Save
      </Button>
    </form>
  );
}
```

### With Preview Evaluation

```tsx
function FormulaWithPreview() {
  const [formula, setFormula] = useState('');
  const [validatedAST, setValidatedAST] = useState<ValidatedAST | null>(null);
  const [previewResults, setPreviewResults] = useState<Value[]>([]);

  async function handleValidation(result: ValidationResult) {
    if (result.isValid && result.validatedAST) {
      setValidatedAST(result.validatedAST);

      // Evaluate preview
      const engine = createFormulaEngine();
      const evalResult = await engine.evaluateBatch(result.validatedAST, previewContext, {
        chunkSize: 10,
      });
      setPreviewResults(evalResult.values);
    }
  }

  return (
    <Box>
      <FormulaEditor
        value={formula}
        onChange={setFormula}
        variableProvider={provider}
        onValidation={handleValidation}
      />
      {previewResults.length > 0 && <PreviewTable results={previewResults} />}
    </Box>
  );
}
```

### In a Dialog

```tsx
function FormulaDialog({ open, onClose, onSave }) {
  const [formula, setFormula] = useState('');
  const [isValid, setIsValid] = useState(false);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Edit Formula</DialogTitle>
      <DialogContent>
        <FormulaEditor
          value={formula}
          onChange={setFormula}
          variableProvider={provider}
          onValidation={(result) => setIsValid(result.isValid)}
          height="200px"
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={() => onSave(formula)} disabled={!isValid} variant="contained">
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}
```

## Exports

```typescript
// Main component
export { FormulaEditor } from 'formulaq/editor';
export type { FormulaEditorProps, ValidationResult } from 'formulaq/editor';

// ValidationStatus component
export { ValidationStatus } from 'formulaq/editor';
export type { ValidationStatusProps, ValidationState, ErrorPositionInfo } from 'formulaq/editor';

// CodeMirror extensions
export { formula, formulaLanguage } from 'formulaq/editor';
export { formulaHighlighting, formulaHighlightStyle } from 'formulaq/editor';
export { formulaAutocomplete, type AutocompleteConfig } from 'formulaq/editor';
export { errorMarkerExtension, updateErrors, clearErrors, setErrors } from 'formulaq/editor';
export type { ErrorPosition } from 'formulaq/editor';
```
