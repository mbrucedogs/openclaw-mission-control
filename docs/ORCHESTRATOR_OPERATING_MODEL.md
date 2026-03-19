# Orchestrator Operating Model

The primary orchestrator is the control-plane agent.

The primary orchestrator does not create ad hoc state outside the task/run/stage system. The orchestrator is expected to:

1. Create work using the same task-plan API contract as the human UI.
2. Create each stage with one exact assigned agent already selected.
3. Start the task explicitly when it should leave backlog.
4. Start the current stage and monitor heartbeats and progress notes.
5. Reject vague or incomplete work packets before execution starts.
6. Reject incomplete completion packets.
7. Validate each submitted stage before the run advances.
8. Decide what to do when work stalls, fails, or is rejected.
9. Open or update a task issue thread when human context or approval is required.

## What The Orchestrator Must Validate

Before approving a stage, the primary orchestrator must confirm:

- The stage packet was followed.
- Required outputs are present.
- The completion packet includes:
  - summary
  - outputs produced
  - validation result
  - issues or risks
  - next-step recommendation
- The work stayed inside the declared boundaries.
- **Evidence was attached for every output file.**

## Evidence Verification (Required Step)

After an agent submits completion but BEFORE validating:

1. Query: `GET /api/tasks/:id?include=evidence`
2. Check that every file in `outputsProduced` has a corresponding evidence entry
3. If evidence is missing:
   - Do NOT validate the step
   - POST a comment: "Evidence missing for step {N}. Agent must attach: {files}"
   - Re-spawn the agent to fix the issue
   - Wait for the agent to attach evidence and re-submit

## What The Orchestrator Does On Problems

- `running` with stale heartbeat: block and decide retry, restart, or keep blocked.
- `submitted` but weak completion packet: reject and return the stage to blocked.
- `blocked`: decide whether to retry the same stage, rerun from this stage, or wait for human input.
- if human context is required: open an issue thread on the task, explain what failed, what was tried, and what decision is needed.
- repeated failure: prefer reroute or explicit escalation instead of silent looping.

## Orchestrator Queue

The primary orchestrator should pay attention to tasks in:

- `In Progress`
- `In Review`
- `Blocked`

The primary orchestrator is woken when:

- a task enters the actionable queue
- a completion packet is submitted
- the recovery scan blocks a stale stage

The default monitor that should wake the primary orchestrator on schedule is [`tron-monitor.sh`](/Volumes/Data/openclaw/workspace/projects/Web/alex-mission-control/tron-monitor.sh).

## One-Shot Creation Contract

When the primary orchestrator creates a task through `POST /api/tasks`, every stage must include:

- `assignedAgentId`
- `assignedAgentName`
- `title`
- `goal`
- `inputs`
- `requiredOutputs`
- `doneCondition`
- `boundaries`

The primary orchestrator should not create role-only stages and defer agent choice to later.
