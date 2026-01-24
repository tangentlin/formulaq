import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      'formulaq/core': resolve(__dirname, 'src/core/index.ts'),
      'formulaq/editor': resolve(__dirname, 'src/editor/index.ts'),
      'formulaq/playground': resolve(__dirname, 'src/playground/index.ts'),
      'formulaq/datagrid': resolve(__dirname, 'src/datagrid/index.ts'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    exclude: ['node_modules', 'dist'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules',
        'dist',
        '**/*.stories.tsx',
        '**/*.test.ts',
        '**/*.test.tsx',
        '**/index.ts',
      ],
    },
  },
});
