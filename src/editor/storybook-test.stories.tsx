import type { Meta, StoryObj } from '@storybook/react';
import { Box, Typography, Button, Paper, Stack, Chip } from '@mui/material';
import { VERSION as CORE_VERSION } from 'formulaq/core';
import { VERSION as EDITOR_VERSION } from 'formulaq/editor';
import React from 'react';

/**
 * Test component to verify Storybook setup is working correctly.
 * This component demonstrates:
 * - MUI theme integration
 * - Path alias imports from formulaq/core
 * - React 19 compatibility
 */
function StorybookTestComponent() {
  const [count, setCount] = React.useState(0);

  function handleClick() {
    setCount(function incrementCount(prev) {
      return prev + 1;
    });
  }

  return (
    <Paper elevation={2} sx={{ p: 3, maxWidth: 500 }}>
      <Stack spacing={2}>
        <Typography variant="h5" component="h1">
          FormulaQ Storybook Setup Test
        </Typography>

        <Typography variant="body1" color="text.secondary">
          This story verifies that Storybook is properly configured with:
        </Typography>

        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <Chip label="MUI Theme" color="primary" size="small" />
          <Chip label="Path Aliases" color="secondary" size="small" />
          <Chip label="React 19" color="success" size="small" />
          <Chip label="Vite Builder" color="info" size="small" />
        </Stack>

        <Box>
          <Typography variant="subtitle2" gutterBottom>
            Package Versions (via path alias imports):
          </Typography>
          <Typography variant="body2" component="div">
            <code>formulaq/core: v{CORE_VERSION}</code>
          </Typography>
          <Typography variant="body2" component="div">
            <code>formulaq/editor: v{EDITOR_VERSION}</code>
          </Typography>
        </Box>

        <Box>
          <Typography variant="subtitle2" gutterBottom>
            React State Test (click count: {count}):
          </Typography>
          <Button variant="contained" onClick={handleClick}>
            Increment Counter
          </Button>
        </Box>

        <Typography variant="caption" color="success.main">
          If you can see this styled content and the button works, Storybook is configured
          correctly.
        </Typography>
      </Stack>
    </Paper>
  );
}

const meta: Meta<typeof StorybookTestComponent> = {
  title: 'Setup/Storybook Test',
  component: StorybookTestComponent,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Test story to verify Storybook configuration. ' +
          'This should display MUI components with proper theming and demonstrate path alias imports.',
      },
    },
  },
};

export default meta;

type Story = StoryObj<typeof StorybookTestComponent>;

/**
 * Default story showing the test component.
 * Verifies MUI theme, path aliases, and React 19 support.
 */
export const Default: Story = {};
