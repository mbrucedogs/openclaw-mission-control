import assert from 'node:assert/strict'
import test from 'node:test'

import { getOpenClawGatewayRuntimeConfig } from '../src/lib/config'
import {
  callOpenClawGateway,
  callOpenClawGatewayWithDiagnostics,
  type OpenClawCallGateway,
} from '../src/lib/openclaw/client'
import { buildGatewayAdapter, type GatewayHealthResponse, type GatewayStatusResponse } from '../src/lib/openclaw/gateway'

test('getOpenClawGatewayRuntimeConfig resolves explicit gateway env with safe defaults', () => {
  const config = getOpenClawGatewayRuntimeConfig({
    OPENCLAW_GATEWAY_URL: '  ws://gateway.tailnet:18789  ',
    OPENCLAW_GATEWAY_TOKEN: '  secret-token  ',
    OPENCLAW_GATEWAY_TIMEOUT_MS: '15000',
  } as NodeJS.ProcessEnv)

  assert.deepEqual(config, {
    url: 'ws://gateway.tailnet:18789',
    token: 'secret-token',
    timeoutMs: 15000,
  })
})

test('getOpenClawGatewayRuntimeConfig falls back to local loopback defaults when env is absent', () => {
  const config = getOpenClawGatewayRuntimeConfig({} as NodeJS.ProcessEnv)

  assert.deepEqual(config, {
    url: 'ws://127.0.0.1:18789',
    token: undefined,
    timeoutMs: 10000,
  })
})

test('callOpenClawGateway uses explicit gateway config when invoking the transport layer', async () => {
  const calls: unknown[] = []

  const result = await callOpenClawGateway<{ ok: boolean }>(
    'status',
    { include: 'recent' },
    {
      env: {
        OPENCLAW_GATEWAY_URL: 'ws://gateway.tailnet:18789',
        OPENCLAW_GATEWAY_TOKEN: 'secret-token',
        OPENCLAW_GATEWAY_TIMEOUT_MS: '15000',
      } as NodeJS.ProcessEnv,
      loadCallGateway: async () => async (opts) => {
        calls.push(opts)
        return { ok: true }
      },
    },
  )

  assert.deepEqual(result, { ok: true })
  assert.deepEqual(calls, [
    {
      method: 'status',
      params: { include: 'recent' },
      url: 'ws://gateway.tailnet:18789',
      token: 'secret-token',
      timeoutMs: 15000,
      expectFinal: false,
      clientName: 'gateway-client',
      clientDisplayName: 'Mission Control',
      mode: 'backend',
    },
  ])
})

test('callOpenClawGatewayWithDiagnostics reports sdk transport success metadata', async () => {
  const result = await callOpenClawGatewayWithDiagnostics<{ ok: boolean }>(
    'health',
    {},
    {
      env: {
        OPENCLAW_GATEWAY_URL: 'ws://gateway.tailnet:18789',
      } as NodeJS.ProcessEnv,
      loadGatewayTransport: async () => ({
        transportMode: 'sdk',
        callGateway: (async () => ({ ok: true })) as OpenClawCallGateway,
      }),
    },
  )

  assert.deepEqual(result, {
    ok: true,
    data: { ok: true },
    diagnostics: {
      transportMode: 'sdk',
      reasonCode: 'ok',
      operatorMessage: 'Connected via SDK transport.',
      hasRawError: false,
    },
  })
})

test('callOpenClawGatewayWithDiagnostics reports cli fallback transport success metadata', async () => {
  const result = await callOpenClawGatewayWithDiagnostics<{ ok: boolean }>(
    'status',
    {},
    {
      env: {
        OPENCLAW_GATEWAY_URL: 'ws://127.0.0.1:18789',
      } as NodeJS.ProcessEnv,
      loadGatewayTransport: async () => ({
        transportMode: 'cli-fallback',
        callGateway: (async () => ({ ok: true })) as OpenClawCallGateway,
      }),
    },
  )

  assert.deepEqual(result, {
    ok: true,
    data: { ok: true },
    diagnostics: {
      transportMode: 'cli-fallback',
      reasonCode: 'ok',
      operatorMessage: 'Connected via CLI fallback transport.',
      hasRawError: false,
    },
  })
})

test('callOpenClawGatewayWithDiagnostics normalizes auth failures', async () => {
  const result = await callOpenClawGatewayWithDiagnostics(
    'health',
    {},
    {
      loadGatewayTransport: async () => ({
        transportMode: 'cli-fallback',
        callGateway: (async () => {
          throw new Error('401 unauthorized: invalid token')
        }) as OpenClawCallGateway,
      }),
    },
  )

  assert.equal(result.ok, false)
  assert.deepEqual(result.diagnostics, {
    transportMode: 'cli-fallback',
    reasonCode: 'auth_failed',
    operatorMessage: 'Gateway authentication failed.',
    hasRawError: true,
  })
})

test('callOpenClawGatewayWithDiagnostics normalizes scope-limited failures', async () => {
  const result = await callOpenClawGatewayWithDiagnostics(
    'status',
    {},
    {
      loadGatewayTransport: async () => ({
        transportMode: 'sdk',
        callGateway: (async () => {
          throw new Error('403 forbidden: missing operator.read scope')
        }) as OpenClawCallGateway,
      }),
    },
  )

  assert.equal(result.ok, false)
  assert.deepEqual(result.diagnostics, {
    transportMode: 'sdk',
    reasonCode: 'insufficient_scope',
    operatorMessage: 'Gateway access is missing the required scope.',
    hasRawError: true,
  })
})

test('callOpenClawGatewayWithDiagnostics reports transport initialization failures', async () => {
  const result = await callOpenClawGatewayWithDiagnostics(
    'status',
    {},
    {
      loadGatewayTransport: async () => {
        throw new Error('openclaw transport module missing')
      },
    },
  )

  assert.equal(result.ok, false)
  assert.deepEqual(result.diagnostics, {
    transportMode: 'failed',
    reasonCode: 'transport_missing',
    operatorMessage: 'Mission Control could not initialize an OpenClaw transport.',
    hasRawError: true,
  })
})

test('buildGatewayAdapter routes gateway methods through the native client and preserves null-on-failure behavior', async () => {
  const calls: Array<{ method: string; params: unknown; opts: unknown }> = []

  const healthResponse: GatewayHealthResponse = {
    ok: true,
    ts: 1_700_000_000_000,
    channels: {},
    channelOrder: ['local'],
    heartbeatSeconds: 30,
    defaultAgentId: 'main',
    agents: [],
    sessions: { path: '/tmp/sessions.json', count: 0, recent: [] },
  }

  const statusResponse: GatewayStatusResponse = {
    runtimeVersion: '2026.3.13',
    heartbeat: {
      defaultAgentId: 'main',
      agents: [],
    },
    channelSummary: [],
    queuedSystemEvents: [],
    sessions: {
      paths: [],
      count: 0,
      defaults: { model: 'gpt-5.4', contextTokens: 200_000 },
      recent: [],
      byAgent: [],
    },
  }

  const gateway = buildGatewayAdapter({
    callOpenClawGateway: async (method, params, opts) => {
      calls.push({ method, params, opts })
      if (method === 'health') return healthResponse
      if (method === 'status') return statusResponse
      throw new Error(`unexpected method: ${method}`)
    },
  })

  assert.deepEqual(await gateway.getGatewayHealth(), healthResponse)
  assert.deepEqual(await gateway.getGatewayStatus(), statusResponse)
  assert.equal(gateway.isGatewayConnected(healthResponse), true)
  assert.equal(gateway.isGatewayConnected(null), false)
  assert.deepEqual(calls, [
    { method: 'health', params: {}, opts: { timeoutMs: 10000 } },
    { method: 'status', params: {}, opts: { timeoutMs: 10000 } },
  ])

  const failingGateway = buildGatewayAdapter({
    callOpenClawGateway: async () => {
      throw new Error('offline')
    },
  })

  assert.equal(await failingGateway.getGatewayHealth(), null)
  assert.equal(await failingGateway.getGatewayStatus(), null)
})
