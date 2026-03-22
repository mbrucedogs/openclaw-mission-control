import assert from 'node:assert/strict'
import test from 'node:test'

import { buildExecApprovalsDiagnosticsModel } from '../src/components/exec-approvals/diagnostics-model'

test('buildExecApprovalsDiagnosticsModel maps failed gateway auth into an approvals banner', () => {
  const model = buildExecApprovalsDiagnosticsModel({
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
    checks: [],
  })

  assert.deepEqual(model, {
    tone: 'failed',
    title: 'Approvals unavailable',
    detail: 'Gateway authentication failed.',
    transportLabel: 'Unavailable',
    linkLabel: 'Open gateway diagnostics',
  })
})

test('buildExecApprovalsDiagnosticsModel maps degraded cli fallback into warning copy', () => {
  const model = buildExecApprovalsDiagnosticsModel({
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
    checks: [],
  })

  assert.deepEqual(model, {
    tone: 'degraded',
    title: 'Approvals degraded',
    detail: 'Gateway reachable, but some runtime details are unavailable.',
    transportLabel: 'CLI fallback',
    linkLabel: 'Open gateway diagnostics',
  })
})
