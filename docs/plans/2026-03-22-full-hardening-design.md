# Full Hardening Design

**Date:** 2026-03-22

**Goal**

Bring Mission Control to a genuinely green operational baseline by fixing repo-wide lint debt, removing current Next.js warnings, adding first-class OpenClaw operator diagnostics surfaces, and introducing end-to-end smoke coverage for the most important operator flows.

## Current Baseline

Verified in the isolated worktree:

- `npm test` passes
- `npm run build` passes
- `npm run lint` fails with 15 errors and 14 warnings
- `next build` still warns about:
  - inferred Turbopack workspace root
  - deprecated `middleware` file convention

The runtime layer is already truthful about gateway status and transport mode, but it still lacks a deeper operator surface and boot-time capability checks.

## Requirements

- Make `npm run lint`, `npm test`, and `npm run build` all pass
- Remove the current Next.js config warnings that are under app control
- Preserve the existing OpenClaw diagnostics behavior already on `master`
- Add a richer operator-facing diagnostics surface without exposing raw secrets or stack traces by default
- Add startup/runtime compatibility checks so configuration problems are visible immediately
- Add minimal but real e2e smoke coverage for the highest-value flows
- Keep the work resumable with plan docs and phase boundaries

## Recommended Approach

Use a staged hardening pass with three phases.

### Phase 1: Repo Health

Fix all current lint failures and warnings that are worth fixing now, then remove the current Next warnings:

- type unsafe `any` API route handlers properly
- clean unused imports/variables
- fix `settings/page.tsx` hook ordering issue
- replace forbidden `require()` usage in `task-runs.ts`
- clean up low-value dead code in ingestion and login surfaces
- configure `turbopack.root` in `next.config.ts`
- migrate deprecated `middleware` to `proxy`

This phase should end with:

- `npm run lint` passing
- `npm test` still passing
- `npm run build` passing without the current root/middleware warnings

### Phase 2: OpenClaw Operator Surfaces

The dashboard now tells the truth, but it is still intentionally shallow. Add an operator-facing diagnostics page and startup capability checks:

- new diagnostics page for richer gateway details
- startup probe/capability snapshot:
  - transport mode
  - gateway reachability
  - token acceptance
  - scope availability
  - Mission Control version
  - OpenClaw runtime version when available
- manual probe action for on-demand refresh
- safe distinction between operator summaries and raw detail payloads

The existing dashboard remains concise; the detailed operator surface moves to a dedicated page.

### Phase 3: End-to-End Smoke Coverage

Add Playwright for smoke coverage of the core operator flows:

- login
- dashboard load
- gateway diagnostics page load
- approvals page load
- task page load and at least one core task action

The purpose is not exhaustive UI testing. It is a basic safety net against obvious regressions in the app’s most important paths.

## Alternatives Considered

### Option 1: Only fix lint/build warnings

Fastest, but leaves the operator/runtime gaps that are most likely to hurt future expansion.

### Option 2: Add new features first, clean lint later

Bad ordering. It increases noise and makes verification unreliable.

### Option 3: Recommended staged hardening

Fix the repo baseline first, then add operator capabilities, then add e2e coverage. This keeps each phase verifiable and reduces ambiguity when something fails.

## Architecture Notes

- Keep transport-level diagnostics where they are now: `src/lib/openclaw/client.ts` and `src/lib/openclaw/gateway.ts`
- Add richer diagnostics via dedicated route/page rather than expanding the main dashboard panel into a dumping ground
- Use one shared capability model for diagnostics API and diagnostics UI
- Keep startup checks explicit and typed so future remote deployment changes do not force another runtime redesign
- Treat Playwright as smoke coverage only; avoid broad brittle UI assertions

## Testing Strategy

- Follow TDD for new behavior:
  - failing tests for diagnostics capability model
  - failing route tests for the diagnostics page API
  - failing Playwright smoke checks for new operator surfaces
- Re-run lint/build after each phase, not just at the end

## Docs Impact

After implementation, update:

- `README.md`
- `docs/README.md`
- `docs/API_REFERENCE.md`
- `docs/OPENCLAW_RUNTIME.md`

Document:

- diagnostics page
- startup compatibility checks
- manual probe behavior
- Playwright smoke test workflow

## Out of Scope

- RBAC or multi-user auth redesign
- replacing the CLI fallback transport entirely
- full OpenClaw admin control plane
- exhaustive UI regression coverage
