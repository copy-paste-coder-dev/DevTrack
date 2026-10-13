import { test, expect } from '../support/test'
import type { Page } from '@playwright/test'

async function emptyStore(page: Page) {
  await page.addInitScript(() => {
    if (!localStorage.getItem('devtrack-e2e-activities'))
      localStorage.setItem('devtrack-e2e-activities', JSON.stringify({ 'test-developer': [] }))
  })
}
const add = (page: Page) => page.getByRole('button', { name: 'Add activity', exact: true }).click()
const start = (page: Page) => page.getByLabel(/^Start time/)
const end = (page: Page) => page.getByLabel(/^End time/)
async function save(page: Page, name: string, endTime: string) {
  await page.getByLabel('Task / activity name').fill(name)
  await end(page).fill(endTime)
  await page.getByRole('button', { name: 'Save activity' }).click()
  await expect(page.getByRole('dialog')).not.toBeVisible()
}

test('09:00–10:00 then 10:45–11:30 saves with a gap without reloading the app', async ({
  page,
}) => {
  await emptyStore(page)
  await page.goto('/app?date=2026-10-15')
  await expect(page.getByText('Your day starts at 09:00.')).toBeVisible()
  const documentRequests: string[] = []
  page.on('request', (request) => {
    if (request.isNavigationRequest() && request.frame() === page.mainFrame())
      documentRequests.push(request.url())
  })
  await add(page)
  await save(page, 'First exact repro', '10:00')
  await add(page)
  await expect(start(page)).toHaveValue('10:00')
  await start(page).fill('10:45')
  await end(page).fill('11:30')
  await expect(page.getByRole('alert')).toHaveCount(0)
  await expect(page.locator('.duration-preview')).toContainText('45m')
  await save(page, 'Second exact repro', '11:30')
  await expect(page.locator('.timeline-item')).toHaveCount(2)
  await expect(page.locator('.timeline-gap')).toContainText('45m unlogged')
  await expect(page).toHaveURL(/\/app\?date=2026-10-15$/)
  expect(documentRequests).toEqual([])
  await add(page)
  await expect(start(page)).toHaveValue('11:30')
  await start(page).fill('09:45')
  await end(page).fill('10:15')
  await page.getByLabel('Task / activity name').fill('Real conflict')
  await expect(page.getByRole('alert')).toContainText('First exact repro')
  await expect(page.getByRole('button', { name: 'Save activity' })).toBeDisabled()
  expect(documentRequests).toEqual([])
})

test('Phase 4 ten-step smart timeline flow, create/edit conflicts, gap repair and deletion', async ({
  page,
}) => {
  await emptyStore(page)
  await page.goto('/app?date=2026-10-15')
  await expect(page.getByText('Your day starts at 09:00.')).toBeVisible()
  await add(page)
  await expect(start(page)).toHaveValue('09:00')
  await expect(end(page)).toHaveValue('09:30')
  await save(page, 'First', '10:30')
  await add(page)
  await expect(start(page)).toHaveValue('10:30')
  await expect(page.locator('.duration-preview')).toContainText('30m')
  await save(page, 'Second', '11:00')
  await add(page)
  await expect(start(page)).toHaveValue('11:00')
  await page.getByLabel('Task / activity name').fill('Collision')
  await start(page).fill('10:45')
  await end(page).fill('11:30')
  await expect(page.getByRole('alert')).toContainText('Second')
  await expect(page.getByRole('button', { name: 'Save activity' })).toBeDisabled()
  await start(page).fill('12:00')
  await save(page, 'Third', '13:00')
  await expect(page.locator('.timeline-gap')).toHaveCount(1)
  await expect(page.locator('.timeline-gap')).toContainText('1h unlogged')
  await expect(page.locator('.stat-card').first()).toContainText('3h')
  await page.getByRole('button', { name: 'Log activity from 11:00 to 12:00' }).click()
  await expect(start(page)).toHaveValue('11:00')
  await expect(end(page)).toHaveValue('12:00')
  await save(page, 'Filled gap', '12:00')
  await expect(page.locator('.timeline-gap')).toHaveCount(0)
  const second = page
    .locator('.timeline-item')
    .filter({ has: page.getByText('Second', { exact: true }) })
  await second.getByRole('button', { name: 'Edit Development' }).click()
  await expect(start(page)).toHaveValue('10:30')
  await end(page).fill('11:30')
  await expect(page.getByRole('alert')).toContainText('Filled gap')
  await expect(page.getByRole('button', { name: 'Update activity' })).toBeDisabled()
  await page.keyboard.press('Escape')
  await page
    .locator('.timeline-item')
    .filter({ has: page.getByText('Third', { exact: true }) })
    .getByRole('button', { name: 'Delete Development' })
    .click()
  await page.getByRole('button', { name: 'Delete', exact: true }).click()
  await expect(page.getByRole('dialog')).not.toBeVisible()
  await add(page)
  await expect(start(page)).toHaveValue('12:00')
  await page.keyboard.press('Escape')
  await page.goto('/app/calendar?date=2026-10-14')
  await add(page)
  await expect(page.getByLabel(/^Date/)).toHaveValue('2026-10-14')
  await expect(start(page)).toHaveValue('09:00')
  await page.keyboard.press('Escape')
  await page.goto('/app/calendar?date=2026-10-15')
  await add(page)
  await expect(start(page)).toHaveValue('12:00')
})

test('end suggestion respects manual edits and midnight; realtime updates preserve drafts and block stale saves', async ({
  page,
}) => {
  await emptyStore(page)
  await page.goto('/app?date=2026-10-15')
  await add(page)
  await start(page).fill('10:00')
  await expect(end(page)).toHaveValue('10:30')
  await end(page).fill('11:00')
  await start(page).fill('10:15')
  await expect(end(page)).toHaveValue('11:00')
  await expect(page.locator('.duration-preview')).toContainText('45m')
  await page.getByLabel('Task / activity name').fill('Keep draft')
  await page.evaluate(async () => {
    // Same isolated adapter as the test app; simulates a new realtime snapshot while open.
    const { activityService } = await import(
      '/tests/support/activity.service.ts' /* @vite-ignore */
    )
    await activityService.createActivity('test-developer', {
      dateKey: '2026-10-15',
      activityType: 'break',
      taskName: 'Other interaction',
      status: 'on_hold',
      startAt: new Date(2026, 9, 15, 10),
      endAt: new Date(2026, 9, 15, 11),
      notes: '',
    })
  })
  await expect(page.getByLabel('Task / activity name')).toHaveValue('Keep draft')
  await expect(start(page)).toHaveValue('10:15')
  await expect(page.getByRole('alert')).toContainText('Other interaction')
  await page.keyboard.press('Escape')
  await add(page)
  await expect(start(page)).toHaveValue('11:00')
  await start(page).fill('23:45')
  await expect(end(page)).toHaveValue('')
  await end(page).fill('00:15')
  await expect(page.locator('.duration-preview')).toContainText('Invalid time range')
})

test('date moves reject destination conflicts, then save at a touching boundary', async ({
  page,
}) => {
  await page.goto('/app?date=2026-10-12')
  await page.getByRole('button', { name: 'Edit Jira Task', exact: true }).click()
  await page.getByLabel(/^Date/).fill('2026-10-13')
  await page.getByRole('button', { name: 'Update activity' }).click()
  await expect(page.getByRole('alert')).toContainText('Polish the calendar keyboard experience')
  await start(page).fill('10:30')
  await end(page).fill('11:30')
  await page.getByRole('button', { name: 'Update activity' }).click()
  await expect(page.getByRole('dialog')).not.toBeVisible()
  await page.goto('/app/calendar?date=2026-10-13')
  await expect(page.locator('.timeline-item')).toHaveCount(3)
  await page.reload()
  await expect(page.locator('.timeline-item')).toHaveCount(3)
})

for (const width of [390, 1440]) {
  test(`gap and conflict UI fit at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await emptyStore(page)
    await page.goto('/app?date=2026-10-15')
    await add(page)
    await start(page).fill('10:00')
    await save(page, 'Later start', '11:00')
    await expect(page.locator('.timeline-gap')).toContainText('1h unlogged')
    await page.screenshot({ path: `artifacts/screenshots/phase4-gap-${width}.png`, fullPage: true })
    await add(page)
    await start(page).fill('10:30')
    await end(page).fill('11:30')
    await expect(page.getByRole('alert')).toContainText('Later start')
    await expect(start(page)).toHaveAttribute('aria-invalid', 'true')
    await expect(end(page)).toHaveAttribute('aria-describedby', /.+/)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.getByRole('alert').scrollIntoViewIfNeeded()
    await page.screenshot({ path: `artifacts/screenshots/phase4-conflict-${width}.png` })
  })
}
