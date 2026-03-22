# OpenClaw Integration Logic

This directory contains the logic for integrating with the OpenClaw workspace.

## Runtime Transport

Mission Control now uses an explicit native OpenClaw gateway client for runtime access.

Primary env/config:

- `OPENCLAW_GATEWAY_URL`
- `OPENCLAW_GATEWAY_TOKEN`
- `OPENCLAW_GATEWAY_TIMEOUT_MS`

The transport implementation lives in:

- [`client.ts`](/Users/mattbruce/.config/superpowers/worktrees/alex-mission-control/openclaw-explicit-gateway-service/src/lib/openclaw/client.ts)
- [`gateway.ts`](/Users/mattbruce/.config/superpowers/worktrees/alex-mission-control/openclaw-explicit-gateway-service/src/lib/openclaw/gateway.ts)

Mission Control no longer depends on spawning the `openclaw` CLI for routine gateway RPCs.

## Dynamic Agent Discovery

Agents in this application are **not** hardcoded. They are dynamically discovered from the configured OpenClaw workspace.

Workspace root resolution:

- `OPENCLAW_WORKSPACE` when set
- otherwise `~/openclaw/workspace`

### Required Files in OpenClaw Workspace:

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

- root workspace agent derivation
- metadata enrichment from `SOUL.md` and `AGENTS.md`
- technical ID remapping
- canonical layer hints for `governance`, `build`, `review`, and `automation`

### Maintenance

If you add a new agent to OpenClaw:
- Add them to `TEAM-REGISTRY.md`.
- Create their folder with `SOUL.md` and `AGENTS.md`.
- Update `TEAM_GOVERNANCE.md` if they participate in the main delivery flow.
- Update technical config if the gateway-facing ID differs from the discovery ID.

The Mission Control UI will automatically pick up these changes on the next refresh.
