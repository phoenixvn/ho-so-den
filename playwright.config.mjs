// SPDX-License-Identifier: AGPL-3.0-only
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.mjs',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    browserName: 'chromium',
    viewport: { width: 1440, height: 1000 },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    launchOptions: process.env.PLAYWRIGHT_CHANNEL ? { channel: process.env.PLAYWRIGHT_CHANNEL } : {}
  },
  webServer: {
    command: 'node scripts/serve.mjs',
    url: 'http://127.0.0.1:4173/healthz',
    env: { HOST: '127.0.0.1', PORT: '4173' },
    reuseExistingServer: false
  }
});
