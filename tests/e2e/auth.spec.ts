import { test, expect } from '@playwright/test'

test('login grants access to the authenticated dashboard shell', async ({ page }) => {
  await page.goto('/login')

  await expect(page.getByRole('heading', { name: /mission control/i })).toBeVisible()
  await page.getByPlaceholder('Username').fill('e2e-admin')
  await page.getByPlaceholder('••••••••').fill('e2e-pass')
  await page.getByRole('button', { name: /verify access/i }).click()

  await expect(page).toHaveURL(/\/$/, { timeout: 15_000 })
  await page.waitForLoadState('domcontentloaded')
  await expect(page.getByRole('heading', { name: /system initialization/i })).toBeVisible()
})
