import { test, expect, closeActivityDialog } from '../support/test'
import type { Page } from '@playwright/test'

async function seed(page: Page, options: Record<string, unknown> = {}) {
  await page.addInitScript((options) => {
    if (localStorage.getItem('devtrack-e2e-activities')) return
    const rows = [
      ['original', '2026-10-12', '09:00', '10:30', 'TD-1 Fix API', 'jira_task', 'completed'],
      ['latest', '2026-10-12', '13:00', '14:00', 'Build dashboard', 'development', 'on_hold'],
      ['older', '2026-10-11', '09:00', '10:00', 'td-1 fix api', 'jira_task', 'completed'],
      ['disabled', '2026-10-11', '11:00', '12:00', 'Disabled review', 'code_review', 'completed'],
    ].map(([id, dateKey, start, end, taskName, activityType, status]) => {
      const startAt = `${dateKey}T${start}:00+05:30`,
        endAt = `${dateKey}T${end}:00+05:30`
      return {
        id,
        dateKey,
        startAt,
        endAt,
        taskName,
        activityType,
        status,
        durationMinutes: (Date.parse(endAt) - Date.parse(startAt)) / 60000,
        notes: `Notes for ${id}`,
        createdAt: null,
        updatedAt: null,
      }
    })
    localStorage.setItem(
      'devtrack-e2e-activities',
      JSON.stringify({ 'test-developer': rows, 'second-user': [] }),
    )
    localStorage.setItem('devtrack-e2e-activity-options', JSON.stringify(options))
    localStorage.setItem(
      'devtrack-e2e-preferences',
      JSON.stringify({
        'test-developer': {
          dayStartTime: '09:00',
          dayEndTime: '18:00',
          timeFormat: '24h',
          enabledActivityTypes: ['jira_task', 'development', 'scrum_call', 'meeting', 'break'],
        },
      }),
    )
  }, options)
}
const nameInput = (page: Page) => page.getByRole('combobox', { name: /^Task \/ activity name/ })
const add = async (page: Page) => {
  await expect(page.getByRole('button', { name: 'Add activity', exact: true })).toBeEnabled()
  await page.keyboard.press('n')
  await expect(nameInput(page)).toBeFocused()
}
const countStored = (page: Page) =>
  page.evaluate(
    () => JSON.parse(localStorage.getItem('devtrack-e2e-activities')!)['test-developer'].length,
  )

let browserErrors: string[] = []
test.beforeEach(async ({ page }) => {
  browserErrors = []
  page.on('pageerror', (error) => browserErrors.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'error') browserErrors.push(message.text())
  })
})
test.afterEach(() => {
  expect(browserErrors).toEqual([])
})

test('keyboard-only creation focuses task, validates, keeps typing safe and saves once with Ctrl+Enter', async ({
  page,
}) => {
  await seed(page, { holdMutation: true })
  await page.goto('/app?date=2026-10-12')
  await add(page)
  await page.keyboard.press('Control+Enter')
  await expect(page.getByText('Give your activity a name.')).toBeVisible()
  await nameInput(page).fill('Keyboard n entry')
  await page.keyboard.type('n')
  await expect(nameInput(page)).toHaveValue('Keyboard n entryn')
  await expect(page.getByRole('dialog')).toHaveCount(1)
  await expect(page.getByLabel(/^Start time/)).toHaveValue('14:00')
  await page.keyboard.press('Tab')
  await expect(page.getByLabel('Task status')).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(page.getByLabel(/^Start time/)).toBeFocused()
  // Native time controls have browser/platform-specific internal tab stops.
  for (
    let index = 0;
    index < 12 &&
    !(await page
      .getByRole('button', { name: '+15m', exact: true })
      .evaluate((element) => element === document.activeElement));
    index++
  )
    await page.keyboard.press('Tab')
  await expect(page.getByRole('button', { name: '+15m', exact: true })).toBeFocused()
  await page.keyboard.press('Tab')
  await page.keyboard.press('Tab')
  await expect(page.getByRole('button', { name: '+1h', exact: true })).toBeFocused()
  await page.keyboard.press('Space')
  await expect(page.getByLabel(/^End time/)).toHaveValue('15:00')
  await page.keyboard.press('Control+Enter')
  await expect(page.getByRole('button', { name: 'Saving…' })).toBeDisabled()
  await page.keyboard.press('Control+Enter')
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.evaluate(() => localStorage.setItem('devtrack-e2e-activity-options', '{}'))
  await expect(page.getByRole('dialog')).not.toBeVisible()
  await expect(page.getByText('Activity logged.', { exact: true })).toHaveCount(1)
  expect(await countStored(page)).toBe(5)
  await expect(page.getByRole('button', { name: 'Add activity', exact: true })).toBeFocused()
})

test('date shortcuts are route scoped, help is discoverable, and overlays suppress route commands', async ({
  page,
}) => {
  await seed(page)
  await page.goto('/app?date=2026-10-31')
  await expect(page.getByRole('button', { name: 'Add activity', exact: true })).toBeEnabled()
  await page.keyboard.press('Alt+ArrowRight')
  await expect(page).toHaveURL(/date=2026-11-01/)
  await page.keyboard.press('Alt+ArrowLeft')
  await expect(page).toHaveURL(/date=2026-10-31/)
  await page.keyboard.press('t')
  await expect(page).toHaveURL(/date=2026-10-12/)
  await page.keyboard.press('?')
  await expect(page.getByRole('dialog', { name: 'Keyboard shortcuts' })).toBeVisible()
  await page.keyboard.press('n')
  await page.keyboard.press('Alt+ArrowRight')
  await expect(page).toHaveURL(/date=2026-10-12/)
  await expect(page.getByRole('dialog')).toHaveCount(1)
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.goto('/app/settings')
  await expect(page.getByLabel('Default day start time')).toBeVisible()
  await page.locator('h1').click()
  await page.keyboard.press('n')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.goto('/app/calendar?date=2026-10-12')
  await add(page)
  await closeActivityDialog(page)
  await page.keyboard.press('Alt+ArrowRight')
  await expect(page).toHaveURL(/date=2026-10-13/)
})

test('all quick durations set exact ends, active state follows custom edits and midnight is disabled', async ({
  page,
}) => {
  await seed(page)
  await page.goto('/app?date=2026-10-14')
  await add(page)
  await page.getByLabel(/^Start time/).fill('10:00')
  for (const [label, end] of [
    ['+15m', '10:15'],
    ['+30m', '10:30'],
    ['+1h', '11:00'],
    ['+2h', '12:00'],
  ]) {
    const button = page.getByRole('button', { name: label, exact: true })
    await button.click()
    await expect(page.getByLabel(/^End time/)).toHaveValue(end)
    await expect(button).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByLabel(/^Start time/)).toHaveValue('10:00')
  }
  await page.getByLabel(/^End time/).fill('10:45')
  await expect(page.locator('.duration-actions [aria-pressed="true"]')).toHaveCount(0)
  await page.getByLabel(/^Start time/).fill('23:30')
  await expect(page.getByRole('button', { name: '+15m', exact: true })).toBeEnabled()
  for (const label of ['+30m', '+1h', '+2h'])
    await expect(page.getByRole('button', { name: label, exact: true })).toBeDisabled()
})

test('recent tasks deduplicate, filter while typing, select by keyboard, and Escape closes suggestions before dialog', async ({
  page,
}) => {
  await seed(page)
  await page.goto('/app?date=2026-10-14')
  await add(page)
  await expect(page.getByRole('option', { name: /TD-1 Fix API/ })).toHaveCount(1)
  await expect(page.getByRole('option', { name: /Disabled review/ })).toHaveCount(0)
  await nameInput(page).fill('TD-')
  await expect(page.getByRole('listbox', { name: 'Recent tasks' }).getByRole('option')).toHaveCount(
    1,
  )
  await page.keyboard.press('ArrowDown')
  await expect(nameInput(page)).toHaveAttribute('aria-activedescendant', /.+-0/)
  await page.keyboard.press('Enter')
  await expect(nameInput(page)).toHaveValue('TD-1 Fix API')
  await expect(page.getByLabel('Activity type')).toHaveValue('jira_task')
  await expect(page.getByLabel(/^Start time/)).toHaveValue('09:00')
  await expect(page.getByLabel(/^End time/)).toHaveValue('09:30')
  await nameInput(page).fill('')
  await expect(page.getByRole('listbox', { name: 'Recent tasks' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toBeVisible()
  await expect(page.getByRole('listbox')).toHaveCount(0)
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
})

test('duplicate and repeat use smart times, preserve duration/notes, reset status and write only on save', async ({
  page,
}) => {
  await seed(page)
  await page.goto('/app/calendar?date=2026-10-12')
  const more = page.getByRole('button', { name: 'More actions for TD-1 Fix API', exact: true })
  await more.click()
  await page.getByRole('menuitem', { name: 'Duplicate', exact: true }).click()
  await expect(page.getByRole('dialog', { name: 'Duplicate activity' })).toBeVisible()
  expect(await countStored(page)).toBe(4)
  await expect(page.getByLabel(/^Start time/)).toHaveValue('14:00')
  await expect(page.getByLabel(/^End time/)).toHaveValue('15:30')
  await expect(page.getByLabel('Task status')).toHaveValue('in_progress')
  await expect(page.getByLabel('Notes (optional)')).toHaveValue('Notes for original')
  await page.getByRole('button', { name: 'Save activity', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.getByText('Activity duplicated.', { exact: true })).toHaveCount(1)
  expect(await countStored(page)).toBe(5)
  await expect(page.locator('.day-summary')).toContainText('4h')
  await page.getByRole('button', { name: 'Repeat last', exact: true }).click()
  await expect(page.getByRole('dialog', { name: 'Repeat last activity' })).toBeVisible()
  await expect(page.getByLabel(/^Start time/)).toHaveValue('15:30')
  await expect(page.getByLabel(/^End time/)).toHaveValue('17:00')
  await page.keyboard.press('Meta+Enter')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.locator('.timeline-item')).toHaveCount(4)
  await expect(page.locator('.day-summary')).toContainText('5h 30m')
})

test('overflow menu keyboard/outside dismissal and delete confirmation preserve context and focus', async ({
  page,
}) => {
  await seed(page)
  await page.goto('/app?date=2026-10-12')
  const more = page.getByRole('button', { name: 'More actions for TD-1 Fix API', exact: true })
  await more.focus()
  await page.keyboard.press('ArrowDown')
  await expect(page.getByRole('menuitem', { name: 'Duplicate', exact: true })).toBeFocused()
  await page.keyboard.press('n')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.keyboard.press('Escape')
  await expect(more).toBeFocused()
  await more.click()
  await page.locator('h1').click()
  await expect(page.getByRole('menu')).toHaveCount(0)
  await more.click()
  await page.keyboard.press('End')
  await expect(page.getByRole('menuitem', { name: 'Delete', exact: true })).toBeFocused()
  await page.keyboard.press('Enter')
  const dialog = page.getByRole('dialog', { name: 'Delete activity?' })
  await expect(dialog).toContainText('TD-1 Fix API')
  await expect(dialog).toContainText('09:00–10:30')
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
  await expect(more).toBeFocused()
  expect(await countStored(page)).toBe(4)
})

test('search and status filter leave analytics unchanged, distinguish no matches, and reset on date change', async ({
  page,
}) => {
  await seed(page)
  await page.goto('/app?date=2026-10-12')
  await expect(page.locator('.day-summary')).toContainText('2h 30m')
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '28')
  const summary = await page.locator('.day-summary').textContent()
  await page.getByLabel('Search activities').fill('jira')
  await expect(page.locator('.timeline-item')).toHaveCount(1)
  await expect(page.locator('.filter-count')).toContainText('Showing 1 of 2')
  await expect(page.locator('.timeline-gap')).toHaveCount(0)
  await expect(page.locator('.day-summary')).toHaveText(summary!)
  await page.getByLabel('Filter status').selectOption('on_hold')
  await expect(page.getByText('No activities match your filters.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Log first activity' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Clear filters', exact: true }).click()
  await expect(page.locator('.timeline-item')).toHaveCount(2)
  await expect(page.locator('.timeline-gap')).toHaveCount(1)
  await page.getByLabel('Filter status').selectOption('completed')
  await expect(page.locator('.timeline-item')).toHaveCount(1)
  await page.getByRole('button', { name: 'Previous day', exact: true }).click()
  await expect(page.getByLabel('Filter status')).toHaveValue('all')
})

test('gap workflow retains exact times when using a recent task and quick entry still prevents overlap', async ({
  page,
}) => {
  await seed(page)
  await page.goto('/app?date=2026-10-12')
  await page.getByRole('button', { name: 'Log activity from 10:30 to 13:00' }).click()
  await expect(page.getByRole('dialog', { name: 'Log gap activity' })).toBeVisible()
  await expect(page.getByRole('option', { name: /TD-1 Fix API/ })).toBeVisible()
  await page.getByRole('option', { name: /TD-1 Fix API/ }).click()
  await expect(page.getByLabel(/^Start time/)).toHaveValue('10:30')
  await expect(page.getByLabel(/^End time/)).toHaveValue('13:00')
  await page.keyboard.press('Control+Enter')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.locator('.timeline-gap')).toHaveCount(0)
  await page.getByRole('button', { name: 'Repeat last', exact: true }).click()
  await page.getByLabel(/^Start time/).fill('13:30')
  await page.getByRole('button', { name: '+1h', exact: true }).click()
  await page.keyboard.press('Control+Enter')
  await expect(page.getByRole('alert')).toContainText('Build dashboard')
  await expect(page.getByRole('dialog')).toBeVisible()
  expect(await countStored(page)).toBe(5)
})

test('recent read failure is nonblocking, enabled types drive chips and duplicate fallback', async ({
  page,
}) => {
  await seed(page, { recentError: true })
  await page.goto('/app?date=2026-10-14')
  await add(page)
  await expect(
    page.getByText('Recent tasks unavailable. You can still log activity.'),
  ).toBeVisible()
  await expect(page.getByRole('group', { name: 'Quick types' }).getByRole('button')).toHaveCount(5)
  await page
    .getByRole('group', { name: 'Quick types' })
    .getByRole('button', { name: 'Break', exact: true })
    .click()
  await expect(page.getByLabel('Activity type')).toHaveValue('break')
  await nameInput(page).fill('Manual entry after recent failure')
  await page.keyboard.press('Control+Enter')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.goto('/app?date=2026-10-11')
  await page.getByRole('button', { name: 'More actions for Disabled review', exact: true }).click()
  await page.getByRole('menuitem', { name: 'Duplicate', exact: true }).click()
  await expect(page.getByLabel('Activity type')).toHaveValue('development')
  await expect(page.getByRole('dialog')).toContainText('original type is disabled')
  await expect(page.getByLabel('Activity type').locator('option[value="code_review"]')).toHaveCount(
    0,
  )
})

test('recents are isolated after logout/account change and late reads do not restore an old dialog', async ({
  page,
}) => {
  await seed(page, { recentDelay: 400 })
  await page.goto('/app?date=2026-10-14')
  await add(page)
  await closeActivityDialog(page)
  await page.getByRole('button', { name: 'Logout', exact: true }).click()
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
  await page.getByRole('button', { name: 'Continue with Google', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Add activity', exact: true })).toBeEnabled()
  await add(page)
  await expect(page.getByText('Loading recent tasks…')).toHaveCount(0)
  await expect(page.getByRole('listbox', { name: 'Recent tasks' })).toHaveCount(0)
  await expect(nameInput(page)).toHaveValue('')
})

for (const width of [390, 768, 1440]) {
  test(`quick form, recent tasks, sticky Save and overflow menu fit ${width}px`, async ({
    page,
  }) => {
    await seed(page)
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1024 })
    await page.goto('/app?date=2026-10-14')
    await add(page)
    await expect(page.getByRole('option', { name: /TD-1 Fix API/ })).toBeVisible()
    await page.getByRole('option', { name: /TD-1 Fix API/ }).click()
    await page.getByRole('button', { name: '+1h', exact: true }).click()
    await page.getByLabel('Notes (optional)').fill('Mobile and desktop quick entry context')
    await expect(page.getByLabel('Notes (optional)')).toBeInViewport()
    const save = page.getByRole('button', { name: 'Save activity', exact: true })
    await save.scrollIntoViewIfNeeded()
    await expect(save).toBeInViewport()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({ path: `artifacts/screenshots/phase7-form-${width}.png` })
    if (width === 390) {
      await page.setViewportSize({ width, height: 540 })
      await save.scrollIntoViewIfNeeded()
      await expect(save).toBeInViewport()
      await page.screenshot({ path: 'artifacts/screenshots/phase7-form-short-390.png' })
    }
    await save.click()
    await expect(page.getByRole('dialog')).toHaveCount(0)
    if (width === 390) await page.setViewportSize({ width, height: 844 })
    const more = page.getByRole('button', { name: 'More actions for TD-1 Fix API', exact: true })
    await more.click()
    await expect(page.getByRole('menuitem', { name: 'Duplicate', exact: true })).toBeInViewport()
    await page.screenshot({ path: `artifacts/screenshots/phase7-menu-${width}.png` })
    await page.keyboard.press('Escape')
    await expect(more).toBeFocused()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  })
}
