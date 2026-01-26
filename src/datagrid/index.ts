/**
 * FormulaQ DataGrid Integration
 *
 * MUI DataGrid integration for formula columns with dependency management.
 *
 * @example
 * ```tsx
 * import { useFormulaColumns } from 'formulaq/datagrid';
 * import { DataGrid } from '@mui/x-data-grid';
 *
 * function MyGrid() {
 *   const { columns, addFormula, isEvaluating } = useFormulaColumns(
 *     baseColumns,
 *     rows
 *   );
 *
 *   return (
 *     <>
 *       <Button onClick={() => addFormula('total', '@price * @quantity')}>
 *         Add Formula
 *       </Button>
 *       <DataGrid columns={columns} rows={rows} loading={isEvaluating} />
 *     </>
 *   );
 * }
 * ```
 *
 * @packageDocumentation
 */

// Hook will be exported here as implemented
// export { useFormulaColumns } from './hooks/use-formula-columns';
// export type { UseFormulaColumnsResult } from './hooks/use-formula-columns';

// Components will be exported here as they are implemented
// export { FormulaColumnDialog } from './formula-column-dialog/formula-column-dialog';
// export type { FormulaColumnDialogProps } from './formula-column-dialog/formula-column-dialog.types';

export { DeleteColumnDialog } from './delete-column-dialog/delete-column-dialog.tsx';
export type { DeleteColumnDialogProps } from './delete-column-dialog/delete-column-dialog.types.ts';

// Adapters
export {
  GridVariableProvider,
  createGridVariableProvider,
  type FormulaColumnDefinition,
  type GridVariableProviderOptions,
} from './adapters/grid-variable-provider.ts';
export {
  gridTypeToValueType,
  columnToVariableInfo,
  formulaColumnToVariableInfo,
  type GridColumnDefinition,
} from './adapters/grid-variable-provider.view-model.ts';
// export { createGridEvaluationContext } from './adapters/grid-evaluation-context';

// Dependency management
export {
  DependencyManager,
  createDependencyManager,
  extractDependenciesFromFormula,
  type FormulaColumnInfo,
  type DependencyGraph,
  type TopologicalSortResult,
} from './dependency/dependency-manager.ts';
export {
  topologicalSort,
  detectCycle,
  getDependents,
  getDirectDependents,
  createDependencyGraph,
} from './dependency/topological-sort.ts';
export {
  buildDependencyGraph,
  getEvaluationOrder,
  hasCycle,
  getCyclePath,
  getBlockers,
  updateVariableInFormula,
  updateReferences,
  wouldCreateCycle,
} from './dependency/dependency-manager.view-model.ts';

// Placeholder export to make the module valid
export const VERSION = '0.1.0';
