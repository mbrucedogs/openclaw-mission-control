# OpenClaw Runtime

Mission Control has two related layers:

- the task orchestration layer built around `Task -> Plan -> Run`
- the live OpenClaw runtime layer that provides discovered agents, gateway health, sessions, approvals, and runtime events

This document describes the second layer.

## What This Layer Is For

The OpenClaw runtime layer is what makes the app feel live instead of static.

It is responsible for:

- discovering which agents exist in the current OpenClaw workspace
- attaching live session and runtime state to those agents
- reporting truthful gateway connectivity
- surfacing gateway-driven exec approvals
- translating gateway snapshots into durable runtime events for streaming and replay

## Workspace Discovery

Agent discovery is not hardcoded in the UI.

Mission Control reads the OpenClaw workspace and builds the roster from:

- `agents/TEAM-REGISTRY.md`
- `TEAM_GOVERNANCE.md`
- the root workspace identity files
- per-agent `SOUL.md` and `AGENTS.md`
- local technical config such as `~/.openclaw/openclaw.json`

The workspace root comes from `OPENCLAW_WORKSPACE` when set. Otherwise the app falls back to `~/openclaw/workspace`.

Discovery also performs:

- root-agent derivation for the main workspace identity
- friendly-name to technical-agent-id remapping
- metadata enrichment from agent docs
- canonical layer hints for `governance`, `build`, `review`, and `automation`

The main implementation lives in [`src/lib/openclaw/discovery.ts`](/Volumes/Data/openclaw/workspace/projects/Web/alex-mission-control/src/lib/openclaw/discovery.ts).

## Shared Gateway Transport

Mission Control now standardizes runtime access through shared gateway adapters instead of mixing unrelated transport paths.

The gateway adapter in [`src/lib/openclaw/gateway.ts`](/Volumes/Data/openclaw/workspace/projects/Web/alex-mission-control/src/lib/openclaw/gateway.ts) is the source for:

- gateway health
- gateway status
- channel information
- agent session summaries
- session recency and utilization data

This transport is consumed by:

- [`/api/status`](/Volumes/Data/openclaw/workspace/projects/Web/alex-mission-control/src/app/api/status/route.ts)
- [`/api/sessions`](/Volumes/Data/openclaw/workspace/projects/Web/alex-mission-control/src/app/api/sessions/route.ts)
- [`/api/gateway`](/Volumes/Data/openclaw/workspace/projects/Web/alex-mission-control/src/app/api/gateway/route.ts)
- [`/api/agents`](/Volumes/Data/openclaw/workspace/projects/Web/alex-mission-control/src/app/api/agents/route.ts)
- [`/api/exec-approvals`](/Volumes/Data/openclaw/workspace/projects/Web/alex-mission-control/src/app/api/exec-approvals/route.ts)

## Truthful Status And Sessions

The dashboard and status APIs should never pretend the gateway is connected.

Current behavior:

- `/api/status` reports `gateway: connected` only when gateway health was actually reached
- `/api/sessions` is normalized from gateway status data instead of a separate legacy shell-out path
- `/api/gateway` returns the broader runtime snapshot used by the gateway panel and event sync path

The dashboard model in [`src/app/dashboard-model.ts`](/Volumes/Data/openclaw/workspace/projects/Web/alex-mission-control/src/app/dashboard-model.ts) now derives summary cards from discovered-agent counts and actual gateway reachability.

## Freshness Model

Mission Control intentionally keeps two agent read paths:

- `getAgents()` for cached synchronous access
- `getAgentsWithGateway()` for fresh asynchronous access with live runtime data

This separation prevents server-rendered and API surfaces from accidentally using stale cached runtime when live data is required.

The freshness boundary lives in [`src/lib/domain/agents.ts`](/Volumes/Data/openclaw/workspace/projects/Web/alex-mission-control/src/lib/domain/agents.ts).

## Runtime Events And Streaming

Gateway snapshots are converted into durable runtime events and stored in the app database.

That pipeline allows:

- replay after reconnect
- live streaming over SSE
- a shared event history for the office and runtime-facing UI surfaces

Key pieces:

- event persistence: [`src/lib/db/runtime.ts`](/Volumes/Data/openclaw/workspace/projects/Web/alex-mission-control/src/lib/db/runtime.ts)
- bridge from gateway snapshots to events: [`src/lib/openclaw/runtime-bridge.ts`](/Volumes/Data/openclaw/workspace/projects/Web/alex-mission-control/src/lib/openclaw/runtime-bridge.ts)
- SSE endpoint: [`src/app/api/events/stream/route.ts`](/Volumes/Data/openclaw/workspace/projects/Web/alex-mission-control/src/app/api/events/stream/route.ts)

The stream supports `Last-Event-ID` replay semantics through runtime cursors.

## Exec Approvals

Exec approvals are not task issue threads.

They represent gateway-level permission requests that need an operator decision. Mission Control exposes them through:

- a shared adapter in [`src/lib/openclaw/approvals.ts`](/Volumes/Data/openclaw/workspace/projects/Web/alex-mission-control/src/lib/openclaw/approvals.ts)
- a route in [`src/app/api/exec-approvals/route.ts`](/Volumes/Data/openclaw/workspace/projects/Web/alex-mission-control/src/app/api/exec-approvals/route.ts)
- a dedicated page at `/approvals`
- a global overlay so new pending requests can interrupt the UI visibly

Supported decisions are:

- `approve` -> allow once
- `always_allow` -> allow always
- `deny`

## Runtime-Facing Pages

These pages are the main consumers of the OpenClaw runtime layer:

- `/` dashboard summary
- `/team` discovered roster and grouping
- `/office` team operations board, live scene, and agent inspector
- `/approvals` gateway approval queue

The office redesign uses a shared operations model in [`src/app/office/team-operations-model.ts`](/Volumes/Data/openclaw/workspace/projects/Web/alex-mission-control/src/app/office/team-operations-model.ts) so task state and live runtime state feed one coherent UI.

## Operational Notes

- If `TEAM-REGISTRY.md` is missing in the configured workspace, discovery falls back safely but the roster will be incomplete.
- Gateway-derived fields such as `gatewaySessionCount`, `currentModel`, and `percentUsed` are live runtime fields and should be treated as ephemeral.
- Task state is still the system of record for planning and execution. Runtime telemetry is an operational overlay, not a replacement for task/run/step history.
