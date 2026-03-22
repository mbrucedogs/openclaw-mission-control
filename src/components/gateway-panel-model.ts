export type GatewayPanelResponse = {
  connected: boolean
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

  return {
    connected: Boolean(data?.connected),
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
