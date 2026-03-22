import assert from 'node:assert/strict'
import test from 'node:test'

import { buildGatewayDiagnosticsModel } from '../src/app/gateway/gateway-diagnostics-model'

test('buildGatewayDiagnosticsModel builds a connected diagnostics view with primary stats and check cards', () => {
  const model = buildGatewayDiagnosticsModel({
    checkedAt: '2026-03-22T12:00:00.000Z',
    config: {
      gatewayUrl: 'ws://127.0.0.1:18789',
      workspaceRoot: '/workspace',
      timeoutMs: 10000,
      hasTokenConfigured: true,
    },
    summary: {
      transportMode: 'sdk',
      state: 'connected',
      reasonCode: 'ok',
      operatorMessage: 'Connected via SDK transport.',
      runtimeVersion: '2026.3.13',
      openClawVersion: '2026.3.13',
      defaultAgentId: 'main',
      heartbeatSeconds: 30,
      channelCount: 2,
      agentCount: 4,
      sessionCount: 12,
    },
    checks: [
      { id: 'transport', label: 'Transport', status: 'pass', detail: 'SDK transport active.' },
      { id: 'gateway', label: 'Gateway', status: 'pass', detail: 'Gateway responded to health and status.' },
    ],
  })

  assert.deepEqual(model.banner, {
    tone: 'connected',
    title: 'Gateway connected',
    detail: 'Connected via SDK transport.',
    transportLabel: 'SDK',
  })
  assert.deepEqual(model.stats, [
    { label: 'Agents', value: '4' },
    { label: 'Sessions', value: '12' },
    { label: 'Channels', value: '2' },
    { label: 'Runtime', value: '2026.3.13' },
  ])
  assert.equal(model.checks[0].tone, 'pass')
})

test('buildGatewayDiagnosticsModel converts degraded fallback state into warning UI copy', () => {
  const model = buildGatewayDiagnosticsModel({
    checkedAt: '2026-03-22T12:00:00.000Z',
    config: {
      gatewayUrl: 'ws://127.0.0.1:18789',
      workspaceRoot: '/workspace',
      timeoutMs: 10000,
      hasTokenConfigured: false,
    },
    summary: {
      transportMode: 'cli-fallback',
      state: 'degraded',
      reasonCode: 'partial_data',
      operatorMessage: 'Gateway reachable, but some runtime details are unavailable.',
      runtimeVersion: null,
      openClawVersion: '2026.3.13',
      defaultAgentId: null,
      heartbeatSeconds: null,
      channelCount: 0,
      agentCount: 0,
      sessionCount: 0,
    },
    checks: [
      { id: 'transport', label: 'Transport', status: 'warn', detail: 'CLI fallback transport active.' },
      { id: 'runtime', label: 'Runtime', status: 'warn', detail: 'Partial runtime data is available.' },
    ],
  })

  assert.deepEqual(model.banner, {
    tone: 'degraded',
    title: 'Gateway degraded',
    detail: 'Gateway reachable, but some runtime details are unavailable.',
    transportLabel: 'CLI fallback',
  })
  assert.equal(model.configRows.find((row) => row.label === 'Token')?.value, 'Not configured')
  assert.equal(model.checks[0].tone, 'warn')
})

test('buildGatewayDiagnosticsModel converts failed auth state into error UI copy', () => {
  const model = buildGatewayDiagnosticsModel({
    checkedAt: '2026-03-22T12:00:00.000Z',
    config: {
      gatewayUrl: 'ws://127.0.0.1:18789',
      workspaceRoot: '/workspace',
      timeoutMs: 10000,
      hasTokenConfigured: true,
    },
    summary: {
      transportMode: 'failed',
      state: 'failed',
      reasonCode: 'auth_failed',
      operatorMessage: 'Gateway authentication failed.',
      runtimeVersion: null,
      openClawVersion: null,
      defaultAgentId: null,
      heartbeatSeconds: null,
      channelCount: 0,
      agentCount: 0,
      sessionCount: 0,
    },
    checks: [
      { id: 'transport', label: 'Transport', status: 'fail', detail: 'Mission Control could not initialize an OpenClaw transport.' },
      { id: 'auth', label: 'Auth', status: 'fail', detail: 'Gateway authentication failed.' },
    ],
  })

  assert.deepEqual(model.banner, {
    tone: 'failed',
    title: 'Gateway failed',
    detail: 'Gateway authentication failed.',
    transportLabel: 'Unavailable',
  })
  assert.equal(model.stats[3].value, 'Unavailable')
  assert.equal(model.checks[1].tone, 'fail')
})
