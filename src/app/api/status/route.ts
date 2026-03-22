import { NextResponse } from 'next/server'

import { db } from '@/lib/db'
import { getGatewayHealth, isGatewayConnected } from '@/lib/openclaw/gateway'

type BuildStatusPayloadInput = {
  agentCount: number
  taskCount: number
  gatewayConnected: boolean
  timestamp?: string
}

export function buildStatusPayload(input: BuildStatusPayloadInput) {
  return {
    status: 'online',
    version: '2.0.0-mission-control',
    gateway: input.gatewayConnected ? 'connected' : 'disconnected',
    environment: 'local',
    stats: {
      agents: input.agentCount,
      tasks: input.taskCount,
    },
    timestamp: input.timestamp ?? new Date().toISOString(),
  }
}

export async function GET() {
  try {
    const agentCount = db.prepare('SELECT COUNT(*) as count FROM agents').get() as { count: number }
    const taskCount = db.prepare('SELECT COUNT(*) as count FROM tasks').get() as { count: number }
    const gatewayHealth = await getGatewayHealth()

    return NextResponse.json(buildStatusPayload({
      agentCount: agentCount.count,
      taskCount: taskCount.count,
      gatewayConnected: isGatewayConnected(gatewayHealth),
    }))
  } catch {
    return NextResponse.json({
      status: 'degraded',
      error: 'Database connection issue',
    }, { status: 500 })
  }
}
