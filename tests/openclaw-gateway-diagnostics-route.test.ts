import assert from 'node:assert/strict'
import test from 'node:test'

import { buildGatewayDiagnosticsPayload } from '../src/app/api/gateway/diagnostics/route'
import type { GatewayCapabilitySnapshot } from '../src/lib/openclaw/capabilities'

function createCapabilitySnapshot(overrides: Partial<GatewayCapabilitySnapshot> = {}): GatewayCapabilitySnapshot {
  return {
    checkedAt: '2026-03-22T12:00:00.000Z',
    missionControlVersion: '0.1.0',
    gatewayUrl: 'ws://127.0.0.1:18789',
    workspaceRoot: '/workspace',
    timeoutMs: 10000,
    hasTokenConfigured: true,
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
    ...overrides,
  }
}

test('buildGatewayDiagnosticsPayload exposes the capability summary and checks for the diagnostics page', () => {
  const payload = buildGatewayDiagnosticsPayload(createCapabilitySnapshot())

  assert.equal(payload.summary.transportMode, 'sdk')
  assert.equal(payload.summary.state, 'connected')
  assert.equal(payload.summary.runtimeVersion, '2026.3.13')
  assert.equal(payload.summary.agentCount, 4)
  assert.equal(payload.checks.length, 2)
  assert.equal(payload.config.gatewayUrl, 'ws://127.0.0.1:18789')
  assert.equal(payload.config.hasTokenConfigured, true)
})

test('buildGatewayDiagnosticsPayload preserves degraded scope warnings and nullable runtime details', () => {
  const payload = buildGatewayDiagnosticsPayload(createCapabilitySnapshot({
    hasTokenConfigured: false,
    summary: {
      transportMode: 'cli-fallback',
      state: 'degraded',
      reasonCode: 'insufficient_scope',
      operatorMessage: 'Gateway access is missing the required scope.',
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
      { id: 'scope', label: 'Scope', status: 'warn', detail: 'Gateway access is missing the required scope.' },
    ],
  }))

  assert.equal(payload.summary.state, 'degraded')
  assert.equal(payload.summary.transportMode, 'cli-fallback')
  assert.equal(payload.config.hasTokenConfigured, false)
  assert.deepEqual(payload.checks, [
    { id: 'transport', label: 'Transport', status: 'warn', detail: 'CLI fallback transport active.' },
    { id: 'scope', label: 'Scope', status: 'warn', detail: 'Gateway access is missing the required scope.' },
  ])
})
