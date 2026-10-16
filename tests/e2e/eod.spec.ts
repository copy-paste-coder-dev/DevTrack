import AxeBuilder from '@axe-core/playwright'
import type { Page } from '@playwright/test'
import { test, expect } from '../support/test'

async function seed(page: Page) {
  await page.addInitScript(() => {
    const dateKey = '2026-10-12'
    const blocks = [
      ['09:00', '10:00', 'jira_task', 'TD-10310 - Fix API', 'in_progress'],
      ['11:30', '12:15', 'jira_task', ' td-10310 -  fix api ', 'on_hold'],
      ['15:00', '16:30', 'jira_task', 'TD-10310 - Fix API', 'completed'],
      ['10:00', '10:30', 'scrum_call', 'Daily sync', 'completed'],
      ['13:00', '14:00', 'development', 'Dashboard responsive fixes', 'in_progress'],
    ]
    const rows = blocks.map(([start, end, activityType, taskName, status], index) => ({
      id: `eod-${index}`,
      dateKey,
      startAt: `${dateKey}T${start}:00+05:30`,
      endAt: `${dateKey}T${end}:00+05:30`,
      durationMinutes:
        (Date.parse(`${dateKey}T${end}:00+05:30`) - Date.parse(`${dateKey}T${start}:00+05:30`)) /
        60000,
      activityType,
      taskName,
      status,
      notes: index === 0 ? 'Session note\nwith another line' : '',
      createdAt: null,
      updatedAt: null,
    }))
    if (!localStorage.getItem('devtrack-e2e-activities'))
      localStorage.setItem('devtrack-e2e-activities', JSON.stringify({ 'test-developer': rows }))
    localStorage.setItem(
      'devtrack-e2e-preferences',
      JSON.stringify({
        'test-developer': {
          dayStartTime: '09:00',
          dayEndTime: '17:00',
          timeFormat: '24h',
          enabledActivityTypes: ['development'],
        },
      }),
    )
  })
}
test('grouped visual summary, text exports, clipboard, provider switch and failure fallback work together', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text())
  })
  await seed(page)
  await page.goto('/app/eod?date=2026-10-12')
  await expect(page.locator('.eod-stats')).toContainText('4h 45m')
  await expect(page.locator('.eod-stats')).toContainText('Unique Work Items3')
  await expect(page.locator('.eod-task')).toHaveCount(3)
  const jira = page
    .locator('.eod-task')
    .filter({ has: page.getByRole('heading', { name: 'TD-10310 - Fix API', exact: true }) })
  await expect(jira).toContainText('Total Duration: 3h 15m')
  await expect(jira.locator('.eod-session-row')).toHaveCount(3)
  await expect(jira.locator('.eod-task-header')).toContainText('Completed')
  await expect(jira).toContainText('On hold')
  await expect(page.locator('.eod-gaps li')).toHaveCount(3)
  expect(await page.evaluate(() => sessionStorage.getItem('devtrack-e2e-listeners'))).toBe('1')
  await page.getByRole('tab', { name: 'Compact Text', exact: true }).click()
  const compact = await page
    .getByRole('textbox', { name: 'Compact Text', exact: true })
    .inputValue()
  expect(compact.match(/TD-10310/g)).toHaveLength(1)
  await page.getByRole('button', { name: 'Copy for Teams / Slack' }).click()
  await expect(page.getByText('EOD summary copied.', { exact: true })).toBeVisible()
  expect((await page.evaluate(() => navigator.clipboard.readText())).replace(/\r\n/g, '\n')).toBe(
    compact,
  )
  // Exercise the legacy selection fallback when the modern API rejects a write.
  await page.evaluate(() =>
    Object.defineProperty(navigator.clipboard, 'writeText', {
      configurable: true,
      value: () => Promise.reject(new Error('Denied')),
    }),
  )
  await page.getByRole('tab', { name: 'Detailed Text', exact: true }).click()
  await expect(page.getByRole('textbox', { name: 'Detailed Text', exact: true })).toHaveValue(
    /09:00–10:00 — 1h · In Progress/,
  )
  await page.getByRole('button', { name: 'Copy for Teams / Slack' }).click()
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain('11:30–12:15 — 45m')
  await page.getByRole('tab', { name: 'AI Enhanced', exact: true }).click()
  await page.getByLabel('AI Provider').selectOption('gemini')
  await page.getByRole('button', { name: 'Generate Better Summary' }).click()
  await expect(page.getByLabel('AI-enhanced summary', { exact: true })).toHaveValue(
    /TD-10310 - Fix API — 3h 15m/,
  )
  const sent = await page.evaluate(() =>
    JSON.parse(sessionStorage.getItem('devtrack-e2e-ai-input')!),
  )
  expect(sent.provider).toBe('gemini')
  expect(sent.input.tasks).toHaveLength(3)
  expect(JSON.stringify(sent)).not.toContain('Session note')
  await page.getByRole('button', { name: 'Copy Summary', exact: true }).click()
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain('3h 15m')
  await page.evaluate(() => localStorage.setItem('devtrack-e2e-ai', 'failure'))
  await page.getByRole('button', { name: 'Regenerate', exact: true }).click()
  await expect(
    page.getByText('AI enhancement is unavailable. Your standard EOD summary is still ready.'),
  ).toBeVisible()
  await expect(page.getByLabel('Standard EOD summary', { exact: true })).toHaveValue(compact)
  await page.getByRole('tab', { name: 'Visual', exact: true }).click()
  await expect(page.locator('.eod-task')).toHaveCount(3)
  expect(errors).toEqual([])
})

test('dates, empty/future/planned, unavailable AI, read error/loading and protected access', async ({
  page,
}) => {
  await seed(page)
  await page.goto('/app/eod?date=2026-10-11')
  await expect(
    page.getByText('No activities were logged for this day.', { exact: true }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Next day', exact: true }).click()
  await expect(page.getByText('Workday in progress', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Next day', exact: true }).click()
  await expect(page.getByText('No EOD summary is available for future dates.')).toBeVisible()
  await page.getByRole('button', { name: 'Today', exact: true }).click()
  await page.clock.setFixedTime(new Date('2026-10-11T06:00:00Z'))
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Planned Activities', exact: true })).toBeVisible()
  await expect(page.getByRole('tab', { name: 'Compact Text', exact: true })).toHaveCount(0)
  await page.clock.setFixedTime(new Date('2026-10-12T06:00:00Z'))
  await page.reload()
  await page.evaluate(() => localStorage.setItem('devtrack-e2e-ai', 'unavailable'))
  await page.getByRole('tab', { name: 'AI Enhanced', exact: true }).click()
  await expect(
    page.getByText('AI enhancement is unavailable. Your standard EOD summary is still ready.'),
  ).toBeVisible()
  await page.goto('/app/eod?date=2026-10-12&preview=loading')
  await expect(page.getByRole('status', { name: 'Loading EOD summary' })).toBeVisible()
  await page.evaluate(() =>
    localStorage.setItem(
      'devtrack-e2e-activity-options',
      JSON.stringify({ readError: 'permission-denied' }),
    ),
  )
  await page.goto('/app/eod?date=2026-10-12')
  await expect(page.getByText('Unable to load EOD summary.', { exact: true })).toBeVisible()
  await page.evaluate(() => localStorage.removeItem('devtrack-e2e-activity-options'))
  await page.getByRole('button', { name: 'Try again', exact: true }).click()
  await expect(page.locator('.eod-task')).toHaveCount(3)
  await page.evaluate(() => localStorage.setItem('devtrack-e2e-session', 'null'))
  await page.goto('/app/eod')
  await expect(page).toHaveURL(/\/login/)
})

test('logging repeated Jira work, scrum and development through the form produces the accepted EOD', async ({
  page,
}) => {
  test.setTimeout(90000)
  await page.addInitScript(() => {
    if (!localStorage.getItem('devtrack-e2e-activities'))
      localStorage.setItem('devtrack-e2e-activities', JSON.stringify({ 'test-developer': [] }))
  })
  await page.goto('/app?date=2026-10-12')
  const rows = [
    ['09:00', '10:00', 'jira_task', 'TD-10310', 'in_progress'],
    ['11:30', '12:15', 'jira_task', 'TD-10310', 'in_progress'],
    ['15:00', '16:30', 'jira_task', 'TD-10310', 'completed'],
    ['10:00', '10:30', 'scrum_call', 'Daily Scrum', 'completed'],
    ['13:00', '14:00', 'development', 'Dashboard responsive fixes', 'in_progress'],
  ]
  for (const [start, end, type, name, status] of rows) {
    await page.getByRole('button', { name: 'Add activity', exact: true }).click()
    await page.getByLabel('Task / activity name').fill(name!)
    await page.getByLabel(/^Activity type/).selectOption(type!)
    await page.getByLabel(/^Task status/).selectOption(status!)
    await page.getByLabel(/^Start time/).fill(start!)
    await page.getByLabel(/^End time/).fill(end!)
    await page.getByRole('button', { name: 'Save activity', exact: true }).click()
    await expect(page.getByRole('dialog')).not.toBeVisible()
  }
  await page.getByRole('link', { name: 'EOD Summary', exact: true }).click()
  await expect(page.locator('.eod-task')).toHaveCount(3)
  await expect(page.locator('.eod-stats')).toContainText('Sessions5')
  const jira = page
    .locator('.eod-task')
    .filter({ has: page.getByRole('heading', { name: 'TD-10310', exact: true }) })
  await expect(jira).toContainText('3h 15m')
  await expect(jira.locator('.eod-session-row')).toHaveCount(3)
  await expect(jira.locator('.eod-task-header')).toContainText('Completed')
})

test('live preferences update all times; keyboard tabs and empty export remain usable', async ({
  page,
}) => {
  await seed(page)
  await page.goto('/app/eod?date=2026-10-12')
  await expect(page.locator('.eod-task')).toHaveCount(3)
  await page.evaluate(async () => {
    const { settingsService } = await import(
      '/tests/support/settings.service.ts' /* @vite-ignore */
    )
    const prefs = await settingsService.getUserPreferences('test-developer')
    await settingsService.updateUserPreferences('test-developer', { ...prefs!, timeFormat: '12h' })
  })
  await expect(page.locator('.eod-workday')).toContainText('9:00 AM')
  await expect(page.locator('.eod-session-row').first()).toContainText('9:00 AM–10:00 AM')
  const visual = page.getByRole('tab', { name: 'Visual', exact: true })
  await visual.focus()
  await page.keyboard.press('ArrowRight')
  await expect(page.getByRole('tab', { name: 'Compact Text', exact: true })).toBeFocused()
  await page.keyboard.press('ArrowRight')
  await expect(page.getByRole('textbox', { name: 'Detailed Text', exact: true })).toHaveValue(
    /9:00 AM–10:00 AM/,
  )
  await page.keyboard.press('Home')
  await expect(visual).toBeFocused()
  await page.getByLabel('Selected date', { exact: true }).fill('2026-10-11')
  await page.getByRole('tab', { name: 'Compact Text', exact: true }).click()
  await expect(page.getByRole('textbox', { name: 'Compact Text', exact: true })).toHaveValue(
    /No activities were logged for this day\.$/,
  )
})

test('long historical task names and notes wrap on mobile and session details support the keyboard', async ({
  page,
}) => {
  await seed(page)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/app/eod?date=2026-10-12')
  await expect(page.locator('.eod-task')).toHaveCount(3)
  const name = `TD-99999 — ${'LongTechnicalTaskNameWithNoSpaces'.repeat(6)}`.slice(0, 160)
  await page.evaluate(async (taskName) => {
    const { activityService } = await import(
      '/tests/support/activity.service.ts' /* @vite-ignore */
    )
    await activityService.createActivity('test-developer', {
      dateKey: '2026-10-12',
      activityType: 'break',
      taskName,
      status: 'on_hold',
      startAt: new Date('2026-10-12T07:00:00+05:30'),
      endAt: new Date('2026-10-12T08:00:00+05:30'),
      notes: 'Long notes with technical context. '.repeat(40).slice(0, 1000),
    })
  }, name)
  const group = page
    .locator('.eod-task')
    .filter({ has: page.getByRole('heading', { name, exact: true }) })
  await expect(group).toContainText('Break')
  await expect(group).toContainText('On hold')
  await expect(group.locator('.eod-notes-preview')).toBeVisible()
  await group.getByRole('button', { name: 'Show full notes', exact: true }).click()
  await expect(group.getByRole('button', { name: 'Show less notes', exact: true })).toHaveAttribute(
    'aria-expanded',
    'true',
  )
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await group.locator('summary').focus()
  await page.keyboard.press('Enter')
  await expect(group.locator('details')).not.toHaveAttribute('open', '')
})

for (const viewport of [
  { width: 390, height: 844 },
  { width: 430, height: 932 },
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
]) {
  test(`EOD visual, text and AI fit ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await seed(page)
    await page.setViewportSize(viewport)
    await page.goto('/app/eod?date=2026-10-12')
    await expect(page.locator('.eod-task')).toHaveCount(3, { timeout: 15000 })
    for (const name of ['Visual', 'Compact Text', 'Detailed Text', 'AI Enhanced']) {
      await page.getByRole('tab', { name, exact: true }).click()
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      )
      if (name === 'AI Enhanced') await expect(page.getByLabel('AI Provider')).toBeVisible()
      if (viewport.width === 390 || viewport.width === 1440) {
        const result = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
          .analyze()
        expect(
          result.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) })),
        ).toEqual([])
      }
    }
    await page.getByRole('tab', { name: 'Visual', exact: true }).click()
    await page.screenshot({
      path: `artifacts/screenshots/eod-${viewport.width}.png`,
      fullPage: true,
    })
  })
}
