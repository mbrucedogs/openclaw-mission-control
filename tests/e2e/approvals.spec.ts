import { test, expect } from '@playwright/test'

import { login } from './helpers'

test('approvals page loads the exec approvals queue', async ({ page }) => {
  await login(page)

  await page.goto('/approvals')
  await expect(page.getByRole('heading', { name: /exec approvals/i })).toBeVisible()
  await expect(page.getByText(/approval queue/i)).toBeVisible()
})
