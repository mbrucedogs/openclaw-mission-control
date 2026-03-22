# OpenClaw Integration Logic

This directory contains the logic for integrating with the OpenClaw workspace.

## Runtime Transport

Mission Control now uses an explicit OpenClaw gateway transport for runtime access.

Primary env/config:

- `OPENCLAW_GATEWAY_URL`
- `OPENCLAW_GATEWAY_TOKEN`
- `OPENCLAW_GATEWAY_TIMEOUT_MS`

The transport implementation lives in:

- [`client.ts`](./client.ts)
- [`gateway.ts`](./gateway.ts)

Current implementation note:

- [`client.ts`](./client.ts) first tries to load a runtime gateway client from the installed `openclaw` package.
- If the package does not expose a usable runtime client, it falls back to `openclaw gateway call --url --token ...`.
- The runtime config is still explicit even when the CLI fallback is used.
- If OpenClaw later exposes a supported runtime gateway client, this transport should switch fully to that public entrypoint.

### Diagnostics Semantics

The transport layer now emits normalized diagnostics instead of exposing only success/failure:

- transport modes: `sdk`, `cli-fallback`, `failed`
- reason codes: `ok`, `partial_data`, `auth_failed`, `insufficient_scope`, `unreachable`, `timeout`, `transport_missing`, `unknown`

[`gateway.ts`](./gateway.ts) lifts those transport-level results into gateway snapshot states:

- `connected`
- `degraded`
- `failed`

Use that snapshot when building API payloads or operator-facing runtime UI. It preserves partial data when one gateway method succeeds and another fails.

## Dynamic Agent Discovery

Agents in this application are **not** hardcoded. They are dynamically discovered from the configured OpenClaw workspace.

Workspace root resolution:

- `OPENCLAW_WORKSPACE` when set
- otherwise `~/openclaw/workspace`

### Discovery Inputs

1.  **`agents/TEAM-REGISTRY.md`**: 
    - **MUST** contain a Markdown table with `Name`, `Role`, and `Folder`.
    - This is the source of truth for which agents exist.
2.  **`TEAM_GOVERNANCE.md`**: 
    - Used to determine governance and team display order.
    - The runtime task system uses task, run, and step records in this app.
3.  **Individual Agent Folders**:
    - Each agent folder (specified in the registry) should contain:
        - `SOUL.md`: Personality and "Core Identity" (extracted as the agent's Mission).
        - `AGENTS.md`: Role definition and "Skills" (extracted as agent Responsibilities).
4.  **Technical Config**:
    - `~/.openclaw/openclaw.json` can remap friendly discovery IDs to technical gateway IDs.

### Discovery Behavior

Discovery also handles:

- deriving the root workspace agent identity
- enriching metadata from `SOUL.md` and `AGENTS.md`
- remapping to technical gateway IDs when configured
- inferring canonical layer hints: `governance`, `build`, `review`, `automation`

See [`discovery.ts`](./discovery.ts).

## Shared Runtime Transport

Gateway-backed runtime access is centralized here instead of spread across unrelated shell-outs or route-specific transport code.

Key modules:

- [`client.ts`](./client.ts) for explicit gateway client loading, CLI fallback wiring, and normalized transport diagnostics
- [`gateway.ts`](./gateway.ts) for health/status RPCs and snapshot-level gateway diagnostics
- [`sessions.ts`](./sessions.ts) for normalized session payloads
- [`approvals.ts`](./approvals.ts) for exec approval snapshots and decisions
- [`runtime-bridge.ts`](./runtime-bridge.ts) for converting gateway snapshots into durable runtime events

## Freshness Model

The app intentionally separates:

- cached synchronous agent reads
- fresh asynchronous agent reads merged with gateway runtime

That boundary lives in [`../domain/agents.ts`](../domain/agents.ts) and is used so API and live UI surfaces can request fresh runtime state when needed.

### Maintenance

If you add a new agent to OpenClaw:
- Add them to `TEAM-REGISTRY.md`.
- Create their folder with `SOUL.md` and `AGENTS.md`.
- Update `TEAM_GOVERNANCE.md` if they participate in the main delivery flow.
- Update technical config if the gateway-facing ID differs from the friendly discovery ID.

The Mission Control UI will automatically pick up these changes on the next refresh.
