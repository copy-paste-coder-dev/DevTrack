import { test, expect } from '../support/test'
import type { Page } from '@playwright/test'

async function emptyStore(page: Page, options: Record<string, unknown> = {}) {
  await page.addInitScript(
    ({ options }) => {
      if (!localStorage.getItem('devtrack-e2e-activities'))
        localStorage.setItem('devtrack-e2e-activities', JSON.stringify({ 'test-developer': [] }))
      if (!localStorage.getItem('devtrack-e2e-activity-options'))
        localStorage.setItem('devtrack-e2e-activity-options', JSON.stringify(options))
    },
    { options },
  )
}
async function fill(page: Page, name: string) {
  await page.getByLabel('Task / activity name').fill(name)
  await page.getByLabel('Activity type').selectOption('jira_task')
  await page.getByLabel(/^Start time/).fill('09:00')
  await page.getByLabel(/^End time/).fill('10:30')
}

test('create, refresh, edit date/status/time, calendar markers and delete stay consistent', async ({
  page,
}) => {
  await emptyStore(page)
  await page.goto('/app?date=2026-10-12')
  await expect(page.getByText('No activities logged for this day.')).toBeVisible()
  await page.getByRole('button', { name: 'Log first activity' }).click()
  await expect(page.getByLabel(/^Date/)).toHaveValue('2026-10-12')
  const name = 'TD-12345 - Fix "+" URL encoding / #ticket and activity logger notes synchronization'
  await fill(page, name)
  await page.getByLabel('Notes (optional)').fill('First line\nSecond line: + / #')
  await page.getByRole('button', { name: 'Save activity' }).click()
  await expect(page.getByRole('dialog')).not.toBeVisible()
  await expect(page.locator('.timeline-item')).toHaveCount(1)
  await expect(page.locator('.stat-card').first()).toContainText('1h 30m')
  const createdAt = await page.evaluate(
    () =>
      JSON.parse(localStorage.getItem('devtrack-e2e-activities')!)['test-developer'][0].createdAt,
  )
  await page.reload()
  await expect(page.getByText(name, { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Edit Jira Task', exact: true }).click()
  await expect(page.getByLabel('Notes (optional)')).toHaveValue('First line\nSecond line: + / #')
  await page.getByLabel(/^Date/).fill('2026-10-13')
  await page.getByLabel('Task / activity name').fill('Moved task')
  await page.getByLabel('Task status').selectOption('completed')
  await page.getByLabel(/^End time/).fill('11:00')
  await page.getByRole('button', { name: 'Update activity' }).click()
  await expect(page.getByText('No activities logged for this day.')).toBeVisible()
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem('devtrack-e2e-activities')!)['test-developer'][0].createdAt,
    ),
  ).toBe(createdAt)
  await page.goto('/app/calendar?date=2026-10-13')
  await expect(page.getByText('Moved task', { exact: true })).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Tuesday, October 13, 2026, activities', exact: true }),
  ).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Monday, October 12, 2026', exact: true }),
  ).toBeVisible()
  await expect(page.locator('.duration-chip')).toHaveText('2h')
  await page.getByRole('button', { name: 'More actions for Moved task', exact: true }).click()
  await page.getByRole('menuitem', { name: 'Delete', exact: true }).click()
  await page.getByRole('button', { name: 'Delete', exact: true }).click()
  await expect(page.getByText('No activities planned/logged for this day.')).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Tuesday, October 13, 2026', exact: true }),
  ).toBeVisible()
  await page.reload()
  await expect(page.locator('.timeline-item')).toHaveCount(0)
})

test('save errors preserve values; retry saves once and the next create starts empty', async ({
  page,
}) => {
  await emptyStore(page, { mutationError: 'permission-denied', holdMutation: true })
  await page.goto('/app')
  await page.getByRole('button', { name: 'Add activity', exact: true }).click()
  await fill(page, 'Keep my input')
  await page.getByRole('button', { name: 'Save activity' }).click()
  await expect(page.getByRole('button', { name: 'Saving…' })).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Close dialog' })).toBeDisabled()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.evaluate(() =>
    localStorage.setItem(
      'devtrack-e2e-activity-options',
      JSON.stringify({ mutationError: 'permission-denied' }),
    ),
  )
  await expect(page.getByRole('alert')).toContainText("You don't have permission")
  await expect(page.getByLabel('Task / activity name')).toHaveValue('Keep my input')
  await page.evaluate(() =>
    localStorage.setItem('devtrack-e2e-activity-options', JSON.stringify({ holdMutation: true })),
  )
  await page.getByRole('button', { name: 'Save activity' }).click()
  await page.getByLabel('Task / activity name').press('Enter')
  await page.evaluate(() => localStorage.removeItem('devtrack-e2e-activity-options'))
  await expect(page.getByRole('dialog')).not.toBeVisible()
  await expect(page.locator('.timeline-item')).toHaveCount(1)
  await page.getByRole('button', { name: 'Add activity', exact: true }).click()
  await expect(page.getByLabel('Task / activity name')).toHaveValue('')
})

test('invalid end time prevents saving, offline failures preserve the form', async ({
  page,
  context,
}) => {
  await emptyStore(page)
  await page.goto('/app')
  await page.getByRole('button', { name: 'Add activity', exact: true }).click()
  await fill(page, 'Offline task')
  await page.getByLabel(/^End time/).fill('08:00')
  await page.getByRole('button', { name: 'Save activity' }).click()
  await expect(page.getByText('End time must be after start time.')).toBeVisible()
  await page.getByLabel(/^End time/).fill('10:30')
  await context.setOffline(true)
  try {
    await page.getByRole('button', { name: 'Save activity' }).click()
    await expect(page.getByRole('alert')).toContainText('internet connection')
    await expect(page.getByLabel('Task / activity name')).toHaveValue('Offline task')
  } finally {
    await context.setOffline(false)
  }
})

test('update and delete errors keep their dialogs open and permit retry', async ({ page }) => {
  await page.goto('/app')
  await page.getByRole('button', { name: 'Edit Development', exact: true }).click()
  await page.getByLabel('Task / activity name').fill('Retry update')
  await page.evaluate(() =>
    localStorage.setItem(
      'devtrack-e2e-activity-options',
      JSON.stringify({ mutationError: 'unavailable' }),
    ),
  )
  await page.getByRole('button', { name: 'Update activity' }).click()
  await expect(page.getByRole('alert')).toContainText('temporarily unavailable')
  await expect(page.getByLabel('Task / activity name')).toHaveValue('Retry update')
  await page.evaluate(() => localStorage.removeItem('devtrack-e2e-activity-options'))
  await page.getByRole('button', { name: 'Update activity' }).click()
  await expect(page.getByRole('dialog')).not.toBeVisible()
  await page.getByRole('button', { name: 'More actions for Retry update', exact: true }).click()
  await page.getByRole('menuitem', { name: 'Delete', exact: true }).click()
  await page.evaluate(() =>
    localStorage.setItem(
      'devtrack-e2e-activity-options',
      JSON.stringify({ mutationError: 'permission-denied' }),
    ),
  )
  await page.getByRole('button', { name: 'Delete', exact: true }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await expect(page.getByRole('alert')).toContainText('permission')
  await page.evaluate(() => localStorage.removeItem('devtrack-e2e-activity-options'))
  await page.getByRole('button', { name: 'Delete', exact: true }).click()
  await expect(page.getByRole('dialog')).not.toBeVisible()
  await expect(page.getByText('Retry update', { exact: true })).toHaveCount(0)
})

test('range reads change with visible month; listener cleanup follows routes and logout', async ({
  page,
}) => {
  await page.goto('/app/calendar?date=2026-10-12')
  await expect(page.locator('.timeline-item')).toHaveCount(6)
  expect(await page.evaluate(() => sessionStorage.getItem('devtrack-e2e-listeners'))).toBe('1')
  await page.getByRole('button', { name: 'Next month', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'November 2026' })).toBeVisible()
  await expect(page.locator('.calendar-dots')).toHaveCount(0)
  await page.getByRole('button', { name: 'Previous month', exact: true }).click()
  await expect(page.locator('.calendar-dots')).toHaveCount(3)
  await page.goto('/app')
  await expect(page.locator('.timeline-item')).toHaveCount(6)
  expect(await page.evaluate(() => sessionStorage.getItem('devtrack-e2e-listeners'))).toBe('1')
  await page.getByRole('link', { name: 'Settings', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Settings', exact: true })).toBeVisible()
  expect(await page.evaluate(() => sessionStorage.getItem('devtrack-e2e-listeners'))).toBe('0')
  await page.getByRole('link', { name: 'Dashboard', exact: true }).click()
  await expect(page.locator('.timeline-item')).toHaveCount(6)
  await page.getByRole('button', { name: 'Logout', exact: true }).click()
  await expect(page).toHaveURL(/\/login/)
  expect(await page.evaluate(() => sessionStorage.getItem('devtrack-e2e-listeners'))).toBe('0')
})

test('read errors show friendly feedback and retry recreates subscriptions', async ({ page }) => {
  await emptyStore(page, { readError: 'failed-precondition' })
  await page.goto('/app/calendar')
  await expect(page.getByRole('alert')).toContainText('index or configuration')
  await page.evaluate(() => localStorage.removeItem('devtrack-e2e-activity-options'))
  await page.getByRole('button', { name: 'Try again' }).click()
  await expect(page.getByRole('alert')).not.toBeVisible()
  await expect(page.getByText('No activities logged for this day.')).toBeVisible()
})
