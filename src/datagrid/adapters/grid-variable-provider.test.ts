/**
 * Tests for GridVariableProvider adapter.
 *
 * These tests verify:
 * - GridColDef columns are correctly mapped to VariableInfo
 * - Column types are correctly inferred as ValueType
 * - Formula columns are included in the provider
 * - getVariables() returns all columns
 * - getVariableType() returns the correct inferred type
 * - hasVariable() correctly identifies existing variables
 * - isNullable() returns correct nullable status
 *
 * @module
 */

import { describe, expect, it } from 'vitest';
import type { GridColDef } from '@mui/x-data-grid';
import type { ValueType } from '../../core/types/values.ts';
import {
  GridVariableProvider,
  createGridVariableProvider,
  type FormulaColumnDefinition,
  type GridVariableProviderOptions,
} from './grid-variable-provider.ts';
import {
  gridTypeToValueType,
  columnToVariableInfo,
  formulaColumnToVariableInfo,
  isDataColumn,
  processGridColumns,
  processFormulaColumns,
  createVariableLookup,
  type GridColumnDefinition,
} from './grid-variable-provider.view-model.ts';

// =============================================================================
// gridTypeToValueType tests
// =============================================================================

describe('gridTypeToValueType', function gridTypeToValueTypeTests() {
  it('should map number to number.float', function numberTest() {
    const result = gridTypeToValueType('number');
    expect(result).toBe('number.float');
  });

  it('should map string to string.text', function stringTest() {
    const result = gridTypeToValueType('string');
    expect(result).toBe('string.text');
  });

  it('should map boolean to boolean.boolean', function booleanTest() {
    const result = gridTypeToValueType('boolean');
    expect(result).toBe('boolean.boolean');
  });

  it('should map singleSelect to string.text', function singleSelectTest() {
    const result = gridTypeToValueType('singleSelect');
    expect(result).toBe('string.text');
  });

  it('should map date to string.text (MVP)', function dateTest() {
    const result = gridTypeToValueType('date');
    expect(result).toBe('string.text');
  });

  it('should map dateTime to string.text (MVP)', function dateTimeTest() {
    const result = gridTypeToValueType('dateTime');
    expect(result).toBe('string.text');
  });

  it('should default undefined to string.text', function undefinedTest() {
    const result = gridTypeToValueType(undefined);
    expect(result).toBe('string.text');
  });

  it('should default unknown types to string.text', function unknownTest() {
    const result = gridTypeToValueType('custom');
    expect(result).toBe('string.text');
  });

  it('should handle empty string as unknown type', function emptyStringTest() {
    const result = gridTypeToValueType('');
    expect(result).toBe('string.text');
  });
});

// =============================================================================
// columnToVariableInfo tests
// =============================================================================

describe('columnToVariableInfo', function columnToVariableInfoTests() {
  it('should create VariableInfo from column with all properties', function fullPropsTest() {
    const column: GridColumnDefinition = {
      field: 'price',
      type: 'number',
      headerName: 'Price',
      description: 'Product price in USD',
    };

    const result = columnToVariableInfo(column);

    expect(result.name).toBe('price');
    expect(result.type).toBe('number.float');
    expect(result.nullable).toBe(true);
    expect(result.description).toBe('Product price in USD');
    expect(result.group).toBe('Columns');
  });

  it('should use headerName as description when description is missing', function headerNameFallbackTest() {
    const column: GridColumnDefinition = {
      field: 'quantity',
      type: 'number',
      headerName: 'Quantity',
    };

    const result = columnToVariableInfo(column);

    expect(result.description).toBe('Quantity');
  });

  it('should handle column with no headerName or description', function noDescriptionTest() {
    const column: GridColumnDefinition = {
      field: 'id',
      type: 'string',
    };

    const result = columnToVariableInfo(column);

    expect(result.name).toBe('id');
    expect(result.type).toBe('string.text');
    expect(result.description).toBeUndefined();
  });

  it('should handle column with no type (default to string.text)', function noTypeTest() {
    const column: GridColumnDefinition = {
      field: 'notes',
      headerName: 'Notes',
    };

    const result = columnToVariableInfo(column);

    expect(result.type).toBe('string.text');
  });

  it('should handle boolean type column', function booleanColumnTest() {
    const column: GridColumnDefinition = {
      field: 'active',
      type: 'boolean',
      headerName: 'Active',
    };

    const result = columnToVariableInfo(column);

    expect(result.type).toBe('boolean.boolean');
  });
});

// =============================================================================
// formulaColumnToVariableInfo tests
// =============================================================================

describe('formulaColumnToVariableInfo', function formulaColumnToVariableInfoTests() {
  it('should create VariableInfo from formula column', function basicTest() {
    const column: FormulaColumnDefinition = {
      field: 'total',
      formula: '@price * @quantity',
      resultType: 'number.float',
    };

    const result = formulaColumnToVariableInfo(column);

    expect(result.name).toBe('total');
    expect(result.type).toBe('number.float');
    expect(result.nullable).toBe(true);
    expect(result.description).toBe('Formula: @price * @quantity');
    expect(result.group).toBe('Formula Columns');
  });

  it('should include headerName in description if provided', function headerNameTest() {
    const column: FormulaColumnDefinition = {
      field: 'total',
      formula: '@price * @quantity',
      resultType: 'number.float',
      headerName: 'Total Price',
    };

    const result = formulaColumnToVariableInfo(column);

    expect(result.description).toBe('Total Price (Formula: @price * @quantity)');
  });

  it('should include custom description if provided', function customDescriptionTest() {
    const column: FormulaColumnDefinition = {
      field: 'profit',
      formula: '@revenue - @cost',
      resultType: 'number.float',
      description: 'Net profit',
    };

    const result = formulaColumnToVariableInfo(column);

    expect(result.description).toBe('Net profit (Formula: @revenue - @cost)');
  });

  it('should handle string result type', function stringResultTest() {
    const column: FormulaColumnDefinition = {
      field: 'fullName',
      formula: 'CONCAT(@firstName, " ", @lastName)',
      resultType: 'string.text',
    };

    const result = formulaColumnToVariableInfo(column);

    expect(result.type).toBe('string.text');
  });

  it('should handle boolean result type', function booleanResultTest() {
    const column: FormulaColumnDefinition = {
      field: 'isExpensive',
      formula: '@price > 100',
      resultType: 'boolean.boolean',
    };

    const result = formulaColumnToVariableInfo(column);

    expect(result.type).toBe('boolean.boolean');
  });
});

// =============================================================================
// isDataColumn tests
// =============================================================================

describe('isDataColumn', function isDataColumnTests() {
  it('should return true for regular data columns', function regularColumnTest() {
    const column: GridColumnDefinition = {
      field: 'name',
      type: 'string',
    };

    expect(isDataColumn(column)).toBe(true);
  });

  it('should return true for number columns', function numberColumnTest() {
    const column: GridColumnDefinition = {
      field: 'price',
      type: 'number',
    };

    expect(isDataColumn(column)).toBe(true);
  });

  it('should return false for action columns', function actionColumnTest() {
    const column: GridColumnDefinition = {
      field: 'actions',
      type: 'actions',
    };

    expect(isDataColumn(column)).toBe(false);
  });

  it('should return true for columns with no type', function noTypeColumnTest() {
    const column: GridColumnDefinition = {
      field: 'notes',
    };

    expect(isDataColumn(column)).toBe(true);
  });
});

// =============================================================================
// processGridColumns tests
// =============================================================================

describe('processGridColumns', function processGridColumnsTests() {
  it('should process multiple columns', function multipleColumnsTest() {
    const columns: GridColumnDefinition[] = [
      { field: 'name', type: 'string', headerName: 'Name' },
      { field: 'price', type: 'number', headerName: 'Price' },
      { field: 'active', type: 'boolean', headerName: 'Active' },
    ];

    const result = processGridColumns(columns);

    expect(result).toHaveLength(3);
    expect(result[0]!.name).toBe('name');
    expect(result[0]!.type).toBe('string.text');
    expect(result[1]!.name).toBe('price');
    expect(result[1]!.type).toBe('number.float');
    expect(result[2]!.name).toBe('active');
    expect(result[2]!.type).toBe('boolean.boolean');
  });

  it('should filter out action columns', function filterActionsTest() {
    const columns: GridColumnDefinition[] = [
      { field: 'name', type: 'string' },
      { field: 'actions', type: 'actions' },
      { field: 'price', type: 'number' },
    ];

    const result = processGridColumns(columns);

    expect(result).toHaveLength(2);
    expect(
      result.some(function hasActions(v) {
        return v.name === 'actions';
      }),
    ).toBe(false);
  });

  it('should handle empty array', function emptyArrayTest() {
    const result = processGridColumns([]);
    expect(result).toHaveLength(0);
  });
});

// =============================================================================
// processFormulaColumns tests
// =============================================================================

describe('processFormulaColumns', function processFormulaColumnsTests() {
  it('should process multiple formula columns', function multipleFormulaTest() {
    const formulaColumns: FormulaColumnDefinition[] = [
      { field: 'total', formula: '@price * @qty', resultType: 'number.float' },
      { field: 'profit', formula: '@total - @cost', resultType: 'number.float' },
    ];

    const result = processFormulaColumns(formulaColumns);

    expect(result).toHaveLength(2);
    expect(result[0]!.name).toBe('total');
    expect(result[0]!.group).toBe('Formula Columns');
    expect(result[1]!.name).toBe('profit');
  });

  it('should handle empty array', function emptyArrayTest() {
    const result = processFormulaColumns([]);
    expect(result).toHaveLength(0);
  });
});

// =============================================================================
// createVariableLookup tests
// =============================================================================

describe('createVariableLookup', function createVariableLookupTests() {
  it('should create lookup map from variables', function lookupMapTest() {
    const variables = [
      { name: 'x', type: 'number.float' as ValueType, nullable: true },
      { name: 'y', type: 'string.text' as ValueType, nullable: false },
    ];

    const lookup = createVariableLookup(variables);

    expect(lookup.size).toBe(2);
    expect(lookup.get('x')).toBe(variables[0]);
    expect(lookup.get('y')).toBe(variables[1]);
  });

  it('should return empty map for empty input', function emptyInputTest() {
    const lookup = createVariableLookup([]);
    expect(lookup.size).toBe(0);
  });

  it('should handle duplicate names (last wins)', function duplicateNamesTest() {
    const variables = [
      { name: 'x', type: 'number.float' as ValueType, nullable: true },
      { name: 'x', type: 'string.text' as ValueType, nullable: false },
    ];

    const lookup = createVariableLookup(variables);

    expect(lookup.size).toBe(1);
    expect(lookup.get('x')!.type).toBe('string.text');
  });
});

// =============================================================================
// GridVariableProvider class tests
// =============================================================================

describe('GridVariableProvider', function gridVariableProviderTests() {
  describe('getVariables', function getVariablesTests() {
    it('should return all variables', function allVariablesTest() {
      const variables = [
        { name: 'x', type: 'number.float' as ValueType, nullable: true },
        { name: 'y', type: 'string.text' as ValueType, nullable: true },
      ];
      const provider = new GridVariableProvider(variables);

      const result = provider.getVariables();

      expect(result).toHaveLength(2);
      expect(result[0]!.name).toBe('x');
      expect(result[1]!.name).toBe('y');
    });

    it('should return a copy of the variables array', function copyTest() {
      const variables = [{ name: 'x', type: 'number.float' as ValueType, nullable: true }];
      const provider = new GridVariableProvider(variables);

      const result1 = provider.getVariables();
      const result2 = provider.getVariables();

      expect(result1).not.toBe(result2);
      expect(result1).toEqual(result2);
    });

    it('should handle empty variables', function emptyVariablesTest() {
      const provider = new GridVariableProvider([]);

      const result = provider.getVariables();

      expect(result).toHaveLength(0);
    });
  });

  describe('hasVariable', function hasVariableTests() {
    it('should return true for existing variable', function existsTest() {
      const variables = [{ name: 'price', type: 'number.float' as ValueType, nullable: true }];
      const provider = new GridVariableProvider(variables);

      expect(provider.hasVariable('price')).toBe(true);
    });

    it('should return false for non-existing variable', function notExistsTest() {
      const variables = [{ name: 'price', type: 'number.float' as ValueType, nullable: true }];
      const provider = new GridVariableProvider(variables);

      expect(provider.hasVariable('unknown')).toBe(false);
    });

    it('should be case-sensitive', function caseSensitiveTest() {
      const variables = [{ name: 'Price', type: 'number.float' as ValueType, nullable: true }];
      const provider = new GridVariableProvider(variables);

      expect(provider.hasVariable('Price')).toBe(true);
      expect(provider.hasVariable('price')).toBe(false);
      expect(provider.hasVariable('PRICE')).toBe(false);
    });
  });

  describe('getVariableType', function getVariableTypeTests() {
    it('should return type for existing variable', function existsTest() {
      const variables = [
        { name: 'price', type: 'number.float' as ValueType, nullable: true },
        { name: 'name', type: 'string.text' as ValueType, nullable: true },
      ];
      const provider = new GridVariableProvider(variables);

      expect(provider.getVariableType('price')).toBe('number.float');
      expect(provider.getVariableType('name')).toBe('string.text');
    });

    it('should return undefined for non-existing variable', function notExistsTest() {
      const variables = [{ name: 'price', type: 'number.float' as ValueType, nullable: true }];
      const provider = new GridVariableProvider(variables);

      expect(provider.getVariableType('unknown')).toBeUndefined();
    });
  });

  describe('isNullable', function isNullableTests() {
    it('should return true for nullable variable', function nullableTest() {
      const variables = [{ name: 'price', type: 'number.float' as ValueType, nullable: true }];
      const provider = new GridVariableProvider(variables);

      expect(provider.isNullable('price')).toBe(true);
    });

    it('should return false for non-nullable variable', function nonNullableTest() {
      const variables = [{ name: 'id', type: 'number.integer' as ValueType, nullable: false }];
      const provider = new GridVariableProvider(variables);

      expect(provider.isNullable('id')).toBe(false);
    });

    it('should return false for non-existing variable', function notExistsTest() {
      const variables = [{ name: 'price', type: 'number.float' as ValueType, nullable: true }];
      const provider = new GridVariableProvider(variables);

      expect(provider.isNullable('unknown')).toBe(false);
    });
  });
});

// =============================================================================
// createGridVariableProvider factory tests
// =============================================================================

describe('createGridVariableProvider', function createGridVariableProviderTests() {
  it('should create provider from grid columns', function basicColumnsTest() {
    const columns: GridColDef[] = [
      { field: 'name', headerName: 'Name' },
      { field: 'price', type: 'number', headerName: 'Price' },
      { field: 'active', type: 'boolean', headerName: 'Active' },
    ];

    const provider = createGridVariableProvider({ columns });

    expect(provider.hasVariable('name')).toBe(true);
    expect(provider.hasVariable('price')).toBe(true);
    expect(provider.hasVariable('active')).toBe(true);

    expect(provider.getVariableType('name')).toBe('string.text');
    expect(provider.getVariableType('price')).toBe('number.float');
    expect(provider.getVariableType('active')).toBe('boolean.boolean');
  });

  it('should include formula columns', function formulaColumnsTest() {
    const columns: GridColDef[] = [
      { field: 'price', type: 'number' },
      { field: 'quantity', type: 'number' },
    ];
    const formulaColumns: FormulaColumnDefinition[] = [
      { field: 'total', formula: '@price * @quantity', resultType: 'number.float' },
    ];

    const provider = createGridVariableProvider({ columns, formulaColumns });

    expect(provider.hasVariable('price')).toBe(true);
    expect(provider.hasVariable('quantity')).toBe(true);
    expect(provider.hasVariable('total')).toBe(true);

    expect(provider.getVariableType('total')).toBe('number.float');
  });

  it('should filter out action columns', function filterActionsTest() {
    const columns: GridColDef[] = [
      { field: 'name', type: 'string' },
      { field: 'actions', type: 'actions' },
    ];

    const provider = createGridVariableProvider({ columns });

    expect(provider.hasVariable('name')).toBe(true);
    expect(provider.hasVariable('actions')).toBe(false);
  });

  it('should handle empty columns', function emptyColumnsTest() {
    const provider = createGridVariableProvider({ columns: [] });

    const variables = provider.getVariables();
    expect(variables).toHaveLength(0);
  });

  it('should handle columns without formulaColumns option', function noFormulaColumnsTest() {
    const columns: GridColDef[] = [{ field: 'name', type: 'string' }];

    const options: GridVariableProviderOptions = { columns };
    const provider = createGridVariableProvider(options);

    expect(provider.getVariables()).toHaveLength(1);
  });

  it('should return variables with correct group assignments', function groupsTest() {
    const columns: GridColDef[] = [{ field: 'price', type: 'number' }];
    const formulaColumns: FormulaColumnDefinition[] = [
      { field: 'total', formula: '@price * 2', resultType: 'number.float' },
    ];

    const provider = createGridVariableProvider({ columns, formulaColumns });
    const variables = provider.getVariables();

    const priceVar = variables.find(function findPrice(v) {
      return v.name === 'price';
    });
    const totalVar = variables.find(function findTotal(v) {
      return v.name === 'total';
    });

    expect(priceVar!.group).toBe('Columns');
    expect(totalVar!.group).toBe('Formula Columns');
  });

  it('should implement VariableProvider interface', function interfaceTest() {
    const columns: GridColDef[] = [{ field: 'x', type: 'number' }];

    const provider = createGridVariableProvider({ columns });

    // Verify all interface methods exist and work
    expect(typeof provider.getVariables).toBe('function');
    expect(typeof provider.hasVariable).toBe('function');
    expect(typeof provider.getVariableType).toBe('function');
    expect(typeof provider.isNullable).toBe('function');

    expect(provider.getVariables()).toBeInstanceOf(Array);
    expect(typeof provider.hasVariable('x')).toBe('boolean');
  });

  it('should handle date and dateTime as string.text', function dateTypesTest() {
    const columns: GridColDef[] = [
      { field: 'createdAt', type: 'date' },
      { field: 'updatedAt', type: 'dateTime' },
    ];

    const provider = createGridVariableProvider({ columns });

    expect(provider.getVariableType('createdAt')).toBe('string.text');
    expect(provider.getVariableType('updatedAt')).toBe('string.text');
  });

  it('should handle singleSelect as string.text', function singleSelectTest() {
    const columns: GridColDef[] = [{ field: 'status', type: 'singleSelect' }];

    const provider = createGridVariableProvider({ columns });

    expect(provider.getVariableType('status')).toBe('string.text');
  });

  it('should preserve column order in getVariables', function orderTest() {
    const columns: GridColDef[] = [
      { field: 'a', type: 'string' },
      { field: 'b', type: 'number' },
      { field: 'c', type: 'boolean' },
    ];
    const formulaColumns: FormulaColumnDefinition[] = [
      { field: 'd', formula: '@a', resultType: 'string.text' },
    ];

    const provider = createGridVariableProvider({ columns, formulaColumns });
    const variables = provider.getVariables();
    const names = variables.map(function getName(v) {
      return v.name;
    });

    expect(names).toEqual(['a', 'b', 'c', 'd']);
  });

  it('should set nullable to true for all variables', function allNullableTest() {
    const columns: GridColDef[] = [
      { field: 'price', type: 'number' },
      { field: 'name', type: 'string' },
    ];
    const formulaColumns: FormulaColumnDefinition[] = [
      { field: 'total', formula: '@price', resultType: 'number.float' },
    ];

    const provider = createGridVariableProvider({ columns, formulaColumns });

    expect(provider.isNullable('price')).toBe(true);
    expect(provider.isNullable('name')).toBe(true);
    expect(provider.isNullable('total')).toBe(true);
  });
});

// =============================================================================
// Integration tests
// =============================================================================

describe('integration: GridVariableProvider with realistic data', function integrationTests() {
  it('should work with a typical e-commerce grid', function ecommerceTest() {
    const columns: GridColDef[] = [
      { field: 'id', type: 'number', headerName: 'ID' },
      { field: 'productName', type: 'string', headerName: 'Product Name' },
      { field: 'price', type: 'number', headerName: 'Price' },
      { field: 'quantity', type: 'number', headerName: 'Quantity' },
      { field: 'category', type: 'singleSelect', headerName: 'Category' },
      { field: 'inStock', type: 'boolean', headerName: 'In Stock' },
      { field: 'lastUpdated', type: 'dateTime', headerName: 'Last Updated' },
      { field: 'actions', type: 'actions', headerName: 'Actions' },
    ];

    const formulaColumns: FormulaColumnDefinition[] = [
      {
        field: 'totalValue',
        formula: '@price * @quantity',
        resultType: 'number.float',
        headerName: 'Total Value',
      },
      {
        field: 'isHighValue',
        formula: '@totalValue > 1000',
        resultType: 'boolean.boolean',
        headerName: 'High Value?',
      },
    ];

    const provider = createGridVariableProvider({ columns, formulaColumns });
    const variables = provider.getVariables();

    // Should have 9 variables (7 data columns + 2 formula columns)
    expect(variables).toHaveLength(9);

    // Should not include actions column
    expect(provider.hasVariable('actions')).toBe(false);

    // Verify type mappings
    expect(provider.getVariableType('id')).toBe('number.float');
    expect(provider.getVariableType('productName')).toBe('string.text');
    expect(provider.getVariableType('price')).toBe('number.float');
    expect(provider.getVariableType('quantity')).toBe('number.float');
    expect(provider.getVariableType('category')).toBe('string.text');
    expect(provider.getVariableType('inStock')).toBe('boolean.boolean');
    expect(provider.getVariableType('lastUpdated')).toBe('string.text');
    expect(provider.getVariableType('totalValue')).toBe('number.float');
    expect(provider.getVariableType('isHighValue')).toBe('boolean.boolean');
  });

  it('should work with columns containing special field names', function specialNamesTest() {
    const columns: GridColDef[] = [
      { field: 'data.value', type: 'number' },
      { field: 'user_name', type: 'string' },
      { field: 'column123', type: 'number' },
    ];

    const provider = createGridVariableProvider({ columns });

    expect(provider.hasVariable('data.value')).toBe(true);
    expect(provider.hasVariable('user_name')).toBe(true);
    expect(provider.hasVariable('column123')).toBe(true);
  });
});
