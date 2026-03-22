// @ts-check
// ESLint flat config for NestJS API (ESLint v9+)

const tsParser = require('@typescript-eslint/parser')
const tsPlugin = require('@typescript-eslint/eslint-plugin')

/** @type {import('eslint').Linter.Config[]} */
module.exports = [
  {
    // Only lint TypeScript source files
    files: ['src/**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: true,
        tsconfigRootDir: __dirname,
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
    },
    rules: {
      // Disable base rule — TS version handles this correctly
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],

      // NestJS uses decorators + DI heavily — turn off pedantic rules
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-empty-interface': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',

      // Allow empty constructors for DI
      '@typescript-eslint/no-empty-function': 'off',

      // Require await on async functions
      '@typescript-eslint/require-await': 'off',
    },
  },
]
