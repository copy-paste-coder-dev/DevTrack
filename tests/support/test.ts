import { test as base, expect } from '@playwright/test'
export const test = base.extend({
  page: async ({ page }, runTest) => {
    await page.clock.setFixedTime(new Date('2026-10-12T06:00:00Z'))
    await runTest(page)
  },
})
export { expect }
