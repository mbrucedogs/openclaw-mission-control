import { expect, test } from '@playwright/test'

import { login } from './helpers'

test('runtime history page loads after login', async ({ page }) => {
  await login(page)

  await page.goto('/runtime')
  await expect(page.getByRole('heading', { name: /openclaw runtime timeline/i })).toBeVisible({ timeout: 15_000 })
  await expect(page.getByText(/recent events/i)).toBeVisible()
  await expect(page.getByText(/latest cursor/i)).toBeVisible()
})
