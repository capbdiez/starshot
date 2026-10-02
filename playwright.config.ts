import { defineConfig, devices } from '@playwright/test';

const PORT = 4173;
const productionUrl = process.env['STARSHOT_PRODUCTION_URL'];

export default defineConfig({
  testDir: 'tests/e2e',
  forbidOnly: Boolean(process.env['CI']),
  retries: process.env['CI'] ? 1 : 0,
  reporter: process.env['CI'] ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: productionUrl ?? `http://localhost:${String(PORT)}`,
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      testIgnore: /m(?:9-mobile-viewport|10-touch-input)\.spec\.ts/,
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
      testIgnore: /m(?:9-mobile-viewport|10-touch-input)\.spec\.ts/,
    },
    {
      name: 'mobile-chromium',
      use: { ...devices['Pixel 5'] },
      testMatch: /m(?:9-mobile-viewport|10-touch-input)\.spec\.ts/,
    },
    {
      name: 'mobile-webkit',
      use: { ...devices['iPhone 13'] },
      testMatch: /m(?:9-mobile-viewport|10-touch-input)\.spec\.ts/,
    },
  ],
  // With STARSHOT_PRODUCTION_URL, run the same smoke suite against a deployed release.
  webServer: productionUrl
    ? undefined
    : {
        // Smoke-test the production bundle, not the dev server.
        command: `npm run build && npm run preview -- --port ${String(PORT)} --strictPort`,
        url: `http://localhost:${String(PORT)}`,
        reuseExistingServer: !process.env['CI'],
        timeout: 120_000,
      },
});
