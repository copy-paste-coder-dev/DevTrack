import { defineConfig } from '@playwright/test'

const port = Number(process.env.DEVTRACK_E2E_PORT ?? 5174)
if (!Number.isInteger(port) || port < 1024 || port > 65535)
  throw new Error('DEVTRACK_E2E_PORT must be a valid local port.')
const baseURL = `http://127.0.0.1:${port}`

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  use: {
    baseURL,
    channel: 'chrome',
    headless: true,
    timezoneId: 'Asia/Kolkata',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: `node node_modules/vite/bin/vite.js --mode e2e --host 127.0.0.1 --port ${port} --strictPort`,
    url: baseURL,
    reuseExistingServer: false,
  },
})
