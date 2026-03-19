# Mission Control Docs

Start here when training or refreshing the primary orchestrator.

Mission Control now uses a `Task -> Plan -> Run` model.

- A `Task` is the durable work item and history container.
- A `Planned Stage` is the saved execution packet attached to the task before work starts.
- A `Run` is one execution attempt for that task.
- A `Run Stage` is the scoped packet given to one exact assigned agent.
- A `Run Step Event` records heartbeats, progress notes, completion submission, validation, retry, rerun, and escalation.
- An `Issue Thread` is the blocker/decision space attached to a task and optionally the current stage.

## Read Order

1. `README.md` - This overview
2. `API_REFERENCE.md` - Canonical API contract and examples
3. `ORCHESTRATOR_OPERATING_MODEL.md` - What the primary orchestrator is expected to do
4. `TASK_AUTHORING_WIZARD.md` - How one-shot creation works
5. `STEP_EXECUTION.md` - How steps move through start, submission, validation, and retry
6. `RECOVERY_AND_MONITORING.md` - 10-minute recovery scan behavior
7. `AI_TRAINING_GUIDE.md` - How to train the primary orchestrator on the rebuilt system

## Critical Rules

- The wizard-backed task creation contract is the only supported way to create new work.
- `POST /api/tasks` saves the task and planned stages only.
- `POST /api/tasks/:id/start` is what instantiates the first run.
- The primary orchestrator and the human operator use the same API contract.
- Task detail supports editing task summary fields and editable planned stages in place before the run starts.
- Each execution packet must name one concrete assigned agent before creation.
- The internal role is derived from the selected agent's configured type.
- Every stage requires a structured packet and assigned agent before the task can be created.
- Every running stage requires a structured completion packet before the primary orchestrator can validate it.
- Board columns reflect task lifecycle status: `Backlog`, `In Progress`, `In Review`, `Blocked`, `Done`.
- Current execution stage such as `Planning`, `Build`, `QA`, or `Review` is shown inside the task card and detail view.
- Blockers that the primary orchestrator cannot resolve must become task-bound issue threads with replies, not loose side conversations.
- A stalled stage is blocked and escalated; it is not auto-restarted by default.
