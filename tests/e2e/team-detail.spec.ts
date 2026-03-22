import { expect, test } from '@playwright/test'

import { login } from './helpers'

test('team detail page loads for the main agent after login', async ({ page }) => {
  await login(page)

  await page.goto('/team/main')
  await expect(page.getByText(/agent detail/i)).toBeVisible({ timeout: 15_000 })
  await expect(page.getByRole('heading', { name: /main/i })).toBeVisible()
  await expect(page.getByText(/runtime timeline/i)).toBeVisible()
})
