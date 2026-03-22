import assert from 'node:assert/strict'
import test from 'node:test'

import { buildGatewayRuntimeMap, mergeAgentsWithRuntime } from '../src/lib/domain/agents'
import type { GatewayHealthResponse, GatewayStatusResponse } from '../src/lib/openclaw/gateway'

test('mergeAgentsWithRuntime keeps cached sync agent views explicit when no gateway runtime is available', () => {
  const agents = mergeAgentsWithRuntime(
    [
      {
        id: 'main',
        name: 'Max',
        role: 'Primary Orchestrator',
        status: 'idle',
        mission: '',
        responsibilities: [],
      },
    ],
    new Map([['main', { status: 'idle', type: 'orchestrator' }]]),
    new Map(),
  )

  assert.equal(agents[0]?.gatewaySessionCount, 0)
  assert.equal(agents[0]?.isActive, false)
  assert.equal(agents[0]?.type, 'orchestrator')
})

test('buildGatewayRuntimeMap combines fresh health and status data for async callers', () => {
  const health: GatewayHealthResponse = {
    ok: true,
    ts: 100,
    channels: {},
    channelOrder: [],
    heartbeatSeconds: 30,
    defaultAgentId: 'main',
    agents: [
      {
        agentId: 'main',
        name: 'Max',
        isDefault: true,
        heartbeat: { enabled: true, every: '30m', everyMs: 1800000, prompt: '', target: '', ackMaxChars: 40 },
        sessions: { path: '/tmp/main', count: 2, recent: [{ key: 'agent:main:main', updatedAt: 100, age: 0 }] },
      },
    ],
    sessions: { path: '/tmp/main', count: 2, recent: [{ key: 'agent:main:main', updatedAt: 100, age: 0 }] },
  }

  const status: GatewayStatusResponse = {
    runtimeVersion: '2026.3.13',
    heartbeat: { defaultAgentId: 'main', agents: [{ agentId: 'main', enabled: true, every: '30m', everyMs: 1800000 }] },
    channelSummary: [],
    queuedSystemEvents: [],
    sessions: {
      paths: ['/tmp/main'],
      count: 2,
      defaults: { model: 'gpt-5.4', contextTokens: 200000 },
      recent: [],
      byAgent: [
        {
          agentId: 'main',
          path: '/tmp/main',
          count: 2,
          recent: [
            {
              agentId: 'main',
              key: 'agent:main:main',
              kind: 'direct',
              sessionId: 'session-1',
              updatedAt: 100,
              age: 0,
              inputTokens: 10,
              outputTokens: 5,
              totalTokens: 15,
              remainingTokens: 199985,
              percentUsed: 8,
              model: 'gpt-5.4',
              contextTokens: 200000,
              flags: [],
            },
          ],
        },
      ],
    },
  }

  const runtimeMap = buildGatewayRuntimeMap(health, status)
  const agents = mergeAgentsWithRuntime(
    [
      {
        id: 'main',
        name: 'Max',
        role: 'Primary Orchestrator',
        status: 'idle',
        mission: '',
        responsibilities: [],
      },
    ],
    new Map([['main', { status: 'idle', type: 'orchestrator' }]]),
    runtimeMap,
  )

  assert.equal(agents[0]?.gatewaySessionCount, 2)
  assert.equal(agents[0]?.isActive, true)
  assert.equal(agents[0]?.heartbeatEvery, '30m')
  assert.equal(agents[0]?.currentModel, 'gpt-5.4')
  assert.equal(agents[0]?.percentUsed, 8)
})

test('mergeAgentsWithRuntime fails safe when the gateway is unavailable', () => {
  const runtimeMap = buildGatewayRuntimeMap(null, null)
  const agents = mergeAgentsWithRuntime(
    [
      {
        id: 'alice-researcher',
        name: 'Alice',
        role: 'Research Specialist',
        status: 'idle',
        mission: '',
        responsibilities: [],
      },
    ],
    new Map(),
    runtimeMap,
  )

  assert.equal(agents[0]?.gatewaySessionCount, 0)
  assert.equal(agents[0]?.isActive, false)
  assert.equal(agents[0]?.currentModel, undefined)
})

test('mergeAgentsWithRuntime keeps historical session counts without marking stale agents active', () => {
  const runtimeMap = new Map([
    ['main', {
      sessionCount: 4,
      heartbeatEnabled: true,
      heartbeatEvery: '30m',
      recentSessions: [{ key: 'agent:main:main', updatedAt: 100, age: 60 * 60 * 1000 }],
      currentModel: 'gpt-5.4',
      percentUsed: 12,
    }],
  ])

  const agents = mergeAgentsWithRuntime(
    [
      {
        id: 'main',
        name: 'Max',
        role: 'Primary Orchestrator',
        status: 'idle',
        mission: '',
        responsibilities: [],
      },
    ],
    new Map([['main', { status: 'idle', type: 'orchestrator' }]]),
    runtimeMap,
  )

  assert.equal(agents[0]?.gatewaySessionCount, 4)
  assert.equal(agents[0]?.isActive, false)
})
