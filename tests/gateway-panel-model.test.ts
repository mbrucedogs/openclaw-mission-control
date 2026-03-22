import assert from 'node:assert/strict'
import test from 'node:test'

import { buildGatewayPanelModel } from '../src/components/gateway-panel-model'

test('buildGatewayPanelModel derives counts, recent session rows, and channel states without a hardcoded version', () => {
  const model = buildGatewayPanelModel({
    connected: true,
    diagnostics: {
      transportMode: 'sdk',
      state: 'connected',
      reasonCode: 'ok',
      operatorMessage: 'Connected via SDK transport.',
      hasRawError: false,
    },
    gateway: {
      ts: '2026-03-22T12:00:00.000Z',
      heartbeatSeconds: 30,
      defaultAgentId: 'main',
      channels: {
        telegram: { running: true },
        discord: { running: false },
      },
      channelOrder: ['telegram', 'discord'],
    },
    agents: [
      { id: 'main', name: 'Max', isDefault: true, heartbeatEnabled: true, heartbeatEvery: '30m', sessionCount: 2 },
      { id: 'alice', name: 'Alice', isDefault: false, heartbeatEnabled: false, heartbeatEvery: 'disabled', sessionCount: 0 },
    ],
    sessions: {
      count: 5,
      defaults: { model: 'gpt-5.4', contextTokens: 200000 },
      recent: [
        {
          agentId: 'main',
          key: 'agent:main:main',
          sessionId: 'session-1',
          updatedAt: 1700000000000,
          age: 120000,
          inputTokens: 10,
          outputTokens: 5,
          totalTokens: 15,
          remainingTokens: 199985,
          percentUsed: 8,
          model: 'gpt-5.4',
        },
      ],
      byAgent: [{ agentId: 'main', count: 2 }],
    },
  })

  assert.equal(model.connected, true)
  assert.deepEqual(model.summary, {
    agentCount: 2,
    activeAgentCount: 1,
    sessionCount: 5,
  })
  assert.deepEqual(model.recentSessions, [
    {
      id: 'agent:main:main',
      agentId: 'main',
      label: 'main',
      model: 'gpt-5.4',
      percentUsed: 8,
      age: 120000,
    },
  ])
  assert.deepEqual(model.channels, [
    { id: 'telegram', label: 'telegram', isRunning: true },
    { id: 'discord', label: 'discord', isRunning: false },
  ])
  assert.deepEqual(model.status, {
    tone: 'connected',
    label: 'Connected',
    detail: 'Connected via SDK transport.',
    transportLabel: 'SDK',
  })
  assert.equal('version' in model, false)
})

test('buildGatewayPanelModel handles disconnected or sparse gateway payloads safely', () => {
  const model = buildGatewayPanelModel({
    connected: false,
    diagnostics: {
      transportMode: 'failed',
      state: 'failed',
      reasonCode: 'unreachable',
      operatorMessage: 'OpenClaw is unreachable.',
      hasRawError: true,
    },
    agents: [],
    sessions: null,
    gateway: null,
  })

  assert.equal(model.connected, false)
  assert.equal(model.summary.agentCount, 0)
  assert.equal(model.summary.activeAgentCount, 0)
  assert.equal(model.summary.sessionCount, 0)
  assert.deepEqual(model.recentSessions, [])
  assert.deepEqual(model.channels, [])
  assert.deepEqual(model.status, {
    tone: 'failed',
    label: 'Gateway failed',
    detail: 'OpenClaw is unreachable.',
    transportLabel: 'Unavailable',
  })
})

test('buildGatewayPanelModel keeps recent session ids unique when the gateway reuses a sessionId across keys', () => {
  const model = buildGatewayPanelModel({
    connected: true,
    diagnostics: {
      transportMode: 'cli-fallback',
      state: 'degraded',
      reasonCode: 'partial_data',
      operatorMessage: 'Gateway reachable, but some runtime details are unavailable.',
      hasRawError: true,
    },
    gateway: null,
    agents: [
      { id: 'main', name: 'Max', isDefault: true, heartbeatEnabled: true, heartbeatEvery: '30m', sessionCount: 2 },
    ],
    sessions: {
      count: 2,
      defaults: { model: 'gpt-5.4', contextTokens: 200000 },
      recent: [
        {
          agentId: 'tron',
          key: 'agent:tron:cron:job-1',
          sessionId: 'shared-session',
          updatedAt: 1700000000000,
          age: 120000,
          inputTokens: 10,
          outputTokens: 5,
          totalTokens: 15,
          remainingTokens: 199985,
          percentUsed: 8,
          model: 'gpt-5.4',
        },
        {
          agentId: 'tron',
          key: 'agent:tron:cron:job-1:run:shared-session',
          sessionId: 'shared-session',
          updatedAt: 1700000000001,
          age: 120001,
          inputTokens: 10,
          outputTokens: 5,
          totalTokens: 15,
          remainingTokens: 199985,
          percentUsed: 8,
          model: 'gpt-5.4',
        },
      ],
      byAgent: [{ agentId: 'tron', count: 2 }],
    },
  })

  assert.deepEqual(
    model.recentSessions.map((session) => session.id),
    [
      'agent:tron:cron:job-1',
      'agent:tron:cron:job-1:run:shared-session',
    ],
  )
  assert.deepEqual(model.status, {
    tone: 'degraded',
    label: 'Degraded',
    detail: 'Gateway reachable, but some runtime details are unavailable.',
    transportLabel: 'CLI fallback',
  })
})
