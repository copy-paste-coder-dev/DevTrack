import { test, expect } from '@playwright/test'
import { readdir, readFile } from 'node:fs/promises'
import AxeBuilder from '@axe-core/playwright'

test('production bundle excludes test adapters and public source maps', async () => {
  const names = await readdir('dist/assets')
  expect(names.some((name) => name.endsWith('.map'))).toBe(false)
  for (const name of names.filter((name) => name.endsWith('.js'))) {
    const source = await readFile(`dist/assets/${name}`, 'utf8')
    expect(source).not.toMatch(/devtrack-e2e-|test-developer|demo-key|Synthetic logout failure/)
    expect(source).not.toContain('sourceMappingURL=')
  }
})

for (const width of [390, 1440]) {
  test(`production SPA entry/reload routes, guest protection and assets at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 })
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text())
    })
    page.on('response', (response) => {
      if (response.url().startsWith('http://127.0.0.1:') && response.status() >= 400)
        errors.push(`${response.status()} ${response.url()}`)
    })
    for (const route of ['/', '/login', '/app', '/app/calendar', '/app/settings']) {
      const response = await page.goto(route)
      expect(response?.status()).toBe(200)
      await expect(page).toHaveURL(/\/login(?:\?|$)/)
      await expect(page.getByRole('button', { name: /Google/ })).toBeVisible()
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      )
      await page.reload()
      await expect(page.getByRole('button', { name: /Google/ })).toBeVisible()
      await expect(page.locator('.dashboard-page')).toHaveCount(0)
    }
    const scan = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze()
    expect(scan.violations).toEqual([])
    await page.screenshot({
      path: `artifacts/screenshots/production-login-${width}.png`,
      fullPage: true,
    })
    expect(errors).toEqual([])
  })
}
