import { test, expect, closeActivityDialog } from '../support/test'
import type { Page } from '@playwright/test'

const blocks = [
  ['2026-10-01', '09:00', '14:00'],
  ['2026-10-02', '09:00', '18:00'],
  ['2026-10-03', '08:00', '18:00'],
  ['2026-10-12', '09:00', '10:30'],
  ['2026-10-12', '10:30', '11:00'],
  ['2026-10-12', '11:30', '13:00'],
  ['2026-10-12', '14:00', '17:00'],
  ['2026-10-14', '09:00', '18:00'],
]
async function seed(page: Page) {
  await page.addInitScript((blocks) => {
    if (localStorage.getItem('devtrack-e2e-activities')) return
    const rows = blocks.map(([dateKey, start, end], index) => {
      const startAt = `${dateKey}T${start}:00+05:30`,
        endAt = `${dateKey}T${end}:00+05:30`
      return {
        id: `analysis-${index}`,
        dateKey,
        startAt,
        endAt,
        durationMinutes: (Date.parse(endAt) - Date.parse(startAt)) / 60000,
        status: index === 5 ? 'in_progress' : index === 6 ? 'on_hold' : 'completed',
        activityType: 'development',
        taskName: `Analysis block ${index}`,
        notes: '',
        createdAt: null,
        updatedAt: null,
      }
    })
    localStorage.setItem('devtrack-e2e-activities', JSON.stringify({ 'test-developer': rows }))
  }, blocks)
}

test('daily metrics agree across Dashboard and Calendar; mixed states and month totals are factual', async ({
  page,
}) => {
  await seed(page)
  await page.goto('/app?date=2026-10-12')
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '72')
  await expect(page.locator('.day-summary')).toContainText('2h 30m')
  await expect(page.locator('.day-summary')).toContainText('2 · 1h 30m')
  await expect(page.locator('.day-summary')).toContainText('1 in progress · 1 on hold · 2 open')
  await expect(page.locator('.timeline-gap')).toHaveCount(2)
  const dashboard = await page.locator('.day-summary').textContent()
  expect(await page.evaluate(() => sessionStorage.getItem('devtrack-e2e-listeners'))).toBe('1')
  await page.getByRole('link', { name: 'Open calendar' }).click()
  await expect(page.locator('.day-summary')).toHaveText(dashboard)
  await expect(page.locator('.month-summary')).toContainText('39h 30m')
  await expect(page.locator('.month-summary')).toContainText('7h 54m')
  const metrics = page.locator('.month-summary dd')
  await expect(metrics.nth(1)).toHaveText('5')
  await expect(metrics.nth(2)).toHaveText('2')
  for (const [day, state] of [
    ['01', 'partial'],
    ['02', 'target_met'],
    ['03', 'over_target'],
    ['04', 'empty'],
    ['14', 'future'],
  ]) {
    const cell = page.locator(`#day-large-2026-10-${day}`)
    await expect(cell).toHaveClass(new RegExp(`state-${state}`))
    await cell.click()
    await expect(page.locator('.day-state')).toHaveClass(new RegExp(`state-${state}`))
  }
  await expect(page.locator('.day-state')).toHaveText('Future · Logged')
  await expect(page.locator('.day-summary')).not.toContainText('Target met')
  await page.locator('#day-large-2026-10-03').click()
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100')
  await expect(page.locator('.workday-progress')).toContainText('111%')
  await expect(page.locator('.overtime-note')).toHaveText('+1h overtime')
})

test('month/day navigation, keyboard boundaries and Today keep selection and listeners synchronized', async ({
  page,
}) => {
  await seed(page)
  for (const route of ['/app/calendar', '/app']) {
    await page.goto(`${route}?date=2026-10-31`)
    await page.getByRole('button', { name: 'Previous month', exact: true }).click()
    await expect(page).toHaveURL(/date=2026-09-30/)
    await page.getByRole('button', { name: 'Next month', exact: true }).click()
    await expect(page).toHaveURL(/date=2026-10-30/)
    await page.getByRole('button', { name: 'Next month', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'November 2026' })).toBeVisible()
    await expect(page.locator('.calendar-day.selected')).toHaveCount(1)
    await expect(page.locator('.calendar-day.selected')).not.toHaveClass(/outside/)
    await page.getByRole('button', { name: 'Today', exact: true }).click()
    await expect(page).toHaveURL(/date=2026-10-12/)
    await expect(page.locator('.calendar-day.selected')).toHaveAttribute('aria-current', 'date')
    expect(await page.evaluate(() => sessionStorage.getItem('devtrack-e2e-listeners'))).toBe('1')
  }
  await page.goto('/app?date=2026-10-31')
  await page.getByRole('button', { name: 'Next day', exact: true }).click()
  await expect(page).toHaveURL(/date=2026-11-01/)
  await page.getByRole('button', { name: 'Previous day', exact: true }).click()
  await expect(page).toHaveURL(/date=2026-10-31/)
  await page.goto('/app/calendar?date=2026-10-31')
  await page.locator('#day-large-2026-10-31').focus()
  await page.keyboard.press('ArrowRight')
  await expect(page.locator('#day-large-2026-11-01')).toBeFocused()
  await expect(page).toHaveURL(/date=2026-11-01/)
})

test('remote preferences and activity snapshots update summary, calendar and month without reload', async ({
  page,
}) => {
  await seed(page)
  await page.goto('/app/calendar?date=2026-10-12')
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '72')
  const navigations: string[] = []
  page.on('request', (request) => {
    if (request.isNavigationRequest()) navigations.push(request.url())
  })
  await page.evaluate(async () => {
    const { settingsService } = await import(
      '/tests/support/settings.service.ts' /* @vite-ignore */
    )
    const prefs = await settingsService.getUserPreferences('test-developer')
    await settingsService.updateUserPreferences('test-developer', {
      ...prefs!,
      dayStartTime: '08:00',
      dayEndTime: '16:00',
      timeFormat: '12h',
    })
  })
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '81')
  await expect(page.locator('.day-summary')).toContainText('9:00 AM')
  await expect(page.locator('.day-summary')).toContainText('5:00 PM')
  await expect(page.locator('.day-summary')).toContainText('3 · 2h 30m')
  await expect(page.locator('#day-large-2026-10-12')).toHaveAttribute('title', /81% of workday/)
  await page.getByRole('button', { name: 'Log activity from 11:00 AM to 11:30 AM' }).click()
  await expect(page.getByLabel(/^Date/)).toHaveValue('2026-10-12')
  await expect(page.getByLabel(/^Start time/)).toHaveValue('11:00')
  await expect(page.getByLabel(/^End time/)).toHaveValue('11:30')
  await page.getByLabel('Task / activity name').fill('Filled calendar gap')
  await page.getByRole('button', { name: 'Save activity', exact: true }).click()
  await expect(page.getByRole('dialog')).not.toBeVisible()
  await expect(page.locator('.day-summary')).toContainText('7h')
  await expect(page.locator('.month-summary')).toContainText('40h')
  await expect(page.locator('.timeline-gap')).toHaveCount(2)
  await page.getByRole('button', { name: 'Add activity', exact: true }).click()
  await expect(page.getByLabel(/^Start time/)).toHaveValue('17:00')
  await closeActivityDialog(page)
  expect(navigations).toEqual([])
})

for (const width of [390, 768, 1440, 1920]) {
  test(`mixed calendar and day detail fit ${width}px with usable cells`, async ({ page }) => {
    await seed(page)
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1024 })
    await page.goto('/app/calendar?date=2026-10-12')
    await expect(page.locator('.day-summary')).toContainText('6h 30m')
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    const cell = await page.locator('#day-large-2026-10-12').boundingBox()
    expect(cell!.width).toBeGreaterThanOrEqual(32)
    expect(cell!.height).toBeGreaterThanOrEqual(44)
    await page.screenshot({
      path: `artifacts/screenshots/phase6-calendar-${width}.png`,
      fullPage: true,
    })
    await page.getByRole('tab', { name: 'Day', exact: true }).click()
    await expect(page.locator('.timeline-item')).toHaveCount(4)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.goto('/app?date=2026-10-12')
    await expect(page.locator('.timeline-item')).toHaveCount(4)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({
      path: `artifacts/screenshots/phase6-dashboard-${width}.png`,
      fullPage: true,
    })
  })
}
