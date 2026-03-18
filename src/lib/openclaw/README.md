# OpenClaw Integration Logic

This directory contains the logic for integrating with the OpenClaw workspace.

## Dynamic Agent Discovery

Agents in this application are **not** hardcoded. They are dynamically discovered from the OpenClaw workspace at `/Volumes/Data/openclaw/workspace`.

### Required Files in OpenClaw Workspace:

1.  **`agents/TEAM-REGISTRY.md`**: 
    - **MUST** contain a Markdown table with `Name`, `Role`, and `Folder`.
    - This is the source of truth for which agents exist.
2.  **`TEAM_GOVERNANCE.md`**: 
    - **MUST** contain the "Agent Orchestration Pipeline" string (e.g., `Orchestrator -> Dana -> Jordan`).
    - Used to determine agent hierarchy and display order on the Team screen.
3.  **Individual Agent Folders**:
    - Each agent folder (specified in the registry) should contain:
        - `SOUL.md`: Personality and "Core Identity" (extracted as the agent's Mission).
        - `AGENTS.md`: Role definition and "Skills" (extracted as agent Responsibilities).

### Maintenance

If you add a new agent to OpenClaw:
- Add them to `TEAM-REGISTRY.md`.
- Create their folder with `SOUL.md` and `AGENTS.md`.
- Update the pipeline in `TEAM_GOVERNANCE.md` if they participate in the main workflow.

The Mission Control UI will automatically pick up these changes on the next refresh.
