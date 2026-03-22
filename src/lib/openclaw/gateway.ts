import { callOpenClawGateway } from './client'

export interface GatewayOptions {
  timeoutMs?: number
}

type GatewayAdapterDeps = {
  callOpenClawGateway?: <T = unknown>(method: string, params?: unknown, opts?: GatewayOptions) => Promise<T>
}

const GATEWAY_TIMEOUT = 8000

export function buildGatewayAdapter(deps: GatewayAdapterDeps = {}) {
  const call = deps.callOpenClawGateway ?? callOpenClawGateway

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
  }
}

const adapter = buildGatewayAdapter()

export const callGateway = adapter.callGateway
export const getGatewayHealth = adapter.getGatewayHealth
export const isGatewayConnected = adapter.isGatewayConnected
export const getGatewayStatus = adapter.getGatewayStatus

export type GatewayCall = typeof callGateway

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
