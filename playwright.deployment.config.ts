import { defineConfig } from '@playwright/test'

// Release checks target only the Firebase project authorized for this release.
export default defineConfig({
  testDir: './tests/deployment',
  outputDir: './test-results/deployment',
  timeout: 60000,
  use: {
    baseURL: 'https://dev-track-46323.web.app',
    channel: 'chrome',
    headless: true,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
})
