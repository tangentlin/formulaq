/**
 * Main Playground component for interactive formula testing.
 *
 * Combines the VariablePanel, FormulaEditor, ResultsPanel, and AggregationDisplay
 * into a three-panel layout for comprehensive formula testing.
 *
 * Features:
 * - Three-panel layout: Variables | Editor | Results
 * - Responsive design (stacks on mobile)
 * - Header with customizable title
 * - End-to-end formula testing workflow
 *
 * @module
 */

import { Box, Paper, Typography, useMediaQuery, useTheme } from '@mui/material';
import React, { useMemo, useEffect, useRef } from 'react';

import { createFormulaEngine } from '../../core/engine.ts';
import type { FormulaQEngine } from '../../core/engine.ts';
import { FormulaEditor } from '../../editor/formula-editor/formula-editor.tsx';
import type { ValidationResult } from '../../editor/formula-editor/formula-editor.types.ts';
import { VariablePanel } from '../variable-panel/variable-panel.tsx';
import { ResultsPanel } from '../results-panel/results-panel.tsx';
import { AggregationDisplay } from '../aggregation-display/aggregation-display.tsx';
import { usePlaygroundState } from '../hooks/use-playground-state.ts';
import type { PlaygroundProps } from './playground.types.ts';
import type { PlaygroundVariable } from '../variable-card/variable-card.types.ts';

/**
 * Default title for the Playground header.
 */
const DEFAULT_TITLE = 'FormulaQ Playground';

/**
 * Width of the variables panel in desktop layout.
 */
const VARIABLE_PANEL_WIDTH = 280;

/**
 * Width of the results panel in desktop layout.
 */
const RESULTS_PANEL_WIDTH = 320;

/**
 * Minimum width for desktop layout (three columns).
 */
const DESKTOP_BREAKPOINT = 'md';

/**
 * Minimum width for tablet layout (two columns).
 */
const TABLET_BREAKPOINT = 'sm';

/**
 * Props for the PlaygroundHeader component.
 */
interface PlaygroundHeaderProps {
  readonly title: string;
}

/**
 * Header section displaying the playground title.
 *
 * @param props - The component props
 * @returns The rendered header
 */
function PlaygroundHeader(props: PlaygroundHeaderProps): React.ReactElement {
  return (
    <Box
      sx={{
        px: 3,
        py: 2,
        borderBottom: 1,
        borderColor: 'divider',
        backgroundColor: 'primary.main',
        color: 'primary.contrastText',
      }}
    >
      <Typography
        variant="h5"
        component="h1"
        sx={{
          fontWeight: 600,
          letterSpacing: '-0.01em',
        }}
      >
        {props.title}
      </Typography>
    </Box>
  );
}

/**
 * Props for the EditorPanel component.
 */
interface EditorPanelProps {
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly onValidation: (result: ValidationResult) => void;
  readonly variableProvider: ReturnType<typeof usePlaygroundState>['variableProvider'];
}

/**
 * Center panel containing the formula editor.
 *
 * @param props - The component props
 * @returns The rendered editor panel
 */
function EditorPanel(props: EditorPanelProps): React.ReactElement {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        p: 2,
        backgroundColor: 'background.default',
      }}
    >
      <Typography
        variant="subtitle2"
        sx={{
          mb: 1.5,
          fontWeight: 600,
          color: 'text.secondary',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          fontSize: '0.75rem',
        }}
      >
        Formula
      </Typography>
      <Box sx={{ flex: 1 }}>
        <FormulaEditor
          value={props.value}
          onChange={props.onChange}
          variableProvider={props.variableProvider}
          onValidation={props.onValidation}
          placeholder="Enter a formula, e.g., @price * (1 + @tax_rate)"
          height="100%"
        />
      </Box>
    </Box>
  );
}

/**
 * Props for the ResultsPanelContainer component.
 */
interface ResultsPanelContainerProps {
  readonly results: ReturnType<typeof usePlaygroundState>['state']['evaluationResult'];
  readonly isEvaluating: boolean;
}

/**
 * Right panel containing results and aggregations.
 *
 * @param props - The component props
 * @returns The rendered results panel container
 */
function ResultsPanelContainer(props: ResultsPanelContainerProps): React.ReactElement {
  const hasAggregations =
    props.results !== null &&
    props.results.aggregations !== undefined &&
    props.results.aggregations.length > 0;

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        p: 2,
        backgroundColor: 'background.paper',
        borderLeft: 1,
        borderColor: 'divider',
      }}
    >
      <Typography
        variant="subtitle2"
        sx={{
          mb: 1.5,
          fontWeight: 600,
          color: 'text.secondary',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          fontSize: '0.75rem',
        }}
      >
        Results
      </Typography>
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1.5, overflow: 'auto' }}>
        {hasAggregations && <AggregationDisplay aggregations={props.results?.aggregations ?? []} />}
        <ResultsPanel
          results={props.results?.values ?? []}
          errors={props.results?.errors}
          isEvaluating={props.isEvaluating}
          emptyMessage="Enter a formula and add variables to see results"
        />
      </Box>
    </Box>
  );
}

/**
 * Main Playground component providing an interactive formula testing environment.
 *
 * The Playground combines three main sections:
 * 1. **Variables Panel** (left): Add, edit, and remove test variables
 * 2. **Formula Editor** (center): Write and validate formulas
 * 3. **Results Panel** (right): View evaluation results and aggregations
 *
 * The layout adapts to screen size:
 * - **Desktop**: Three columns side by side
 * - **Tablet**: Variables on top, Editor + Results below
 * - **Mobile**: All panels stacked vertically
 *
 * @param props - The component props
 * @returns The rendered Playground component
 *
 * @example
 * ```tsx
 * // Basic usage
 * <Playground />
 *
 * // With initial state
 * <Playground
 *   title="My Calculator"
 *   initialVariables={[
 *     { name: 'price', type: 'number.float', values: [100, 200, 300] },
 *     { name: 'tax', type: 'number.float', values: [0.1, 0.1, 0.1] },
 *   ]}
 *   initialFormula="@price * (1 + @tax)"
 * />
 * ```
 */
export function Playground(props: PlaygroundProps): React.ReactElement {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up(DESKTOP_BREAKPOINT));
  const isTablet = useMediaQuery(theme.breakpoints.up(TABLET_BREAKPOINT));

  // Create the engine once
  const engine = useMemo(function createEngine(): FormulaQEngine {
    return createFormulaEngine();
  }, []);

  // Use the playground state hook
  const playgroundState = usePlaygroundState(engine);

  // Track if we've initialized with props
  const initializedRef = useRef(false);

  // Initialize with props on first render
  useEffect(
    function initializeFromProps() {
      if (initializedRef.current) {
        return;
      }
      initializedRef.current = true;

      // Add initial variables
      const initialVariables = props.initialVariables;
      if (initialVariables !== undefined && initialVariables.length > 0) {
        for (const variable of initialVariables) {
          playgroundState.addVariable(variable);
        }
      }

      // Set initial formula
      const initialFormula = props.initialFormula;
      if (initialFormula !== undefined && initialFormula !== '') {
        playgroundState.setFormula(initialFormula);
      }
    },
    [props.initialVariables, props.initialFormula, playgroundState],
  );

  const title = props.title ?? DEFAULT_TITLE;

  // Handler functions to adapt between callbacks
  function handleAddVariable(variable: PlaygroundVariable): void {
    playgroundState.addVariable(variable);
  }

  function handleEditVariable(variable: PlaygroundVariable): void {
    playgroundState.editVariable(variable);
  }

  function handleDeleteVariable(name: string): void {
    playgroundState.removeVariable(name);
  }

  function handleFormulaChange(value: string): void {
    playgroundState.setFormula(value);
  }

  function handleValidation(result: ValidationResult): void {
    playgroundState.handleValidation(result);
  }

  // Desktop layout: Three columns
  if (isDesktop) {
    return (
      <Paper
        elevation={3}
        sx={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          minHeight: 500,
          overflow: 'hidden',
          borderRadius: 2,
        }}
      >
        <PlaygroundHeader title={title} />
        <Box
          sx={{
            display: 'flex',
            flex: 1,
            overflow: 'hidden',
          }}
        >
          {/* Variables Panel - Fixed width */}
          <Box
            sx={{
              width: VARIABLE_PANEL_WIDTH,
              flexShrink: 0,
              overflow: 'auto',
            }}
          >
            <VariablePanel
              variables={playgroundState.state.variables}
              onAddVariable={handleAddVariable}
              onEditVariable={handleEditVariable}
              onDeleteVariable={handleDeleteVariable}
            />
          </Box>

          {/* Editor Panel - Flexible width */}
          <Box
            sx={{
              flex: 1,
              minWidth: 0,
              overflow: 'hidden',
            }}
          >
            <EditorPanel
              value={playgroundState.state.formula}
              onChange={handleFormulaChange}
              onValidation={handleValidation}
              variableProvider={playgroundState.variableProvider}
            />
          </Box>

          {/* Results Panel - Fixed width */}
          <Box
            sx={{
              width: RESULTS_PANEL_WIDTH,
              flexShrink: 0,
              overflow: 'auto',
            }}
          >
            <ResultsPanelContainer
              results={playgroundState.state.evaluationResult}
              isEvaluating={playgroundState.state.isEvaluating}
            />
          </Box>
        </Box>
      </Paper>
    );
  }

  // Tablet layout: Variables on top, Editor + Results below
  if (isTablet) {
    return (
      <Paper
        elevation={3}
        sx={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          minHeight: 600,
          overflow: 'hidden',
          borderRadius: 2,
        }}
      >
        <PlaygroundHeader title={title} />

        {/* Variables Panel - Horizontal */}
        <Box
          sx={{
            height: 200,
            flexShrink: 0,
            overflow: 'auto',
            borderBottom: 1,
            borderColor: 'divider',
          }}
        >
          <VariablePanel
            variables={playgroundState.state.variables}
            onAddVariable={handleAddVariable}
            onEditVariable={handleEditVariable}
            onDeleteVariable={handleDeleteVariable}
          />
        </Box>

        {/* Editor + Results - Split horizontally */}
        <Box
          sx={{
            display: 'flex',
            flex: 1,
            overflow: 'hidden',
          }}
        >
          {/* Editor Panel */}
          <Box
            sx={{
              flex: 1,
              minWidth: 0,
              overflow: 'hidden',
            }}
          >
            <EditorPanel
              value={playgroundState.state.formula}
              onChange={handleFormulaChange}
              onValidation={handleValidation}
              variableProvider={playgroundState.variableProvider}
            />
          </Box>

          {/* Results Panel */}
          <Box
            sx={{
              width: RESULTS_PANEL_WIDTH,
              flexShrink: 0,
              overflow: 'auto',
            }}
          >
            <ResultsPanelContainer
              results={playgroundState.state.evaluationResult}
              isEvaluating={playgroundState.state.isEvaluating}
            />
          </Box>
        </Box>
      </Paper>
    );
  }

  // Mobile layout: All stacked vertically
  return (
    <Paper
      elevation={3}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: 700,
        overflow: 'auto',
        borderRadius: 2,
      }}
    >
      <PlaygroundHeader title={title} />

      {/* Variables Panel */}
      <Box
        sx={{
          height: 250,
          flexShrink: 0,
          overflow: 'auto',
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <VariablePanel
          variables={playgroundState.state.variables}
          onAddVariable={handleAddVariable}
          onEditVariable={handleEditVariable}
          onDeleteVariable={handleDeleteVariable}
        />
      </Box>

      {/* Editor Panel */}
      <Box
        sx={{
          height: 200,
          flexShrink: 0,
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <EditorPanel
          value={playgroundState.state.formula}
          onChange={handleFormulaChange}
          onValidation={handleValidation}
          variableProvider={playgroundState.variableProvider}
        />
      </Box>

      {/* Results Panel */}
      <Box
        sx={{
          flex: 1,
          minHeight: 250,
        }}
      >
        <ResultsPanelContainer
          results={playgroundState.state.evaluationResult}
          isEvaluating={playgroundState.state.isEvaluating}
        />
      </Box>
    </Paper>
  );
}
