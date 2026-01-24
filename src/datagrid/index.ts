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
// export { useFormulaColumns } from './hooks/useFormulaColumns';
// export type { UseFormulaColumnsResult } from './hooks/useFormulaColumns';

// Components will be exported here as they are implemented
// export { FormulaColumnDialog } from './FormulaColumnDialog/FormulaColumnDialog';
// export type { FormulaColumnDialogProps } from './FormulaColumnDialog/FormulaColumnDialog.types';

// export { DeleteColumnDialog } from './DeleteColumnDialog/DeleteColumnDialog';
// export type { DeleteColumnDialogProps } from './DeleteColumnDialog/DeleteColumnDialog.types';

// Adapters
// export { GridVariableProvider } from './adapters/GridVariableProvider';
// export { createGridEvaluationContext } from './adapters/GridEvaluationContext';

// Placeholder export to make the module valid
export const VERSION = '0.1.0';
