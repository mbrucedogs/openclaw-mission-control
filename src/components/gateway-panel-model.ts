export type GatewayPanelResponse = {
  connected: boolean
  diagnostics?: {
    transportMode: 'sdk' | 'cli-fallback' | 'failed'
    state: 'connected' | 'degraded' | 'failed'
    reasonCode: 'ok' | 'partial_data' | 'auth_failed' | 'insufficient_scope' | 'unreachable' | 'timeout' | 'transport_missing' | 'unknown'
    operatorMessage: string
    hasRawError: boolean
  }
  gateway?: {
    ts: string
    heartbeatSeconds: number
    defaultAgentId: string
    channels: Record<string, { running?: boolean }>
    channelOrder: string[]
  } | null
  agents: Array<{
    id: string
    name: string
    isDefault: boolean
    heartbeatEnabled: boolean
    heartbeatEvery: string
    sessionCount: number
  }>
  sessions?: {
    count: number
    defaults: { model: string; contextTokens: number }
    recent: Array<{
      agentId: string
      key: string
      sessionId: string
      updatedAt: number
      age: number
      inputTokens: number
      outputTokens: number
      totalTokens: number
      remainingTokens: number
      percentUsed: number
      model: string
    }>
    byAgent: Array<{ agentId: string; count: number }>
  } | null
}

export type GatewayPanelModel = {
  connected: boolean
  status: {
    tone: 'connected' | 'degraded' | 'failed'
    label: string
    detail: string
    transportLabel: string
  }
  summary: {
    agentCount: number
    activeAgentCount: number
    sessionCount: number
  }
  recentSessions: Array<{
    id: string
    agentId: string
    label: string
    model: string
    percentUsed: number
    age: number
  }>
  channels: Array<{
    id: string
    label: string
    isRunning: boolean
  }>
}

export function buildGatewayPanelModel(data: GatewayPanelResponse | null): GatewayPanelModel {
  const agents = data?.agents ?? []
  const sessions = data?.sessions
  const gateway = data?.gateway
  const diagnostics = data?.diagnostics

  return {
    connected: Boolean(data?.connected),
    status: {
      tone: diagnostics?.state ?? (data?.connected ? 'connected' : 'failed'),
      label: diagnostics?.state === 'degraded'
        ? 'Degraded'
        : diagnostics?.state === 'failed' || !data?.connected
          ? 'Gateway failed'
          : 'Connected',
      detail: diagnostics?.operatorMessage ?? (data?.connected
        ? 'Connected to OpenClaw.'
        : 'OpenClaw is unreachable, so runtime metrics are temporarily unavailable.'),
      transportLabel: diagnostics?.transportMode === 'sdk'
        ? 'SDK'
        : diagnostics?.transportMode === 'cli-fallback'
          ? 'CLI fallback'
          : 'Unavailable',
    },
    summary: {
      agentCount: agents.length,
      activeAgentCount: agents.filter((agent) => agent.sessionCount > 0).length,
      sessionCount: sessions?.count ?? 0,
    },
    recentSessions: (sessions?.recent ?? []).slice(0, 4).map((session) => ({
      id: session.key || `${session.agentId}:${session.sessionId}:${session.updatedAt}`,
      agentId: session.agentId,
      label: session.agentId,
      model: session.model,
      percentUsed: session.percentUsed,
      age: session.age,
    })),
    channels: (gateway?.channelOrder ?? []).map((channelId) => ({
      id: channelId,
      label: channelId,
      isRunning: Boolean(gateway?.channels?.[channelId]?.running),
    })),
  }
}
