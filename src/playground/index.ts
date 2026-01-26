/**
 * FormulaQ Playground
 *
 * Interactive formula testing UI with variable editing and result visualization.
 *
 * @example
 * ```tsx
 * import { Playground } from 'formulaq/playground';
 *
 * function App() {
 *   return <Playground />;
 * }
 * ```
 *
 * @packageDocumentation
 */

export { Playground } from './playground/playground';
export type { PlaygroundProps } from './playground/playground.types';

export { VariableEditor } from './variable-editor/variable-editor';
export type { VariableEditorProps, ParseResult } from './variable-editor/variable-editor.types';

export { VariableCard } from './variable-card/variable-card';
export type { VariableCardProps, PlaygroundVariable } from './variable-card/variable-card.types';

export { AggregationDisplay } from './aggregation-display/aggregation-display';
export type {
  AggregationDisplayProps,
  AggregationResult,
} from './aggregation-display/aggregation-display.types';

export { ResultsPanel } from './results-panel/results-panel';
export type {
  ResultsPanelProps,
  ResultsStatistics,
  FormattedResult,
} from './results-panel/results-panel.types';

export { VariablePanel } from './variable-panel/variable-panel';
export type { VariablePanelProps } from './variable-panel/variable-panel.types';

export { usePlaygroundState } from './hooks/use-playground-state';
export type { UsePlaygroundStateReturn } from './hooks/use-playground-state';
export type { PlaygroundState, EvaluationResult } from './hooks/use-playground-state.view-model';
