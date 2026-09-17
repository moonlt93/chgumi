import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import prettier from 'eslint-config-prettier';
import reactHooks from 'eslint-plugin-react-hooks';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import tseslint from 'typescript-eslint';

export default defineConfig({
  files: ['src/**/*.{ts,tsx}', 'scripts/**/*.ts', 'tests/**/*.ts'],
  extends: [js.configs.recommended, tseslint.configs.recommended, prettier],
  plugins: {
    'react-hooks': reactHooks,
    'simple-import-sort': simpleImportSort,
  },
  rules: {
    ...reactHooks.configs.recommended.rules,
    'one-var': ['error', 'never'],
    curly: ['error', 'all'],
    eqeqeq: ['error', 'always'],
    'no-empty': 'error',
    '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    'simple-import-sort/imports': 'error',
    'simple-import-sort/exports': 'error',
  },
});
