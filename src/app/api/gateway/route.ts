import { NextResponse } from 'next/server'
import { getGatewayHealth, getGatewayStatus } from '@/lib/openclaw/gateway'
import { appendRuntimeEvent, getLatestCursor, replayEvents } from '@/lib/db/runtime'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const includeEvents = searchParams.get('events') === 'true'
  const afterCursor = searchParams.get('afterCursor')
  const cursor = afterCursor ? parseInt(afterCursor, 10) : undefined

  const [health, status] = await Promise.all([getGatewayHealth(), getGatewayStatus()])

  if (!health && !status) {
    return NextResponse.json({ connected: false, agents: [], sessions: [] })
  }

  // Append gateway event for durability
  try {
    appendRuntimeEvent({
      eventType: 'gateway.status.fetch',
      actor: health?.defaultAgentId ?? 'unknown',
      payload: {
        healthOk: health?.ok ?? false,
        sessionCount: status?.sessions.count ?? 0,
        agentCount: health?.agents?.length ?? 0,
      },
    })
  } catch (err) {
    console.warn('Failed to append runtime event:', err)
  }

  const response: Record<string, unknown> = {
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
  }

  // Include runtime events for cursor-based replay
  if (includeEvents) {
    const events = replayEvents(cursor)
    const latestCursor = getLatestCursor()
    response.runtimeEvents = events.map(e => ({
      ...e,
      payload: JSON.parse(e.payload),
    }))
    response.latestCursor = latestCursor
  }

  return NextResponse.json(response)
}
