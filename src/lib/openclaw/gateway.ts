import {
  callOpenClawGateway,
  callOpenClawGatewayWithDiagnostics,
  type OpenClawGatewayCallResult,
  type OpenClawGatewayDiagnostics,
  type OpenClawGatewayReasonCode,
  type OpenClawTransportMode,
} from './client'

export interface GatewayOptions {
  timeoutMs?: number
}

type GatewayAdapterDeps = {
  callOpenClawGateway?: <T = unknown>(method: string, params?: unknown, opts?: GatewayOptions) => Promise<T>
  callOpenClawGatewayWithDiagnostics?: <T = unknown>(method: string, params?: unknown, opts?: GatewayOptions) => Promise<OpenClawGatewayCallResult<T>>
}

const GATEWAY_TIMEOUT = 8000

export function buildGatewayAdapter(deps: GatewayAdapterDeps = {}) {
  const call = deps.callOpenClawGateway ?? callOpenClawGateway
  const callWithDiagnostics = deps.callOpenClawGatewayWithDiagnostics ?? (async <T = unknown>(
    method: string,
    params: unknown = {},
    opts: GatewayOptions = {},
  ): Promise<OpenClawGatewayCallResult<T>> => {
    if (deps.callOpenClawGateway) {
      try {
        const data = await deps.callOpenClawGateway<T>(method, params, opts)
        return {
          ok: true,
          data,
          diagnostics: {
            transportMode: 'sdk',
            reasonCode: 'ok',
            operatorMessage: 'Connected via SDK transport.',
            hasRawError: false,
          },
        }
      } catch (err) {
        return {
          ok: false,
          diagnostics: {
            transportMode: 'failed',
            reasonCode: 'unknown',
            operatorMessage: 'Mission Control could not read from OpenClaw.',
            hasRawError: true,
          },
          error: err instanceof Error ? err : new Error(String(err)),
        }
      }
    }

    return callOpenClawGatewayWithDiagnostics<T>(method, params, opts)
  })

  return {
    async callGateway<T = unknown>(method: string, params: unknown = {}, opts: GatewayOptions = {}): Promise<T> {
      const timeoutMs = opts.timeoutMs ?? GATEWAY_TIMEOUT
      return await call<T>(method, params, { timeoutMs })
    },

    async getGatewayHealth() {
      try {
        return await call<GatewayHealthResponse>('health', {}, { timeoutMs: 10000 })
      } catch {
        return null
      }
    },

    isGatewayConnected(health: GatewayHealthResponse | null | undefined): boolean {
      return Boolean(health?.ok)
    },

    async getGatewayStatus() {
      try {
        return await call<GatewayStatusResponse>('status', {}, { timeoutMs: 10000 })
      } catch {
        return null
      }
    },

    async getGatewaySnapshot(): Promise<GatewaySnapshot> {
      const [healthResult, statusResult] = await Promise.all([
        callWithDiagnostics<GatewayHealthResponse>('health', {}, { timeoutMs: 10000 }),
        callWithDiagnostics<GatewayStatusResponse>('status', {}, { timeoutMs: 10000 }),
      ])

      const connected = healthResult.ok && statusResult.ok
      const diagnostics = buildGatewaySnapshotDiagnostics(healthResult, statusResult)

      return {
        connected,
        health: healthResult.ok ? healthResult.data : null,
        status: statusResult.ok ? statusResult.data : null,
        diagnostics,
      }
    },
  }
}

const adapter = buildGatewayAdapter()

export const callGateway = adapter.callGateway
export const getGatewayHealth = adapter.getGatewayHealth
export const isGatewayConnected = adapter.isGatewayConnected
export const getGatewayStatus = adapter.getGatewayStatus
export const getGatewaySnapshot = adapter.getGatewaySnapshot

export type GatewayCall = typeof callGateway

export interface GatewayDiagnostics extends OpenClawGatewayDiagnostics {
  state: 'connected' | 'degraded' | 'failed'
}

export interface GatewaySnapshot {
  connected: boolean
  health: GatewayHealthResponse | null
  status: GatewayStatusResponse | null
  diagnostics: GatewayDiagnostics
}

function buildGatewaySnapshotDiagnostics(
  healthResult: OpenClawGatewayCallResult<GatewayHealthResponse>,
  statusResult: OpenClawGatewayCallResult<GatewayStatusResponse>,
): GatewayDiagnostics {
  if (healthResult.ok && statusResult.ok) {
    const transportMode = pickTransportMode([healthResult.diagnostics.transportMode, statusResult.diagnostics.transportMode])
    return {
      state: 'connected',
      transportMode,
      reasonCode: 'ok',
      operatorMessage: transportMode === 'sdk'
        ? 'Connected via SDK transport.'
        : 'Connected via CLI fallback transport.',
      hasRawError: false,
    }
  }

  if (healthResult.ok || statusResult.ok) {
    const failure = healthResult.ok ? statusResult : healthResult
    const success = healthResult.ok ? healthResult : statusResult
    const reasonCode: OpenClawGatewayReasonCode = failure.diagnostics.reasonCode === 'insufficient_scope'
      ? 'insufficient_scope'
      : 'partial_data'

    return {
      state: 'degraded',
      transportMode: pickTransportMode([success.diagnostics.transportMode, failure.diagnostics.transportMode]),
      reasonCode,
      operatorMessage: reasonCode === 'insufficient_scope'
        ? failure.diagnostics.operatorMessage
        : 'Gateway reachable, but some runtime details are unavailable.',
      hasRawError: failure.diagnostics.hasRawError,
    }
  }

  const primaryFailure = pickPrimaryFailure([
    healthResult.diagnostics,
    statusResult.diagnostics,
  ])

  return {
    state: 'failed',
    ...primaryFailure,
    hasRawError: healthResult.diagnostics.hasRawError || statusResult.diagnostics.hasRawError,
  }
}

function pickTransportMode(modes: OpenClawTransportMode[]): OpenClawTransportMode {
  return modes.find((mode) => mode === 'sdk')
    ?? modes.find((mode) => mode === 'cli-fallback')
    ?? 'failed'
}

function pickPrimaryFailure(diagnostics: OpenClawGatewayDiagnostics[]): OpenClawGatewayDiagnostics {
  const priority: OpenClawGatewayReasonCode[] = [
    'auth_failed',
    'insufficient_scope',
    'transport_missing',
    'timeout',
    'unreachable',
    'unknown',
  ]

  for (const reasonCode of priority) {
    const match = diagnostics.find((diagnostic) => diagnostic.reasonCode === reasonCode)
    if (match) {
      return match
    }
  }

  return diagnostics[0] ?? {
    transportMode: 'failed',
    reasonCode: 'unknown',
    operatorMessage: 'Mission Control could not read from OpenClaw.',
    hasRawError: true,
  }
}

export interface GatewayHealthResponse {
  ok: boolean
  ts: number
  channels: Record<string, unknown>
  channelOrder: string[]
  heartbeatSeconds: number
  defaultAgentId: string
  agents: GatewayAgent[]
  sessions: { path: string; count: number; recent: SessionRef[] }
}

export interface GatewayStatusResponse {
  runtimeVersion: string
  heartbeat: { defaultAgentId: string; agents: { agentId: string; enabled: boolean; every: string; everyMs: number | null }[] }
  channelSummary: string[]
  queuedSystemEvents: unknown[]
  sessions: {
    paths: string[]
    count: number
    defaults: { model: string; contextTokens: number }
    recent: SessionDetail[]
    byAgent: AgentSessionGroup[]
  }
}

export interface GatewayAgent {
  agentId: string
  name?: string
  isDefault: boolean
  heartbeat: { enabled: boolean; every: string; everyMs: number | null; prompt: string; target: string; ackMaxChars: number }
  sessions: { path: string; count: number; recent: SessionRef[] }
}

export interface SessionRef {
  key: string
  updatedAt: number
  age: number
}

export interface SessionDetail {
  agentId: string
  key: string
  kind: string
  sessionId: string
  updatedAt: number
  age: number
  systemSent?: boolean
  abortedLastRun?: boolean
  inputTokens: number
  outputTokens: number
  totalTokens: number
  remainingTokens: number
  percentUsed: number
  model: string
  contextTokens: number
  flags: string[]
}

export interface AgentSessionGroup {
  agentId: string
  path: string
  count: number
  recent: SessionDetail[]
}
