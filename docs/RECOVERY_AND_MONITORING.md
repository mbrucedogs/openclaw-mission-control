# Recovery And Monitoring

Mission Control expects a recovery scan to run every 10 minutes.

Endpoint:

- `GET /api/recovery/scan`

## Default Monitor Path

The default wakeup monitor is:

- [`tron-monitor.sh`](/Volumes/Data/openclaw/workspace/projects/Web/alex-mission-control/tron-monitor.sh)

Run it on a 10-minute schedule.

It is responsible for:

- calling the recovery scan
- checking the actionable orchestrator queue
- waking the primary orchestrator through OpenClaw when action is required

The older development poller in [`scripts/orchestrator.ts`](/Volumes/Data/openclaw/workspace/projects/Web/alex-mission-control/scripts/orchestrator.ts) should be treated as a manual/local helper, not the default production-style monitor path.

## Recovery Scan Responsibilities

The scan should:

1. look for `running` steps with stale heartbeats
2. mark those steps `blocked`
3. record a run-step escalation event
4. wake the primary orchestrator with the blocked step context

## Default Policy

The recovery scan does not auto-restart work by default.

The scan must not silently change execution direction. It only detects stale work and escalates to the primary orchestrator.

## Why

Auto-restarting by default caused hidden loops and unclear responsibility. The new model makes the decision explicit:

- retry same step
- rerun from this step
- keep blocked
- escalate to human

If the primary orchestrator cannot resolve the blocked state alone, the orchestrator should open or update a task issue thread so the blocker conversation stays attached to the task.

## Operational Expectation

If a task appears active on the board but the agent timed out or stopped sending heartbeat updates, the scan is responsible for surfacing that mismatch to the primary orchestrator.
