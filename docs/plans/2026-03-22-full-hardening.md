# Full Hardening Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Bring Mission Control to a genuinely green operational baseline by fixing repo lint/build debt, adding richer OpenClaw operator diagnostics, and introducing end-to-end smoke coverage for the app’s core flows.

**Architecture:** Work in three phases. First make the repo itself green by eliminating lint failures and current Next warnings. Then add a dedicated diagnostics surface and startup capability checks on top of the existing gateway diagnostics layer. Finally add minimal Playwright smoke coverage so login, dashboard, diagnostics, approvals, and core task pages are protected from obvious regressions.

**Tech Stack:** Next.js App Router, TypeScript, ESLint, Node test runner, Playwright

---

### Task 1: Fix repo-wide lint failures and warnings

**Files:**
- Modify: `src/app/api/activity/feed/route.ts`
- Modify: `src/app/api/activity/route.ts`
- Modify: `src/app/api/auth/login/route.ts`
- Modify: `src/app/api/document-folders/route.ts`
- Modify: `src/app/api/memory/route.ts`
- Modify: `src/app/api/projects/[id]/route.ts`
- Modify: `src/app/api/users/route.ts`
- Modify: `src/app/login/page.tsx`
- Modify: `src/app/settings/page.tsx`
- Modify: `src/components/IngestButton.tsx`
- Modify: `src/lib/domain/documents.ts`
- Modify: `src/lib/domain/task-runs.ts`
- Modify: `src/lib/openclaw/ingestion.ts`

**Step 1: Write or extend failing tests where behavior changes are required**

Add or update tests only for files whose behavior must change materially, especially:

- `settings/page.tsx` hook ordering or load behavior
- `task-runs.ts` import behavior if refactoring affects runtime

**Step 2: Run lint to verify the current failure list**

Run: `npm run lint`
Expected: FAIL with the existing 15 errors and 14 warnings.

**Step 3: Implement minimal lint-safe fixes**

Replace unsafe `any` with narrow typed parsing, remove unused symbols, convert the `require()` in `task-runs.ts`, and fix hook ordering in `settings/page.tsx`.

**Step 4: Run lint again**

Run: `npm run lint`
Expected: PASS

**Step 5: Run tests/build**

Run:

```bash
npm test
npm run build
```

Expected: PASS

**Step 6: Commit**

```bash
git add src/app/api/activity/feed/route.ts src/app/api/activity/route.ts src/app/api/auth/login/route.ts src/app/api/document-folders/route.ts src/app/api/memory/route.ts src/app/api/projects/[id]/route.ts src/app/api/users/route.ts src/app/login/page.tsx src/app/settings/page.tsx src/components/IngestButton.tsx src/lib/domain/documents.ts src/lib/domain/task-runs.ts src/lib/openclaw/ingestion.ts
git commit -m "chore: clear lint debt"
```

### Task 2: Remove current Next.js warnings

**Files:**
- Modify: `next.config.ts`
- Rename or Replace: `src/middleware.ts`
- Add/Modify: any proxy helper files needed by the Next 16 migration

**Step 1: Write the failing verification**

Run: `npm run build`
Expected: PASS with warnings for inferred root and deprecated middleware.

**Step 2: Implement the minimal config changes**

- set `turbopack.root` explicitly
- migrate deprecated `middleware` to the supported `proxy` convention

**Step 3: Re-run build**

Run: `npm run build`
Expected: PASS without the current Next warnings.

**Step 4: Commit**

```bash
git add next.config.ts src/middleware.ts src/proxy.ts
git commit -m "chore: remove next build warnings"
```

Adjust the exact file list if the migration uses a different proxy path.

### Task 3: Add startup compatibility and diagnostics API coverage

**Files:**
- Create or Modify: `src/lib/openclaw/capabilities.ts`
- Create or Modify: `src/app/api/gateway/diagnostics/route.ts`
- Modify: `src/lib/openclaw/client.ts`
- Modify: `src/lib/openclaw/gateway.ts`
- Test: `tests/openclaw-capabilities.test.ts`
- Test: `tests/openclaw-gateway-diagnostics-route.test.ts`

**Step 1: Write the failing tests**

Add tests for:

- capability snapshot classification
- scope and token error reporting
- diagnostics route payload shape
- manual probe refresh behavior if exposed at the route level

**Step 2: Run tests to verify they fail**

Run:

```bash
node --import tsx --test tests/openclaw-capabilities.test.ts tests/openclaw-gateway-diagnostics-route.test.ts
```

Expected: FAIL

**Step 3: Write minimal implementation**

Build a shared capability model and diagnostics route using the existing gateway diagnostics layer.

**Step 4: Run tests to verify they pass**

Run:

```bash
node --import tsx --test tests/openclaw-capabilities.test.ts tests/openclaw-gateway-diagnostics-route.test.ts
```

Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/openclaw/capabilities.ts src/app/api/gateway/diagnostics/route.ts src/lib/openclaw/client.ts src/lib/openclaw/gateway.ts tests/openclaw-capabilities.test.ts tests/openclaw-gateway-diagnostics-route.test.ts
git commit -m "feat: add gateway capability diagnostics"
```

### Task 4: Add diagnostics UI and probe controls

**Files:**
- Create: `src/app/gateway/page.tsx`
- Create or Modify: `src/app/gateway/GatewayDiagnosticsClient.tsx`
- Create or Modify: `src/app/gateway/gateway-diagnostics-model.ts`
- Modify: `src/app/page.tsx`
- Test: `tests/gateway-diagnostics-model.test.ts`

**Step 1: Write the failing tests**

Add tests for the diagnostics model covering:

- connected transport summary
- degraded scope-limited state
- failed auth/unreachable state
- manual probe UI state derivation

**Step 2: Run tests to verify they fail**

Run: `node --import tsx --test tests/gateway-diagnostics-model.test.ts`
Expected: FAIL

**Step 3: Write minimal implementation**

Add the diagnostics page and link to it from the app, keeping the dashboard summary concise.

**Step 4: Run tests to verify they pass**

Run: `node --import tsx --test tests/gateway-diagnostics-model.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/app/gateway/page.tsx src/app/gateway/GatewayDiagnosticsClient.tsx src/app/gateway/gateway-diagnostics-model.ts src/app/page.tsx tests/gateway-diagnostics-model.test.ts
git commit -m "feat: add gateway diagnostics page"
```

### Task 5: Add Playwright smoke coverage

**Files:**
- Modify: `package.json`
- Create: `playwright.config.ts`
- Create: `tests/e2e/auth.spec.ts`
- Create: `tests/e2e/dashboard.spec.ts`
- Create: `tests/e2e/gateway.spec.ts`
- Create: `tests/e2e/approvals.spec.ts`
- Create: `tests/e2e/tasks.spec.ts`

**Step 1: Write the failing smoke specs**

Add minimal Playwright specs for:

- login page
- dashboard
- gateway diagnostics page
- approvals page
- tasks page

**Step 2: Run them to verify the suite fails correctly before setup**

Run: `npx playwright test`
Expected: FAIL until Playwright config/setup is complete.

**Step 3: Add minimal Playwright setup**

Install/configure Playwright and wire the app server command for smoke runs.

**Step 4: Re-run smoke tests**

Run: `npx playwright test`
Expected: PASS

**Step 5: Commit**

```bash
git add package.json package-lock.json playwright.config.ts tests/e2e/auth.spec.ts tests/e2e/dashboard.spec.ts tests/e2e/gateway.spec.ts tests/e2e/approvals.spec.ts tests/e2e/tasks.spec.ts
git commit -m "test: add e2e smoke coverage"
```

### Task 6: Refresh docs

**Files:**
- Modify: `README.md`
- Modify: `docs/README.md`
- Modify: `docs/API_REFERENCE.md`
- Modify: `docs/OPENCLAW_RUNTIME.md`

**Step 1: Update docs**

Document:

- repo is now expected to pass lint/test/build
- gateway diagnostics page
- startup capability checks
- manual probe behavior
- Playwright smoke test usage

**Step 2: Run relevant verification**

Run:

```bash
npm run lint
npm test
npm run build
npx playwright test
```

Expected: PASS

**Step 3: Commit**

```bash
git add README.md docs/README.md docs/API_REFERENCE.md docs/OPENCLAW_RUNTIME.md
git commit -m "docs: refresh hardening guidance"
```

### Task 7: Final verification and cleanup

**Files:**
- Verify only

**Step 1: Run the full verification suite**

Run:

```bash
npm run lint
npm test
npm run build
npx playwright test
```

Expected: PASS

**Step 2: Remove completed plan docs if all work is implemented**

Delete:

- `docs/plans/2026-03-22-full-hardening-design.md`
- `docs/plans/2026-03-22-full-hardening.md`

**Step 3: Commit final cleanup if needed**

```bash
git add -A
git commit -m "chore: finalize full hardening pass"
```

Only if the cleanup changed tracked files.
