# OpenClaw Integration Logic

This directory contains the logic for integrating with the OpenClaw workspace.

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

See [`discovery.ts`](/Volumes/Data/openclaw/workspace/projects/Web/alex-mission-control/src/lib/openclaw/discovery.ts).

## Shared Runtime Transport

Gateway-backed runtime access is centralized here instead of spread across unrelated shell-outs.

Key modules:

- [`gateway.ts`](/Volumes/Data/openclaw/workspace/projects/Web/alex-mission-control/src/lib/openclaw/gateway.ts) for health and status RPCs
- [`sessions.ts`](/Volumes/Data/openclaw/workspace/projects/Web/alex-mission-control/src/lib/openclaw/sessions.ts) for normalized session payloads
- [`approvals.ts`](/Volumes/Data/openclaw/workspace/projects/Web/alex-mission-control/src/lib/openclaw/approvals.ts) for exec approval snapshots and decisions
- [`runtime-bridge.ts`](/Volumes/Data/openclaw/workspace/projects/Web/alex-mission-control/src/lib/openclaw/runtime-bridge.ts) for converting gateway snapshots into durable runtime events

## Freshness Model

The app intentionally separates:

- cached synchronous agent reads
- fresh asynchronous agent reads merged with gateway runtime

That boundary lives in [`src/lib/domain/agents.ts`](/Volumes/Data/openclaw/workspace/projects/Web/alex-mission-control/src/lib/domain/agents.ts) and is used so API and live UI surfaces can request fresh runtime state when needed.

### Maintenance

If you add a new agent to OpenClaw:
- Add them to `TEAM-REGISTRY.md`.
- Create their folder with `SOUL.md` and `AGENTS.md`.
- Update `TEAM_GOVERNANCE.md` if they participate in the main delivery flow.
- Update technical config if the gateway-facing ID differs from the friendly discovery ID.

The Mission Control UI will automatically pick up these changes on the next refresh.
