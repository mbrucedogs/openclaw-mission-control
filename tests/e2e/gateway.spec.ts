import { test, expect } from '@playwright/test'

import { login } from './helpers'

test('gateway diagnostics page loads and can refresh the runtime probe', async ({ page }) => {
  await login(page)

  await page.goto('/gateway')
  await expect(page.getByRole('heading', { name: /openclaw runtime probe/i })).toBeVisible({ timeout: 15_000 })
  await expect(page.getByText(/transport/i).first()).toBeVisible()
  await page.getByRole('button', { name: /refresh probe/i }).click()
  await expect(page.getByRole('button', { name: /refresh probe/i })).toBeVisible()
})
