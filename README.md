# Mission Control

Mission Control is a task orchestration system for OpenClaw organizations built around a `Task -> Plan -> Run` model.

## What It Does

- Creates tasks through a wizard-first authoring flow
- Saves tasks in `Backlog` first, with the execution plan attached before any run starts
- Lets the primary orchestrator or the user edit task summary fields and planned stages from task detail before execution
- Stores execution runs separately, with full retry and rerun history once a task starts
- Breaks work into exact-agent stage packets for researcher, builder, tester, and reviewer work
- Tracks live step events, comments, and evidence
- Tracks blocker conversations through task-bound issue threads with replies
- Surfaces stalled work to the primary orchestrator through a recovery scan instead of silently retrying
- Discovers the OpenClaw agent roster dynamically from workspace metadata
- Connects to OpenClaw through an explicit native gateway client configured by URL/token instead of shelling out to the CLI
- Uses task lifecycle statuses on the board: `Backlog`, `In Progress`, `In Review`, `Blocked`, `Done`
- Shows the current execution stage inside each task as secondary context

## Current Product Model

- `Task`: durable work item and history container
- `Planned Stage`: saved execution packet attached to the task before work starts
- `Run`: one execution attempt for the task
- `Run Stage`: a scoped packet with one required assigned agent, plus inputs, outputs, done condition, and boundaries
- `Run Step Event`: progress, heartbeat, validation, retry, rerun, and escalation history
- `Issue Thread`: a blocker or decision thread assigned to the primary orchestrator or the human operator, with replies attached to the task
- `Template`: an optional saved run that can prefill the wizard later

## Quick Start

```bash
npm install
npm run dev
```

Open [http://localhost:4000](http://localhost:4000).

## Docs

AI training and operating docs live in [`docs/`](./docs):

- [`docs/README.md`](./docs/README.md)
- [`docs/API_REFERENCE.md`](./docs/API_REFERENCE.md)
- [`docs/OPENCLAW_RUNTIME.md`](./docs/OPENCLAW_RUNTIME.md)
- [`docs/ORCHESTRATOR_OPERATING_MODEL.md`](./docs/ORCHESTRATOR_OPERATING_MODEL.md)
- [`docs/TASK_AUTHORING_WIZARD.md`](./docs/TASK_AUTHORING_WIZARD.md)
- [`docs/STEP_EXECUTION.md`](./docs/STEP_EXECUTION.md)
- [`docs/RECOVERY_AND_MONITORING.md`](./docs/RECOVERY_AND_MONITORING.md)
- [`docs/AI_TRAINING_GUIDE.md`](./docs/AI_TRAINING_GUIDE.md)

## API Highlights

```text
GET    /api/tasks
POST   /api/tasks
GET    /api/tasks/:id
PATCH  /api/tasks/:id
DELETE /api/tasks/:id
POST   /api/tasks/:id/start
GET    /api/tasks/:id/steps
POST   /api/tasks/:id/steps/:stepId
PATCH  /api/tasks/:id/steps/:stepId
POST   /api/tasks/:id/steps/:stepId/completion
POST   /api/tasks/:id/steps/:stepId/events
GET    /api/tasks/:id/issues
POST   /api/tasks/:id/issues
PATCH  /api/tasks/:id/issues/:issueId
POST   /api/tasks/:id/rerun
GET    /api/tasks/activity
GET    /api/task-templates
POST   /api/task-templates
GET    /api/task-templates/:id
PATCH  /api/task-templates/:id
DELETE /api/task-templates/:id
GET    /api/recovery/scan
```

`POST /api/tasks` is the canonical one-shot creation interface for both the primary orchestrator and the wizard UI. It saves the task and planned stages only. `POST /api/tasks/:id/start` instantiates the first run later when the task is ready to execute. Each execution packet in the payload must include `assignedAgentId` and `assignedAgentName`, and the internal role is derived from that agent.

Saved templates can be managed directly from `/tasks` through `Manage Templates`, including edit, duplicate, and delete.

The `/tasks` screen also includes a show/hide live activity panel backed by the task-native activity feed.

Full request details live in [`docs/API_REFERENCE.md`](./docs/API_REFERENCE.md).

All API requests require the `X-API-Key` header when made outside the authenticated UI session.

## OpenClaw Runtime Config

Mission Control now talks to OpenClaw through an explicit native gateway client.

Primary runtime config:

```bash
OPENCLAW_GATEWAY_URL=ws://127.0.0.1:18789
OPENCLAW_GATEWAY_TOKEN=
OPENCLAW_GATEWAY_TIMEOUT_MS=10000
OPENCLAW_WORKSPACE=~/openclaw/workspace
```

Notes:

- `OPENCLAW_GATEWAY_URL` can stay loopback for same-machine deployments.
- If OpenClaw moves to another machine later, point the URL at the remote gateway and provide the token if required.
- `OPENCLAW_WORKSPACE` is still used for local discovery of agent metadata and docs.
- Runtime access no longer depends on spawning the `openclaw` CLI from Mission Control.

## Development

```bash
npm run dev
npm run build
npm run lint
node --import tsx --test tests/task-runs.test.ts
```

## Recovery Monitor

Use [`tron-monitor.sh`](/Volumes/Data/openclaw/workspace/projects/Web/alex-mission-control/tron-monitor.sh) as the default scheduled monitor for stalled stages and actionable orchestrator wakeups.

Run it every 10 minutes.

[`scripts/orchestrator.ts`](/Volumes/Data/openclaw/workspace/projects/Web/alex-mission-control/scripts/orchestrator.ts) remains available as a manual/local polling helper, but it is not the preferred default monitor path.
