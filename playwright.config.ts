import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  snapshotDir: './tests/__screenshots__',
  timeout: 60000,
  retries: 2,
  use: {
    baseURL: 'http://localhost:8080',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'pnpm start:dev',
    url: 'http://localhost:8080',
    reuseExistingServer: true,
  },
})
