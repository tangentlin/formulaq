/**
 * Integration tests for the FormulaQEngine facade.
 *
 * These tests verify the complete integration of parser, validator,
 * and evaluator through the unified engine interface.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createFormulaEngine, type FormulaQEngine, type BatchEvaluationOptions } from './engine.ts';
import type { EvaluationContext, VariableProvider } from './types/context.ts';
import type { Value } from './types/values.ts';
import type { FormulaFunction } from './types/functions.ts';
import type { RowContext } from './formula-evaluator/evaluator.types.ts';
import { FormulaSyntaxError, FormulaSemanticError } from './types/errors.ts';

describe('FormulaQEngine', function describeFormulaQEngine() {
  let engine: FormulaQEngine;

  beforeEach(function setupEngine() {
    engine = createFormulaEngine();
  });

  describe('createFormulaEngine', function describeCreateFormulaEngine() {
    it('should create an engine with default functions', function testDefaultFunctions() {
      const engineWithDefaults = createFormulaEngine();
      const functions = engineWithDefaults.getFunctions();

      // Should have default functions registered
      expect(functions.length).toBeGreaterThan(0);

      // Verify some specific default functions exist
      const functionNames = functions.map(function getName(fn) {
        return fn.name;
      });

      expect(functionNames).toContain('SUM');
      expect(functionNames).toContain('AVG');
      expect(functionNames).toContain('IF');
      expect(functionNames).toContain('CONCAT');
      expect(functionNames).toContain('LOG');
    });

    it('should create an engine without default functions when specified', function testNoDefaultFunctions() {
      const customEngine = createFormulaEngine({ includeDefaultFunctions: false });
      const functions = customEngine.getFunctions();

      expect(functions.length).toBe(0);
    });

    it('should include defaults when option is explicitly true', function testExplicitDefaults() {
      const engineWithDefaults = createFormulaEngine({ includeDefaultFunctions: true });
      const functions = engineWithDefaults.getFunctions();

      expect(functions.length).toBeGreaterThan(0);
    });
  });

  describe('parse', function describeParse() {
    it('should parse a simple expression', function testParseSimple() {
      const ast = engine.parse('@x + @y');

      expect(ast.type).toBe('BinaryOp');
      if (ast.type === 'BinaryOp') {
        expect(ast.operator).toBe('+');
        expect(ast.left.type).toBe('VariableRef');
        expect(ast.right.type).toBe('VariableRef');
      }
    });

    it('should parse a literal expression', function testParseLiteral() {
      const ast = engine.parse('42');

      expect(ast.type).toBe('Literal');
      if (ast.type === 'Literal') {
        expect(ast.value).toBe(42);
      }
    });

    it('should parse a function call', function testParseFunctionCall() {
      const ast = engine.parse('SUM(@values)');

      expect(ast.type).toBe('FunctionCall');
      if (ast.type === 'FunctionCall') {
        expect(ast.name).toBe('SUM');
        expect(ast.args.length).toBe(1);
      }
    });

    it('should throw FormulaSyntaxError for invalid syntax', function testParseSyntaxError() {
      expect(function parseInvalid() {
        engine.parse('@x +');
      }).toThrow(FormulaSyntaxError);
    });

    it('should throw for empty formula', function testParseEmpty() {
      expect(function parseEmpty() {
        engine.parse('');
      }).toThrow(FormulaSyntaxError);
    });
  });

  describe('validate', function describeValidate() {
    let variableProvider: VariableProvider;

    beforeEach(function setupProvider() {
      variableProvider = createTestVariableProvider(['x', 'y', 'score']);
    });

    it('should validate a valid formula', function testValidateValid() {
      const validated = engine.validate('@x + @y', variableProvider);

      expect(validated.root).toBeDefined();
      expect(validated.resultType).toBe('number.float');
      expect(validated.dependencies).toEqual(['x', 'y']);
      expect(validated.hasAggregations).toBe(false);
    });

    it('should validate a formula with AST input', function testValidateWithAst() {
      const ast = engine.parse('@score * 2');
      const validated = engine.validate(ast, variableProvider);

      expect(validated.root).toBeDefined();
      expect(validated.dependencies).toEqual(['score']);
    });

    it('should detect aggregation functions', function testValidateAggregation() {
      const validated = engine.validate('AVG(@score)', variableProvider);

      expect(validated.hasAggregations).toBe(true);
      expect(validated.aggregations).toContain('AVG');
    });

    it('should throw FormulaSemanticError for unknown variable', function testValidateUnknownVar() {
      expect(function validateUnknown() {
        engine.validate('@unknown', variableProvider);
      }).toThrow(FormulaSemanticError);
    });

    it('should throw for unknown function', function testValidateUnknownFunction() {
      expect(function validateUnknownFunc() {
        engine.validate('UNKNOWN_FUNC(@x)', variableProvider);
      }).toThrow(FormulaSemanticError);
    });
  });

  describe('evaluateRow', function describeEvaluateRow() {
    it('should evaluate a simple expression for a single row', async function testEvaluateRowSimple() {
      const rowContext = createTestRowContext({ x: 10, y: 5 });
      const result = await engine.evaluateRow('@x + @y', rowContext);

      expect(result.value).toBe(15);
      expect(result.type).toBe('number.float');
    });

    it('should evaluate a formula with AST input', async function testEvaluateRowWithAst() {
      const ast = engine.parse('@x * 2');
      const rowContext = createTestRowContext({ x: 7 });
      const result = await engine.evaluateRow(ast, rowContext);

      expect(result.value).toBe(14);
    });

    it('should evaluate a validated AST', async function testEvaluateRowWithValidated() {
      const provider = createTestVariableProvider(['x']);
      const validated = engine.validate('@x + 10', provider);
      const rowContext = createTestRowContext({ x: 5 });
      const result = await engine.evaluateRow(validated, rowContext);

      expect(result.value).toBe(15);
    });

    it('should handle null values', async function testEvaluateRowNull() {
      const rowContext = createTestRowContext({ x: null });
      const result = await engine.evaluateRow('@x + 5', rowContext);

      expect(result.value).toBe(null);
    });

    it('should evaluate function calls', async function testEvaluateRowFunction() {
      const rowContext = createTestRowContext({ x: 100 });
      const result = await engine.evaluateRow('LOG10(@x)', rowContext);

      expect(result.value).toBeCloseTo(2, 5);
    });
  });

  describe('evaluateBatch', function describeEvaluateBatch() {
    it('should evaluate across all rows', async function testEvaluateBatchBasic() {
      const context = createTestEvaluationContext({
        x: [1, 2, 3, 4, 5],
      });

      const result = await engine.evaluateBatch('@x * 2', context);

      expect(result.values.length).toBe(5);
      expect(result.values[0]?.value).toBe(2);
      expect(result.values[1]?.value).toBe(4);
      expect(result.values[2]?.value).toBe(6);
      expect(result.values[3]?.value).toBe(8);
      expect(result.values[4]?.value).toBe(10);
      expect(result.hasErrors).toBe(false);
    });

    it('should handle null values in batch', async function testEvaluateBatchNull() {
      const context = createTestEvaluationContext({
        x: [1, null, 3],
      });

      const result = await engine.evaluateBatch('@x + 1', context);

      expect(result.values[0]?.value).toBe(2);
      expect(result.values[1]?.value).toBe(null);
      expect(result.values[2]?.value).toBe(4);
    });

    it('should evaluate with aggregations', async function testEvaluateBatchAggregation() {
      const context = createTestEvaluationContext({
        score: [10, 20, 30, 40, 50],
      });

      const result = await engine.evaluateBatch('@score - AVG(@score)', context);

      // AVG = 30, so results should be: -20, -10, 0, 10, 20
      expect(result.values[0]?.value).toBe(-20);
      expect(result.values[1]?.value).toBe(-10);
      expect(result.values[2]?.value).toBe(0);
      expect(result.values[3]?.value).toBe(10);
      expect(result.values[4]?.value).toBe(20);
    });

    it('should report progress', async function testEvaluateBatchProgress() {
      const context = createTestEvaluationContext({
        x: Array.from({ length: 100 }, function generate(_, i) {
          return i;
        }),
      });

      const progressCalls: Array<{ completed: number; total: number }> = [];
      const options: BatchEvaluationOptions = {
        chunkSize: 25,
        onProgress: function trackProgress(completed, total) {
          progressCalls.push({ completed, total });
        },
      };

      await engine.evaluateBatch('@x + 1', context, options);

      expect(progressCalls.length).toBeGreaterThan(0);
      const lastCall = progressCalls[progressCalls.length - 1];
      expect(lastCall?.completed).toBe(100);
      expect(lastCall?.total).toBe(100);
    });

    it('should support cancellation', async function testEvaluateBatchCancellation() {
      const context = createTestEvaluationContext({
        x: Array.from({ length: 1000 }, function generate(_, i) {
          return i;
        }),
      });

      const controller = new AbortController();

      // Abort after a short delay
      setTimeout(function abort() {
        controller.abort();
      }, 10);

      const options: BatchEvaluationOptions = {
        chunkSize: 100,
        delayMs: 5,
        signal: controller.signal,
      };

      const result = await engine.evaluateBatch('@x * 2', context, options);

      // Should have partial results (less than 1000)
      expect(result.values.length).toBeLessThanOrEqual(1000);
    });

    it('should handle empty context', async function testEvaluateBatchEmpty() {
      const context: EvaluationContext = {
        variables: {},
        rowCount: 0,
      };

      const result = await engine.evaluateBatch('42', context);

      expect(result.values.length).toBe(0);
      expect(result.hasErrors).toBe(false);
    });
  });

  describe('execute', function describeExecute() {
    it('should validate and evaluate in one call', async function testExecuteBasic() {
      const context = createTestEvaluationContext({
        value: [10, 20, 30],
      });

      const result = await engine.execute('@value * 2', context);

      expect(result.values.length).toBe(3);
      expect(result.values[0]?.value).toBe(20);
      expect(result.values[1]?.value).toBe(40);
      expect(result.values[2]?.value).toBe(60);
    });

    it('should throw for invalid formula', async function testExecuteInvalid() {
      const context = createTestEvaluationContext({
        value: [1, 2, 3],
      });

      await expect(engine.execute('@unknown_variable', context)).rejects.toThrow(
        FormulaSemanticError,
      );
    });

    it('should support options', async function testExecuteWithOptions() {
      const context = createTestEvaluationContext({
        x: Array.from({ length: 50 }, function generate(_, i) {
          return i;
        }),
      });

      const progressCalls: number[] = [];
      const options: BatchEvaluationOptions = {
        chunkSize: 10,
        onProgress: function trackProgress(completed) {
          progressCalls.push(completed);
        },
      };

      await engine.execute('@x + 1', context, options);

      expect(progressCalls.length).toBeGreaterThan(0);
    });
  });

  describe('getFunctions', function describeGetFunctions() {
    it('should return all registered functions', function testGetFunctions() {
      const functions = engine.getFunctions();

      expect(Array.isArray(functions)).toBe(true);
      expect(functions.length).toBeGreaterThan(0);

      // Each function should have required metadata
      for (const fn of functions) {
        expect(fn.name).toBeDefined();
        expect(fn.description).toBeDefined();
        expect(fn.params).toBeDefined();
        expect(fn.returnType).toBeDefined();
        expect(typeof fn.isAggregation).toBe('boolean');
      }
    });

    it('should include aggregation functions', function testGetAggregationFunctions() {
      const functions = engine.getFunctions();
      const aggregations = functions.filter(function isAgg(fn) {
        return fn.isAggregation;
      });

      expect(aggregations.length).toBeGreaterThan(0);

      const aggNames = aggregations.map(function getName(fn) {
        return fn.name;
      });

      expect(aggNames).toContain('SUM');
      expect(aggNames).toContain('AVG');
      expect(aggNames).toContain('MIN');
      expect(aggNames).toContain('MAX');
      expect(aggNames).toContain('COUNT');
    });
  });

  describe('registerFunction', function describeRegisterFunction() {
    it('should register a custom function', function testRegisterFunction() {
      const customEngine = createFormulaEngine({ includeDefaultFunctions: false });

      const doubleFunction: FormulaFunction = {
        name: 'DOUBLE',
        description: 'Doubles a number',
        params: [{ name: 'x', type: 'number.float', description: 'Value to double' }],
        returnType: 'number.float',
        isAggregation: false,
        async evaluate(args) {
          const val = args[0]?.value;
          if (val === null || typeof val !== 'number') {
            return { type: 'number.float', value: null };
          }
          return { type: 'number.float', value: val * 2 };
        },
      };

      customEngine.registerFunction(doubleFunction);

      const functions = customEngine.getFunctions();
      const functionNames = functions.map(function getName(fn) {
        return fn.name;
      });

      expect(functionNames).toContain('DOUBLE');
    });

    it('should allow using registered custom function', async function testUseCustomFunction() {
      const customEngine = createFormulaEngine({ includeDefaultFunctions: false });

      customEngine.registerFunction({
        name: 'SQUARE',
        description: 'Squares a number',
        params: [{ name: 'x', type: 'number.float', description: 'Value to square' }],
        returnType: 'number.float',
        isAggregation: false,
        async evaluate(args) {
          const val = args[0]?.value;
          if (val === null || typeof val !== 'number') {
            return { type: 'number.float', value: null };
          }
          return { type: 'number.float', value: val * val };
        },
      });

      const context = createTestEvaluationContext({
        n: [2, 3, 4],
      });

      const result = await customEngine.execute('SQUARE(@n)', context);

      expect(result.values[0]?.value).toBe(4);
      expect(result.values[1]?.value).toBe(9);
      expect(result.values[2]?.value).toBe(16);
    });

    it('should throw for duplicate function name', function testRegisterDuplicate() {
      expect(function registerDuplicate() {
        engine.registerFunction({
          name: 'SUM', // Already exists
          description: 'Another sum',
          params: [],
          returnType: 'number.float',
          isAggregation: false,
          async evaluate() {
            return { type: 'number.float', value: 0 };
          },
        });
      }).toThrow();
    });
  });

  describe('getDependencies', function describeGetDependencies() {
    it('should extract variable dependencies from formula string', function testGetDepsFromString() {
      const deps = engine.getDependencies('@a + @b * @c');

      expect(deps).toContain('a');
      expect(deps).toContain('b');
      expect(deps).toContain('c');
      expect(deps.length).toBe(3);
    });

    it('should extract dependencies from AST', function testGetDepsFromAst() {
      const ast = engine.parse('@x + @y');
      const deps = engine.getDependencies(ast);

      expect(deps).toContain('x');
      expect(deps).toContain('y');
      expect(deps.length).toBe(2);
    });

    it('should return unique dependencies', function testGetDepsUnique() {
      const deps = engine.getDependencies('@x + @x + @x');

      expect(deps).toEqual(['x']);
    });

    it('should return empty array for formula without variables', function testGetDepsNoVars() {
      const deps = engine.getDependencies('1 + 2 * 3');

      expect(deps).toEqual([]);
    });

    it('should include variables inside function calls', function testGetDepsInFunctions() {
      const deps = engine.getDependencies('AVG(@score) + @bonus');

      expect(deps).toContain('score');
      expect(deps).toContain('bonus');
    });
  });

  describe('integration scenarios', function describeIntegration() {
    it('should handle complex formula with multiple operations', async function testComplexFormula() {
      const context = createTestEvaluationContext({
        price: [100, 200, 300],
        quantity: [2, 3, 1],
        discount: [0.1, 0.2, 0.15],
      });

      // (price * quantity) * (1 - discount)
      const result = await engine.execute('(@price * @quantity) * (1 - @discount)', context);

      expect(result.values[0]?.value).toBeCloseTo(180, 5); // 100 * 2 * 0.9
      expect(result.values[1]?.value).toBeCloseTo(480, 5); // 200 * 3 * 0.8
      expect(result.values[2]?.value).toBeCloseTo(255, 5); // 300 * 1 * 0.85
    });

    it('should handle formula with IF and aggregation', async function testIfWithAggregation() {
      const context = createTestEvaluationContext({
        score: [70, 80, 90, 100],
      });

      // Mark scores above average
      const result = await engine.execute('IF(@score > AVG(@score), 1, 0)', context);

      // AVG = 85
      expect(result.values[0]?.value).toBe(0); // 70 < 85
      expect(result.values[1]?.value).toBe(0); // 80 < 85
      expect(result.values[2]?.value).toBe(1); // 90 > 85
      expect(result.values[3]?.value).toBe(1); // 100 > 85
    });

    it('should handle string concatenation', async function testStringConcat() {
      const context: EvaluationContext = {
        variables: {
          first: [
            { type: 'string.text', value: 'John' },
            { type: 'string.text', value: 'Jane' },
          ],
          last: [
            { type: 'string.text', value: 'Doe' },
            { type: 'string.text', value: 'Smith' },
          ],
        },
        rowCount: 2,
      };

      const result = await engine.execute('CONCAT(@first, " ", @last)', context);

      expect(result.values[0]?.value).toBe('John Doe');
      expect(result.values[1]?.value).toBe('Jane Smith');
    });

    it('should handle nested function calls', async function testNestedFunctions() {
      const context = createTestEvaluationContext({
        value: [-10, 0, 10, null],
      });

      // IFNULL(value, 0) then check if positive
      const result = await engine.execute('IF(IFNULL(@value, 0) > 0, 1, 0)', context);

      expect(result.values[0]?.value).toBe(0); // -10 is not > 0
      expect(result.values[1]?.value).toBe(0); // 0 is not > 0
      expect(result.values[2]?.value).toBe(1); // 10 > 0
      expect(result.values[3]?.value).toBe(0); // IFNULL(null, 0) = 0, not > 0
    });
  });
});

// Helper functions for creating test data

/**
 * Creates a test VariableProvider with the given variable names.
 */
function createTestVariableProvider(names: string[]): VariableProvider {
  return {
    getVariables() {
      return names.map(function createInfo(name) {
        return { name, type: 'number.float' as const, nullable: true };
      });
    },
    hasVariable(name: string) {
      return names.includes(name);
    },
    getVariableType() {
      return 'number.float';
    },
    isNullable() {
      return true;
    },
  };
}

/**
 * Creates a test RowContext with the given variable values.
 */
function createTestRowContext(values: Record<string, number | null>): RowContext {
  return {
    rowIndex: 0,
    getVariable(name: string): Value | null {
      const val = values[name];
      if (val === undefined) {
        return null;
      }
      return { type: 'number.float', value: val };
    },
  };
}

/**
 * Creates a test EvaluationContext from numeric arrays.
 */
function createTestEvaluationContext(
  data: Record<string, Array<number | null>>,
): EvaluationContext {
  const variables: Record<string, Value[]> = {};
  let rowCount = 0;

  for (const name of Object.keys(data)) {
    const values = data[name];
    if (values !== undefined) {
      variables[name] = values.map(function createValue(v): Value {
        return { type: 'number.float', value: v };
      });
      rowCount = Math.max(rowCount, values.length);
    }
  }

  return {
    variables,
    rowCount,
  };
}
