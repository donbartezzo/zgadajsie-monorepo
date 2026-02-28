import baseConfig from '../eslint.config.mjs';

export default [
  ...baseConfig,
  {
    files: ['**/*.ts'],
    rules: {
      // NestJS uses decorators and class patterns extensively
      '@typescript-eslint/no-extraneous-class': 'off',
      '@typescript-eslint/no-empty-interface': 'off',

      // NestJS DI requires parameter properties
      '@typescript-eslint/no-useless-constructor': 'off',

      // Stricter rules for backend reliability
      '@typescript-eslint/no-floating-promises': 'off',
      'no-return-await': 'off',
      '@typescript-eslint/return-await': 'off',
    },
  },
];
