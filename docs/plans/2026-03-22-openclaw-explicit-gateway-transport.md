# OpenClaw Explicit Gateway Transport Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace CLI-spawned gateway RPC calls with an explicit native OpenClaw gateway client that is configurable for local or remote deployment.

**Architecture:** Keep the existing Mission Control adapter seam (`gateway.ts`, approvals, sessions, runtime bridge, routes), but move the transport underneath to a direct `openclaw/plugin-sdk` client configured by `OPENCLAW_GATEWAY_URL` and related settings. Continue to fail safe at the route layer when the gateway is unavailable.

**Tech Stack:** Next.js App Router, TypeScript, OpenClaw plugin SDK gateway client, node:test, ESLint, Next build.

---

### Task 1: Add Explicit Gateway Config Helpers

**Files:**
- Modify: `src/lib/config.ts`
- Test: `tests/openclaw-native-client.test.ts`

**Step 1: Write the failing test**

Add a test that proves Mission Control resolves:

- `OPENCLAW_GATEWAY_URL`
- `OPENCLAW_GATEWAY_TOKEN`
- `OPENCLAW_GATEWAY_TIMEOUT_MS`

and falls back safely when optional values are missing.

**Step 2: Run test to verify it fails**

Run: `node --import tsx --test tests/openclaw-native-client.test.ts`
Expected: FAIL because the explicit gateway config helpers do not exist yet.

**Step 3: Write minimal implementation**

Add config helpers for explicit gateway runtime settings.

**Step 4: Run test to verify it passes**

Run: `node --import tsx --test tests/openclaw-native-client.test.ts`
Expected: PASS

### Task 2: Add Native Gateway Client Module

**Files:**
- Create: `src/lib/openclaw/client.ts`
- Modify: `tests/openclaw-native-client.test.ts`

**Step 1: Extend the failing test**

Prove the new client:

- calls OpenClaw's native `callGateway`
- passes configured URL/token/timeout
- preserves method and params

Use dependency injection so the test does not hit a real gateway.

**Step 2: Run test to verify it fails**

Run: `node --import tsx --test tests/openclaw-native-client.test.ts`
Expected: FAIL because the native client module does not exist yet.

**Step 3: Write minimal implementation**

Create a small wrapper around `openclaw/plugin-sdk` `callGateway`.

**Step 4: Run test to verify it passes**

Run: `node --import tsx --test tests/openclaw-native-client.test.ts`
Expected: PASS

### Task 3: Switch Gateway Adapter Off the CLI Path

**Files:**
- Modify: `src/lib/openclaw/gateway.ts`
- Modify: `tests/openclaw-native-client.test.ts`
- Test: `tests/status-route.test.ts`
- Test: `tests/openclaw-sessions-route.test.ts`

**Step 1: Extend tests**

Add assertions that:

- `getGatewayHealth()` and `getGatewayStatus()` use the native client
- transport failures still return `null`
- existing route payload builders stay unchanged

**Step 2: Run targeted tests to verify red**

Run:

```bash
node --import tsx --test tests/openclaw-native-client.test.ts tests/status-route.test.ts tests/openclaw-sessions-route.test.ts
```

Expected: FAIL because `gateway.ts` still shells out.

**Step 3: Write minimal implementation**

Refactor `gateway.ts` to call the new native client and remove subprocess usage.

**Step 4: Run targeted tests to verify green**

Run:

```bash
node --import tsx --test tests/openclaw-native-client.test.ts tests/status-route.test.ts tests/openclaw-sessions-route.test.ts
```

Expected: PASS

### Task 4: Verify Downstream Runtime Consumers

**Files:**
- Modify: `src/lib/openclaw/approvals.ts`
- Modify: `src/lib/openclaw/runtime-bridge.ts`
- Test: `tests/openclaw-approvals.test.ts`
- Test: `tests/openclaw-runtime-bridge.test.ts`

**Step 1: Add or adjust failing tests**

Confirm approvals and runtime bridge still behave correctly with the new transport-backed gateway adapter.

**Step 2: Run tests to verify red if behavior changed**

Run:

```bash
node --import tsx --test tests/openclaw-approvals.test.ts tests/openclaw-runtime-bridge.test.ts
```

Expected: FAIL only if downstream code still assumes the old transport details.

**Step 3: Write minimal implementation**

Update downstream callers only if needed to align with the new explicit client.

**Step 4: Run tests to verify green**

Run:

```bash
node --import tsx --test tests/openclaw-approvals.test.ts tests/openclaw-runtime-bridge.test.ts
```

Expected: PASS

### Task 5: Refresh Docs For The New Transport

**Files:**
- Modify: `README.md`
- Modify: `docs/OPENCLAW_RUNTIME.md`
- Modify: `src/lib/openclaw/README.md`

**Step 1: Update docs**

Document:

- explicit gateway URL/token config
- no CLI subprocess dependency for runtime access
- local vs remote deployment behavior

**Step 2: Verify docs match code**

Cross-check the new transport module and `gateway.ts` against the written docs.

### Task 6: Verification

**Files:**
- Modify: `src/lib/config.ts`
- Modify: `src/lib/openclaw/client.ts`
- Modify: `src/lib/openclaw/gateway.ts`
- Modify: runtime docs/tests as needed

**Step 1: Run targeted tests**

Run:

```bash
node --import tsx --test tests/openclaw-native-client.test.ts tests/status-route.test.ts tests/openclaw-sessions-route.test.ts tests/openclaw-approvals.test.ts tests/openclaw-runtime-bridge.test.ts
```

Expected: PASS

**Step 2: Run repo tests**

Run:

```bash
npm test
```

Expected: PASS

**Step 3: Run focused lint on changed files**

Run:

```bash
npx eslint src/lib/config.ts src/lib/openclaw/client.ts src/lib/openclaw/gateway.ts src/lib/openclaw/approvals.ts src/lib/openclaw/runtime-bridge.ts tests/openclaw-native-client.test.ts README.md docs/OPENCLAW_RUNTIME.md src/lib/openclaw/README.md
```

Expected: PASS or doc-file exclusions only

**Step 4: Run production build**

Run:

```bash
npm run build
```

Expected: PASS

## Notes

- Do not preserve the CLI subprocess path as fallback.
- Keep route payload shapes stable unless a correctness issue forces a change.
- Prefer explicit env/config helpers over scattered `process.env` access.
- If `openclaw/plugin-sdk` import shape is awkward, isolate that complexity in `client.ts`, not route-level code.
