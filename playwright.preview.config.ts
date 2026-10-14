import { defineConfig } from '@playwright/test'

const port = Number(process.env.DEVTRACK_PREVIEW_PORT ?? 5190)
if (!Number.isInteger(port) || port < 1024 || port > 65535)
  throw new Error('DEVTRACK_PREVIEW_PORT must be a valid local port.')
const baseURL = `http://127.0.0.1:${port}`
export default defineConfig({
  testDir: './tests/preview',
  outputDir: './test-results/preview',
  timeout: 30000,
  use: {
    baseURL,
    channel: 'chrome',
    headless: true,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: `node node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port ${port} --strictPort`,
    url: baseURL,
    reuseExistingServer: false,
  },
})
