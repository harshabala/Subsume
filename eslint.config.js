import js from '@eslint/js';
import tseslint from 'typescript-eslint';

/**
 * Lightweight ESLint baseline for Chrome Web Store readiness.
 * Not type-aware (no projectService) — fast and non-blocking.
 * See docs/LINTING.md.
 */
export default tseslint.config(
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'coverage/**',
      'tests/**',
      'scripts/**',
      'vite.config.ts',
      'vitest.config.ts',
      'eslint.config.js',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    rules: {
      // Prefer TS-aware unused checks; allow intentional _ prefix
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      // Soften noisy rules for existing codebase (baseline / advisory)
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-empty-object-type': 'warn',
      '@typescript-eslint/no-require-imports': 'off',
      // TypeScript + chrome types cover this; avoid false positives in extension SW/DOM
      'no-undef': 'off',
      'no-redeclare': 'off',
      '@typescript-eslint/no-redeclare': 'off',
      // Useful but noisy as hard errors on legacy code — warn for baseline
      'preserve-caught-error': 'warn',
      'no-useless-assignment': 'warn',
      'no-empty': ['warn', { allowEmptyCatch: true }],
      'prefer-const': 'warn',
      'no-constant-binary-expression': 'warn',
    },
  },
);
