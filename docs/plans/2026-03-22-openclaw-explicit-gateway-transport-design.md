# OpenClaw Explicit Gateway Transport Design

## Goal

Replace Mission Control's `spawn("openclaw", "gateway", "call", ...)` integration with an explicit native gateway client so the app talks to OpenClaw through a stable, configurable transport instead of a subprocess bridge.

## Why Change It

The current integration works, but it is a bridge architecture:

- every runtime read spawns a subprocess
- deployment depends on `PATH`, local CLI install, and shell environment behavior
- errors are flattened into stdout/stderr parsing
- moving OpenClaw to another machine later would still leave the app pretending everything is local

OpenClaw already provides the primitives we need:

- a WebSocket gateway service (`openclaw gateway --port 18789`)
- explicit remote URL and token support
- a first-party JS gateway client in `openclaw/plugin-sdk`

That means Mission Control can become a normal configured gateway client now, without inventing a second bridge layer.

## Recommended Architecture

### 1. Native gateway client in Mission Control

Mission Control should own a small transport module that uses OpenClaw's first-party JS client directly.

New config:

- `OPENCLAW_GATEWAY_URL`
- `OPENCLAW_GATEWAY_TOKEN` when auth is enabled
- optional `OPENCLAW_GATEWAY_TIMEOUT_MS`

The transport module should:

- create one explicit call path for all gateway RPCs
- stop shelling out to the CLI
- centralize timeout and connection error formatting
- keep the existing `getGatewayHealth()` and `getGatewayStatus()` style adapter surface so routes do not need to know transport details

### 2. Preserve the current domain seam

The existing route/domain/UI code should continue to depend on:

- `getGatewayHealth()`
- `getGatewayStatus()`
- `isGatewayConnected()`
- approval/session helpers layered on top

That seam was the right cleanup move. We should keep it and replace only the transport underneath.

### 3. Explicit configuration, not implicit machine state

Mission Control should no longer depend on `OPENCLAW_BIN` or an available `openclaw` shell command.

Instead:

- runtime access is controlled by explicit gateway URL/token config
- workspace discovery still uses `OPENCLAW_WORKSPACE`
- discovery and runtime remain separate concerns

This keeps filesystem metadata local while allowing runtime to move to another machine later.

## Implementation Shape

### Transport layer

Create a dedicated module, likely `src/lib/openclaw/client.ts`, that:

- imports `callGateway` from `openclaw/plugin-sdk`
- supplies `url`, `token`, `timeoutMs`, and client identity
- returns typed payloads for Mission Control's gateway adapters

`src/lib/openclaw/gateway.ts` then becomes a thin typed adapter over that client instead of a subprocess launcher.

### Config layer

Add explicit helpers for:

- gateway URL
- gateway token
- timeout

These should live in app config, not ad hoc process-env reads spread through the runtime code.

### Error behavior

The native client should fail safe the same way current routes do:

- `getGatewayHealth()` returns `null` on transport failure
- `getGatewayStatus()` returns `null` on transport failure
- routes continue to surface disconnected/empty states instead of throwing raw transport errors to users

### Auth assumptions

We should assume token auth is the normal long-term mode.

If the gateway is loopback and unauthenticated, the URL alone may be enough, but the Mission Control client should still be ready for token-based remote use.

## Testing Strategy

1. Add unit tests for explicit config resolution and native client call wiring.
2. Keep existing route tests green so behavior does not regress.
3. Add regression coverage that proves no subprocess path is used anymore.
4. Verify dashboard/status/sessions/approvals behavior still fails safe when the gateway is unavailable.

## Migration Plan

Phase 1:

- add explicit transport module
- switch `gateway.ts` to native client
- remove `OPENCLAW_BIN` dependency

Phase 2:

- document the required gateway URL/token config
- update runtime docs and setup docs

Phase 3:

- optionally add connection pooling or cached client instances if needed
- optionally move discovery behind the gateway later if local workspace access becomes a deployment limitation

## Non-Goals

- rewriting the task model
- changing route payload shapes unless transport demands it
- moving workspace discovery off disk in this pass
- introducing a separate Mission Control-owned bridge service unless OpenClaw's native client proves insufficient

## Resume Notes

If this work pauses mid-stream, the safe checkpoint order is:

1. docs written
2. tests for explicit transport added and red
3. native client introduced
4. `gateway.ts` switched over
5. docs and env examples refreshed
6. full verification rerun
