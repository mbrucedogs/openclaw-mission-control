import { test, expect } from '@playwright/test'

import { login } from './helpers'

test('dashboard loads after authentication', async ({ page }) => {
  await login(page)

  await expect(page.getByRole('heading', { name: /system initialization/i })).toBeVisible()
  await expect(page.getByText(/gateway/i).first()).toBeVisible()
})
