import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  use: {
    baseURL: 'http://localhost:4101',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: `sh -c "mkdir -p .playwright && NEXT_DIST_DIR=.playwright/next-e2e AUTH_USER=e2e-admin AUTH_PASS=e2e-pass API_KEY=e2e-api-key DATABASE_URL=.playwright/mission-control.e2e.db OPENCLAW_WORKSPACE=tests/fixtures/openclaw-workspace OPENCLAW_GATEWAY_URL=ws://127.0.0.1:65535 OPENCLAW_GATEWAY_TIMEOUT_MS=2000 npx next dev -p 4101"`,
    url: 'http://localhost:4101/login',
    timeout: 120_000,
    reuseExistingServer: false,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
})
