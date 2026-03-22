import { test, expect } from '@playwright/test'

import { login } from './helpers'

test('tasks page opens the new task wizard', async ({ page }) => {
  await login(page)

  await page.goto('/tasks')
  await expect(page.getByRole('button', { name: /new task/i })).toBeVisible()
  await page.getByRole('button', { name: /new task/i }).click()
  await expect(page.getByRole('heading', { name: /create task \+ saved execution plan/i })).toBeVisible()
})
