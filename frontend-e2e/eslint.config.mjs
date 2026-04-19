import playwright from 'eslint-plugin-playwright';
import baseConfig from '../eslint.config.mjs';

export default [
  playwright.configs['flat/recommended'],
  ...baseConfig,
  {
    files: ['**/*.ts', '**/*.js'],
    // Override or add rules here
    rules: {
      '@nx/enforce-module-boundaries': 'off',
      'no-empty-pattern': 'off',
      'playwright/no-skipped-test': 'off',
    },
  },
];
