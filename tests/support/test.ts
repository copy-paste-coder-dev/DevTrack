import { test as base, expect } from '@playwright/test'
import type { Page } from '@playwright/test'

export async function closeActivityDialog(page: Page) {
  if (
    (await page
      .getByRole('combobox', { name: /^Task \/ activity name/ })
      .getAttribute('aria-expanded')) === 'true'
  )
    await page.keyboard.press('Escape')
  await page.keyboard.press('Escape')
}
export const test = base.extend({
  page: async ({ page }, runTest) => {
    await page.clock.setFixedTime(new Date('2026-10-12T06:00:00Z'))
    await runTest(page)
  },
})
export { expect }
