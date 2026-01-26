import { resolve } from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import dts from 'vite-plugin-dts';

const port = 5173;
export default defineConfig({
  plugins: [
    react(),
    dts({
      include: ['src'],
      outDir: 'dist',
      rollupTypes: false,
    }),
  ],
  server: {
    port,
    host: true,
  },
  resolve: {
    alias: {
      'formulaq/core': resolve(__dirname, 'src/core/index.ts'),
      'formulaq/editor': resolve(__dirname, 'src/editor/index.ts'),
      'formulaq/playground': resolve(__dirname, 'src/playground/index.ts'),
      'formulaq/datagrid': resolve(__dirname, 'src/datagrid/index.ts'),
    },
  },
  build: {
    lib: {
      entry: {
        'core/index': resolve(__dirname, 'src/core/index.ts'),
        'editor/index': resolve(__dirname, 'src/editor/index.ts'),
        'playground/index': resolve(__dirname, 'src/playground/index.ts'),
        'datagrid/index': resolve(__dirname, 'src/datagrid/index.ts'),
      },
      formats: ['es'],
    },
    rollupOptions: {
      external: [
        'react',
        'react-dom',
        'react/jsx-runtime',
        '@mui/material',
        '@mui/icons-material',
        '@mui/x-data-grid',
        '@emotion/react',
        '@emotion/styled',
      ],
      output: {
        preserveModules: true,
        preserveModulesRoot: 'src',
        entryFileNames: '[name].js',
      },
    },
    sourcemap: true,
    minify: false,
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
  },
});
