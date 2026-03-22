import assert from 'node:assert/strict'
import test from 'node:test'

import type { GatewayStatusResponse } from '../src/lib/openclaw/gateway'
import { buildSessionsPayload } from '../src/lib/openclaw/sessions'

function createGatewayStatusResponse(
  overrides: Partial<GatewayStatusResponse> = {},
): GatewayStatusResponse {
  return {
    runtimeVersion: '2026.3.13',
    heartbeat: {
      defaultAgentId: 'main',
      agents: [{ agentId: 'main', enabled: true, every: '30m', everyMs: 1_800_000 }],
    },
    channelSummary: [],
    queuedSystemEvents: [],
    sessions: {
      paths: ['/tmp/main/sessions.json'],
      count: 2,
      defaults: { model: 'gpt-5.4', contextTokens: 200_000 },
      recent: [
        {
          agentId: 'main',
          key: 'agent:main:main',
          kind: 'direct',
          sessionId: 'session-1',
          updatedAt: 1_700_000_000_000,
          age: 12_000,
          systemSent: true,
          abortedLastRun: false,
          inputTokens: 120,
          outputTokens: 45,
          totalTokens: 165,
          remainingTokens: 199_835,
          percentUsed: 1,
          model: 'gpt-5.4',
          contextTokens: 200_000,
          flags: ['system'],
        },
        {
          agentId: '',
          key: '',
          kind: '',
          sessionId: 'session-2',
          updatedAt: Number.NaN,
          age: 3_000,
          inputTokens: 10,
          outputTokens: 5,
          totalTokens: Number.NaN,
          remainingTokens: 0,
          percentUsed: 0,
          model: '',
          contextTokens: 0,
          flags: [],
        },
      ],
      byAgent: [],
    },
    ...overrides,
  }
}

test('buildSessionsPayload maps gateway status sessions into the sessions route shape', () => {
  const payload = buildSessionsPayload(createGatewayStatusResponse())

  assert.deepEqual(payload, {
    sessions: [
      {
        agentId: 'main',
        key: 'agent:main:main',
        kind: 'direct',
        sessionId: 'session-1',
        updatedAt: 1_700_000_000_000,
        ageMs: 12_000,
        systemSent: true,
        abortedLastRun: false,
        inputTokens: 120,
        outputTokens: 45,
        totalTokens: 165,
        model: 'gpt-5.4',
        contextTokens: 200_000,
      },
      {
        agentId: 'session-2',
        key: 'session-2',
        kind: 'session',
        sessionId: 'session-2',
        updatedAt: 0,
        ageMs: 3_000,
        inputTokens: 10,
        outputTokens: 5,
        totalTokens: null,
        model: 'gpt-5.4',
        contextTokens: 0,
      },
    ],
  })
})

test('buildSessionsPayload returns an empty sessions list when gateway status is missing', () => {
  assert.deepEqual(buildSessionsPayload(null), { sessions: [] })
})
