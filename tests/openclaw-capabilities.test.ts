import assert from 'node:assert/strict'
import test from 'node:test'

import { buildGatewayCapabilities } from '../src/lib/openclaw/capabilities'
import type { GatewaySnapshot } from '../src/lib/openclaw/gateway'

function createSnapshot(overrides: Partial<GatewaySnapshot> = {}): GatewaySnapshot {
  return {
    connected: true,
    health: {
      ok: true,
      ts: 1_700_000_000_000,
      channels: {
        local: { running: true },
        discord: { running: false },
      },
      channelOrder: ['local', 'discord'],
      heartbeatSeconds: 30,
      defaultAgentId: 'main',
      agents: [],
      sessions: {
        path: '/tmp/sessions.json',
        count: 4,
        recent: [],
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
        count: 4,
        defaults: { model: 'gpt-5.4', contextTokens: 200_000 },
        recent: [],
        byAgent: [],
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

test('buildGatewayCapabilities reports passing checks for a connected sdk-backed gateway', () => {
  const result = buildGatewayCapabilities({
    snapshot: createSnapshot(),
    checkedAt: '2026-03-22T12:00:00.000Z',
    missionControlVersion: '0.1.0',
    gatewayUrl: 'ws://127.0.0.1:18789',
    workspaceRoot: '/workspace',
    timeoutMs: 10000,
    hasTokenConfigured: true,
    openClawVersion: '2026.3.13',
  })

  assert.equal(result.summary.transportMode, 'sdk')
  assert.equal(result.summary.state, 'connected')
  assert.equal(result.summary.runtimeVersion, '2026.3.13')
  assert.deepEqual(
    result.checks.map((check) => [check.id, check.status]),
    [
      ['transport', 'pass'],
      ['gateway', 'pass'],
      ['auth', 'pass'],
      ['scope', 'pass'],
      ['runtime', 'pass'],
      ['cli', 'pass'],
    ],
  )
})

test('buildGatewayCapabilities reports a warning when the gateway only works through cli fallback', () => {
  const result = buildGatewayCapabilities({
    snapshot: createSnapshot({
      diagnostics: {
        transportMode: 'cli-fallback',
        state: 'connected',
        reasonCode: 'ok',
        operatorMessage: 'Connected via CLI fallback transport.',
        hasRawError: false,
      },
    }),
    checkedAt: '2026-03-22T12:00:00.000Z',
    missionControlVersion: '0.1.0',
    gatewayUrl: 'ws://127.0.0.1:18789',
    workspaceRoot: '/workspace',
    timeoutMs: 10000,
    hasTokenConfigured: false,
    openClawVersion: '2026.3.13',
  })

  assert.equal(result.summary.transportMode, 'cli-fallback')
  assert.equal(result.checks.find((check) => check.id === 'transport')?.status, 'warn')
  assert.equal(result.checks.find((check) => check.id === 'auth')?.status, 'warn')
})

test('buildGatewayCapabilities reports degraded scope limitations without discarding successful runtime data', () => {
  const result = buildGatewayCapabilities({
    snapshot: createSnapshot({
      connected: false,
      health: null,
      diagnostics: {
        transportMode: 'sdk',
        state: 'degraded',
        reasonCode: 'insufficient_scope',
        operatorMessage: 'Gateway access is missing the required scope.',
        hasRawError: true,
      },
    }),
    checkedAt: '2026-03-22T12:00:00.000Z',
    missionControlVersion: '0.1.0',
    gatewayUrl: 'ws://127.0.0.1:18789',
    workspaceRoot: '/workspace',
    timeoutMs: 10000,
    hasTokenConfigured: true,
    openClawVersion: '2026.3.13',
  })

  assert.equal(result.summary.state, 'degraded')
  assert.equal(result.summary.sessionCount, 4)
  assert.equal(result.checks.find((check) => check.id === 'scope')?.status, 'warn')
  assert.equal(result.checks.find((check) => check.id === 'runtime')?.status, 'warn')
})

test('buildGatewayCapabilities reports failed auth and missing runtime data as hard failures', () => {
  const result = buildGatewayCapabilities({
    snapshot: createSnapshot({
      connected: false,
      health: null,
      status: null,
      diagnostics: {
        transportMode: 'failed',
        state: 'failed',
        reasonCode: 'auth_failed',
        operatorMessage: 'Gateway authentication failed.',
        hasRawError: true,
      },
    }),
    checkedAt: '2026-03-22T12:00:00.000Z',
    missionControlVersion: '0.1.0',
    gatewayUrl: 'ws://127.0.0.1:18789',
    workspaceRoot: '/workspace',
    timeoutMs: 10000,
    hasTokenConfigured: true,
    openClawVersion: null,
  })

  assert.equal(result.summary.state, 'failed')
  assert.equal(result.summary.runtimeVersion, null)
  assert.deepEqual(
    result.checks.map((check) => [check.id, check.status]),
    [
      ['transport', 'fail'],
      ['gateway', 'fail'],
      ['auth', 'fail'],
      ['scope', 'pass'],
      ['runtime', 'fail'],
      ['cli', 'warn'],
    ],
  )
})
