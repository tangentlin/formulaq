import type { Preview, Decorator, ReactRenderer } from '@storybook/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import React from 'react';

/**
 * Default MUI theme for FormulaQ components.
 * Components use this theme for consistent styling in Storybook.
 */
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#9c27b0',
    },
    error: {
      main: '#d32f2f',
    },
    success: {
      main: '#2e7d32',
    },
    background: {
      default: '#fafafa',
      paper: '#ffffff',
    },
  },
  typography: {
    fontFamily: [
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
    ].join(','),
    fontSize: 14,
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          margin: 0,
          padding: 0,
        },
      },
    },
  },
});

/**
 * Decorator that wraps all stories with MUI ThemeProvider and CssBaseline.
 * This ensures consistent theming across all component stories.
 */
const withMuiTheme: Decorator<ReactRenderer> = function withMuiTheme(Story) {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Story />
    </ThemeProvider>
  );
};

const preview: Preview = {
  decorators: [withMuiTheme],

  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    layout: 'padded',
    docs: {
      toc: true,
    },
  },

  tags: ['autodocs'],
};

export default preview;
