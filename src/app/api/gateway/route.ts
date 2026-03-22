import { NextResponse } from 'next/server'
import { getGatewaySnapshot, type GatewaySnapshot } from '@/lib/openclaw/gateway'
import { syncGatewayRuntimeEvents } from '@/lib/openclaw/runtime-bridge'

export const dynamic = 'force-dynamic'

export function buildGatewayPayload(snapshot: GatewaySnapshot) {
  const health = snapshot.health
  const status = snapshot.status

  return {
    connected: snapshot.connected,
    diagnostics: snapshot.diagnostics,
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
  }
}

export async function GET() {
  const snapshot = await getGatewaySnapshot()

  try {
    if (snapshot.diagnostics.state !== 'failed') {
      await syncGatewayRuntimeEvents('api.gateway')
    }
  } catch (err) {
    console.warn('Failed to sync gateway runtime events:', err)
  }

  return NextResponse.json(buildGatewayPayload(snapshot))
}
