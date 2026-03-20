import { NextResponse } from 'next/server'
import { getGatewayHealth, getGatewayStatus } from '@/lib/openclaw/gateway'

export const dynamic = 'force-dynamic'

export async function GET() {
  const [health, status] = await Promise.all([getGatewayHealth(), getGatewayStatus()])

  if (!health && !status) {
    return NextResponse.json({ connected: false, agents: [], sessions: [] })
  }

  return NextResponse.json({
    connected: health?.ok ?? false,
    gateway: health ? {
      ts: new Date(health.ts).toISOString(),
      heartbeatSeconds: health.heartbeatSeconds,
      defaultAgentId: health.defaultAgentId,
      channels: health.channels,
      channelOrder: health.channelOrder,
    } : null,
    agents: (health?.agents ?? []).map(a => ({
      id: a.agentId,
      name: a.name ?? a.agentId,
      isDefault: a.isDefault,
      heartbeatEnabled: a.heartbeat.enabled,
      heartbeatEvery: a.heartbeat.every,
      sessionCount: a.sessions.count,
      recent: a.sessions.recent.slice(0, 3),
    })),
    sessions: status ? {
      count: status.sessions.count,
      defaults: status.sessions.defaults,
      recent: status.sessions.recent.slice(0, 10),
      byAgent: status.sessions.byAgent.map(g => ({
        agentId: g.agentId,
        count: g.count,
        recent: g.recent.slice(0, 3),
      })),
    } : null,
  })
}
