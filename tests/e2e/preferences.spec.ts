import { test, expect, closeActivityDialog } from '../support/test'
import type { Page } from '@playwright/test'

const saveButton = (page: Page) => page.getByRole('button', { name: 'Save changes', exact: true })
async function save(page: Page) {
  await saveButton(page).click()
  await expect(saveButton(page)).toBeDisabled()
  await expect(page.getByText('Settings saved.')).toBeVisible()
}
async function configure(page: Page) {
  await page.getByLabel('Default day start time').fill('08:30')
  await page.getByLabel('Default day end time').fill('17:30')
  await page.getByLabel('Time display format').selectOption('12h')
  await page.getByRole('switch', { name: 'Enable Meeting', exact: true }).click()
  await save(page)
}

test('first load initializes once; settings persist, drive smart start/format/types/target and never rewrite activities', async ({
  page,
}) => {
  await page.goto('/app/settings')
  await expect(page.getByLabel('Default day start time')).toHaveValue('09:00')
  expect(
    await page.evaluate(() => sessionStorage.getItem('devtrack-e2e-preferences-listeners')),
  ).toBe('1')
  const activityBefore = await page.evaluate(() => localStorage.getItem('devtrack-e2e-activities'))
  await expect(saveButton(page)).toBeDisabled()
  await configure(page)
  const createdAt = await page.evaluate(
    () => JSON.parse(localStorage.getItem('devtrack-e2e-preferences')!)['test-developer'].createdAt,
  )
  await page.reload()
  await expect(page.getByLabel('Default day start time')).toHaveValue('08:30')
  await expect(page.getByLabel('Default day end time')).toHaveValue('17:30')
  await expect(page.getByLabel('Time display format')).toHaveValue('12h')
  await expect(page.getByRole('switch', { name: 'Enable Meeting', exact: true })).not.toBeChecked()
  expect(await page.evaluate(() => localStorage.getItem('devtrack-e2e-activities'))).toBe(
    activityBefore,
  )
  await page.goto('/app?date=2026-10-14')
  await expect(page.getByText('Your day starts at 8:30 AM.')).toBeVisible()
  await page.getByRole('button', { name: 'Add activity', exact: true }).click()
  await expect(page.getByLabel(/^Start time/)).toHaveValue('08:30')
  await expect(page.getByLabel('Activity type').locator('option[value="meeting"]')).toHaveCount(0)
  await page.getByLabel('Task / activity name').fill('Settings integration')
  await page.getByLabel(/^End time/).fill('10:00')
  await page.getByRole('button', { name: 'Save activity' }).click()
  await expect(page.getByRole('dialog')).not.toBeVisible()
  await expect(page.locator('.activity-time')).toContainText('8:30 AM')
  await expect(page.locator('.day-summary')).toContainText('7h 30m')
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '17')
  await page.goto('/app/settings')
  await page.getByLabel('Default day start time').fill('09:30')
  await save(page)
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem('devtrack-e2e-preferences')!)['test-developer'].createdAt,
    ),
  ).toBe(createdAt)
  await page.goto('/app/calendar?date=2026-10-14')
  await page.getByRole('button', { name: 'Add activity', exact: true }).click()
  await expect(page.getByLabel(/^Start time/)).toHaveValue('10:00')
  await closeActivityDialog(page)
  await page.goto('/app?date=2026-10-12')
  await expect(page.getByText('Sprint planning with the team', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Edit Meeting', exact: true }).click()
  await expect(page.getByLabel('Activity type')).toHaveValue('meeting')
  await expect(page.getByLabel('Activity type').locator('option[value="meeting"]')).toHaveText(
    'Meeting (currently disabled)',
  )
  await page.getByRole('button', { name: 'Update activity' }).click()
  await expect(page.getByRole('dialog')).not.toBeVisible()
  await page.getByRole('button', { name: 'Logout', exact: true }).click()
  await expect(page).toHaveURL(/\/login/)
  expect(
    await page.evaluate(() => sessionStorage.getItem('devtrack-e2e-preferences-listeners')),
  ).toBe('0')
  await page.getByRole('button', { name: 'Continue with Google' }).click()
  await page.getByRole('link', { name: 'Settings', exact: true }).click()
  await expect(page.getByLabel('Default day start time')).toHaveValue('09:30')
})

test('validation rejects zero types and overnight workday, reset is local until Save', async ({
  page,
}) => {
  await page.goto('/app/settings')
  await expect(saveButton(page)).toBeDisabled()
  await page.getByLabel('Default day start time').fill('18:00')
  await page.getByLabel('Default day end time').fill('09:00')
  await expect(page.getByText('End time must be later than start time.')).toBeVisible()
  await expect(saveButton(page)).toBeDisabled()
  await page.getByRole('button', { name: 'Reset to defaults' }).click()
  for (const toggle of await page.getByRole('switch').all()) await toggle.click()
  await expect(page.getByText('Select at least one activity type.')).toBeVisible()
  await expect(saveButton(page)).toBeDisabled()
  await page.getByRole('switch', { name: 'Enable Break', exact: true }).click()
  await page.getByLabel('Default day end time').fill('09:30')
  await save(page)
  await page.getByRole('button', { name: 'Reset to defaults' }).click()
  await expect(page.getByRole('switch', { name: 'Enable Meeting', exact: true })).toBeChecked()
  await page.reload()
  await expect(page.getByRole('switch', { name: 'Enable Meeting', exact: true })).not.toBeChecked()
  await page.goto('/app?date=2026-10-14')
  await page.getByRole('button', { name: 'Add activity', exact: true }).click()
  await expect(page.getByLabel('Activity type')).toHaveValue('break')
  await expect(page.getByLabel('Activity type').locator('option')).toHaveCount(1)
})

test('failed saves preserve drafts; retry and dirty state behave predictably', async ({ page }) => {
  await page.goto('/app/settings')
  await page.getByLabel('Default day start time').fill('08:00')
  await page.evaluate(() =>
    localStorage.setItem(
      'devtrack-e2e-preferences-options',
      JSON.stringify({ saveError: 'permission-denied', holdSave: true }),
    ),
  )
  await saveButton(page).click()
  await expect(page.getByRole('button', { name: 'Saving…' })).toBeDisabled()
  await expect(page.getByLabel('Default day start time')).toBeDisabled()
  await page.evaluate(() =>
    localStorage.setItem(
      'devtrack-e2e-preferences-options',
      JSON.stringify({ saveError: 'permission-denied' }),
    ),
  )
  await expect(page.getByRole('alert')).toContainText('permission')
  await expect(page.getByLabel('Default day start time')).toHaveValue('08:00')
  await page.evaluate(() => localStorage.removeItem('devtrack-e2e-preferences-options'))
  await save(page)
  await expect(page.getByRole('alert')).toHaveCount(0)
})

test('read failure falls back for logging and Retry restores preferences without infinite loading', async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      'devtrack-e2e-preferences-options',
      JSON.stringify({ readError: 'unavailable' }),
    ),
  )
  await page.goto('/app?date=2026-10-14')
  await expect(page.locator('.preferences-warning')).toContainText(
    'Default workday settings are being used.',
  )
  await page.getByRole('button', { name: 'Add activity', exact: true }).click()
  await expect(page.getByLabel(/^Start time/)).toHaveValue('09:00')
  await closeActivityDialog(page)
  await page.getByRole('link', { name: 'Settings', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('temporarily unavailable')
  await page.evaluate(() => localStorage.removeItem('devtrack-e2e-preferences-options'))
  await page.getByRole('button', { name: 'Try again' }).click()
  await expect(page.getByLabel('Default day start time')).toHaveValue('09:00')
  await expect(page.locator('.preferences-warning')).toHaveCount(0)
})

test('clean forms follow remote updates; dirty drafts stay intact and live defaults recalculate', async ({
  page,
}) => {
  await page.goto('/app/settings')
  await expect(page.getByLabel('Default day start time')).toHaveValue('09:00')
  async function remote(start: string) {
    await page.evaluate(async (start) => {
      const { settingsService } = await import(
        '/tests/support/settings.service.ts' /* @vite-ignore */
      )
      const values = await settingsService.getUserPreferences('test-developer')
      await settingsService.updateUserPreferences('test-developer', {
        ...values!,
        dayStartTime: start,
        timeFormat: '12h',
      })
    }, start)
  }
  await remote('08:00')
  await expect(page.getByLabel('Default day start time')).toHaveValue('08:00')
  await page.getByLabel('Default day start time').fill('07:30')
  await remote('10:00')
  await expect(page.getByLabel('Default day start time')).toHaveValue('07:30')
  await page.getByRole('link', { name: 'Dashboard', exact: true }).click()
  await expect(page.locator('.timeline-gap')).toHaveCount(0)
  await page.goto('/app?date=2026-10-14')
  await expect(page.getByText('Your day starts at 10:00 AM.')).toBeVisible()
})

test('two users receive their own settings and logout removes the single listener', async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      'devtrack-e2e-preferences',
      JSON.stringify({
        'test-developer': {
          dayStartTime: '08:30',
          dayEndTime: '17:30',
          timeFormat: '24h',
          enabledActivityTypes: ['development'],
        },
        'second-user': {
          dayStartTime: '10:00',
          dayEndTime: '18:00',
          timeFormat: '12h',
          enabledActivityTypes: ['meeting'],
        },
      }),
    ),
  )
  await page.goto('/app?date=2026-10-14')
  await page.getByRole('button', { name: 'Add activity', exact: true }).click()
  await expect(page.getByLabel(/^Start time/)).toHaveValue('08:30')
  await closeActivityDialog(page)
  await page.getByRole('button', { name: 'Logout', exact: true }).click()
  await expect(page).toHaveURL(/\/login/)
  expect(
    await page.evaluate(() => sessionStorage.getItem('devtrack-e2e-preferences-listeners')),
  ).toBe('0')
  await page.evaluate(() =>
    localStorage.setItem(
      'devtrack-e2e-options',
      JSON.stringify({
        signInUser: {
          uid: 'second-user',
          displayName: 'Second User',
          email: 'second@example.invalid',
          photoURL: null,
        },
      }),
    ),
  )
  await page.getByRole('button', { name: 'Continue with Google' }).click()
  await page.goto('/app?date=2026-10-14')
  await expect(page.getByText('Your day starts at 10:00 AM.')).toBeVisible()
  await page.getByRole('button', { name: 'Add activity', exact: true }).click()
  await expect(page.getByLabel(/^Start time/)).toHaveValue('10:00')
  await expect(page.getByLabel('Activity type')).toHaveValue('meeting')
  expect(
    await page.evaluate(() => sessionStorage.getItem('devtrack-e2e-preferences-listeners')),
  ).toBe('1')
})

test('a second tab receives saved preferences without refreshing', async ({ page, context }) => {
  test.setTimeout(60000)
  await page.goto('/app/settings')
  await expect(page.getByLabel('Default day start time')).toHaveValue('09:00')
  const other = await context.newPage()
  await other.goto('/app?date=2026-10-14')
  await expect(other.getByText('Your day starts at 09:00.')).toBeVisible()
  await page.bringToFront()
  await configure(page)
  await other.bringToFront()
  await expect(other.getByText('Your day starts at 8:30 AM.')).toBeVisible()
  await other.close()
})

for (const width of [390, 430, 768, 1024, 1440]) {
  test(`saved 12h settings, timeline and target fit ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/app/settings')
    await configure(page)
    await page.screenshot({
      path: `artifacts/screenshots/phase5-settings-${width}.png`,
      fullPage: true,
    })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.goto('/app?date=2026-10-12')
    await expect(page.locator('.timeline-gap')).toContainText('30m unlogged')
    await expect(page.locator('.day-summary')).toContainText('2h 30m')
    await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '72')
    await page.screenshot({
      path: `artifacts/screenshots/phase5-dashboard-${width}.png`,
      fullPage: true,
    })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  })
}
