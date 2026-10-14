import AxeBuilder from '@axe-core/playwright'
import { test, expect, closeActivityDialog } from '../support/test'
import type { Page } from '@playwright/test'

async function audit(page: Page, name: string) {
  const result = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze()
  expect(
    result.violations.map(({ id, nodes }) => ({
      id,
      nodes: nodes.map(({ target, failureSummary }) => ({ target, failureSummary })),
    })),
    name,
  ).toEqual([])
}

for (const width of [390, 1440]) {
  test(`release accessibility audit at ${width}px`, async ({ page }) => {
    test.setTimeout(120000)
    await page.setViewportSize({ width, height: 900 })
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text())
    })
    await page.goto('/app?date=2026-10-12')
    await expect(page.getByRole('button', { name: 'Add activity', exact: true })).toBeEnabled()
    await audit(page, 'Dashboard')
    await page
      .getByRole('button', { name: /^More actions for/ })
      .first()
      .click()
    await expect(page.getByRole('menu')).toBeVisible()
    await audit(page, 'Activity actions menu')
    await page.keyboard.press('Escape')
    await page.getByRole('button', { name: 'Keyboard shortcuts', exact: true }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await audit(page, 'Shortcut help')
    await page.keyboard.press('Escape')
    await page.getByRole('button', { name: 'Add activity', exact: true }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await audit(page, 'Activity form')
    await page.getByRole('button', { name: 'Save activity' }).click()
    await expect(page.getByText('Give your activity a name.')).toBeVisible()
    await audit(page, 'Activity validation')
    await closeActivityDialog(page)
    await page.goto('/app/calendar?date=2026-10-12')
    await expect(page.getByRole('tab', { name: 'Month', exact: true })).toBeVisible()
    await audit(page, 'Calendar')
    await page.getByRole('tab', { name: 'Day', exact: true }).click()
    await audit(page, 'Calendar day view')
    await page.goto('/app/settings')
    await expect(page.getByRole('button', { name: 'Save changes', exact: true })).toBeVisible()
    await audit(page, 'Settings')
    await page.evaluate(() => localStorage.setItem('devtrack-e2e-session', 'null'))
    await page.goto('/login')
    await expect(page.getByRole('button', { name: /Google/ })).toBeVisible()
    await audit(page, 'Login')
    expect(errors).toEqual([])
  })
}
