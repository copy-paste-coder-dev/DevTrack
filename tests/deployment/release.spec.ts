import { test, expect } from '@playwright/test'
import { readFile, readdir } from 'node:fs/promises'
import { createHash, randomUUID } from 'node:crypto'
import AxeBuilder from '@axe-core/playwright'

test('live Firestore denies unauthenticated profile, settings and activity access', async ({
  request,
}) => {
  const root =
    'https://firestore.googleapis.com/v1/projects/dev-track-46323/databases/(default)/documents'
  const uid = `phase8-denied-guest-${randomUUID()}`
  const parent = `${root}/users/${uid}`
  const activity = `${parent}/activities/probe`
  const fields = {
    dateKey: { stringValue: '2026-10-14' },
    activityType: { stringValue: 'development' },
    taskName: { stringValue: 'Disposable denied-access release probe' },
    status: { stringValue: 'in_progress' },
    startAt: { timestampValue: '2026-10-14T09:00:00Z' },
    endAt: { timestampValue: '2026-10-14T10:00:00Z' },
    durationMinutes: { integerValue: '60' },
    notes: { stringValue: '' },
  }
  const operations = [
    { method: 'GET', url: parent },
    { method: 'GET', url: `${root}/users` },
    { method: 'GET', url: `${parent}/settings/preferences` },
    { method: 'GET', url: `${parent}/settings` },
    { method: 'GET', url: activity },
    { method: 'GET', url: `${parent}/activities` },
    {
      method: 'POST',
      url: `${root}:commit`,
      data: {
        writes: [
          {
            update: { name: activity.replace('https://firestore.googleapis.com/v1/', ''), fields },
            currentDocument: { exists: false },
            updateTransforms: [
              { fieldPath: 'createdAt', setToServerValue: 'REQUEST_TIME' },
              { fieldPath: 'updatedAt', setToServerValue: 'REQUEST_TIME' },
            ],
          },
        ],
      },
    },
    {
      method: 'PATCH',
      url: `${activity}?updateMask.fieldPaths=status`,
      data: { fields: { status: { stringValue: 'completed' } } },
    },
    { method: 'DELETE', url: activity },
    { method: 'GET', url: `${root}/unlisted/probe` },
  ]
  // Every attempted mutation uses a unique disposable probe path; successful guest access fails the release check.
  for (const operation of operations) {
    const response = await request.fetch(operation.url, operation)
    expect(response.status(), `${operation.method} ${operation.url}`).toBe(403)
    const result = await response.json()
    expect(result.error?.status).toBe('PERMISSION_DENIED')
    expect(result.error?.message).toMatch(/Missing or insufficient permissions/i)
  }
})

test('public Hosting serves the exact release assets with correct security/cache headers', async ({
  request,
}) => {
  const localIndex = await readFile('dist/index.html', 'utf8')
  for (const route of ['/', '/login', '/app', '/app/calendar', '/app/settings']) {
    const response = await request.get(route)
    expect(response.status()).toBe(200)
    expect(await response.text()).toBe(localIndex)
    const headers = response.headers()
    expect(headers['x-content-type-options']).toBe('nosniff')
    expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin')
    expect(headers['permissions-policy']).toBe('camera=(), microphone=(), geolocation=()')
    expect(headers['cache-control']).toBe('no-cache')
  }
  for (const asset of (await readdir('dist/assets')).filter((name) => /\.(js|css)$/.test(name))) {
    const response = await request.get(`/assets/${asset}`)
    expect(response.status(), asset).toBe(200)
    expect(response.headers()['cache-control']).toBe('public, max-age=31536000, immutable')
    const sha256 = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex')
    expect(sha256(await response.body()), asset).toBe(
      sha256(await readFile(`dist/assets/${asset}`)),
    )
  }
  expect((await request.get('/favicon.svg')).status()).toBe(200)
  // Public Hosting rewrites this unknown path to the SPA; no environment file is uploaded.
  const hidden = await request.get('/.env')
  expect(hidden.status()).toBe(200)
  expect(await hidden.text()).toBe(localIndex)
  expect(hidden.headers()['cache-control']).toBe('no-cache')
})

for (const width of [390, 1440]) {
  test(`deployed SPA reloads and guest route protection work at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text())
    })
    page.on('response', (response) => {
      if (response.url().startsWith('https://dev-track-46323.web.app/') && response.status() >= 400)
        errors.push(`${response.status()} ${response.url()}`)
    })
    for (const route of ['/', '/login', '/app', '/app/calendar', '/app/settings']) {
      expect((await page.goto(route))?.status()).toBe(200)
      await expect(page).toHaveURL(/\/login(?:\?|$)/)
      await expect(page.getByRole('button', { name: 'Continue with Google' })).toBeVisible()
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      )
      expect((await page.reload())?.status()).toBe(200)
      await expect(page.getByRole('button', { name: 'Continue with Google' })).toBeVisible()
      await expect(page.locator('.dashboard-page')).toHaveCount(0)
    }
    expect(
      (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
        .violations,
    ).toEqual([])
    await page.goto('/not-a-route')
    await expect(page.getByRole('heading', { name: 'Page not found', exact: true })).toBeVisible()
    await page.screenshot({
      path: `artifacts/screenshots/deployed-not-found-${width}.png`,
      fullPage: true,
    })
    expect(errors).toEqual([])
  })
}
