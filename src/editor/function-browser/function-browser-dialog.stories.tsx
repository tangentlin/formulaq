/**
 * Storybook stories for the FunctionBrowserDialog component.
 *
 * @module
 */

import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { useState } from 'react';
import { Button, Box, Typography } from '@mui/material';

import { FunctionBrowserDialog } from './function-browser-dialog.tsx';
import { createFunctionRegistry } from '../../core/functions/function-registry.ts';

const meta: Meta<typeof FunctionBrowserDialog> = {
  title: 'Editor/FunctionBrowserDialog',
  component: FunctionBrowserDialog,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof FunctionBrowserDialog>;

/**
 * Create a default function registry with all built-in functions.
 */
function createDefaultRegistry() {
  return createFunctionRegistry({ includeDefaults: true });
}

/**
 * Default story showing the dialog in its open state.
 */
export const Default: Story = {
  args: {
    open: true,
    onClose: fn(),
    onInsert: fn(),
    functionRegistry: createDefaultRegistry(),
  },
};

/**
 * Interactive story with a button to open the dialog.
 */
export const Interactive: Story = {
  render: function InteractiveStory() {
    const [open, setOpen] = useState(false);
    const [lastInserted, setLastInserted] = useState<string>('');
    const registry = createDefaultRegistry();

    function handleOpen(): void {
      setOpen(true);
    }

    function handleClose(): void {
      setOpen(false);
    }

    function handleInsert(template: string): void {
      setLastInserted(template);
    }

    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'center' }}>
        <Button variant="contained" onClick={handleOpen}>
          Open Function Browser
        </Button>

        {lastInserted && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Last inserted:
            </Typography>
            <Typography
              fontFamily="monospace"
              sx={{ bgcolor: 'action.hover', px: 2, py: 1, borderRadius: 1 }}
            >
              {lastInserted}
            </Typography>
          </Box>
        )}

        <FunctionBrowserDialog
          open={open}
          onClose={handleClose}
          functionRegistry={registry}
          onInsert={handleInsert}
        />
      </Box>
    );
  },
};

/**
 * Story showing pre-selected aggregation category.
 */
export const WithSearch: Story = {
  render: function WithSearchStory() {
    const [open, setOpen] = useState(true);
    const registry = createDefaultRegistry();

    function handleClose(): void {
      setOpen(false);
    }

    function handleInsert(template: string): void {
      console.log('Inserted:', template);
    }

    return (
      <FunctionBrowserDialog
        open={open}
        onClose={handleClose}
        functionRegistry={registry}
        onInsert={handleInsert}
      />
    );
  },
};

/**
 * Story without insert callback (read-only browsing).
 */
export const ReadOnly: Story = {
  args: {
    open: true,
    onClose: fn(),
    onInsert: undefined,
    functionRegistry: createDefaultRegistry(),
  },
};
