# API Reference

This is the current task-orchestration API.

## Authentication

External requests must include:

- `X-API-Key: <key>`

## Task Creation

`POST /api/tasks`

This is the canonical creation endpoint for both the wizard UI and the primary orchestrator.

It saves:

- the task
- the planned stages
- optional template defaults already applied

It does not start execution.

Request:

```json
{
  "title": "Summarize a YouTube video",
  "goal": "Create a Markdown summary from a YouTube video transcript.",
  "priority": "high",
  "project": "optional-project-id",
  "initiatedBy": "primary-orchestrator",
  "acceptanceCriteria": [
    "Markdown summary file saved on the local filesystem"
  ],
  "templateId": "optional-template-id",
  "steps": [
    {
      "title": "Download transcript",
      "assignedAgentId": "example-researcher",
      "assignedAgentName": "Research Agent",
      "goal": "Retrieve the transcript and source title.",
      "inputs": ["YouTube URL"],
      "requiredOutputs": ["Transcript text", "Transcript file path", "Video title"],
      "doneCondition": "Transcript is ready for summarization.",
      "boundaries": ["Do not summarize the transcript"],
      "dependencies": [],
      "notesForOrchestrator": "Block if no transcript is available."
    }
  ]
}
```

Validation rules:

- `title` is required.
- `steps` must be present and non-empty.
- every step must include an exact assigned agent
- the assigned agent must exist
- the step role is derived from the assigned agent when omitted
- if a role is provided, the selected agent still acts as the source of truth
- incomplete stage packets are rejected

Response:

- `201` with the saved task in `Backlog`
- `currentRunId` is empty
- `stagePlan` contains the saved execution flow

## Starting Execution

`POST /api/tasks/:id/start`

This instantiates the first run from the saved stage plan.

Request:

```json
{
  "actor": "primary-orchestrator",
  "reason": "Start execution now"
}
```

## Task Edits

`PATCH /api/tasks/:id`

Use this to update task-level summary fields.

Request:

```json
{
  "actor": "primary-orchestrator",
  "title": "Summarize a YouTube video",
  "goal": "Create a Markdown summary from a YouTube video transcript.",
  "priority": "high",
  "project": "optional-project-id",
  "acceptanceCriteria": [
    "Markdown summary file saved on the local filesystem"
  ]
}
```

In the current UI this corresponds to:

- `Title`
- `Summary`
- `Priority`
- `Project`
- `Final Deliverable`

## Task Queries

`GET /api/tasks`

Query params:

- `status`
- `owner`
- `project`
- `include=currentRun,comments,activity,evidence,plan,issues`

`GET /api/tasks/:id`

Query params:

- `include=currentRun,comments,activity,evidence,plan,issues`

`GET /api/tasks/activity`

Returns the latest task-native activity across all tasks for the live activity panel.

Query params:

- `limit`

## Runtime Activity

`GET /api/activity`

Returns a runtime-backed operator activity payload built from:

- recent `task_activity`
- recent `runtime_events`
- fresh `step_heartbeats`

It does not read from a legacy filesystem activity log.

Response shape:

```json
{
  "activities": [],
  "agents": []
}
```

`DELETE /api/tasks/:id`

Deletes the task and its dependent orchestration records.

Cascading delete removes:

- runs
- steps
- step events
- comments
- activity
- evidence
- document links

## Stage Operations

`GET /api/tasks/:id/steps`

Returns:

- the active run stages if a run exists
- otherwise the saved planned stages

`POST /api/tasks/:id/steps/:stepId`

Actions:

- `start`
- `block`
- `retry`
- `validate`

Examples:

```json
{ "action": "start", "actor": "primary-orchestrator" }
```

```json
{ "action": "retry", "actor": "primary-orchestrator", "reason": "Retry requested by the primary orchestrator" }
```

```json
{ "action": "validate", "actor": "primary-orchestrator", "decision": "pass", "notes": "Validation passed" }
```

`PATCH /api/tasks/:id/steps/:stepId`

This updates a stored stage packet in place.

Rules:

- planned stages can be edited before the task starts
- once the task has started, only `draft`, `ready`, and `blocked` run stages can be edited
- `running`, `submitted`, and `complete` run stages are immutable
- assigned agent validation is enforced again on every edit
- the internal role is derived from the selected agent

Request:

```json
{
  "actor": "primary-orchestrator",
  "title": "Download transcript",
  "assignedAgentId": "example-researcher",
  "assignedAgentName": "Research Agent",
  "goal": "Retrieve the transcript and source title.",
  "inputs": ["YouTube URL", "Task summary"],
  "requiredOutputs": ["Transcript text", "Transcript file path", "Video title"],
  "doneCondition": "Transcript is ready for summarization.",
  "boundaries": ["Do not summarize the transcript", "Do not save the final summary file"],
  "dependencies": [],
  "notesForOrchestrator": "Block if no transcript is available."
}
```

## Step Events

`POST /api/tasks/:id/steps/:stepId/events`

Supported event types:

- `created`
- `updated`
- `started`
- `heartbeat`
- `progress_note`
- `completion_submitted`
- `validation_passed`
- `validation_rejected`
- `blocked`
- `retry_requested`
- `restarted`
- `rerun_created`
- `escalated`

Example:

```json
{
  "actor": "primary-orchestrator",
  "actorType": "system",
  "eventType": "heartbeat",
  "message": "Heartbeat acknowledged by the primary orchestrator",
  "heartbeatAt": "2026-03-18T00:00:00.000Z"
}
```

## Completion Packet

`POST /api/tasks/:id/steps/:stepId/completion`

Request:

```json
{
  "actor": "agent-worker",
  "summary": "Implemented requested work.",
  "outputsProduced": ["path/to/output"],
  "validationResult": "Build passed locally.",
  "issues": "No known blockers.",
  "nextStepRecommendation": "Proceed to QA."
}
```

All fields are required.

## Reruns

`POST /api/tasks/:id/rerun`

Request:

```json
{
  "stepNumber": 2,
  "actor": "primary-orchestrator",
  "reason": "Rerun from implementation"
}
```

This creates a new run and preserves prior run history.

## Issue Threads

`GET /api/tasks/:id/issues`

`POST /api/tasks/:id/issues`

Use this when the primary orchestrator or the human operator needs a blocker/decision thread attached to the task.

Request:

```json
{
  "title": "Need source URL",
  "summary": "The primary orchestrator cannot continue because the source URL is missing.",
  "assignedTo": "human",
  "createdBy": "primary-orchestrator",
  "runId": "optional-run-id",
  "stepId": "optional-step-id"
}
```

`PATCH /api/tasks/:id/issues/:issueId`

Use this to:

- reassign to `orchestrator` or `human`
- change status to `waiting_on_orchestrator`, `waiting_on_human`, or `resolved`
- store a resolution

Example:

```json
{
  "actor": "primary-orchestrator",
  "status": "resolved",
  "resolution": "User supplied the missing source URL in the thread."
}
```

## Comments And Replies

`GET /api/tasks/:id/comments`

Optional query params:

- `type`
- `issueId`

`POST /api/tasks/:id/comments`

Comments can be:

- general task notes
- issue-thread replies
- replies to replies through `parentId`

Example issue-thread reply:

```json
{
  "content": "Use this URL instead.",
  "author": "matt",
  "authorType": "user",
  "issueId": "iss-123",
  "parentId": "optional-parent-comment-id"
}
```

## Templates

`GET /api/task-templates`

Returns the saved template library.

`POST /api/task-templates`

Supports three modes:

1. Save a run as a template

```json
{
  "runId": "run-123",
  "name": "Website Build",
  "description": "Reusable website delivery flow",
  "actor": "primary-orchestrator"
}
```

2. Create a template directly

```json
{
  "name": "YouTube Transcript to Markdown Summary",
  "description": "Fetch transcript, write markdown, verify output",
  "actor": "primary-orchestrator",
  "taskDefaults": {
    "goal": "Create a Markdown summary from a YouTube transcript.",
    "acceptanceCriteria": [
      "Markdown summary file saved to the local filesystem"
    ]
  },
  "steps": [
    {
      "title": "Download transcript",
      "assignedAgentId": "example-researcher",
      "assignedAgentName": "Research Agent",
      "goal": "Retrieve the transcript and source title.",
      "inputs": ["YouTube URL"],
      "requiredOutputs": ["Transcript text", "Transcript file path", "Video title"],
      "doneCondition": "Transcript is ready for summarization.",
      "boundaries": ["Do not summarize the transcript"]
    }
  ]
}
```

3. Duplicate an existing template

```json
{
  "sourceTemplateId": "tpl-123",
  "name": "YouTube Transcript to Markdown Summary Copy",
  "actor": "primary-orchestrator"
}
```

`GET /api/task-templates/:id`

Returns one saved template.

`PATCH /api/task-templates/:id`

Updates a saved template in place. The payload shape matches direct template creation.

`DELETE /api/task-templates/:id`

Deletes a saved template.

Saved templates preserve exact assigned agents, and their validation rules match task stage-plan validation:

- `name` is required
- at least one stage is required
- every stage must include an exact assigned agent
- the assigned agent must exist
- incomplete stage packets are rejected

## Recovery

`GET /api/recovery/scan`

Query params:

- `staleMinutes`

The scan finds stale running steps, blocks them, records escalation events, and returns the work the primary orchestrator needs to review.

## OpenClaw Runtime APIs

These endpoints back the live operational surfaces of the app.

## Agents

`GET /api/agents`

Returns the discovered agent roster merged with fresh gateway runtime where available.

Live runtime fields can include:

- `isActive`
- `gatewaySessionCount`
- `currentModel`
- `percentUsed`

This endpoint uses the fresh async gateway-backed agent path rather than the cached sync helper.

## Status

`GET /api/status`

Returns app-level status plus truthful gateway connectivity.

Response shape:

```json
{
  "status": "online",
  "version": "2.0.0-mission-control",
  "gateway": "connected",
  "environment": "local",
  "stats": {
    "agents": 6,
    "tasks": 24
  },
  "timestamp": "2026-03-22T12:00:00.000Z"
}
```

`gateway` becomes `disconnected` when the app cannot reach OpenClaw gateway health.

## Sessions

`GET /api/sessions`

Returns a normalized sessions payload built from gateway status data.

Response shape:

```json
{
  "sessions": [
    {
      "id": "sess-123",
      "agentId": "builder-1",
      "model": "gpt-5.4",
      "startedAt": "2026-03-22T11:30:00.000Z",
      "updatedAt": "2026-03-22T11:59:00.000Z",
      "ageMs": 1740000,
      "percentUsed": 42
    }
  ]
}
```

If gateway status is unavailable, the endpoint fails safe with an empty `sessions` list.

## Gateway Snapshot

`GET /api/gateway`

Returns the broader gateway snapshot used by the dashboard and gateway panel.

The response includes:

- `connected`
- `diagnostics`
- `gateway`
- `agents`
- `sessions`

`diagnostics` normalizes transport/runtime state into:

- `transportMode` -> `sdk`, `cli-fallback`, or `failed`
- `state` -> `connected`, `degraded`, or `failed`
- `reasonCode` -> `ok`, `partial_data`, `auth_failed`, `insufficient_scope`, `unreachable`, `timeout`, `transport_missing`, or `unknown`
- `operatorMessage`
- `hasRawError`

This allows the dashboard to distinguish full outages from partial or scope-limited runtime access without exposing raw gateway errors in the main UI.

This route also attempts to sync gateway-derived runtime events before returning.

## Gateway Diagnostics

`GET /api/gateway/diagnostics`

Returns the richer operator-facing runtime capability snapshot used by `/gateway`.

The response includes:

- `checkedAt`
- `config`
- `summary`
- `checks`

`config` includes:

- `gatewayUrl`
- `workspaceRoot`
- `timeoutMs`
- `hasTokenConfigured`

`summary` includes:

- `transportMode`
- `state`
- `reasonCode`
- `operatorMessage`
- `runtimeVersion`
- `openClawVersion`
- `defaultAgentId`
- `heartbeatSeconds`
- `channelCount`
- `agentCount`
- `sessionCount`

`checks` is a list of normalized compatibility checks such as:

- `transport`
- `gateway`
- `auth`
- `scope`
- `runtime`
- `cli`

Each check includes:

- `id`
- `label`
- `status` -> `pass`, `warn`, or `fail`
- `detail`

## Exec Approvals

`GET /api/exec-approvals`

Returns pending gateway exec approvals in normalized shape:

```json
{
  "approvals": [
    {
      "id": "apr-123",
      "agentId": "builder-1",
      "risk": "medium",
      "command": "npm publish",
      "reason": "Publishing requires approval",
      "status": "pending"
    }
  ]
}
```

`POST /api/exec-approvals`

Request:

```json
{
  "id": "apr-123",
  "action": "approve"
}
```

Supported actions:

- `approve`
- `always_allow`
- `deny`

## Runtime Events Stream

`GET /api/events/stream`

Server-sent events stream for runtime snapshots and agent activity transitions.

Behavior:

- emits a `connection` event when the stream opens
- emits `event` messages for replayed or newly synced runtime events
- supports replay from `Last-Event-ID`
- sends heartbeat comments periodically to keep the stream alive

## Activity Feed

`GET /api/activity/feed`

Returns task-native agent activity and active heartbeat state for the live activity UI.

Behavior notes:

- only fresh heartbeat rows are returned
- stale heartbeat rows are pruned during heartbeat writes and activity polling

Query params:

- `taskId`
- `agent`
- `limit`

Response shape:

```json
{
  "events": [],
  "agents": []
}
```
