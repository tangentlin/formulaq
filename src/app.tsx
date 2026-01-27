/**
 * Main App component for the FormulaQ demo.
 *
 * Showcases FormulaQ with a DataGrid containing editable cells
 * and formula columns that recalculate in real-time.
 *
 * @module
 */

import {
  Box,
  Container,
  CssBaseline,
  Paper,
  ThemeProvider,
  Typography,
  createTheme,
  Chip,
  Stack,
} from '@mui/material';
import FunctionsIcon from '@mui/icons-material/Functions';
import React from 'react';

import { FormulaShowcase } from './datagrid/showcase/formula-showcase.tsx';
/**
 * MUI theme for the demo app.
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
    background: {
      default: '#f5f5f5',
    },
  },
  typography: {
    h4: {
      fontWeight: 600,
    },
    h6: {
      fontWeight: 500,
    },
  },
});

/**
 * Main App component.
 */
export function App(): React.ReactElement {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box
        sx={{
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          background: 'linear-gradient(180deg, #e3f2fd 0%, #f5f5f5 100%)',
        }}
      >
        <Container
          maxWidth="xl"
          sx={{ flex: 1, display: 'flex', flexDirection: 'column', py: 3, overflow: 'hidden' }}
        >
          {/* Header */}
          <Box sx={{ mb: 4, textAlign: 'center' }}>
            <Stack
              direction="row"
              spacing={1}
              justifyContent="center"
              alignItems="center"
              sx={{ mb: 1 }}
            >
              <FunctionsIcon sx={{ fontSize: 40, color: 'primary.main' }} />
              <Typography variant="h4" component="h1" color="primary">
                Formula Engine POC for React DataGrids
              </Typography>
            </Stack>
            <Stack direction="row" spacing={1} justifyContent="center" flexWrap="wrap" useFlexGap>
              <Chip label="Editable Cells" size="small" />
              <Chip label="Formula Columns" size="small" color="primary" />
              <Chip label="Real-time Recalculation" size="small" />
              <Chip label="Aggregation Functions" size="small" />
            </Stack>
          </Box>

          {/* Instructions */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Try it out
            </Typography>
            <Stack spacing={1.5}>
              <Typography variant="body2" color="text.secondary">
                <strong>1. Add a formula column:</strong> Click <strong>+ Add Column</strong> and
                try one of these formulas:
              </Typography>
              <Box sx={{ pl: 2 }}>
                <Typography
                  variant="body2"
                  component="div"
                  sx={{ fontFamily: 'monospace', bgcolor: 'grey.100', p: 1, borderRadius: 1 }}
                >
                  <div>
                    <code>@price * @quantity</code> — Calculate subtotal
                  </div>
                  <div>
                    <code>@price * @taxRate / 100</code> — Calculate tax amount
                  </div>
                  <div>
                    <code>IF(@inStock, "Available", "Out of Stock")</code> — Conditional text
                  </div>
                  <div>
                    <code>AVG(@price)</code> — Average price (aggregation)
                  </div>
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                <strong>2. Edit cells:</strong> Double-click on <strong>Price</strong> or{' '}
                <strong>Tax Rate</strong> to edit. Formula columns recalculate instantly.
              </Typography>
              <Typography variant="body2" color="text.secondary">
                <strong>3. Manage formulas:</strong> Right-click any formula column header for{' '}
                <strong>Edit Formula</strong> or <strong>Delete Column</strong>.
              </Typography>
            </Stack>
          </Paper>

          {/* DataGrid */}
          <Paper
            sx={{
              p: 2,
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              minHeight: 0,
            }}
          >
            <FormulaShowcase height="100%" disablePagination />
          </Paper>
        </Container>
      </Box>
    </ThemeProvider>
  );
}
