/**
 * Chevrotain grammar rules for the FormulaQ language.
 *
 * This module defines the parser class that implements the grammar rules
 * for parsing formula expressions. The grammar handles operator precedence,
 * associativity, and produces a CST (Concrete Syntax Tree) that is then
 * transformed into an AST by the ASTBuilder.
 *
 * Grammar Precedence (lowest to highest):
 * 1. Comparison operators (==, !=, <>, <, >, <=, >=)
 * 2. String concatenation (&)
 * 3. Additive (+, -)
 * 4. Multiplicative (*, /, %)
 * 5. Exponentiation (^) - RIGHT associative
 * 6. Unary (-, +)
 * 7. Primary (literals, variables, function calls, parentheses)
 *
 * @module
 */

import { CstParser, type CstNode, type IToken, type ParserMethod } from 'chevrotain';

import type { ASTNode } from '../types/ast.ts';
import { ASTBuilder } from './ast-builder.ts';
import {
  allTokens,
  Ampersand,
  Comma,
  Divide,
  Equal,
  False,
  FormulaLexer,
  GreaterThan,
  GreaterThanOrEqual,
  Identifier,
  LeftParen,
  LessThan,
  LessThanOrEqual,
  Minus,
  Modulo,
  Multiply,
  NotEqual,
  NotEqualAlt,
  NumberLiteral,
  Plus,
  Power,
  RightParen,
  SingleQuoteStringLiteral,
  StringLiteral,
  True,
  VariableRef,
} from './tokens.ts';

/**
 * Result of parsing a formula string.
 */
export interface ParseResult {
  /**
   * The parsed AST node. Only present if parsing succeeded.
   */
  readonly ast?: ASTNode | undefined;

  /**
   * The raw CST (Concrete Syntax Tree) from Chevrotain.
   */
  readonly cst: CstNode;

  /**
   * Any errors that occurred during parsing.
   */
  readonly errors: readonly ParseError[];
}

/**
 * Information about a parse error.
 */
export interface ParseError {
  /**
   * Human-readable error message.
   */
  readonly message: string;

  /**
   * Token that caused the error (if available).
   */
  readonly token?: IToken | undefined;

  /**
   * Starting offset of the error.
   */
  readonly startOffset: number;

  /**
   * Ending offset of the error.
   */
  readonly endOffset: number;

  /**
   * Line number (1-based) of the error.
   */
  readonly line: number;

  /**
   * Column number (1-based) of the error.
   */
  readonly column: number;
}

/**
 * Chevrotain parser for the FormulaQ language.
 *
 * This parser implements a recursive descent grammar for parsing
 * formula expressions with proper operator precedence and associativity.
 *
 * @example
 * ```typescript
 * const parser = new FormulaParser();
 * const result = parser.parse('@x + 1');
 * if (result.errors.length === 0) {
 *   console.log(result.ast);
 * }
 * ```
 */
export class FormulaParser extends CstParser {
  private readonly astBuilder: ASTBuilder;

  // Rule declarations (required by Chevrotain for recursive rules)
  public expression: ParserMethod<[], CstNode>;
  public comparisonExpression: ParserMethod<[], CstNode>;
  public concatenationExpression: ParserMethod<[], CstNode>;
  public additiveExpression: ParserMethod<[], CstNode>;
  public multiplicativeExpression: ParserMethod<[], CstNode>;
  public exponentiationExpression: ParserMethod<[], CstNode>;
  public unaryExpression: ParserMethod<[], CstNode>;
  public primaryExpression: ParserMethod<[], CstNode>;
  public functionCall: ParserMethod<[], CstNode>;
  public argumentList: ParserMethod<[], CstNode>;
  public parenthesizedExpression: ParserMethod<[], CstNode>;

  constructor() {
    super(allTokens, {
      recoveryEnabled: true,
      maxLookahead: 2,
    });

    this.astBuilder = new ASTBuilder();

    // Define grammar rules
    // Note: Chevrotain RULE requires regular function expressions, not arrow functions.
    // The `self` pattern is necessary to access parser methods from within rule callbacks.
    // oxlint-disable-next-line typescript-eslint/no-this-alias
    const self = this;

    /**
     * Top-level expression rule.
     * expression -> comparisonExpression
     */
    this.expression = this.RULE('expression', function expressionRule() {
      self.SUBRULE(self.comparisonExpression);
    });

    /**
     * Comparison expression (lowest precedence for binary operators).
     * comparisonExpression -> concatenationExpression ((==|!=|<>|<|>|<=|>=) concatenationExpression)*
     */
    this.comparisonExpression = this.RULE(
      'comparisonExpression',
      function comparisonExpressionRule() {
        self.SUBRULE(self.concatenationExpression);
        self.MANY(function comparisonManyRule() {
          self.OR([
            {
              ALT: function equalAlt() {
                self.CONSUME(Equal, { LABEL: 'comparisonOperator' });
              },
            },
            {
              ALT: function notEqualAlt() {
                self.CONSUME(NotEqual, { LABEL: 'comparisonOperator' });
              },
            },
            {
              ALT: function notEqualAltAlt() {
                self.CONSUME(NotEqualAlt, { LABEL: 'comparisonOperator' });
              },
            },
            {
              ALT: function lessThanOrEqualAlt() {
                self.CONSUME(LessThanOrEqual, { LABEL: 'comparisonOperator' });
              },
            },
            {
              ALT: function greaterThanOrEqualAlt() {
                self.CONSUME(GreaterThanOrEqual, { LABEL: 'comparisonOperator' });
              },
            },
            {
              ALT: function lessThanAlt() {
                self.CONSUME(LessThan, { LABEL: 'comparisonOperator' });
              },
            },
            {
              ALT: function greaterThanAlt() {
                self.CONSUME(GreaterThan, { LABEL: 'comparisonOperator' });
              },
            },
          ]);
          self.SUBRULE2(self.concatenationExpression);
        });
      },
    );

    /**
     * String concatenation expression.
     * concatenationExpression -> additiveExpression (& additiveExpression)*
     */
    this.concatenationExpression = this.RULE(
      'concatenationExpression',
      function concatenationExpressionRule() {
        self.SUBRULE(self.additiveExpression);
        self.MANY(function concatenationManyRule() {
          self.CONSUME(Ampersand);
          self.SUBRULE2(self.additiveExpression);
        });
      },
    );

    /**
     * Additive expression.
     * additiveExpression -> multiplicativeExpression ((+|-) multiplicativeExpression)*
     */
    this.additiveExpression = this.RULE('additiveExpression', function additiveExpressionRule() {
      self.SUBRULE(self.multiplicativeExpression);
      self.MANY(function additiveManyRule() {
        self.OR([
          {
            ALT: function plusAlt() {
              self.CONSUME(Plus, { LABEL: 'additiveOperator' });
            },
          },
          {
            ALT: function minusAlt() {
              self.CONSUME(Minus, { LABEL: 'additiveOperator' });
            },
          },
        ]);
        self.SUBRULE2(self.multiplicativeExpression);
      });
    });

    /**
     * Multiplicative expression.
     * multiplicativeExpression -> exponentiationExpression ((*|/|%) exponentiationExpression)*
     */
    this.multiplicativeExpression = this.RULE(
      'multiplicativeExpression',
      function multiplicativeExpressionRule() {
        self.SUBRULE(self.exponentiationExpression);
        self.MANY(function multiplicativeManyRule() {
          self.OR([
            {
              ALT: function multiplyAlt() {
                self.CONSUME(Multiply, { LABEL: 'multiplicativeOperator' });
              },
            },
            {
              ALT: function divideAlt() {
                self.CONSUME(Divide, { LABEL: 'multiplicativeOperator' });
              },
            },
            {
              ALT: function moduloAlt() {
                self.CONSUME(Modulo, { LABEL: 'multiplicativeOperator' });
              },
            },
          ]);
          self.SUBRULE2(self.exponentiationExpression);
        });
      },
    );

    /**
     * Exponentiation expression (RIGHT associative).
     * exponentiationExpression -> unaryExpression (^ unaryExpression)*
     *
     * Note: The CST structure handles multiple ^ operators, and the
     * ASTBuilder uses buildRightAssociativeChain to create the correct AST.
     */
    this.exponentiationExpression = this.RULE(
      'exponentiationExpression',
      function exponentiationExpressionRule() {
        self.SUBRULE(self.unaryExpression);
        self.MANY(function exponentiationManyRule() {
          self.CONSUME(Power);
          self.SUBRULE2(self.unaryExpression);
        });
      },
    );

    /**
     * Unary expression.
     * unaryExpression -> (-|+) unaryExpression | primaryExpression
     */
    this.unaryExpression = this.RULE('unaryExpression', function unaryExpressionRule() {
      self.OR([
        {
          ALT: function unaryOperatorAlt() {
            self.OR2([
              {
                ALT: function unaryPlusAlt() {
                  self.CONSUME(Plus, { LABEL: 'unaryOperator' });
                },
              },
              {
                ALT: function unaryMinusAlt() {
                  self.CONSUME(Minus, { LABEL: 'unaryOperator' });
                },
              },
            ]);
            self.SUBRULE(self.unaryExpression);
          },
        },
        {
          ALT: function primaryAlt() {
            self.SUBRULE(self.primaryExpression);
          },
        },
      ]);
    });

    /**
     * Primary expression.
     * primaryExpression -> NumberLiteral | StringLiteral | SingleQuoteStringLiteral
     *                    | TRUE | FALSE | VariableRef | functionCall | parenthesizedExpression
     */
    this.primaryExpression = this.RULE('primaryExpression', function primaryExpressionRule() {
      self.OR([
        {
          ALT: function numberAlt() {
            self.CONSUME(NumberLiteral);
          },
        },
        {
          ALT: function stringAlt() {
            self.CONSUME(StringLiteral);
          },
        },
        {
          ALT: function singleQuoteStringAlt() {
            self.CONSUME(SingleQuoteStringLiteral);
          },
        },
        {
          ALT: function trueAlt() {
            self.CONSUME(True);
          },
        },
        {
          ALT: function falseAlt() {
            self.CONSUME(False);
          },
        },
        {
          ALT: function variableAlt() {
            self.CONSUME(VariableRef);
          },
        },
        {
          ALT: function functionAlt() {
            self.SUBRULE(self.functionCall);
          },
        },
        {
          ALT: function parenAlt() {
            self.SUBRULE(self.parenthesizedExpression);
          },
        },
      ]);
    });

    /**
     * Function call.
     * functionCall -> Identifier LeftParen argumentList? RightParen
     */
    this.functionCall = this.RULE('functionCall', function functionCallRule() {
      self.CONSUME(Identifier);
      self.CONSUME(LeftParen);
      self.OPTION(function argumentListOption() {
        self.SUBRULE(self.argumentList);
      });
      self.CONSUME(RightParen);
    });

    /**
     * Argument list (comma-separated expressions).
     * argumentList -> expression (Comma expression)*
     */
    this.argumentList = this.RULE('argumentList', function argumentListRule() {
      self.SUBRULE(self.expression);
      self.MANY(function argumentListManyRule() {
        self.CONSUME(Comma);
        self.SUBRULE2(self.expression);
      });
    });

    /**
     * Parenthesized expression.
     * parenthesizedExpression -> LeftParen expression RightParen
     */
    this.parenthesizedExpression = this.RULE(
      'parenthesizedExpression',
      function parenthesizedExpressionRule() {
        self.CONSUME(LeftParen);
        self.SUBRULE(self.expression);
        self.CONSUME(RightParen);
      },
    );

    // Perform self-analysis to build internal parser data structures
    this.performSelfAnalysis();
  }

  /**
   * Parses a formula string and returns the result.
   *
   * @param formulaText - The formula string to parse
   * @returns The parse result containing CST, AST (if successful), and any errors
   */
  parse(formulaText: string): ParseResult {
    // Tokenize the input
    const lexResult = FormulaLexer.tokenize(formulaText);

    // Check for lexer errors
    if (lexResult.errors.length > 0) {
      const errors: ParseError[] = lexResult.errors.map(function mapLexError(error) {
        return {
          message: error.message,
          startOffset: error.offset,
          endOffset: error.offset + error.length,
          line: error.line ?? 1,
          column: error.column ?? 1,
        };
      });

      // Return with empty CST and lexer errors
      return {
        cst: { name: 'expression', children: {} },
        errors,
      };
    }

    // Set the input tokens
    this.input = lexResult.tokens;

    // Parse the tokens
    const cst = this.expression();

    // Convert parse errors to our format
    const errors: ParseError[] = this.errors.map(function mapParseError(error) {
      const token = error.token;
      return {
        message: error.message,
        token,
        startOffset: token.startOffset,
        endOffset: token.endOffset ?? token.startOffset,
        line: token.startLine ?? 1,
        column: token.startColumn ?? 1,
      };
    });

    // If there are errors, return without AST
    if (errors.length > 0) {
      return { cst, errors };
    }

    // Build AST from CST
    try {
      const ast = this.astBuilder.visitExpression(cst);
      return { ast, cst, errors: [] };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        cst,
        errors: [
          {
            message: `AST construction failed: ${message}`,
            startOffset: 0,
            endOffset: formulaText.length,
            line: 1,
            column: 1,
          },
        ],
      };
    }
  }
}

// Singleton parser instance for reuse
let parserInstance: FormulaParser | null = null;

/**
 * Gets or creates the singleton FormulaParser instance.
 *
 * The parser is reusable and stateless between parse calls.
 *
 * @returns The FormulaParser instance
 */
export function getFormulaParser(): FormulaParser {
  if (parserInstance === null) {
    parserInstance = new FormulaParser();
  }
  return parserInstance;
}

/**
 * Parses a formula string into an AST.
 *
 * This is the main entry point for parsing formulas. It uses a singleton
 * parser instance for efficiency.
 *
 * @param formulaText - The formula string to parse
 * @returns The parse result containing CST, AST (if successful), and any errors
 *
 * @example
 * ```typescript
 * const result = parseFormula('@x + @y * 2');
 * if (result.errors.length === 0 && result.ast) {
 *   console.log('Parsed:', result.ast);
 * } else {
 *   console.error('Parse errors:', result.errors);
 * }
 * ```
 */
export function parseFormula(formulaText: string): ParseResult {
  const parser = getFormulaParser();
  return parser.parse(formulaText);
}
