import assert from 'node:assert/strict'
import test from 'node:test'

import { buildStatusPayload } from '../src/app/api/status/route'

test('buildStatusPayload reports a connected gateway when gateway health is reachable', () => {
  const payload = buildStatusPayload({
    agentCount: 6,
    taskCount: 18,
    gatewayConnected: true,
    timestamp: '2026-03-22T12:00:00.000Z',
  })

  assert.deepEqual(payload, {
    status: 'online',
    version: '2.0.0-mission-control',
    gateway: 'connected',
    environment: 'local',
    stats: {
      agents: 6,
      tasks: 18,
    },
    timestamp: '2026-03-22T12:00:00.000Z',
  })
})

test('buildStatusPayload reports a disconnected gateway while preserving database stats', () => {
  const payload = buildStatusPayload({
    agentCount: 2,
    taskCount: 5,
    gatewayConnected: false,
    timestamp: '2026-03-22T12:30:00.000Z',
  })

  assert.deepEqual(payload, {
    status: 'online',
    version: '2.0.0-mission-control',
    gateway: 'disconnected',
    environment: 'local',
    stats: {
      agents: 2,
      tasks: 5,
    },
    timestamp: '2026-03-22T12:30:00.000Z',
  })
})
