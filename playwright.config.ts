import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 4 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  // CI installs only Chromium (the reusable static-web deploy workflow runs
  // `playwright install chromium`), so the WebKit (Mobile Safari) project is
  // local-only. Locally we still cover both engines.
  projects: process.env.CI
    ? [
        {
          name: 'Mobile Chrome',
          use: { ...devices['Pixel 5'] },
        },
      ]
    : [
        {
          name: 'Mobile Chrome',
          use: { ...devices['Pixel 5'] },
        },
        {
          name: 'Mobile Safari',
          use: { ...devices['iPhone 12'] },
        },
      ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
})
