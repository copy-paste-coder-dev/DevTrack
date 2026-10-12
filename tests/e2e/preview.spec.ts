import { test, expect } from '@playwright/test'

test('activity preview validates fields, preserves sample data and restores focus', async ({
  page,
}) => {
  await page.goto('/app')
  const add = page.getByRole('button', { name: 'Add activity', exact: true })
  await add.click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await page.getByRole('button', { name: 'Save preview' }).click()
  await expect(page.getByText('Give your activity a name.')).toBeVisible()
  await page.getByLabel('Task / activity name').fill('Review UI preview')
  await page.getByLabel('End time', { exact: true }).fill('08:00')
  await page.getByRole('button', { name: 'Save preview' }).click()
  await expect(page.getByText('End time must be after start time.')).toBeVisible()
  await page.getByLabel('End time', { exact: true }).fill('10:00')
  await page.getByRole('button', { name: 'Save preview' }).click()
  await expect(dialog).not.toBeVisible()
  await expect(page.getByText('Activity preview validated')).toBeVisible()
  await expect(
    page.getByRole('list', { name: 'Daily activities' }).locator('.timeline-item'),
  ).toHaveCount(6)
  await expect(add).toBeFocused()
  await add.click()
  await page.keyboard.press('Escape')
  await expect(dialog).not.toBeVisible()
  await expect(add).toBeFocused()
})

test('editing and deleting are explicit previews with no data mutation', async ({ page }) => {
  await page.goto('/app')
  await page.getByRole('button', { name: 'Edit Development', exact: true }).click()
  await expect(page.getByLabel('Task / activity name')).toHaveValue('Build the dashboard interface')
  await expect(page.getByLabel('Start time', { exact: true })).toHaveValue('11:00')
  await page.screenshot({ path: 'artifacts/screenshots/edit-dialog-desktop.png' })
  await page.getByRole('button', { name: 'Update preview' }).click()
  await page.getByRole('button', { name: 'Delete Development', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Delete activity?' })).toBeVisible()
  await page.getByRole('button', { name: 'Confirm delete preview' }).click()
  await expect(page.getByText('Delete preview complete')).toBeVisible()
  await expect(page.getByText('Build the dashboard interface', { exact: true })).toBeVisible()
})

test('calendar selects empty days, supports keyboard movement and resets its visible month', async ({
  page,
}) => {
  await page.goto('/app/calendar')
  await page.getByRole('button', { name: 'Wednesday, October 14, 2026', exact: true }).click()
  await expect(page.getByText('A fresh page for your day')).toBeVisible()
  await expect(page).toHaveURL(/date=2026-10-14/)
  const day = page.getByRole('button', { name: 'Wednesday, October 14, 2026', exact: true })
  await day.focus()
  await page.keyboard.press('ArrowLeft')
  await expect(
    page.getByRole('button', { name: 'Tuesday, October 13, 2026, sample activities' }),
  ).toBeFocused()
  await expect(
    page.getByRole('list', { name: 'Daily activities' }).locator('.timeline-item'),
  ).toHaveCount(6)
  await page.getByRole('button', { name: 'Today', exact: true }).click()
  await page.getByRole('button', { name: 'Next month', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'November 2026' })).toBeVisible()
  await page.getByRole('button', { name: 'Today', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'October 2026' })).toBeVisible()
  await page.goto('/app?date=invalid')
  await expect(page.getByRole('heading', { name: 'Today', exact: true })).toBeVisible()
})

test('settings controls, custom categories and reset work without persistence', async ({
  page,
}) => {
  await page.goto('/app/settings')
  const toggle = page.getByRole('switch', { name: 'Enable Jira Task', exact: true })
  await expect(toggle).toBeChecked()
  await toggle.click()
  await expect(toggle).not.toBeChecked()
  await page.getByRole('button', { name: 'Add custom type' }).click()
  await page.getByLabel('Custom activity type').fill('Architecture')
  await page.getByRole('button', { name: 'Add', exact: true }).click()
  await expect(page.getByRole('switch', { name: 'Enable Architecture' })).toBeChecked()
  await page.getByRole('button', { name: 'Preview changes' }).click()
  await expect(page.getByText('Preferences previewed')).toBeVisible()
  await page.getByRole('button', { name: 'Reset preview' }).click()
  await expect(toggle).toBeChecked()
  await expect(page.getByRole('switch', { name: 'Enable Architecture' })).toHaveCount(0)
})

test('login controls disclose preview status and offer workspace access', async ({ page }) => {
  await page.goto('/login')
  await page.getByRole('button', { name: 'Continue with Google' }).click()
  await expect(page.getByText('Sign-in arrives in Phase 2')).toBeVisible()
  await page.getByRole('link', { name: 'Explore sample workspace' }).click()
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
  for (let i = 0; i < 15; i++) {
    await page.keyboard.press('Tab')
    expect(await page.evaluate(() => Boolean(document.activeElement?.closest('dialog')))).toBe(true)
  }
  await page.screenshot({ path: 'artifacts/screenshots/add-dialog-mobile.png' })
  await page.keyboard.press('Escape')
  await expect(dialog).not.toBeVisible()
})
