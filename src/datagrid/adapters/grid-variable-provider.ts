/**
 * Adapter for converting MUI DataGrid columns to a VariableProvider.
 *
 * This adapter enables the FormulaQ engine to understand available variables
 * from DataGrid column definitions, supporting both regular data columns
 * and computed formula columns.
 *
 * @module
 */

import type { VariableProvider } from '../../core/types/context.ts';
import type { ValueType, VariableInfo } from '../../core/types/values.ts';
import type { GridColDef } from '@mui/x-data-grid';
import {
  type FormulaColumnDefinition,
  type GridColumnDefinition,
  createVariableLookup,
  processFormulaColumns,
  processGridColumns,
} from './grid-variable-provider.view-model.ts';

/**
 * Definition for a formula column to include in the variable provider.
 *
 * Re-exported for convenience from the viewModel.
 */
export type { FormulaColumnDefinition };

/**
 * Options for creating a GridVariableProvider.
 */
export interface GridVariableProviderOptions {
  /**
   * The DataGrid column definitions.
   * These are the regular data columns from your grid.
   */
  readonly columns: readonly GridColDef[];

  /**
   * Optional formula column definitions.
   * These are computed columns whose results can be referenced by other formulas.
   */
  readonly formulaColumns?: readonly FormulaColumnDefinition[] | undefined;
}

/**
 * VariableProvider implementation backed by DataGrid columns.
 *
 * This class adapts MUI DataGrid column definitions to the VariableProvider
 * interface required by the FormulaQ validation engine.
 *
 * @example
 * ```typescript
 * const columns: GridColDef[] = [
 *   { field: 'price', type: 'number', headerName: 'Price' },
 *   { field: 'quantity', type: 'number', headerName: 'Quantity' },
 * ];
 *
 * const formulaColumns: FormulaColumnDefinition[] = [
 *   { field: 'total', formula: '@price * @quantity', resultType: 'number.float' },
 * ];
 *
 * const provider = createGridVariableProvider({ columns, formulaColumns });
 *
 * // Use with FormulaQ engine
 * engine.validate('@total + @price', provider);
 * ```
 */
export class GridVariableProvider implements VariableProvider {
  private readonly variables: readonly VariableInfo[];
  private readonly lookup: Map<string, VariableInfo>;

  /**
   * Creates a new GridVariableProvider.
   *
   * @param variables - The list of variables to provide
   */
  constructor(variables: readonly VariableInfo[]) {
    this.variables = variables;
    this.lookup = createVariableLookup(variables);
  }

  /**
   * Returns all available variables from the grid columns.
   *
   * This includes both regular data columns and formula columns.
   *
   * @returns Array of VariableInfo objects
   */
  getVariables(): VariableInfo[] {
    return this.variables.slice();
  }

  /**
   * Checks if a variable with the given name exists.
   *
   * @param name - The variable name (without @ prefix)
   * @returns True if the variable exists, false otherwise
   */
  hasVariable(name: string): boolean {
    return this.lookup.has(name);
  }

  /**
   * Gets the type of a variable by name.
   *
   * @param name - The variable name (without @ prefix)
   * @returns The variable's ValueType, or undefined if not found
   */
  getVariableType(name: string): ValueType | undefined {
    const variable = this.lookup.get(name);
    if (variable === undefined) {
      return undefined;
    }
    return variable.type;
  }

  /**
   * Checks if a variable can contain null values.
   *
   * For grid columns, all variables are assumed nullable since
   * cell values can be undefined or null.
   *
   * @param name - The variable name (without @ prefix)
   * @returns True if the variable is nullable, false if not found
   */
  isNullable(name: string): boolean {
    const variable = this.lookup.get(name);
    if (variable === undefined) {
      return false;
    }
    return variable.nullable;
  }
}

/**
 * Creates a VariableProvider from DataGrid column definitions.
 *
 * This factory function is the primary API for creating GridVariableProvider
 * instances. It processes both regular columns and formula columns,
 * filtering out non-data columns (like action columns).
 *
 * Type mapping follows the implementation plan:
 * - 'number' -> 'number.float' (all numbers as float)
 * - 'string' -> 'string.text'
 * - 'boolean' -> 'boolean.boolean'
 * - 'singleSelect' -> 'string.text'
 * - 'date' -> 'string.text' (MVP)
 * - 'dateTime' -> 'string.text' (MVP)
 * - undefined/other -> 'string.text' (default)
 *
 * @param options - Configuration options
 * @returns A VariableProvider backed by the grid columns
 *
 * @example
 * ```typescript
 * const columns: GridColDef[] = [
 *   { field: 'name', headerName: 'Name' },
 *   { field: 'price', type: 'number', headerName: 'Price' },
 *   { field: 'active', type: 'boolean', headerName: 'Active' },
 * ];
 *
 * const provider = createGridVariableProvider({ columns });
 *
 * provider.getVariables();
 * // [
 * //   { name: 'name', type: 'string.text', nullable: true, group: 'Columns' },
 * //   { name: 'price', type: 'number.float', nullable: true, group: 'Columns' },
 * //   { name: 'active', type: 'boolean.boolean', nullable: true, group: 'Columns' },
 * // ]
 *
 * provider.hasVariable('price'); // true
 * provider.hasVariable('unknown'); // false
 *
 * provider.getVariableType('price'); // 'number.float'
 * provider.getVariableType('unknown'); // undefined
 * ```
 */
export function createGridVariableProvider(options: GridVariableProviderOptions): VariableProvider {
  const gridColumns = options.columns as readonly GridColumnDefinition[];
  const formulaColumns = options.formulaColumns ?? [];

  const gridVariables = processGridColumns(gridColumns);
  const formulaVariables = processFormulaColumns(formulaColumns);

  const allVariables = gridVariables.concat(formulaVariables);

  return new GridVariableProvider(allVariables);
}
