import assert from 'node:assert/strict'
import test from 'node:test'

import { buildActivityPayload } from '../src/app/api/activity/route'

test('buildActivityPayload combines task activity, runtime events, and fresh agent heartbeats', () => {
  const payload = buildActivityPayload({
    taskActivityRows: [
      {
        id: 'task-1',
        actor: 'Rita',
        activity_type: 'heartbeat',
        details: JSON.stringify({ message: 'Researching' }),
        created_at: '2026-03-22T12:00:00.000Z',
      },
    ],
    runtimeEvents: [
      {
        id: 'runtime-1',
        event_type: 'openclaw.agent.active',
        actor: 'rita',
        payload: JSON.stringify({ nextCount: 1 }),
        cursor: 2,
        created_at: '2026-03-22T12:01:00.000Z',
      },
    ],
    heartbeatRows: [
      {
        agent_id: 'rita',
        agent_name: 'Rita',
        task_id: 'task-1',
        step_id: 'step-1',
        run_id: 'run-1',
        task_title: 'Research flow',
        step_title: 'Investigate',
        last_activity: 'Researching',
        heartbeat_count: 3,
        is_stuck: 0,
        stuck_reason: null,
        last_seen: '2026-03-22T12:02:00.000Z',
        first_seen: '2026-03-22T11:55:00.000Z',
      },
    ],
  })

  assert.equal(payload.activities.length, 2)
  assert.deepEqual(payload.activities[0], {
    id: 'runtime-1',
    actor: 'rita',
    eventType: 'openclaw.agent.active',
    message: 'openclaw.agent.active',
    timestamp: '2026-03-22T12:01:00.000Z',
    source: 'runtime',
    metadata: { nextCount: 1 },
  })
  assert.deepEqual(payload.activities[1], {
    id: 'task-1',
    actor: 'Rita',
    eventType: 'heartbeat',
    message: 'Researching',
    timestamp: '2026-03-22T12:00:00.000Z',
    source: 'task',
    metadata: {},
  })

  assert.deepEqual(payload.agents, [
    {
      agentId: 'rita',
      agentName: 'Rita',
      currentTask: 'task-1',
      currentStep: 'step-1',
      currentRun: 'run-1',
      taskTitle: 'Research flow',
      stepTitle: 'Investigate',
      lastActivity: 'Researching',
      heartbeatCount: 3,
      isStuck: false,
      stuckReason: null,
      lastSeen: '2026-03-22T12:02:00.000Z',
      firstSeen: '2026-03-22T11:55:00.000Z',
      status: 'active',
    },
  ])
})

test('buildActivityPayload handles empty task and runtime sources without filesystem fallbacks', () => {
  const payload = buildActivityPayload({
    taskActivityRows: [],
    runtimeEvents: [],
    heartbeatRows: [],
  })

  assert.deepEqual(payload, {
    activities: [],
    agents: [],
  })
})
