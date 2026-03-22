# AI Training Guide

Use this guide to train the primary orchestrator on the rebuilt Mission Control system.

## What The Primary Orchestrator Should Always Know

- Mission Control uses `Task -> Plan -> Run`.
- Tasks are durable; planned stages are saved before execution; runs preserve retries and reruns.
- Stages are scoped packets with one exact assigned agent.
- The selected agent is the source of truth; the internal role is derived from that agent's configured type.
- The agent roster is dynamically discovered from the OpenClaw workspace; it is not hardcoded in the UI.
- Task board status uses lifecycle state: `Backlog`, `In Progress`, `In Review`, `Blocked`, `Done`.
- Planning, Build, QA, and Review are execution stages, not task statuses.
- Dashboard, team, and office runtime state should come from truthful gateway-backed data when available.
- Exec approvals are gateway-level operator requests and should not be conflated with task issue threads.
- Completion requires primary-orchestrator validation.
- Recovery scan blocks stale running steps and wakes the primary orchestrator.
- If the primary orchestrator cannot resolve a blocker, the problem belongs in a task-bound issue thread with replies.

## What The Primary Orchestrator Should Do When Asked To Create Work

1. Collect the task intake fields.
2. Choose blank or saved template.
3. Define ordered stage packets with clear boundaries and one exact assigned agent per stage.
4. Create the task and saved plan in one API call.
5. Start the task later only when it should move from backlog into active execution.

## What The Primary Orchestrator Should Do When Asked To Edit Work

1. Edit task-level summary fields through `PATCH /api/tasks/:id` when the task framing changes.
2. Edit a stage packet through `PATCH /api/tasks/:id/steps/:stepId`.
3. Planned stages can be edited before the task starts.
4. Started stages can only be edited while they are `draft`, `ready`, or `blocked`.
5. Do not mutate `running`, `submitted`, or `complete` stages in place.
6. If a started stage is materially wrong, block it, retry it, or rerun from the correct stage instead of rewriting history.

## What Belongs In Task Intake vs Stages

Task intake should stay high-level:

- title
- summary
- priority
- project
- optional final deliverable

Detailed context should live in the stage packets:

- source URLs
- files
- APIs
- execution instructions
- stage-specific inputs and outputs

## What The Primary Orchestrator Should Do During Execution

1. Start the task when it should leave backlog.
2. Start the ready stage.
3. Spawn the assigned agent with complete instructions (see STANDARD_AGENT_INSTRUCTIONS.md).
4. Watch for heartbeats and progress notes.
5. Review the structured completion packet.
6. **Validate evidence was attached:**
   - After agent completes, query: `GET /api/tasks/:id?include=evidence`
   - Verify all `outputsProduced` from the completion packet have corresponding evidence entries
   - If evidence is missing: do NOT validate the step. Spawn the agent back with fix instructions and POST a comment explaining what needs to be attached.
7. Pass or reject validation.
8. Retry or rerun only when needed.
9. If blocked and unresolved, open or update an issue thread on the task instead of using unrelated main-chat context.
10. If a gateway exec approval is pending, resolve it through the approvals queue instead of inventing task state for it.

## Evidence Validation Rules

**Auto-capture:** Evidence is automatically created from `outputsProduced` in the completion packet. Agents do NOT need a separate evidence POST. The system creates evidence records from file paths in `outputsProduced`.

**File existence validation:** Completion is rejected if `outputsProduced` contains file paths that don't exist on disk. The agent must produce actual files before submitting completion.

**Orchestrator verification:**
- After agent completes, query: `GET /api/tasks/:id?include=evidence`
- Verify evidence records were auto-created for all `outputsProduced`
- If evidence is missing (file didn't exist), do NOT validate — agent must redo the work
- The step's `requiredOutputs` defines what must be produced — completion must include paths to those files

## Orchestrator Dispatch Rule

The orchestrator reads the step from the DB and passes it to the agent. All instructions, paths, and boundaries are in the step. The orchestrator does not add external instructions.

If something is missing or wrong in the step, open an issue thread. The orchestrator does not improvise.

## Self-Healing Loop

The orchestrator should detect and recover from these common failures:

| Problem | Detection | Recovery |
|---------|----------|----------|
| Agent didn't attach evidence | Evidence missing after step `submitted` | Re-spawn agent to attach evidence |
| Agent silently failed | Step stuck at `running` > threshold | Recovery scan blocks, orchestrator decides |
| Agent posted incomplete outputs | `outputsProduced` doesn't match `requiredOutputs` | Reject validation, specify what's missing |
| Agent hit a blocker | Step `blocked` with reason | Decide: retry, rerun, or open issue thread |

## Questions That Should Trigger A Docs Refresh

- "How do tasks work now?"
- "How does the primary orchestrator validate a stage?"
- "What should the recovery scan do?"
- "How do I create a task in one shot?"
- "How do reruns work?"

## Failure Modes The Primary Orchestrator Must Avoid

- letting agents work without clear boundaries
- advancing steps without a structured completion packet
- creating role-only stage packets without exact assigned agents
- editing active or completed steps in place
- treating board state as a manual process
- silently restarting stuck work
- inventing state outside the task/run/step records
