# FormulaQ DataGrid Integration

Seamless integration with MUI X DataGrid for adding computed formula columns. Includes dependency management, batch evaluation with progress, and automatic re-computation.

## Installation

```bash
npm install @mui/x-data-grid @mui/material @emotion/react @emotion/styled
```

```typescript
import { useFormulaColumns } from 'formulaq/datagrid';
```

## Quick Start

```tsx
import { useState } from 'react';
import { DataGrid, type GridColDef } from '@mui/x-data-grid';
import { Button } from '@mui/material';
import { useFormulaColumns } from 'formulaq/datagrid';

function MyDataGrid() {
  const baseColumns: GridColDef[] = [
    { field: 'id', headerName: 'ID', type: 'number' },
    { field: 'price', headerName: 'Price', type: 'number' },
    { field: 'quantity', headerName: 'Quantity', type: 'number' },
  ];

  const [rows, setRows] = useState([
    { id: 1, price: 10, quantity: 2 },
    { id: 2, price: 25, quantity: 3 },
    { id: 3, price: 15, quantity: 4 },
  ]);

  const { columns, addFormula, isEvaluating, progress } = useFormulaColumns({ baseColumns, rows });

  return (
    <div>
      <Button onClick={() => addFormula('total', '@price * @quantity', 'Total')}>
        Add Total Column
      </Button>
      <DataGrid columns={columns} rows={rows} loading={isEvaluating} />
      {progress && <div>Progress: {Math.round((progress.completed / progress.total) * 100)}%</div>}
    </div>
  );
}
```

## API Reference

### useFormulaColumns Hook

The main hook for managing formula columns in a DataGrid.

#### Options

```typescript
interface UseFormulaColumnsOptions {
  // Original DataGrid column definitions
  baseColumns: GridColDef[];

  // Grid row data
  rows: GridRowModel[];

  // Optional pre-existing formula columns
  initialFormulaColumns?: FormulaColumn[];

  // Optional custom engine instance
  engine?: FormulaQEngine;
}
```

#### Return Value

```typescript
interface UseFormulaColumnsResult {
  // Merged columns (base + formula columns)
  columns: GridColDef[];

  // Add a new formula column
  addFormula: (name: string, formula: string, headerName?: string) => void;

  // Update an existing formula
  editFormula: (field: string, formula: string) => void;

  // Remove a formula column
  removeFormula: (field: string) => void;

  // Update formulas when a column is renamed
  renameColumn: (oldName: string, newName: string) => void;

  // Whether evaluation is in progress
  isEvaluating: boolean;

  // Current progress (null if not evaluating)
  progress: { completed: number; total: number } | null;

  // Cancel ongoing evaluation
  cancelEvaluation: () => void;

  // Get computed values for a formula column
  getFormulaResults: (field: string) => Value[];

  // Get columns that depend on a given column
  getBlockingColumns: (field: string) => string[];

  // Get variable provider for formula editor
  getVariableProvider: () => VariableProvider;

  // Get preview data for a formula
  getPreviewData: (formula: string, limit?: number) => PreviewData;

  // Rows with formula results merged in
  rowsWithFormulas: Record<string, unknown>[];
}
```

### Example with Full API

```tsx
function AdvancedDataGrid() {
  const {
    columns,
    addFormula,
    editFormula,
    removeFormula,
    renameColumn,
    isEvaluating,
    progress,
    cancelEvaluation,
    getFormulaResults,
    getBlockingColumns,
    getVariableProvider,
    rowsWithFormulas,
  } = useFormulaColumns({ baseColumns, rows });

  // Add a formula column
  const handleAddFormula = () => {
    addFormula('total', '@price * @quantity', 'Total');
  };

  // Edit an existing formula
  const handleEditFormula = (field: string, newFormula: string) => {
    editFormula(field, newFormula);
  };

  // Remove a formula (with dependency check)
  const handleRemoveFormula = (field: string) => {
    const blockers = getBlockingColumns(field);
    if (blockers.length > 0) {
      alert(`Cannot delete: ${blockers.join(', ')} depend on this column`);
      return;
    }
    removeFormula(field);
  };

  // Handle column rename (updates dependent formulas)
  const handleRenameColumn = (oldName: string, newName: string) => {
    renameColumn(oldName, newName);
  };

  return (
    <Box>
      <DataGrid
        columns={columns}
        rows={rowsWithFormulas} // Use rows with formula values
        loading={isEvaluating}
      />
      {isEvaluating && (
        <Box>
          <LinearProgress
            variant="determinate"
            value={((progress?.completed ?? 0) / (progress?.total ?? 1)) * 100}
          />
          <Button onClick={cancelEvaluation}>Cancel</Button>
        </Box>
      )}
    </Box>
  );
}
```

## Components

### FormulaColumnDialog

Modal dialog for creating or editing formula columns.

```tsx
import { FormulaColumnDialog } from 'formulaq/datagrid';

<FormulaColumnDialog
  open={isOpen}
  onClose={handleClose}
  onSave={handleSave}
  variableProvider={getVariableProvider()}
  previewRows={rows.slice(0, 10)}
  existingColumnNames={columns.map(c => c.field)}
  mode="create"
/>

<FormulaColumnDialog
  open={isOpen}
  onClose={handleClose}
  onSave={handleSave}
  variableProvider={getVariableProvider()}
  previewRows={rows.slice(0, 10)}
  existingColumnNames={columns.filter(c => c.field !== 'total').map(c => c.field)}
  mode="edit"
  initialName="total"
  initialFormula="@price * @quantity"
/>
```

#### Props

| Prop                  | Type                                      | Description                     |
| --------------------- | ----------------------------------------- | ------------------------------- |
| `open`                | `boolean`                                 | Dialog visibility               |
| `onClose`             | `() => void`                              | Called when dialog closes       |
| `onSave`              | `(name: string, formula: string) => void` | Called on save                  |
| `variableProvider`    | `VariableProvider`                        | Variables for autocomplete      |
| `previewRows`         | `object[]`                                | Rows for preview table          |
| `existingColumnNames` | `string[]`                                | Names to exclude                |
| `mode`                | `'create' \| 'edit'`                      | Dialog mode                     |
| `initialName`         | `string`                                  | Initial column name (edit mode) |
| `initialFormula`      | `string`                                  | Initial formula (edit mode)     |

### DeleteColumnDialog

Confirmation dialog for deleting formula columns.

```tsx
import { DeleteColumnDialog } from 'formulaq/datagrid';

<DeleteColumnDialog
  open={isOpen}
  onClose={handleClose}
  onConfirm={handleDelete}
  columnName="total"
  blockingColumns={getBlockingColumns('total')}
/>;
```

#### Props

| Prop              | Type         | Description                  |
| ----------------- | ------------ | ---------------------------- |
| `open`            | `boolean`    | Dialog visibility            |
| `onClose`         | `() => void` | Called when dialog closes    |
| `onConfirm`       | `() => void` | Called when delete confirmed |
| `columnName`      | `string`     | Column being deleted         |
| `blockingColumns` | `string[]`   | Columns that block deletion  |

### PreviewTable

Shows formula evaluation preview.

```tsx
import { PreviewTable } from 'formulaq/datagrid';

<PreviewTable
  formula="@price * @quantity"
  columns={[
    { field: 'price', headerName: 'Price' },
    { field: 'quantity', headerName: 'Quantity' },
    { field: 'result', headerName: 'Result' },
  ]}
  rows={[
    { id: 1, price: 10, quantity: 2, result: 20 },
    { id: 2, price: 25, quantity: 3, result: 75 },
  ]}
  hasError={false}
/>;
```

### ProgressOverlay

Inline progress indicator for large evaluations.

```tsx
import { ProgressOverlay } from 'formulaq/datagrid';

<ProgressOverlay progress={progress} onCancel={cancelEvaluation} />;
```

## Adapters

### GridVariableProvider

Converts DataGrid columns to a VariableProvider.

```typescript
import { createGridVariableProvider, GridVariableProvider } from 'formulaq/datagrid';

const provider = createGridVariableProvider({
  columns: baseColumns,
  formulaColumns: [
    { field: 'total', formula: '@price * @quantity', resultType: 'number.float' },
  ],
});

// Use with FormulaEditor
<FormulaEditor variableProvider={provider} ... />
```

#### Type Mapping

| GridColDef.type  | ValueType           |
| ---------------- | ------------------- |
| `'number'`       | `'number.float'`    |
| `'string'`       | `'string.text'`     |
| `'boolean'`      | `'boolean.boolean'` |
| `'singleSelect'` | `'string.text'`     |
| `undefined`      | `'string.text'`     |

### GridEvaluationContext

Converts DataGrid rows to an EvaluationContext.

```typescript
import { createGridEvaluationContext } from 'formulaq/datagrid';

const context = createGridEvaluationContext({
  columns: baseColumns,
  rows: rows,
  formulaResults: existingFormulaResults,
});

// Use with engine
const result = await engine.evaluateBatch(formula, context);
```

## Dependency Management

### DependencyManager

Tracks dependencies between formula columns.

```typescript
import { createDependencyManager, DependencyManager } from 'formulaq/datagrid';

const manager = createDependencyManager();

// Add a formula column
manager.addFormulaColumn('total', '@price * @quantity');
manager.addFormulaColumn('tax', '@total * 0.1');
manager.addFormulaColumn('grandTotal', '@total + @tax');

// Get evaluation order (topological sort)
const order = manager.getEvaluationOrder();
// ['total', 'tax', 'grandTotal']

// Check what blocks deletion
const blockers = manager.getBlockingColumns('total');
// ['tax', 'grandTotal']

// Update references when renaming
manager.renameColumn('total', 'subtotal');
// Updates 'tax' formula to '@subtotal * 0.1'
// Updates 'grandTotal' formula to '@subtotal + @tax'
```

### Circular Reference Detection

```typescript
// This would create a cycle: total -> tax -> total
manager.addFormulaColumn('total', '@tax + @price');

// Check for cycles
const result = manager.getEvaluationOrder();
if (result.hasCycle) {
  console.log('Cycle detected:', result.cyclePath);
  // ['total', 'tax', 'total']
}
```

### Utility Functions

```typescript
import {
  topologicalSort,
  detectCycle,
  getDependents,
  getDirectDependents,
  extractDependenciesFromFormula,
} from 'formulaq/datagrid';

// Extract dependencies from a formula string
const deps = extractDependenciesFromFormula('@price * @quantity');
// ['price', 'quantity']

// Check if a graph has a cycle
const graph = { a: ['b'], b: ['c'], c: ['a'] };
const cycle = detectCycle(graph);
// ['a', 'b', 'c', 'a']

// Get all dependents (direct and indirect)
const dependents = getDependents('price', graph);
// All columns that depend on 'price'
```

## Integration Examples

### Complete Integration

```tsx
function DataGridWithFormulas() {
  const baseColumns: GridColDef[] = [
    { field: 'id', headerName: 'ID', type: 'number', width: 70 },
    { field: 'product', headerName: 'Product', type: 'string', width: 200 },
    { field: 'price', headerName: 'Price', type: 'number', width: 100 },
    { field: 'quantity', headerName: 'Qty', type: 'number', width: 80 },
  ];

  const [rows, setRows] = useState([
    { id: 1, product: 'Widget A', price: 10.0, quantity: 5 },
    { id: 2, product: 'Widget B', price: 25.5, quantity: 3 },
    { id: 3, product: 'Widget C', price: 15.75, quantity: 10 },
  ]);

  const {
    columns,
    addFormula,
    editFormula,
    removeFormula,
    isEvaluating,
    progress,
    cancelEvaluation,
    getBlockingColumns,
    getVariableProvider,
    rowsWithFormulas,
  } = useFormulaColumns({ baseColumns, rows });

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
  const [editingColumn, setEditingColumn] = useState<string | null>(null);

  const handleOpenCreate = () => {
    setDialogMode('create');
    setEditingColumn(null);
    setDialogOpen(true);
  };

  const handleOpenEdit = (field: string) => {
    setDialogMode('edit');
    setEditingColumn(field);
    setDialogOpen(true);
  };

  const handleSave = (name: string, formula: string) => {
    if (dialogMode === 'create') {
      addFormula(name, formula, name);
    } else if (editingColumn) {
      editFormula(editingColumn, formula);
    }
    setDialogOpen(false);
  };

  const handleDelete = (field: string) => {
    const blockers = getBlockingColumns(field);
    if (blockers.length > 0) {
      alert(`Cannot delete: used by ${blockers.join(', ')}`);
      return;
    }
    removeFormula(field);
  };

  return (
    <Box sx={{ height: 600, width: '100%' }}>
      <Toolbar>
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenCreate}>
          Add Formula Column
        </Button>
      </Toolbar>

      <DataGrid
        rows={rowsWithFormulas}
        columns={columns}
        loading={isEvaluating}
        slots={{
          loadingOverlay: () => (
            <Box sx={{ p: 2 }}>
              <LinearProgress
                variant="determinate"
                value={((progress?.completed ?? 0) / (progress?.total ?? 1)) * 100}
              />
              <Button onClick={cancelEvaluation}>Cancel</Button>
            </Box>
          ),
        }}
      />

      <FormulaColumnDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSave={handleSave}
        variableProvider={getVariableProvider()}
        previewRows={rows.slice(0, 10)}
        existingColumnNames={columns.map((c) => c.field)}
        mode={dialogMode}
        initialName={editingColumn ?? ''}
        initialFormula=""
      />
    </Box>
  );
}
```

### With Column Menu Actions

```tsx
function DataGridWithColumnMenu() {
  const { columns, editFormula, removeFormula, getBlockingColumns } = useFormulaColumns({
    baseColumns,
    rows,
  });

  // Add custom actions to formula columns
  const columnsWithActions = columns.map((col) => {
    if (col.field.startsWith('formula_')) {
      return {
        ...col,
        renderHeader: (params) => (
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {col.headerName}
            <IconButton onClick={() => handleEditColumn(col.field)}>
              <EditIcon />
            </IconButton>
            <IconButton onClick={() => handleDeleteColumn(col.field)}>
              <DeleteIcon />
            </IconButton>
          </Box>
        ),
      };
    }
    return col;
  });

  return <DataGrid columns={columnsWithActions} rows={rows} />;
}
```

## Performance Considerations

### Large Datasets

For datasets with 10,000+ rows:

```tsx
const { columns, isEvaluating, progress } = useFormulaColumns({
  baseColumns,
  rows,
  // Evaluation uses chunked processing internally
});

// Show progress for user feedback
{
  isEvaluating && (
    <LinearProgress
      variant="determinate"
      value={((progress?.completed ?? 0) / (progress?.total ?? 1)) * 100}
    />
  );
}
```

### Cancellation

```tsx
const { cancelEvaluation } = useFormulaColumns({ baseColumns, rows });

// Cancel when dialog closes or user navigates away
useEffect(() => {
  return () => {
    cancelEvaluation();
  };
}, []);
```

### Memoization

The hook memoizes:

- Merged column definitions
- Formula results
- Variable provider
- Rows with formulas

Changes to `rows` or formulas trigger re-evaluation.

### Dependency Order

Formulas are evaluated in topological order:

```
price, quantity (source columns)
    |
    v
  total = @price * @quantity
    |
    v
  tax = @total * 0.1
    |
    v
grandTotal = @total + @tax
```

This ensures each formula has access to computed values from its dependencies.

## Types

### FormulaColumn

```typescript
interface FormulaColumn {
  field: string; // Column field name
  formula: string; // Formula expression
  headerName?: string; // Display name
}
```

### FormulaColumnDefinition

```typescript
interface FormulaColumnDefinition {
  field: string;
  formula: string;
  resultType: ValueType;
}
```

### PreviewData

```typescript
interface PreviewData {
  columns: { field: string; headerName: string }[];
  rows: Record<string, unknown>[];
  hasError: boolean;
  errorMessage?: string;
}
```

## Exports

```typescript
// Main hook
export { useFormulaColumns } from 'formulaq/datagrid';
export type {
  UseFormulaColumnsOptions,
  UseFormulaColumnsResult,
  FormulaColumn,
} from 'formulaq/datagrid';

// Components
export { FormulaColumnDialog } from 'formulaq/datagrid';
export type { FormulaColumnDialogProps } from 'formulaq/datagrid';

export { DeleteColumnDialog } from 'formulaq/datagrid';
export type { DeleteColumnDialogProps } from 'formulaq/datagrid';

export { PreviewTable } from 'formulaq/datagrid';
export type { PreviewTableProps } from 'formulaq/datagrid';

export { ProgressOverlay } from 'formulaq/datagrid';
export type { ProgressOverlayProps } from 'formulaq/datagrid';

// Adapters
export { GridVariableProvider, createGridVariableProvider } from 'formulaq/datagrid';
export type { FormulaColumnDefinition, GridVariableProviderOptions } from 'formulaq/datagrid';

export { gridTypeToValueType, columnToVariableInfo } from 'formulaq/datagrid';

// Dependency management
export { DependencyManager, createDependencyManager } from 'formulaq/datagrid';
export type { FormulaColumnInfo, DependencyGraph, TopologicalSortResult } from 'formulaq/datagrid';

export {
  topologicalSort,
  detectCycle,
  getDependents,
  getDirectDependents,
  extractDependenciesFromFormula,
} from 'formulaq/datagrid';

export {
  buildDependencyGraph,
  getEvaluationOrder,
  hasCycle,
  getCyclePath,
  getBlockers,
  updateVariableInFormula,
  updateReferences,
  wouldCreateCycle,
} from 'formulaq/datagrid';
```
