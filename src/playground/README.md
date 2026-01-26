# FormulaQ Playground

An interactive formula testing environment with variable management and result visualization. Perfect for experimenting with formulas before deploying them in production.

## Installation

```typescript
import { Playground } from 'formulaq/playground';
```

## Quick Start

```tsx
import { Playground } from 'formulaq/playground';

function App() {
  return <Playground />;
}
```

### With Initial Data

```tsx
<Playground
  initialVariables={[
    { name: 'score', type: 'number.float', values: [85, 92, 78, 95, 88] },
    { name: 'weight', type: 'number.float', values: [0.2, 0.3, 0.15, 0.25, 0.1] },
    { name: 'name', type: 'string.text', values: ['Alice', 'Bob', 'Carol', 'Dave', 'Eve'] },
  ]}
  initialFormula="@score * @weight"
  title="Formula Calculator"
/>
```

## API Reference

### Playground Component

The main playground component providing a three-panel layout.

#### Props

| Prop               | Type                   | Required | Default                 | Description            |
| ------------------ | ---------------------- | -------- | ----------------------- | ---------------------- |
| `initialVariables` | `PlaygroundVariable[]` | No       | `[]`                    | Initial test variables |
| `initialFormula`   | `string`               | No       | `''`                    | Initial formula string |
| `title`            | `string`               | No       | `'FormulaQ Playground'` | Header title           |

#### PlaygroundVariable

```typescript
interface PlaygroundVariable {
  // Variable name (without @)
  name: string;

  // Data type
  type: ValueType;

  // Array of values for testing
  values: (number | string | boolean | null)[];
}
```

## Layout

The Playground has a three-panel layout:

```
+------------------+-------------------+------------------+
|                  |                   |                  |
|   Variables      |   Formula         |   Results        |
|   Panel          |   Editor          |   Panel          |
|                  |                   |                  |
|   - Add/Edit     |   - Syntax        |   - Value Table  |
|   - Remove       |     highlighting  |   - Statistics   |
|   - View values  |   - Autocomplete  |   - Aggregations |
|                  |   - Validation    |                  |
|                  |                   |                  |
+------------------+-------------------+------------------+
```

On smaller screens, panels stack vertically.

## Components

### VariablePanel

Container for managing test variables.

```tsx
import { VariablePanel } from 'formulaq/playground';

<VariablePanel
  variables={variables}
  onAddVariable={handleAdd}
  onEditVariable={handleEdit}
  onRemoveVariable={handleRemove}
/>;
```

#### Props

| Prop               | Type                     | Description                    |
| ------------------ | ------------------------ | ------------------------------ |
| `variables`        | `PlaygroundVariable[]`   | Current variables              |
| `onAddVariable`    | `() => void`             | Called when Add button clicked |
| `onEditVariable`   | `(name: string) => void` | Called when Edit clicked       |
| `onRemoveVariable` | `(name: string) => void` | Called when Remove clicked     |

### VariableCard

Displays a single variable with actions.

```tsx
import { VariableCard } from 'formulaq/playground';

<VariableCard
  variable={{
    name: 'score',
    type: 'number.float',
    values: [85, 92, 78, 95, 88],
  }}
  onEdit={() => openEditor('score')}
  onDelete={() => removeVariable('score')}
/>;
```

#### Props

| Prop       | Type                 | Description                |
| ---------- | -------------------- | -------------------------- |
| `variable` | `PlaygroundVariable` | Variable to display        |
| `onEdit`   | `() => void`         | Called when Edit clicked   |
| `onDelete` | `() => void`         | Called when Delete clicked |

### VariableEditor

Form for adding or editing variables.

```tsx
import { VariableEditor } from 'formulaq/playground';

<VariableEditor
  mode="create"
  onSave={(variable) => addVariable(variable)}
  onCancel={() => closeEditor()}
  existingNames={['score', 'weight']}
/>

<VariableEditor
  mode="edit"
  initialVariable={{
    name: 'score',
    type: 'number.float',
    values: [85, 92, 78],
  }}
  onSave={(variable) => updateVariable(variable)}
  onCancel={() => closeEditor()}
  existingNames={['weight']}
/>
```

#### Props

| Prop              | Type                                     | Description                       |
| ----------------- | ---------------------------------------- | --------------------------------- |
| `mode`            | `'create' \| 'edit'`                     | Editor mode                       |
| `initialVariable` | `PlaygroundVariable`                     | Variable to edit (edit mode)      |
| `onSave`          | `(variable: PlaygroundVariable) => void` | Called on save                    |
| `onCancel`        | `() => void`                             | Called on cancel                  |
| `existingNames`   | `string[]`                               | Names to exclude (for validation) |

#### Input Formats

Values can be entered as:

- **Comma-separated**: `85, 92, 78, 95`
- **JSON array**: `[85, 92, 78, 95]`
- **With nulls**: `85, null, 78, 95` or `[85, null, 78, 95]`

### ResultsPanel

Displays evaluation results and statistics.

```tsx
import { ResultsPanel } from 'formulaq/playground';

<ResultsPanel
  results={evaluationResults}
  statistics={{
    total: 5,
    min: 17.0,
    max: 27.6,
    nullCount: 0,
    errorCount: 0,
  }}
/>;
```

#### Props

| Prop         | Type                | Description             |
| ------------ | ------------------- | ----------------------- |
| `results`    | `FormattedResult[]` | Formatted result values |
| `statistics` | `ResultsStatistics` | Computed statistics     |

#### ResultsStatistics

```typescript
interface ResultsStatistics {
  total: number; // Total row count
  min?: number; // Minimum value (numeric only)
  max?: number; // Maximum value (numeric only)
  nullCount: number; // Count of null results
  errorCount: number; // Count of errors
}
```

### AggregationDisplay

Shows pre-computed aggregation values.

```tsx
import { AggregationDisplay } from 'formulaq/playground';

<AggregationDisplay
  aggregations={[
    { expression: 'AVG(@score)', value: 87.6 },
    { expression: 'MAX(@score)', value: 95 },
  ]}
/>;
```

#### Props

| Prop           | Type                  | Description         |
| -------------- | --------------------- | ------------------- |
| `aggregations` | `AggregationResult[]` | Aggregation results |

#### AggregationResult

```typescript
interface AggregationResult {
  expression: string; // e.g., 'AVG(@score)'
  value: number | null;
}
```

## Hooks

### usePlaygroundState

Main hook for managing playground state.

```tsx
import { usePlaygroundState } from 'formulaq/playground';

function MyPlayground() {
  const {
    variables,
    formula,
    validationResult,
    evaluationResult,
    setFormula,
    addVariable,
    editVariable,
    removeVariable,
    variableProvider,
  } = usePlaygroundState({
    initialVariables: [],
    initialFormula: '',
  });

  return (
    <Box>
      <VariablePanel
        variables={variables}
        onAddVariable={() => {
          /* open editor */
        }}
        onEditVariable={(name) => {
          /* open editor */
        }}
        onRemoveVariable={removeVariable}
      />
      <FormulaEditor
        value={formula}
        onChange={setFormula}
        variableProvider={variableProvider}
        onValidation={(result) => {
          /* update state */
        }}
      />
      <ResultsPanel
        results={evaluationResult?.formattedResults ?? []}
        statistics={evaluationResult?.statistics}
      />
    </Box>
  );
}
```

#### Options

```typescript
interface UsePlaygroundStateOptions {
  initialVariables?: PlaygroundVariable[];
  initialFormula?: string;
}
```

#### Return Value

```typescript
interface UsePlaygroundStateReturn {
  // Current state
  variables: PlaygroundVariable[];
  formula: string;
  validationResult: ValidationResult | null;
  evaluationResult: EvaluationResult | null;
  isEvaluating: boolean;

  // Actions
  setFormula: (formula: string) => void;
  addVariable: (variable: PlaygroundVariable) => void;
  editVariable: (name: string, variable: PlaygroundVariable) => void;
  removeVariable: (name: string) => void;

  // Helpers
  variableProvider: VariableProvider;
  evaluationContext: EvaluationContext;
}
```

## Integration Examples

### Embedded in Application

```tsx
function MyApp() {
  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <AppBar>
        <Toolbar>
          <Typography>My App</Typography>
        </Toolbar>
      </AppBar>
      <Box sx={{ flexGrow: 1, overflow: 'hidden' }}>
        <Playground initialVariables={defaultVariables} title="Formula Tester" />
      </Box>
    </Box>
  );
}
```

### With External Data

```tsx
function DataPlayground({ data }) {
  // Convert data to playground variables
  const initialVariables = useMemo(() => {
    return Object.keys(data[0]).map((key) => ({
      name: key,
      type: inferType(data[0][key]),
      values: data.map((row) => row[key]),
    }));
  }, [data]);

  return <Playground initialVariables={initialVariables} />;
}
```

### Custom Playground

```tsx
function CustomPlayground() {
  const {
    variables,
    formula,
    setFormula,
    addVariable,
    removeVariable,
    variableProvider,
    evaluationResult,
  } = usePlaygroundState({
    initialVariables: [{ name: 'x', type: 'number.float', values: [1, 2, 3, 4, 5] }],
  });

  return (
    <Grid container spacing={2}>
      <Grid item xs={12} md={4}>
        <Card>
          <CardHeader title="Variables" />
          <CardContent>
            {variables.map((v) => (
              <Chip key={v.name} label={`@${v.name}`} onDelete={() => removeVariable(v.name)} />
            ))}
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} md={8}>
        <Card>
          <CardHeader title="Formula" />
          <CardContent>
            <FormulaEditor
              value={formula}
              onChange={setFormula}
              variableProvider={variableProvider}
            />
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12}>
        <Card>
          <CardHeader title="Results" />
          <CardContent>
            {evaluationResult?.formattedResults.map((r, i) => (
              <Typography key={i}>
                Row {i}: {r.displayValue}
              </Typography>
            ))}
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
}
```

## Types

### PlaygroundVariable

```typescript
interface PlaygroundVariable {
  name: string;
  type: ValueType;
  values: (number | string | boolean | null)[];
}
```

### EvaluationResult

```typescript
interface EvaluationResult {
  // Raw batch result from engine
  batchResult: BatchResult;

  // Formatted for display
  formattedResults: FormattedResult[];

  // Computed statistics
  statistics: ResultsStatistics;

  // Aggregation values (if formula uses aggregations)
  aggregations: AggregationResult[];
}
```

### FormattedResult

```typescript
interface FormattedResult {
  index: number; // Row index
  value: Value; // Raw value
  displayValue: string; // Formatted for display
  isError: boolean; // Whether this row had an error
  isNull: boolean; // Whether value is null
}
```

## Exports

```typescript
// Main component
export { Playground } from 'formulaq/playground';
export type { PlaygroundProps } from 'formulaq/playground';

// Sub-components
export { VariablePanel } from 'formulaq/playground';
export type { VariablePanelProps } from 'formulaq/playground';

export { VariableCard } from 'formulaq/playground';
export type { VariableCardProps, PlaygroundVariable } from 'formulaq/playground';

export { VariableEditor } from 'formulaq/playground';
export type { VariableEditorProps, ParseResult } from 'formulaq/playground';

export { ResultsPanel } from 'formulaq/playground';
export type { ResultsPanelProps, ResultsStatistics, FormattedResult } from 'formulaq/playground';

export { AggregationDisplay } from 'formulaq/playground';
export type { AggregationDisplayProps, AggregationResult } from 'formulaq/playground';

// Hooks
export { usePlaygroundState } from 'formulaq/playground';
export type {
  UsePlaygroundStateReturn,
  PlaygroundState,
  EvaluationResult,
} from 'formulaq/playground';
```
