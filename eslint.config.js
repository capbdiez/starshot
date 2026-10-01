import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import globals from 'globals';
import tseslint from 'typescript-eslint';

/** Browser/timing globals the deterministic sim must never touch (ARCHITECTURE §7). */
const SIM_FORBIDDEN_GLOBALS = [
  'window',
  'document',
  'navigator',
  'localStorage',
  'performance',
  'Date',
  'setTimeout',
  'setInterval',
  'requestAnimationFrame',
  'fetch',
  'crypto',
].map((name) => ({
  name,
  message: 'src/sim is pure and deterministic: no DOM, clocks or timers (AGENTS §2).',
}));

export default tseslint.config(
  {
    ignores: ['dist/', 'coverage/', 'node_modules/', 'playwright-report/', 'test-results/'],
  },
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: { allowDefaultProject: ['*.js', '*.cjs'] },
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      'no-console': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: false }],
      // Bracket access is used deliberately for records / env / dataset (index signatures).
      '@typescript-eslint/dot-notation': 'off',
      'no-warning-comments': ['error', { terms: ['todo', 'fixme'], location: 'start' }],
    },
  },
  {
    files: ['src/**/*.ts'],
    languageOptions: { globals: globals.browser },
  },
  {
    files: ['src/sim/**/*.ts'],
    rules: {
      '@typescript-eslint/no-non-null-assertion': 'error',
      'no-restricted-globals': ['error', ...SIM_FORBIDDEN_GLOBALS],
      'no-restricted-properties': [
        'error',
        { object: 'Math', property: 'random', message: 'Use the injected seeded RNG.' },
        { object: 'Math', property: 'sin', message: 'Use shared trig helpers (ARCHITECTURE §7).' },
        { object: 'Math', property: 'cos', message: 'Use shared trig helpers (ARCHITECTURE §7).' },
        { object: 'Math', property: 'tan', message: 'Use shared trig helpers (ARCHITECTURE §7).' },
        {
          object: 'Math',
          property: 'atan2',
          message: 'Use shared trig helpers (ARCHITECTURE §7).',
        },
        { object: 'Date', property: 'now', message: 'The sim has no clock.' },
      ],
      'no-restricted-imports': [
        'error',
        {
          patterns: [{ group: ['phaser', 'phaser/*'], message: 'src/sim must not import Phaser.' }],
        },
      ],
    },
  },
  {
    files: ['src/debug/**/*.ts'],
    rules: { 'no-console': 'off' },
  },
  {
    files: ['tools/**/*.ts', 'tests/**/*.ts', '*.config.ts', '*.js', '*.cjs'],
    languageOptions: { globals: globals.node },
  },
  {
    files: ['*.js', '*.cjs'],
    ...tseslint.configs.disableTypeChecked,
  },
  {
    files: ['*.cjs'],
    languageOptions: { sourceType: 'commonjs' },
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },
  prettier,
);
