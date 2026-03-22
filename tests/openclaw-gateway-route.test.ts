import assert from 'node:assert/strict'
import test from 'node:test'

import { buildGatewayPayload } from '../src/app/api/gateway/route'
import type { GatewaySnapshot } from '../src/lib/openclaw/gateway'

function createGatewaySnapshot(overrides: Partial<GatewaySnapshot> = {}): GatewaySnapshot {
  return {
    connected: true,
    health: {
      ok: true,
      ts: 1_700_000_000_000,
      channels: {
        local: { running: true },
      },
      channelOrder: ['local'],
      heartbeatSeconds: 30,
      defaultAgentId: 'main',
      agents: [
        {
          agentId: 'main',
          name: 'Max',
          isDefault: true,
          heartbeat: {
            enabled: true,
            every: '30m',
            everyMs: 1_800_000,
            prompt: '',
            target: '',
            ackMaxChars: 0,
          },
          sessions: {
            path: '/tmp/sessions.json',
            count: 2,
            recent: [{ key: 'agent:main:main', updatedAt: 1_700_000_000_000, age: 1_000 }],
          },
        },
      ],
      sessions: {
        path: '/tmp/sessions.json',
        count: 2,
        recent: [{ key: 'agent:main:main', updatedAt: 1_700_000_000_000, age: 1_000 }],
      },
    },
    status: {
      runtimeVersion: '2026.3.13',
      heartbeat: {
        defaultAgentId: 'main',
        agents: [{ agentId: 'main', enabled: true, every: '30m', everyMs: 1_800_000 }],
      },
      channelSummary: ['local'],
      queuedSystemEvents: [],
      sessions: {
        paths: ['/tmp/sessions.json'],
        count: 2,
        defaults: { model: 'gpt-5.4', contextTokens: 200_000 },
        recent: [
          {
            agentId: 'main',
            key: 'agent:main:main',
            kind: 'direct',
            sessionId: 'session-1',
            updatedAt: 1_700_000_000_000,
            age: 1_000,
            inputTokens: 10,
            outputTokens: 5,
            totalTokens: 15,
            remainingTokens: 199_985,
            percentUsed: 1,
            model: 'gpt-5.4',
            contextTokens: 200_000,
            flags: [],
          },
        ],
        byAgent: [{ agentId: 'main', path: '/tmp/sessions.json', count: 2, recent: [] }],
      },
    },
    diagnostics: {
      transportMode: 'sdk',
      state: 'connected',
      reasonCode: 'ok',
      operatorMessage: 'Connected via SDK transport.',
      hasRawError: false,
    },
    ...overrides,
  }
}

test('buildGatewayPayload includes connected diagnostics when health and status both succeed', () => {
  const payload = buildGatewayPayload(createGatewaySnapshot())

  assert.equal(payload.connected, true)
  assert.deepEqual(payload.diagnostics, {
    transportMode: 'sdk',
    state: 'connected',
    reasonCode: 'ok',
    operatorMessage: 'Connected via SDK transport.',
    hasRawError: false,
  })
  assert.equal(payload.agents.length, 1)
  assert.equal(payload.sessions?.count, 2)
})

test('buildGatewayPayload preserves partial runtime data when the gateway is degraded', () => {
  const payload = buildGatewayPayload(createGatewaySnapshot({
    connected: false,
    status: null,
    diagnostics: {
      transportMode: 'cli-fallback',
      state: 'degraded',
      reasonCode: 'partial_data',
      operatorMessage: 'Gateway reachable, but some runtime details are unavailable.',
      hasRawError: true,
    },
  }))

  assert.equal(payload.connected, false)
  assert.deepEqual(payload.diagnostics, {
    transportMode: 'cli-fallback',
    state: 'degraded',
    reasonCode: 'partial_data',
    operatorMessage: 'Gateway reachable, but some runtime details are unavailable.',
    hasRawError: true,
  })
  assert.equal(payload.gateway?.defaultAgentId, 'main')
  assert.equal(payload.sessions, null)
})

test('buildGatewayPayload surfaces scope-limited degraded access distinctly from a full outage', () => {
  const payload = buildGatewayPayload(createGatewaySnapshot({
    connected: false,
    health: null,
    diagnostics: {
      transportMode: 'sdk',
      state: 'degraded',
      reasonCode: 'insufficient_scope',
      operatorMessage: 'Gateway access is missing the required scope.',
      hasRawError: true,
    },
  }))

  assert.equal(payload.connected, false)
  assert.equal(payload.diagnostics.state, 'degraded')
  assert.equal(payload.diagnostics.reasonCode, 'insufficient_scope')
  assert.equal(payload.sessions?.count, 2)
})

test('buildGatewayPayload returns a failed diagnostics block when the gateway is unreachable', () => {
  const payload = buildGatewayPayload({
    connected: false,
    health: null,
    status: null,
    diagnostics: {
      transportMode: 'failed',
      state: 'failed',
      reasonCode: 'unreachable',
      operatorMessage: 'OpenClaw is unreachable.',
      hasRawError: true,
    },
  })

  assert.deepEqual(payload, {
    connected: false,
    diagnostics: {
      transportMode: 'failed',
      state: 'failed',
      reasonCode: 'unreachable',
      operatorMessage: 'OpenClaw is unreachable.',
      hasRawError: true,
    },
    gateway: null,
    agents: [],
    sessions: null,
  })
})
