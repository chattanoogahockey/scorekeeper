import js from '@eslint/js';
import globals from 'globals';
import importPlugin from 'eslint-plugin-import';
import jsonPlugin from 'eslint-plugin-json';

export default [
  {
    files: ['**/*.js', '**/*.mjs'],
    ignores: ['node_modules/', 'dist/', 'build/', '*.min.js', 'coverage/'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    plugins: {
      import: importPlugin,
    },
    rules: {
      ...js.configs.recommended.rules,
      'import/no-unresolved': ['error', { ignore: ['^https?://'] }],
      'import/order': [
        'warn',
        {
          groups: [['builtin', 'external'], ['internal'], ['parent', 'sibling', 'index']],
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],
      'no-console': 'off',
      'prefer-const': 'error',
      'no-var': 'error',
      'arrow-spacing': 'error',
      'eqeqeq': ['error', 'always'],
      curly: ['error', 'all'],
      'brace-style': ['error', '1tbs'],
      semi: ['error', 'always'],
      quotes: ['error', 'single'],
      'comma-dangle': ['error', 'always-multiline'],
      'space-before-blocks': 'error',
      'space-infix-ops': 'error',
      'eol-last': ['error', 'always'],
    },
  },
  {
    files: ['**/*.json'],
    plugins: {
      json: jsonPlugin,
    },
    rules: {
      ...jsonPlugin.configs.recommended.rules,
    },
  },
];