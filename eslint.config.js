import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import prettier from 'eslint-config-prettier';
import { twilightEslintConfig } from '@salla.sa/twilight-theme-engine/eslint';

export default tseslint.config(
  {
    ignores: [
      'dist',
      '.tanstack',
      'coverage',
      'app/routeTree.gen.ts',
      'theme-raed/',
      '.notes/',
      'node_modules',
      '.wrangler',
    ],
  },

  // Theme guard rails shipped by the engine (restricted imports / DOM / location globals).
  ...twilightEslintConfig,

  js.configs.recommended,
  ...tseslint.configs.recommended,

  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    languageOptions: {
      globals: { ...globals.browser, ...globals.serviceworker },
    },
  },

  {
    files: ['**/*.{jsx,tsx}'],
    ...react.configs.flat.recommended,
    languageOptions: {
      ...react.configs.flat.recommended.languageOptions,
      globals: { ...globals.browser },
    },
    settings: { react: { version: 'detect' } },
  },
  // React 19 automatic JSX runtime: no `import React` needed.
  { files: ['**/*.{jsx,tsx}'], ...react.configs.flat['jsx-runtime'] },
  { files: ['**/*.{jsx,tsx}'], ...jsxA11y.flatConfigs.recommended },
  { files: ['**/*.{js,jsx,ts,tsx}'], ...reactHooks.configs.flat.recommended },

  // React Compiler-style rules shipped in eslint-plugin-react-hooks v7 flag existing, working
  // patterns. Fixing them means editing effect/memo logic, which this change must not do, so
  // they are downgraded to warnings (still visible, not blocking).
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    rules: {
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/use-memo': 'warn',
      'react-hooks/globals': 'warn',
    },
  },

  // Tests query the rendered DOM directly by design; the engine's DOM restrictions target app code.
  {
    files: ['tests/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-properties': 'off',
      'no-restricted-globals': 'off',
    },
  },

  // Node-side config files (postcss / tailwind) are CommonJS.
  {
    files: ['**/*.cjs'],
    languageOptions: { sourceType: 'commonjs', globals: { ...globals.node } },
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },
  {
    files: ['*.config.{js,ts}', 'vite.config.ts', 'vitest.config.ts'],
    languageOptions: { globals: { ...globals.node } },
  },

  // CI scripts run on Node.
  {
    files: ['scripts/**/*.ts'],
    languageOptions: { globals: { ...globals.node } },
    rules: { 'no-restricted-properties': 'off', 'no-restricted-globals': 'off' },
  },

  // Must stay last: turns off formatting rules that conflict with Prettier.
  prettier
);
