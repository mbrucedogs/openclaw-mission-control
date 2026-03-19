# Mission Control Product Definition

## Product

Mission Control is a local task orchestration system for OpenClaw built around:

- `Task`
- `Planned Stage`
- `Run`
- `Run Step Event`
- `Issue Thread`
- `Template`

The system is designed for one primary orchestrator and a known roster of discovered agents.

## Core Rules

- The task is the source of truth.
- Every task is created in one shot with its ordered planned stages.
- Tasks save to `Backlog` first. Runs start later through an explicit start action.
- Every execution packet must name one exact assigned agent.
- The internal role is derived from that selected agent.
- The primary orchestrator and the human use the same creation contract.
- The primary orchestrator validates each step before the run advances.
- The primary orchestrator should try to resolve execution problems first. If the orchestrator cannot, the blocker becomes a task-bound issue thread instead of a main-chat interruption.
- Recovery blocks stale work and wakes the primary orchestrator. It does not silently restart work.

## Authoring Model

Task creation collects:

- title
- summary
- priority
- project
- optional final deliverable
- initiated by
- optional template
- ordered stage packets

Every step packet must include:

- title
- assignedAgentId
- assignedAgentName
- goal
- inputs
- requiredOutputs
- doneCondition
- boundaries

Optional:

- role when posting directly to the API, though it is derived automatically in normal authoring
- dependencies
- notesForOrchestrator

## Execution Model

Normal step lifecycle:

`draft -> ready -> running -> submitted -> complete`

Exceptional transitions:

- `running -> blocked`
- `submitted -> blocked`
- `blocked -> ready`

The primary orchestrator is responsible for:

- creating work
- starting the task when it is ready to execute
- starting the ready step
- reviewing heartbeats and progress notes
- validating completion packets
- deciding retry, rerun, keep-blocked, or escalation

## API Contract

Canonical one-shot creation endpoint:

- `POST /api/tasks`

Operational endpoints:

- `GET /api/tasks`
- `GET /api/tasks/:id`
- `PATCH /api/tasks/:id`
- `POST /api/tasks/:id/start`
- `GET /api/tasks/:id/events`
- `GET /api/tasks/:id/issues`
- `POST /api/tasks/:id/issues`
- `PATCH /api/tasks/:id/issues/:issueId`
- `POST /api/tasks/:id/steps/:stepId`
- `PATCH /api/tasks/:id/steps/:stepId`
- `POST /api/tasks/:id/steps/:stepId/events`
- `POST /api/tasks/:id/steps/:stepId/completion`
- `POST /api/tasks/:id/rerun`
- `GET /api/task-templates`
- `POST /api/task-templates`
- `GET /api/recovery/scan`

See [`docs/API_REFERENCE.md`](./docs/API_REFERENCE.md) for request and response details.

## UX Surface

- Board columns reflect task lifecycle status: `Backlog`, `In Progress`, `In Review`, `Blocked`, `Done`.
- The current stage of execution such as `Planning`, `Build`, `QA`, or `Review` is shown inside the task card and task detail view.
- Task creation uses a wizard.
- Task detail is the operational center for editing task summary fields, editing planned stages or eligible run stages, starting the task, validation, events, notes, evidence, retry, rerun, issue threads, and recovery.

## Explicit Non-Goals

The current product does not include:

- separate orchestration CRUD surfaces outside task/run/step records
- automatic multi-route assembly at task creation time
- manual route-editing screens before task creation
