import type { StorybookConfig } from '@storybook/react-vite';
import { resolve } from 'path';

const config: StorybookConfig = {
  stories: ['../src/**/*.mdx', '../src/**/*.stories.@(js|jsx|mjs|ts|tsx)'],

  addons: ['@storybook/addon-essentials', '@storybook/addon-interactions'],

  framework: {
    name: '@storybook/react-vite',
    options: {
      builder: {
        viteConfigPath: undefined,
      },
    },
  },

  typescript: {
    reactDocgen: 'react-docgen-typescript',
    check: false,
  },

  docs: {},

  viteFinal: async function viteFinal(viteConfig) {
    // Merge path aliases from the main vite config
    viteConfig.resolve = viteConfig.resolve ?? {};
    viteConfig.resolve.alias = {
      ...viteConfig.resolve.alias,
      'formulaq/core': resolve(__dirname, '../src/core/index.ts'),
      'formulaq/editor': resolve(__dirname, '../src/editor/index.ts'),
      'formulaq/playground': resolve(__dirname, '../src/playground/index.ts'),
      'formulaq/datagrid': resolve(__dirname, '../src/datagrid/index.ts'),
    };

    return viteConfig;
  },
};

export default config;
