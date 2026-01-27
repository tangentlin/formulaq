/**
 * FunctionBrowserDialog component for browsing and inserting functions.
 *
 * Provides a modal dialog with:
 * - Search input to filter functions by name or description
 * - Category tabs to filter by function type
 * - List of functions showing name, signature, description
 * - Detail panel showing full documentation and examples
 * - Insert button to add function template at cursor
 *
 * @module
 */

import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  InputAdornment,
  List,
  ListItemButton,
  ListItemText,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import SearchIcon from '@mui/icons-material/Search';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import type { FunctionInfo } from '../../core/types/functions.ts';
import {
  type FunctionBrowserDialogProps,
  type FunctionBrowserState,
  FUNCTION_CATEGORIES,
  INITIAL_FUNCTION_BROWSER_STATE,
  filterFunctions,
  formatSignature,
} from './function-browser-dialog.types.ts';

/**
 * FunctionBrowserDialog component for browsing available functions.
 *
 * Features:
 * - Search by name or description
 * - Filter by category (Aggregation, Math, Logical, String)
 * - Function list with signatures
 * - Detail panel with parameters, return type, and examples
 * - Insert button to add function template
 *
 * @param props - Component props
 * @returns The rendered FunctionBrowserDialog component
 *
 * @example
 * ```tsx
 * <FunctionBrowserDialog
 *   open={isOpen}
 *   onClose={() => setIsOpen(false)}
 *   functionRegistry={registry}
 *   onInsert={(template) => insertAtCursor(template)}
 * />
 * ```
 */
export function FunctionBrowserDialog(props: FunctionBrowserDialogProps): React.ReactElement {
  const [state, setState] = useState<FunctionBrowserState>(INITIAL_FUNCTION_BROWSER_STATE);

  // Reset state when dialog opens
  useEffect(
    function resetStateOnOpen(): void {
      if (props.open) {
        setState(INITIAL_FUNCTION_BROWSER_STATE);
      }
    },
    [props.open],
  );

  // Get all functions from registry
  const allFunctions = useMemo(
    function getAllFunctions(): readonly FunctionInfo[] {
      return props.functionRegistry.getAll();
    },
    [props.functionRegistry],
  );

  // Filter functions based on search and category
  const filteredFunctions = useMemo(
    function getFilteredFunctions(): readonly FunctionInfo[] {
      return filterFunctions(allFunctions, state.searchQuery, state.selectedCategory);
    },
    [allFunctions, state.searchQuery, state.selectedCategory],
  );

  // Auto-select first function when list changes
  useEffect(
    function autoSelectFirst(): void {
      if (filteredFunctions.length > 0 && state.selectedFunction === null) {
        setState(function updateState(prev): FunctionBrowserState {
          return { ...prev, selectedFunction: filteredFunctions[0]! };
        });
      } else if (filteredFunctions.length === 0) {
        setState(function updateState(prev): FunctionBrowserState {
          return { ...prev, selectedFunction: null };
        });
      }
    },
    [filteredFunctions, state.selectedFunction],
  );

  // Handle search input change
  const handleSearchChange = useCallback(function handleSearchChange(
    event: React.ChangeEvent<HTMLInputElement>,
  ): void {
    const value = event.target.value;
    setState(function updateState(prev): FunctionBrowserState {
      return { ...prev, searchQuery: value, selectedFunction: null };
    });
  }, []);

  // Handle category tab change
  const handleCategoryChange = useCallback(function handleCategoryChange(
    _event: React.SyntheticEvent,
    newValue: number,
  ): void {
    const category = FUNCTION_CATEGORIES[newValue]!;
    setState(function updateState(prev): FunctionBrowserState {
      return { ...prev, selectedCategory: category, selectedFunction: null };
    });
  }, []);

  // Handle function selection
  const handleFunctionSelect = useCallback(function handleFunctionSelect(fn: FunctionInfo): void {
    setState(function updateState(prev): FunctionBrowserState {
      return { ...prev, selectedFunction: fn };
    });
  }, []);

  // Handle insert button click
  const handleInsert = useCallback(
    function handleInsert(): void {
      if (state.selectedFunction !== null && props.onInsert !== undefined) {
        props.onInsert(state.selectedFunction.name + '(');
        props.onClose();
      }
    },
    [state.selectedFunction, props.onInsert, props.onClose],
  );

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    function handleKeyDown(event: React.KeyboardEvent): void {
      if (filteredFunctions.length === 0) return;

      const currentIndex = state.selectedFunction
        ? filteredFunctions.findIndex(function findFn(fn): boolean {
            return fn.name === state.selectedFunction?.name;
          })
        : -1;

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        const nextIndex = currentIndex < filteredFunctions.length - 1 ? currentIndex + 1 : 0;
        setState(function updateState(prev): FunctionBrowserState {
          return { ...prev, selectedFunction: filteredFunctions[nextIndex]! };
        });
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        const prevIndex = currentIndex > 0 ? currentIndex - 1 : filteredFunctions.length - 1;
        setState(function updateState(prev): FunctionBrowserState {
          return { ...prev, selectedFunction: filteredFunctions[prevIndex]! };
        });
      } else if (event.key === 'Enter' && state.selectedFunction !== null) {
        event.preventDefault();
        handleInsert();
      }
    },
    [filteredFunctions, state.selectedFunction, handleInsert],
  );

  // Get category tab index
  const categoryTabIndex = FUNCTION_CATEGORIES.indexOf(state.selectedCategory);

  return (
    <Dialog
      open={props.open}
      onClose={props.onClose}
      maxWidth="md"
      fullWidth
      onKeyDown={handleKeyDown}
      PaperProps={{
        sx: { height: '80vh', maxHeight: '80vh' },
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h6">Function Browser</Typography>
        <IconButton onClick={props.onClose} size="small" aria-label="Close">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ p: 0, display: 'flex', flexDirection: 'column' }}>
        {/* Search and category filters */}
        <Box sx={{ p: 2, pb: 0 }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Search functions..."
            value={state.searchQuery}
            onChange={handleSearchChange}
            autoFocus
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon color="action" />
                </InputAdornment>
              ),
            }}
          />
          <Tabs
            value={categoryTabIndex}
            onChange={handleCategoryChange}
            variant="scrollable"
            scrollButtons="auto"
            sx={{ mt: 1 }}
          >
            {FUNCTION_CATEGORIES.map(function renderTab(category): React.ReactElement {
              return <Tab key={category} label={category} />;
            })}
          </Tabs>
        </Box>

        {/* Main content area */}
        <Box sx={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>
          {/* Function list */}
          <Box
            sx={{
              width: 280,
              borderRight: 1,
              borderColor: 'divider',
              overflow: 'auto',
            }}
          >
            <List dense disablePadding>
              {filteredFunctions.map(function renderFunction(fn): React.ReactElement {
                const isSelected = state.selectedFunction?.name === fn.name;
                return (
                  <ListItemButton
                    key={fn.name}
                    selected={isSelected}
                    onClick={function handleClick(): void {
                      handleFunctionSelect(fn);
                    }}
                  >
                    <ListItemText
                      primary={fn.name}
                      secondary={formatSignature(fn)}
                      primaryTypographyProps={{ fontWeight: 'medium', fontFamily: 'monospace' }}
                      secondaryTypographyProps={{ fontSize: '0.75rem', fontFamily: 'monospace' }}
                    />
                  </ListItemButton>
                );
              })}
              {filteredFunctions.length === 0 && (
                <Box sx={{ p: 2, textAlign: 'center' }}>
                  <Typography color="text.secondary" variant="body2">
                    No functions found
                  </Typography>
                </Box>
              )}
            </List>
          </Box>

          {/* Detail panel */}
          <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
            {state.selectedFunction !== null ? (
              <FunctionDetail fn={state.selectedFunction} />
            ) : (
              <Box sx={{ textAlign: 'center', color: 'text.secondary', mt: 4 }}>
                <Typography>Select a function to view details</Typography>
              </Box>
            )}
          </Box>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={props.onClose}>Cancel</Button>
        <Button
          variant="contained"
          onClick={handleInsert}
          disabled={state.selectedFunction === null || props.onInsert === undefined}
        >
          Insert
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/**
 * Props for the FunctionDetail component.
 */
interface FunctionDetailProps {
  /**
   * The function to display details for.
   */
  readonly fn: FunctionInfo;
}

/**
 * FunctionDetail component showing full function documentation.
 */
function FunctionDetail(props: FunctionDetailProps): React.ReactElement {
  const fn = props.fn;

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <Typography variant="h6" fontFamily="monospace" fontWeight="bold">
          {fn.name}
        </Typography>
        {fn.category !== undefined && <Chip label={fn.category} size="small" variant="outlined" />}
        {fn.isAggregation && (
          <Chip label="Aggregation" size="small" color="primary" variant="outlined" />
        )}
      </Box>

      {/* Description */}
      <Typography variant="body1" paragraph>
        {fn.description}
      </Typography>

      <Divider sx={{ my: 2 }} />

      {/* Signature */}
      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
        Signature
      </Typography>
      <Typography
        fontFamily="monospace"
        sx={{ bgcolor: 'action.hover', px: 1.5, py: 1, borderRadius: 1, mb: 2 }}
      >
        {formatSignature(fn)}
      </Typography>

      {/* Parameters */}
      {fn.params.length > 0 && (
        <>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Parameters
          </Typography>
          <Box component="ul" sx={{ mt: 0, mb: 2, pl: 3 }}>
            {fn.params.map(function renderParam(param): React.ReactElement {
              return (
                <Box component="li" key={param.name} sx={{ mb: 0.5 }}>
                  <Typography component="span" fontFamily="monospace" fontWeight="medium">
                    {param.name}
                  </Typography>
                  {param.optional && (
                    <Typography component="span" color="text.secondary">
                      {' '}
                      (optional)
                    </Typography>
                  )}
                  <Typography component="span" color="text.secondary">
                    {' '}
                    - {param.description}
                  </Typography>
                </Box>
              );
            })}
          </Box>
        </>
      )}

      {/* Return type */}
      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
        Returns
      </Typography>
      <Typography fontFamily="monospace" sx={{ mb: 2 }}>
        {fn.returnType}
      </Typography>

      {/* Examples */}
      {fn.examples !== undefined && fn.examples.length > 0 && (
        <>
          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Examples
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {fn.examples.map(function renderExample(example, index): React.ReactElement {
              return (
                <Box key={index} sx={{ bgcolor: 'action.hover', px: 1.5, py: 1, borderRadius: 1 }}>
                  <Typography fontFamily="monospace" fontSize="0.875rem">
                    {example.formula}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {example.description}
                  </Typography>
                </Box>
              );
            })}
          </Box>
        </>
      )}
    </Box>
  );
}
