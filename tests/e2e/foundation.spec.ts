import { test, expect } from '@playwright/test'

test('app routes render and navigation works without runtime errors', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text())
  })
  await page.goto('/')
  await expect(page).toHaveURL(/\/app$/)
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await page.getByRole('link', { name: 'Calendar', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Calendar', exact: true })).toBeVisible()
  await page.getByRole('link', { name: 'Settings', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Settings', exact: true })).toBeVisible()
  await page.goto('/not-a-route')
  await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible()
  expect(errors).toEqual([])
})

for (const viewport of [
  { width: 390, height: 844 },
  { width: 430, height: 932 },
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
]) {
  test(`screens and modal fit a ${viewport.width}x${viewport.height} viewport`, async ({
    page,
  }) => {
    const { width, height } = viewport
    await page.setViewportSize(viewport)
    for (const route of ['/app', '/app/calendar', '/app/settings', '/login']) {
      if (route === '/login')
        await page.evaluate(() => localStorage.setItem('devtrack-e2e-session', 'null'))
      await page.goto(route)
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      )
      if (route !== '/login')
        await expect(page.getByRole('link', { name: 'Calendar', exact: true })).toBeInViewport()
      await page.screenshot({
        path: `artifacts/screenshots/${route.split('/').at(-1)}-${width}.png`,
        fullPage: true,
      })
    }
    await page.evaluate(() => localStorage.removeItem('devtrack-e2e-session'))
    await page.goto('/app')
    await expect(page.locator('.stat-card')).toHaveCount(5)
    for (const card of await page.locator('.stat-card').all()) await expect(card).toBeVisible()
    if (width < 701) {
      await expect(page.locator('.sidebar')).not.toBeVisible()
      await expect(page.getByRole('navigation', { name: 'Mobile navigation' })).toBeInViewport()
      const addBox = await page
        .getByRole('button', { name: 'Add activity', exact: true })
        .boundingBox()
      const statsBox = await page.locator('.stats-grid').boundingBox()
      expect(addBox!.width).toBeGreaterThan(width - 60)
      expect(addBox!.y).toBeGreaterThan(statsBox!.y + statsBox!.height)
    }
    await page.getByRole('button', { name: 'Add activity', exact: true }).click()
    const dialog = page.getByRole('dialog')
    const box = await dialog.boundingBox()
    expect(box!.x).toBeGreaterThanOrEqual(0)
    expect(box!.y).toBeGreaterThanOrEqual(0)
    expect(box!.width).toBeLessThanOrEqual(width)
    expect(box!.height).toBeLessThanOrEqual(height)
    await page.getByRole('button', { name: 'Save activity' }).scrollIntoViewIfNeeded()
    await expect(page.getByRole('button', { name: 'Save activity' })).toBeInViewport()
    await page.screenshot({ path: `artifacts/screenshots/dialog-${width}.png` })
    await page.keyboard.press('Escape')
    await expect(dialog).not.toBeVisible()
  })
}
