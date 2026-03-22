# OpenClaw Runtime

Mission Control has two related layers:

- the task orchestration layer built around `Task -> Plan -> Run`
- the OpenClaw runtime layer that provides discovery, live gateway state, sessions, approvals, and runtime events

This document covers the runtime layer.

## Runtime Connection Model

Mission Control now connects to OpenClaw through a native gateway client inside the app process.

It no longer shells out to:

```bash
openclaw gateway call ...
```

for routine runtime reads.

Instead, runtime access is configured explicitly with:

```bash
OPENCLAW_GATEWAY_URL=ws://127.0.0.1:18789
OPENCLAW_GATEWAY_TOKEN=
OPENCLAW_GATEWAY_TIMEOUT_MS=10000
```

This gives Mission Control a stable path for:

- same-machine local development
- SSH tunnel or tailnet forwarding
- future remote gateway deployments on another host

## Discovery vs Runtime

Mission Control intentionally keeps these concerns separate.

### Discovery

Filesystem-backed discovery still reads the OpenClaw workspace using:

- `OPENCLAW_WORKSPACE`
- `agents/TEAM-REGISTRY.md`
- `TEAM_GOVERNANCE.md`
- per-agent `SOUL.md`
- per-agent `AGENTS.md`
- optional `~/.openclaw/openclaw.json` technical ID mappings

### Runtime

Gateway-backed runtime uses the explicit gateway URL/token config to retrieve:

- health
- status
- sessions
- approvals
- runtime event deltas

This split keeps agent metadata local while making runtime transport movable later.

## Default Local Setup

For a same-machine deployment, the normal defaults are:

```bash
OPENCLAW_GATEWAY_URL=ws://127.0.0.1:18789
OPENCLAW_WORKSPACE=~/openclaw/workspace
```

If token auth is enabled on the gateway, also set:

```bash
OPENCLAW_GATEWAY_TOKEN=<token>
```

## Remote Deployment Shape

If OpenClaw runs on another machine later, Mission Control does not need a transport rewrite.

You can point the same app at:

- a tailnet URL
- an SSH-forwarded local URL
- a directly reachable remote gateway URL

Only the environment config changes.

## Runtime Modules

Key modules:

- [`src/lib/openclaw/client.ts`](/Users/mattbruce/.config/superpowers/worktrees/alex-mission-control/openclaw-explicit-gateway-service/src/lib/openclaw/client.ts)
- [`src/lib/openclaw/gateway.ts`](/Users/mattbruce/.config/superpowers/worktrees/alex-mission-control/openclaw-explicit-gateway-service/src/lib/openclaw/gateway.ts)
- [`src/lib/openclaw/discovery.ts`](/Users/mattbruce/.config/superpowers/worktrees/alex-mission-control/openclaw-explicit-gateway-service/src/lib/openclaw/discovery.ts)
- [`src/lib/openclaw/approvals.ts`](/Users/mattbruce/.config/superpowers/worktrees/alex-mission-control/openclaw-explicit-gateway-service/src/lib/openclaw/approvals.ts)
- [`src/lib/openclaw/runtime-bridge.ts`](/Users/mattbruce/.config/superpowers/worktrees/alex-mission-control/openclaw-explicit-gateway-service/src/lib/openclaw/runtime-bridge.ts)

## Operational Expectations

- If the gateway is unreachable, Mission Control should fail safe and report disconnected or empty runtime state.
- Runtime access should be explicit, typed, and config-driven.
- The task model remains the system of record for execution history; runtime is an operational overlay.
