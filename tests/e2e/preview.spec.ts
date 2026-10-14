import { test, expect, closeActivityDialog } from '../support/test'

let browserIssues: string[] = []
test.beforeEach(async ({ page }) => {
  browserIssues = []
  page.on('pageerror', (error) => browserIssues.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'error' || message.type() === 'warning')
      browserIssues.push(message.text())
  })
  page.on('request', (request) => {
    if (/^https?:/.test(request.url()) && new URL(request.url()).hostname !== '127.0.0.1')
      browserIssues.push(`Unexpected network request: ${request.url()}`)
  })
})
test.afterEach(() => {
  expect(browserIssues).toEqual([])
})

test('activity form validates fields, saves and restores focus', async ({ page }) => {
  await page.goto('/app')
  const add = page.getByRole('button', { name: 'Add activity', exact: true })
  await add.click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await page.getByRole('button', { name: 'Save activity' }).click()
  await expect(page.getByText('Give your activity a name.')).toBeVisible()
  await page.getByLabel('Task / activity name').fill('Review UI preview')
  await page.getByLabel(/^End time/).fill('')
  await page.getByRole('button', { name: 'Save activity' }).click()
  await expect(page.getByText('Choose an end time.')).toBeVisible()
  await page.getByLabel(/^End time/).fill('16:00')
  await page.getByRole('button', { name: 'Save activity' }).click()
  await expect(dialog).not.toBeVisible()
  await expect(page.getByText('Activity logged.')).toBeVisible()
  await expect(
    page.getByRole('list', { name: 'Daily activities' }).locator('.timeline-item'),
  ).toHaveCount(7)
  await expect(add).toBeFocused()
  await add.click()
  await closeActivityDialog(page)
  await expect(dialog).not.toBeVisible()
  await expect(add).toBeFocused()
})

test('editing and deleting update activity data and retain dialog focus', async ({ page }) => {
  await page.goto('/app')
  await page.getByRole('button', { name: 'Edit Development', exact: true }).click()
  await expect(page.getByLabel('Task / activity name')).toHaveValue('Build the dashboard interface')
  await expect(page.getByLabel(/^Start time/)).toHaveValue('11:00')
  await page.screenshot({ path: 'artifacts/screenshots/edit-dialog-desktop.png' })
  await page.getByRole('button', { name: 'Update activity' }).click()
  await page
    .getByRole('button', { name: 'More actions for Build the dashboard interface', exact: true })
    .click()
  await page.getByRole('menuitem', { name: 'Delete', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Delete activity?' })).toBeVisible()
  await page.getByRole('button', { name: 'Delete', exact: true }).click()
  await expect(page.getByText('Activity deleted.')).toBeVisible()
  await expect(page.getByText('Build the dashboard interface', { exact: true })).toHaveCount(0)
  const edit = page.getByRole('button', { name: 'Edit Jira Task', exact: true })
  await edit.click()
  await page.getByRole('button', { name: 'Delete', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Delete activity?' })).toBeVisible()
  await page.getByRole('button', { name: 'Cancel', exact: true }).click()
  await expect(page.getByRole('dialog')).not.toBeVisible()
  await expect(edit).toBeFocused()
})

test('calendar selects empty days, supports keyboard movement and resets its visible month', async ({
  page,
}) => {
  await page.goto('/app/calendar')
  await page.getByRole('button', { name: 'Wednesday, October 14, 2026', exact: true }).click()
  await expect(page.getByText('No activities planned/logged for this day.')).toBeVisible()
  await expect(page).toHaveURL(/date=2026-10-14/)
  const day = page.getByRole('button', { name: 'Wednesday, October 14, 2026', exact: true })
  await day.focus()
  await page.keyboard.press('ArrowLeft')
  await expect(
    page.getByRole('button', { name: 'Tuesday, October 13, 2026, activities' }),
  ).toBeFocused()
  await expect(
    page.getByRole('list', { name: 'Daily activities' }).locator('.timeline-item'),
  ).toHaveCount(2)
  await page.getByRole('button', { name: 'Today', exact: true }).click()
  await page.getByRole('button', { name: 'Next month', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'November 2026' })).toBeVisible()
  await page.getByRole('button', { name: 'Today', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'October 2026' })).toBeVisible()
  await page.goto('/app?date=invalid')
  await expect(page.getByRole('heading', { name: 'Today', exact: true })).toBeVisible()
})

test('settings controls save persistently and custom categories remain deferred', async ({
  page,
}) => {
  await page.goto('/app/settings')
  const toggle = page.getByRole('switch', { name: 'Enable Jira Task', exact: true })
  await expect(toggle).toBeChecked()
  await toggle.click()
  await expect(toggle).not.toBeChecked()
  await expect(page.getByRole('button', { name: 'Custom types · Coming later' })).toBeDisabled()
  await page.getByRole('button', { name: 'Save changes' }).click()
  await expect(page.getByText('Settings saved.')).toBeVisible()
  await page.reload()
  await expect(toggle).not.toBeChecked()
  await page.getByRole('button', { name: 'Reset to defaults' }).click()
  await expect(toggle).toBeChecked()
})

test('login disables future providers and signs in through the auth abstraction', async ({
  page,
}) => {
  await page.addInitScript(() => localStorage.setItem('devtrack-e2e-session', 'null'))
  await page.goto('/login')
  await expect(page.getByRole('button', { name: /Continue with GitHub/ })).toBeDisabled()
  await expect(page.getByRole('button', { name: /Continue with email/ })).toBeDisabled()
  await page.getByRole('button', { name: 'Continue with Google' }).click()
  await expect(page).toHaveURL(/\/app$/)
})

test('mobile dialog stays in viewport and traps keyboard focus', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/app')
  await page.getByRole('button', { name: 'Add activity', exact: true }).click()
  const dialog = page.getByRole('dialog')
  const box = await dialog.boundingBox()
  expect(box).not.toBeNull()
  expect(box!.x).toBeGreaterThanOrEqual(0)
  expect(box!.x + box!.width).toBeLessThanOrEqual(390)
  expect(box!.height).toBeLessThanOrEqual(844)
  for (let i = 0; i < 36; i++) {
    await page.keyboard.press('Tab')
    expect(await page.evaluate(() => Boolean(document.activeElement?.closest('dialog')))).toBe(true)
  }
  await page.screenshot({ path: 'artifacts/screenshots/add-dialog-mobile.png' })
  await page.getByRole('button', { name: 'Close dialog', exact: true }).focus()
  await page.keyboard.press('Shift+Tab')
  await expect(page.getByRole('button', { name: 'Save activity', exact: true })).toBeFocused()
  await closeActivityDialog(page)
  await expect(dialog).not.toBeVisible()
})

test('busy, light, empty and long-task fixtures keep timeline and summaries consistent', async ({
  page,
}) => {
  await page.goto('/app')
  await expect(page.locator('.timeline-item')).toHaveCount(6)
  await expect(page.locator('.stat-card').first()).toContainText('6h 30m')
  await page.goto('/app?date=2026-10-13')
  await expect(page.locator('.timeline-item')).toHaveCount(2)
  await expect(page.locator('.stat-card').first()).toContainText('1h 30m')
  await expect(page.locator('.day-summary')).toContainText('1h 30m')
  await page.goto('/app?date=2026-10-14')
  await expect(page.getByText('No activities planned/logged for this day.')).toBeVisible()
  await page.getByRole('button', { name: 'Log first activity' }).click()
  await expect(page.getByLabel(/^Date/)).toHaveValue('2026-10-14')
  await expect(page.getByText('Suggested from your configured day start.')).toBeVisible()
  await closeActivityDialog(page)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/app?date=2026-10-09')
  await expect(page.locator('.timeline-item')).toHaveCount(1)
  await expect(page.locator('.duration-chip')).toHaveText('8h')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: 'artifacts/screenshots/long-task-mobile.png', fullPage: true })
  await page.getByRole('button', { name: 'Edit Development', exact: true }).click()
  await page.getByRole('button', { name: 'Update activity' }).click()
  await expect(page.getByRole('dialog')).not.toBeVisible()
})

test('loading skeletons and retryable error states render on every data screen', async ({
  page,
}) => {
  test.setTimeout(60000)
  for (const route of ['/app', '/app/calendar', '/app/settings']) {
    const name = route.split('/').at(-1)
    if (route === '/app/settings')
      await page.evaluate(() =>
        localStorage.setItem('devtrack-e2e-preferences-options', JSON.stringify({ loading: true })),
      )
    await page.goto(route + '?preview=loading')
    await expect(
      page.getByRole('status', { name: /^Loading (activity data|calendar data|settings)$/ }),
    ).toBeVisible()
    await expect(page.locator('.skeleton').first()).toBeVisible()
    await page.screenshot({ path: `artifacts/screenshots/${name}-loading.png`, fullPage: true })
    if (route === '/app/settings')
      await page.evaluate(() =>
        localStorage.setItem(
          'devtrack-e2e-preferences-options',
          JSON.stringify({ readError: 'unavailable' }),
        ),
      )
    else
      await page.evaluate(() =>
        localStorage.setItem(
          'devtrack-e2e-activity-options',
          JSON.stringify({ readError: 'unavailable' }),
        ),
      )
    await page.goto(route + '?preview=error')
    await expect(page.getByRole('alert')).toBeVisible()
    await page.screenshot({ path: `artifacts/screenshots/${name}-error.png`, fullPage: true })
    if (route === '/app/settings')
      await page.evaluate(() => localStorage.removeItem('devtrack-e2e-preferences-options'))
    else await page.evaluate(() => localStorage.removeItem('devtrack-e2e-activity-options'))
    await page.getByRole('button', { name: 'Try again' }).click()
    await expect(page.getByRole('alert')).not.toBeVisible()
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  }
})

test('calendar tabs support selection, arrow keys and return to month', async ({ page }) => {
  await page.goto('/app/calendar')
  await expect(page.getByRole('tab', { name: 'Week · Coming soon' })).toBeDisabled()
  await page.getByRole('tab', { name: 'Month', exact: true }).focus()
  await page.keyboard.press('ArrowRight')
  await expect(page.getByRole('tab', { name: 'Day', exact: true })).toBeFocused()
  await expect(page.getByRole('list', { name: 'Daily activities' })).toBeVisible()
  await expect(page.locator('.month-calendar')).toHaveCount(0)
  await page.keyboard.press('ArrowLeft')
  await expect(page.getByRole('heading', { name: 'October 2026' })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('heading', { name: 'October 2026' })).toBeVisible()
})

test('all-disabled types cannot be saved and reset restores canonical preferences', async ({
  page,
}) => {
  await page.goto('/app/settings')
  await page.getByLabel('Time display format').selectOption('12h')
  await expect(page.getByLabel('Time display format')).toHaveValue('12h')
  for (const toggle of await page.getByRole('switch').all()) await toggle.click()
  await expect(page.getByText('Select at least one activity type.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Save changes' })).toBeDisabled()
  await page.getByRole('button', { name: 'Reset to defaults' }).click()
  await expect(page.getByText('Select at least one activity type.')).not.toBeVisible()
  await expect(page.getByLabel('Time display format')).toHaveValue('24h')
  await page.getByRole('button', { name: 'Logout', exact: true }).click()
  await expect(page).toHaveURL(/\/login/)
  await expect(page.getByText('Signed out successfully')).toBeVisible()
})
