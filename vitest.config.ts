import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    exclude: ['tests/e2e/**', 'node_modules/**'],
    coverage: {
      provider: 'v8',
      include: ['src/sim/**', 'src/content/**', 'src/shared/**', 'src/app/game-loop.ts'],
      reporter: ['text-summary', 'html'],
      thresholds: {
        'src/sim/**': { lines: 80, statements: 80, functions: 80, branches: 80 },
      },
    },
  },
});
