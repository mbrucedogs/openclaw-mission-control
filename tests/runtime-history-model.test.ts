import assert from 'node:assert/strict'
import test from 'node:test'

import { buildRuntimeHistoryModel } from '../src/app/runtime/runtime-history-model'

test('buildRuntimeHistoryModel summarizes runtime events and orders the newest rows first', () => {
  const model = buildRuntimeHistoryModel({
    totalCount: 3,
    latestCursor: 42,
    events: [
      {
        id: 'evt-1',
        event_type: 'openclaw.agent.idle',
        actor: 'rita',
        payload: '{"taskId":"task-1","stepId":"step-2"}',
        cursor: 41,
        created_at: '2026-03-22T12:01:00.000Z',
      },
      {
        id: 'evt-2',
        event_type: 'openclaw.agent.active',
        actor: 'max',
        payload: '{"taskId":"task-2","summary":"Investigating approvals"}',
        cursor: 42,
        created_at: '2026-03-22T12:02:00.000Z',
      },
    ],
  })

  assert.deepEqual(model.summary, [
    { label: 'Events', value: '3' },
    { label: 'Latest cursor', value: '42' },
    { label: 'Visible rows', value: '2' },
  ])
  assert.equal(model.events[0]?.id, 'evt-2')
  assert.equal(model.events[0]?.payloadRows[0]?.label, 'Task')
  assert.equal(model.events[0]?.payloadRows[0]?.value, 'task-2')
  assert.equal(model.events[0]?.payloadRows[1]?.label, 'Summary')
  assert.equal(model.events[0]?.payloadRows[1]?.value, 'Investigating approvals')
})

test('buildRuntimeHistoryModel fails safe when event payload is malformed', () => {
  const model = buildRuntimeHistoryModel({
    totalCount: 1,
    latestCursor: 9,
    events: [
      {
        id: 'evt-1',
        event_type: 'openclaw.agent.active',
        actor: 'max',
        payload: '{not-json',
        cursor: 9,
        created_at: '2026-03-22T12:02:00.000Z',
      },
    ],
  })

  assert.equal(model.events[0]?.payloadRows[0]?.label, 'Payload')
  assert.equal(model.events[0]?.payloadRows[0]?.value, 'Unavailable')
})
