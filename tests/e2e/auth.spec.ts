import type { Page } from '@playwright/test'
import { test, expect } from '../support/test'

const user = {
  uid: 'test-developer',
  displayName: 'Test Developer',
  email: 'dev@example.invalid',
  photoURL: null,
}
async function seed(
  page: Page,
  session: typeof user | null,
  options: Record<string, unknown> = {},
) {
  await page.addInitScript(
    ({ session, options }) => {
      if (localStorage.getItem('devtrack-e2e-session') === null)
        localStorage.setItem('devtrack-e2e-session', JSON.stringify(session))
      if (localStorage.getItem('devtrack-e2e-options') === null)
        localStorage.setItem('devtrack-e2e-options', JSON.stringify(options))
    },
    { session, options },
  )
}

test('guests cannot open root or any protected route', async ({ page }) => {
  await seed(page, null)
  for (const path of ['/', '/app', '/app/calendar', '/app/settings']) {
    await page.goto(path)
    await expect(page).toHaveURL(/\/login/)
    await expect(page.getByRole('heading', { name: 'Welcome to your flow.' })).toBeVisible()
    await expect(page.locator('.sidebar')).toHaveCount(0)
  }
})

test('authenticated root and login redirect; a refreshed nested route stays accessible', async ({
  page,
}) => {
  await seed(page, user)
  for (const path of ['/', '/login']) {
    await page.goto(path)
    await expect(page).toHaveURL(/\/app$/)
  }
  await page.goto('/app/settings')
  await page.reload()
  await expect(page).toHaveURL(/\/app\/settings$/)
  await expect(page.getByRole('heading', { name: 'Settings', exact: true })).toBeVisible()
  await expect(page.locator('.profile')).toContainText('Test Developer')
  await expect(page.locator('.profile')).toContainText('dev@example.invalid')
})

test('session initialization holds both protected and guest content without flicker', async ({
  page,
}) => {
  await seed(page, user, { initializationDelay: 1200 })
  await page.goto('/login')
  await expect(page.getByRole('status')).toContainText('Restoring your session')
  await expect(page.getByRole('heading', { name: 'Welcome to your flow.' })).toHaveCount(0)
  await expect(page).toHaveURL(/\/app$/)
  await expect(page.getByRole('heading', { name: 'Today', exact: true })).toBeVisible()
})

test('sign-in stays on the button during profile sync and restores the intended route', async ({
  page,
}) => {
  await seed(page, null, { signInDelay: 400 })
  await page.goto('/app/calendar?date=2026-10-13')
  await expect(page).toHaveURL(/\/login\?returnTo=/)
  await page.getByRole('button', { name: 'Continue with Google' }).click()
  await expect(page.getByRole('button', { name: 'Signing in…' })).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Signing in…' })).toHaveAttribute(
    'aria-busy',
    'true',
  )
  await expect(page).toHaveURL(/\/app\/calendar\?date=2026-10-13$/)
  await expect(page.locator('.timeline-item')).toHaveCount(2)
  await page.reload()
  await expect(page).toHaveURL(/\/app\/calendar\?date=2026-10-13$/)
  await expect(page.getByRole('heading', { name: 'Calendar', exact: true })).toBeVisible()
})

test('unsafe return paths fall back to the dashboard', async ({ page }) => {
  await seed(page, null)
  await page.goto('/login?returnTo=https%3A%2F%2Fevil.example')
  await page.getByRole('button', { name: 'Continue with Google' }).click()
  await expect(page).toHaveURL(/\/app$/)
})

test('offline sign-in shows a friendly retryable message', async ({ page, context }) => {
  await seed(page, null)
  await page.goto('/login')
  await expect(page.getByRole('button', { name: 'Continue with Google' })).toBeEnabled()
  await context.setOffline(true)
  try {
    await page.getByRole('button', { name: 'Continue with Google' }).click()
    await expect(page.getByRole('alert')).toContainText("You're offline")
    await expect(page.getByRole('button', { name: 'Continue with Google' })).toBeEnabled()
  } finally {
    await context.setOffline(false)
  }
})

test('popup errors allow a clean retry and profile failure does not end authentication', async ({
  page,
}) => {
  await seed(page, null, { signInError: 'auth/popup-blocked' })
  await page.goto('/login')
  await page.getByRole('button', { name: 'Continue with Google' }).click()
  await expect(page.getByRole('alert')).toContainText('allow popups')
  await expect(page.getByRole('button', { name: 'Continue with Google' })).toBeEnabled()
  await page.evaluate(() =>
    localStorage.setItem('devtrack-e2e-options', JSON.stringify({ profileSyncFailed: true })),
  )
  await page.getByRole('button', { name: 'Continue with Google' }).click()
  await expect(page).toHaveURL(/\/app$/)
  await expect(
    page.getByText("Signed in successfully, but we couldn't sync your profile."),
  ).toBeVisible()
  await expect(page.locator('.profile')).toContainText('Test Developer')
})

test('initialization failures show safe setup feedback and support retry', async ({ page }) => {
  await seed(page, null, { initializationError: true })
  await page.goto('/app')
  await expect(page.getByRole('alert')).toContainText('Complete the Firebase setup')
  await expect(page.getByRole('button', { name: 'Continue with Google' })).toBeDisabled()
  await page.evaluate(() => localStorage.setItem('devtrack-e2e-options', '{}'))
  await page.getByRole('button', { name: 'Try again' }).click()
  await expect(page.getByRole('button', { name: 'Continue with Google' })).toBeEnabled()
})

test('logout failures retain the session; successful logout closes protected routes', async ({
  page,
}) => {
  await seed(page, user, { logoutError: true })
  await page.goto('/app/calendar')
  await page.getByRole('button', { name: 'Logout', exact: true }).click()
  await expect(page.getByText('Unable to sign out. Please try again.')).toBeVisible()
  await expect(page).toHaveURL(/\/app\/calendar$/)
  await page.evaluate(() => localStorage.setItem('devtrack-e2e-options', '{}'))
  await page.getByRole('button', { name: 'Logout', exact: true }).click()
  await expect(page).toHaveURL(/\/login/)
  await page.goto('/app')
  await expect(page).toHaveURL(/\/login/)
})

test('mobile profile menu exposes authenticated identity and keyboard logout', async ({ page }) => {
  await seed(page, user)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/app')
  await page.locator('summary[aria-label="Open account menu"]').click()
  await expect(page.locator('.account-menu-panel')).toContainText('Test Developer')
  await expect(page.locator('.account-menu-panel')).toContainText('dev@example.invalid')
  await page.screenshot({ path: 'artifacts/screenshots/auth-mobile-menu.png' })
  await page.locator('.account-menu-panel').getByRole('button', { name: 'Logout' }).focus()
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/\/login/)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: 'artifacts/screenshots/auth-login-mobile.png' })
})

test('avatar images fall back to initials when the image cannot be decoded', async ({ page }) => {
  const session = { ...user, photoURL: 'https://avatars.example.invalid/broken.png' }
  await page.route(session.photoURL, (route) =>
    route.fulfill({ status: 200, contentType: 'image/png', body: 'invalid image bytes' }),
  )
  await page.addInitScript(
    (session) => localStorage.setItem('devtrack-e2e-session', JSON.stringify(session)),
    session,
  )
  await page.goto('/app')
  const avatar = page.locator('.profile').getByRole('img', { name: 'Test Developer profile' })
  await expect(avatar).toHaveText('TD')
  await expect(avatar.locator('img')).toHaveCount(0)
})
