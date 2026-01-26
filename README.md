# FormulaQ

An extensible formula engine for React applications. FormulaQ provides parsing, validation, and evaluation of spreadsheet-like formulas with seamless integration into MUI DataGrid.

## Features

- **Formula Parser**: Chevrotain-based parser with detailed error messages
- **Type System**: Hierarchical type system with null propagation
- **Built-in Functions**: Aggregations (SUM, AVG, MIN, MAX, COUNT, PERCENTILE), Math (LOG, LOG10, POWER), Logical (IF, AND, OR, NOT, IFNULL), and String (CONCAT)
- **Custom Functions**: Extensible function registry
- **React Editor**: CodeMirror-based editor with syntax highlighting and autocomplete
- **DataGrid Integration**: First-class MUI DataGrid support with formula columns
- **Performance**: Chunked evaluation with progress reporting and cancellation

## Installation

```bash
npm install formulaq
# or
pnpm add formulaq
# or
yarn add formulaq
```

### Peer Dependencies

FormulaQ requires React 19+:

```bash
npm install react react-dom
```

For DataGrid integration, install MUI X DataGrid:

```bash
npm install @mui/x-data-grid @mui/material @emotion/react @emotion/styled
```

## Quick Start

### Basic Formula Evaluation

```typescript
import { createFormulaEngine, type EvaluationContext } from 'formulaq/core';

// Create the engine
const engine = createFormulaEngine();

// Parse a formula
const ast = engine.parse('@price * @quantity');

// Create evaluation context
const context: EvaluationContext = {
  variables: {
    price: [
      { type: 'number.float', value: 10.0 },
      { type: 'number.float', value: 25.0 },
    ],
    quantity: [
      { type: 'number.float', value: 2 },
      { type: 'number.float', value: 3 },
    ],
  },
  rowCount: 2,
};

// Execute the formula
const result = await engine.execute('@price * @quantity', context);
console.log(result.values); // [{ type: 'number.float', value: 20 }, { type: 'number.float', value: 75 }]
```

### Formula Editor Component

```tsx
import { FormulaEditor } from 'formulaq/editor';
import type { VariableProvider } from 'formulaq/core';

function MyComponent() {
  const [formula, setFormula] = useState('@price * @quantity');

  // Create a variable provider for autocomplete and validation
  const variableProvider: VariableProvider = {
    getVariables: () => [
      { name: 'price', type: 'number.float', nullable: true },
      { name: 'quantity', type: 'number.float', nullable: true },
    ],
    hasVariable: (name) => ['price', 'quantity'].includes(name),
    getVariableType: (name) => {
      if (name === 'price' || name === 'quantity') return 'number.float';
      return undefined;
    },
    isNullable: () => true,
  };

  return (
    <FormulaEditor
      value={formula}
      onChange={setFormula}
      variableProvider={variableProvider}
      onValidation={(result) => {
        if (result.isValid) {
          console.log('Formula is valid!');
        } else {
          console.log('Errors:', result.errors);
        }
      }}
    />
  );
}
```

### Interactive Playground

```tsx
import { Playground } from 'formulaq/playground';

function App() {
  return (
    <Playground
      initialVariables={[
        { name: 'score', type: 'number.float', values: [85, 92, 78, 95] },
        { name: 'weight', type: 'number.float', values: [0.3, 0.3, 0.2, 0.2] },
      ]}
      initialFormula="@score * @weight"
    />
  );
}
```

### DataGrid Integration

```tsx
import { DataGrid } from '@mui/x-data-grid';
import { useFormulaColumns } from 'formulaq/datagrid';

function MyDataGrid() {
  const baseColumns = [
    { field: 'id', headerName: 'ID', type: 'number' },
    { field: 'price', headerName: 'Price', type: 'number' },
    { field: 'quantity', headerName: 'Quantity', type: 'number' },
  ];

  const rows = [
    { id: 1, price: 10, quantity: 2 },
    { id: 2, price: 25, quantity: 3 },
    { id: 3, price: 15, quantity: 4 },
  ];

  const { columns, addFormula, isEvaluating } = useFormulaColumns({
    baseColumns,
    rows,
  });

  const handleAddTotal = () => {
    addFormula('total', '@price * @quantity', 'Total');
  };

  return (
    <div>
      <Button onClick={handleAddTotal}>Add Total Column</Button>
      <DataGrid
        columns={columns}
        rows={rows}
        loading={isEvaluating}
      />
    </div>
  );
}
```

## Package Exports

FormulaQ uses subpath exports for tree-shaking:

| Import Path | Description |
|-------------|-------------|
| `formulaq/core` | Parser, validator, evaluator, and engine |
| `formulaq/editor` | FormulaEditor React component |
| `formulaq/playground` | Interactive playground component |
| `formulaq/datagrid` | MUI DataGrid integration |

## Documentation

- [Core API Reference](./src/core/README.md) - FormulaQ engine, types, and functions
- [Editor Component](./src/editor/README.md) - Formula editor with CodeMirror
- [Playground](./src/playground/README.md) - Interactive testing UI
- [DataGrid Integration](./src/datagrid/README.md) - MUI DataGrid formula columns

## Formula Syntax

### Variables

Variables are referenced with the `@` prefix:

```
@price
@quantity
@result_data.minimized_affinity
```

### Operators

| Category | Operators |
|----------|-----------|
| Arithmetic | `+`, `-`, `*`, `/`, `^` (power), `%` (modulo) |
| Comparison | `==`, `!=`, `<>`, `<`, `>`, `<=`, `>=` |
| String | `&` (concatenation) |

### Functions

```
SUM(@values)
AVG(@scores)
IF(@price > 100, "expensive", "affordable")
CONCAT(@first_name, " ", @last_name)
```

### Examples

```
# Basic arithmetic
@price * @quantity

# Conditional logic
IF(@score >= 90, "A", IF(@score >= 80, "B", "C"))

# Aggregations
AVG(@score) / MAX(@score) * 100

# String operations
CONCAT(@first_name, " ", @last_name)

# Null handling
IFNULL(@value, 0)
```

## Built-in Functions

| Category | Functions |
|----------|-----------|
| Aggregation | `SUM`, `AVG`, `MIN`, `MAX`, `COUNT`, `PERCENTILE` |
| Math | `LOG`, `LOG10`, `POWER` |
| Logical | `IF`, `AND`, `OR`, `NOT`, `IFNULL` |
| String | `CONCAT` |

## Type System

FormulaQ uses a hierarchical type system:

| Type | Description |
|------|-------------|
| `number.integer` | Whole numbers |
| `number.float` | IEEE 754 double-precision floats |
| `string.text` | UTF-8 text strings |
| `boolean.boolean` | True or false values |

All types are nullable. Null propagation follows standard SQL semantics.

## License

MIT

## Contributing

Contributions are welcome! Please see our contributing guidelines for details.
