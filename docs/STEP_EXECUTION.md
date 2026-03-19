# Step Execution

## Step Lifecycle

Normal lifecycle:

`draft -> ready -> running -> submitted -> complete`

Exceptional lifecycle:

`running -> blocked`

`submitted -> blocked` when the primary orchestrator rejects validation

`blocked -> ready` when the primary orchestrator retries the stage

## Step Start

When a task is still only a saved plan:

- it stays in `Backlog`
- the planned stages can still be edited
- there is no run history yet

When the task is started:

- the first run is created from the saved plan
- stage 1 becomes `ready`
- the task moves into active work

When a stage starts:

- the stored assigned agent is the expected executor
- the step becomes `running`
- heartbeat tracking begins

If a stage does not have an assigned agent, it is invalid and must not start.

## Progress

During execution, agents or the primary orchestrator should emit:

- `heartbeat`
- `progress_note`
- `updated` when the primary orchestrator revises a still-editable stage packet

These events update the stage timeline and keep recovery logic accurate.

## Completion Submission

A stage cannot be validated until it has a structured completion packet:

- summary
- outputs produced
- validation result
- issues or risks
- next-step recommendation

## Validation

When the primary orchestrator passes validation:

- the current stage becomes `complete`
- the next stage becomes `ready`
- the task stays in `In Progress` or `In Review` based on which stage is now active

When the primary orchestrator rejects validation:

- the stage becomes `blocked`
- the rejection is recorded as a run-step event
- the task board moves to `Blocked`

## Edit Rules

Planned stage packets can be edited before the run starts.

Started stage packets can only be edited while they are still:

- `draft`
- `ready`
- `blocked`

Once a stage is `running`, `submitted`, or `complete`, the packet is locked. Change the task through retry, rerun, or a future stage instead of mutating recorded execution.

## Blockers And Issue Threads

If the primary orchestrator cannot resolve a blocked stage alone:

- open a task issue thread
- explain what failed
- explain what the primary orchestrator already tried
- assign the issue to `human` or `orchestrator`
- continue the conversation inside that issue thread until resolved

Issue threads keep blocker context on the task itself so parallel work does not depend on the main chat.
