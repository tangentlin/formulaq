/**
 * Pure logic for variable resolution in formulas.
 *
 * This module contains the pure functions for traversing the AST,
 * collecting variable references, and validating them against
 * available variables. It has no dependencies on classes.
 *
 * @module
 */

import type { ASTNode, SourceLocation } from '../types/ast.ts';
import type { VariableReference } from './validator.types.ts';

/**
 * Input for variable resolution.
 */
export interface ResolveVariablesInput {
  /**
   * The AST to traverse.
   */
  readonly ast: ASTNode;

  /**
   * Function to check if a variable exists.
   */
  readonly hasVariable: (name: string) => boolean;
}

/**
 * Collects all variable references from an AST.
 *
 * Traverses the AST depth-first and collects all VariableRefNode nodes.
 * Returns unique variable names in the order they are first encountered.
 *
 * @param ast - The AST node to traverse
 * @returns Array of variable references with position information
 *
 * @example
 * ```typescript
 * const ast = parse('@x + @y * @x');
 * const refs = collectVariableReferences(ast);
 * // Returns: [
 * //   { name: 'x', start: 0, end: 2 },
 * //   { name: 'y', start: 5, end: 7 },
 * //   { name: 'x', start: 10, end: 12 }
 * // ]
 * ```
 */
export function collectVariableReferences(ast: ASTNode): VariableReference[] {
  const references: VariableReference[] = [];
  traverseForVariables(ast, references);
  return references;
}

/**
 * Recursive helper to traverse AST and collect variable references.
 *
 * @param node - Current AST node
 * @param references - Array to accumulate references into
 */
function traverseForVariables(node: ASTNode, references: VariableReference[]): void {
  switch (node.type) {
    case 'Literal':
      // Literals have no variable references
      break;

    case 'VariableRef':
      references.push(createVariableReference(node.name, node.location));
      break;

    case 'BinaryOp':
      traverseForVariables(node.left, references);
      traverseForVariables(node.right, references);
      break;

    case 'UnaryOp':
      traverseForVariables(node.operand, references);
      break;

    case 'FunctionCall':
      for (const arg of node.args) {
        traverseForVariables(arg, references);
      }
      break;

    default:
      // Exhaustive check - TypeScript will error if a case is missing
      assertNever(node);
  }
}

/**
 * Creates a VariableReference from a variable name and location.
 *
 * @param name - Variable name (without @ prefix)
 * @param location - Source location if available
 * @returns VariableReference object
 */
function createVariableReference(
  name: string,
  location: SourceLocation | undefined,
): VariableReference {
  // Use location if available, otherwise use 0
  const start = location?.start ?? 0;
  const end = location?.end ?? start;

  return {
    name,
    start,
    end,
  };
}

/**
 * Extracts unique variable names from references.
 *
 * Preserves the order of first occurrence.
 *
 * @param references - Array of variable references
 * @returns Array of unique variable names
 *
 * @example
 * ```typescript
 * const refs = [
 *   { name: 'x', start: 0, end: 2 },
 *   { name: 'y', start: 5, end: 7 },
 *   { name: 'x', start: 10, end: 12 }
 * ];
 * const unique = extractUniqueVariableNames(refs);
 * // Returns: ['x', 'y']
 * ```
 */
export function extractUniqueVariableNames(references: readonly VariableReference[]): string[] {
  const seen = new Set<string>();
  const unique: string[] = [];

  for (const ref of references) {
    if (!seen.has(ref.name)) {
      seen.add(ref.name);
      unique.push(ref.name);
    }
  }

  return unique;
}

/**
 * Information about an unknown variable for error creation.
 */
export interface UnknownVariableInfo {
  /**
   * Variable name.
   */
  readonly name: string;

  /**
   * Start position in source.
   */
  readonly start: number;

  /**
   * End position in source.
   */
  readonly end: number;
}

/**
 * Finds variable references that don't exist in the available variables.
 *
 * Returns the first occurrence of each unknown variable.
 *
 * @param references - All variable references found in the AST
 * @param hasVariable - Function to check if a variable exists
 * @returns Array of unknown variable info for error creation
 *
 * @example
 * ```typescript
 * const refs = [
 *   { name: 'x', start: 0, end: 2 },
 *   { name: 'unknown', start: 5, end: 12 },
 * ];
 * const hasVar = (name) => name === 'x';
 * const unknown = findUnknownVariables(refs, hasVar);
 * // Returns: [{ name: 'unknown', start: 5, end: 12 }]
 * ```
 */
export function findUnknownVariables(
  references: readonly VariableReference[],
  hasVariable: (name: string) => boolean,
): UnknownVariableInfo[] {
  const seenUnknown = new Set<string>();
  const unknown: UnknownVariableInfo[] = [];

  for (const ref of references) {
    // Only report each unknown variable once (first occurrence)
    if (!hasVariable(ref.name) && !seenUnknown.has(ref.name)) {
      seenUnknown.add(ref.name);
      unknown.push({
        name: ref.name,
        start: ref.start,
        end: ref.end,
      });
    }
  }

  return unknown;
}

/**
 * Creates an error message for an unknown variable.
 *
 * @param variableName - The name of the unknown variable
 * @returns Human-readable error message
 */
export function createUnknownVariableMessage(variableName: string): string {
  return `Unknown variable: @${variableName}`;
}

/**
 * Resolves all variables in an AST.
 *
 * This is the main entry point for variable resolution. It:
 * 1. Collects all variable references from the AST
 * 2. Finds which variables are unknown
 * 3. Returns dependencies and error information
 *
 * Note: This function does not create FormulaSemanticError objects directly.
 * It returns the information needed to create them, allowing the caller
 * to handle error creation (maintaining purity of this module).
 *
 * @param input - The resolution input containing AST and variable lookup
 * @returns Object with dependencies and unknown variable info
 *
 * @example
 * ```typescript
 * const result = resolveVariables({
 *   ast: parse('@x + @y'),
 *   hasVariable: (name) => name === 'x',
 * });
 * // result.dependencies = ['x', 'y']
 * // result.unknownVariables = [{ name: 'y', start: 5, end: 7 }]
 * ```
 */
export function resolveVariables(input: ResolveVariablesInput): ResolveVariablesResult {
  const references = collectVariableReferences(input.ast);
  const dependencies = extractUniqueVariableNames(references);
  const unknownVariables = findUnknownVariables(references, input.hasVariable);

  return {
    dependencies,
    unknownVariables,
  };
}

/**
 * Result of variable resolution (pure data, no error objects).
 */
export interface ResolveVariablesResult {
  /**
   * All unique variable names referenced in the formula.
   */
  readonly dependencies: readonly string[];

  /**
   * Information about unknown variables for error creation.
   */
  readonly unknownVariables: readonly UnknownVariableInfo[];
}

/**
 * Helper for exhaustive type checking.
 *
 * @param x - Value that should never exist
 */
function assertNever(x: never): never {
  throw new Error(`Unexpected node type: ${(x as ASTNode).type}`);
}
