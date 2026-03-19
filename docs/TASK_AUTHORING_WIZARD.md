# Task Authoring Wizard

All new tasks should be authored through the wizard or the matching API payload.

The wizard payload and the primary-orchestrator payload are the same contract.

## Wizard Stages

1. `Task Intake`
   - title
   - summary
   - priority
   - project
   - optional final deliverable
2. `Starting Point`
   - blank task plan
   - or saved template
   - templates can be managed from the `/tasks` screen through `Manage Templates`
3. `Stage Design`
   - ordered structured stage packets
4. `Review`
   - confirm board path and planned execution flow before creation

## Task Intake Rules

The first screen is intentionally summary-only.

Use it for:

- what the task is
- the high-level outcome
- optional final artifact

Do not put detailed source material, URLs, file paths, or stage instructions there unless they truly apply to the entire task. Those belong in the stage packets.

The first screen is not meant to describe the full implementation. The combined task summary plus ordered stages become the real picture of the work.

## Required Stage Packet Fields

Each stage must define:

- `title`
- `assignedAgentId`
- `assignedAgentName`
- `goal`
- `inputs`
- `requiredOutputs`
- `doneCondition`
- `boundaries`

Optional:

- `role` when posting directly through the API, though the system will derive it from the selected agent when possible
- `dependencies`
- `notesForOrchestrator`

## Agent-First Authoring

The wizard no longer asks the human to choose both role and agent.

- `Assigned Agent` is the primary choice
- the internal orchestration role is derived from that agent's configured type
- the derived execution stage is shown as read-only context

This keeps the UI aligned with the real source of truth and avoids duplicate selection.

## Saved Template Management

Saved templates are editable from the task screen.

The template manager supports:

- create blank templates
- edit template name, description, default summary, and default final deliverable
- edit the full stage packet sequence
- duplicate a template into a new saved template
- delete a template

The template editor uses the same stage packet structure as task planning so there is no separate authoring model to learn.

## Editing After Creation

The task detail view now supports in-place editing.

Task-level edits update:

- title
- summary
- priority
- project
- final deliverable

Stage-level edits update the stored packet in place.

- planned stages can be edited before the task starts
- run stages can be edited only when the stage is still:

- `draft`
- `ready`
- `blocked`

Run stages that are already `running`, `submitted`, or `complete` stay locked so execution history remains trustworthy.

## API Contract

The primary orchestrator can create the exact same structure in one shot through `POST /api/tasks`. The wizard is only a guided way to build that JSON payload.

That call saves the task and its planned stages in `Backlog`.

Execution begins later through `POST /api/tasks/:id/start`.

See `API_REFERENCE.md` for the full payload.

## Design Intent

The wizard exists to stop two failure modes:

1. The human writes a large freeform task description and then has to restate the same information in each stage.
2. An agent sees the whole task and attempts to do everything instead of one stage.

If a task cannot be expressed as scoped stages, it is not ready to create.
