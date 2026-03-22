import type { Page } from '@playwright/test'
import { expect } from '@playwright/test'

export async function login(page: Page) {
  await page.goto('/login')
  await page.getByPlaceholder('Username').fill('e2e-admin')
  await page.getByPlaceholder('••••••••').fill('e2e-pass')
  await page.getByRole('button', { name: /verify access/i }).click()
  await expect(page).toHaveURL(/\/$/, { timeout: 15_000 })
  await page.waitForLoadState('domcontentloaded')
}
