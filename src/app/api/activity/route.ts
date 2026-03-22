import { NextResponse } from 'next/server';

import { appendRuntimeEvent, replayEvents, type RuntimeEvent } from '@/lib/db/runtime';
import { db } from '@/lib/db';
import { listFreshStepHeartbeats, type StepHeartbeatRow } from '@/lib/activity-heartbeats';

export const dynamic = 'force-dynamic';
const LIVENESS_WINDOW_MS = 5 * 60 * 1000;

type TaskActivityRow = {
  id: string
  actor: string
  activity_type: string
  details: string | null
  created_at: string
}

function parseJsonObject(value: string | null): Record<string, unknown> {
  if (!value) return {}
  try {
    const parsed = JSON.parse(value) as unknown
    return parsed && typeof parsed === 'object' ? parsed as Record<string, unknown> : {}
  } catch {
    return {}
  }
}

export function buildActivityPayload(input: {
  taskActivityRows: TaskActivityRow[]
  runtimeEvents: RuntimeEvent[]
  heartbeatRows: StepHeartbeatRow[]
}) {
  const taskActivities = input.taskActivityRows.map((row) => {
    const details = parseJsonObject(row.details)

    return {
      id: row.id,
      actor: row.actor,
      eventType: row.activity_type,
      message: typeof details.message === 'string' && details.message ? details.message : row.activity_type,
      timestamp: row.created_at,
      source: 'task' as const,
      metadata: typeof details.metadata === 'object' && details.metadata ? details.metadata as Record<string, unknown> : {},
    }
  })

  const runtimeActivities = input.runtimeEvents.map((event) => {
    const payload = parseJsonObject(event.payload)
    return {
      id: event.id,
      actor: event.actor,
      eventType: event.event_type,
      message: event.event_type,
      timestamp: event.created_at,
      source: 'runtime' as const,
      metadata: payload,
    }
  })

  const activities = [...runtimeActivities, ...taskActivities]
    .sort((left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime())

  const agents = input.heartbeatRows.map((row) => ({
    agentId: row.agent_id,
    agentName: row.agent_name,
    currentTask: row.task_id,
    currentStep: row.step_id,
    currentRun: row.run_id,
    taskTitle: row.task_title || null,
    stepTitle: row.step_title || null,
    lastActivity: row.last_activity,
    heartbeatCount: row.heartbeat_count,
    isStuck: Boolean(row.is_stuck),
    stuckReason: row.stuck_reason || null,
    lastSeen: row.last_seen,
    firstSeen: row.first_seen,
    status: row.is_stuck ? 'stuck' : 'active',
  }))

  return { activities, agents }
}

export async function GET() {
  try {
    const cutoff = new Date(Date.now() - LIVENESS_WINDOW_MS).toISOString()
    const taskActivityRows = db.prepare(`
      SELECT id, actor, activity_type, details, created_at
      FROM task_activity
      WHERE created_at >= ?
      ORDER BY created_at DESC
      LIMIT 100
    `).all(cutoff) as TaskActivityRow[]

    const runtimeEvents = replayEvents()
      .filter((event) => new Date(event.created_at).getTime() >= new Date(cutoff).getTime())
      .slice(-100)
      .reverse()

    return NextResponse.json(buildActivityPayload({
      taskActivityRows,
      runtimeEvents,
      heartbeatRows: listFreshStepHeartbeats(),
    }))
  } catch (error) {
    console.error('Failed to build activity payload:', error)
    return NextResponse.json({ activities: [], agents: [], error: 'Failed to fetch activity' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as Record<string, unknown>
    const actor = typeof body.agent_id === 'string'
      ? body.agent_id
      : typeof body.actor === 'string'
        ? body.actor
        : 'unknown'

    const event = appendRuntimeEvent({
      eventType: 'openclaw.activity.note',
      actor,
      payload: body,
    })

    return NextResponse.json({
      success: true,
      entry: {
        id: event.id,
        actor,
        timestamp: event.created_at,
        ...body,
      },
    }, { status: 201 })
  } catch (error) {
    console.error('Failed to write activity entry:', error)
    return NextResponse.json({ error: 'Failed to log activity' }, { status: 500 })
  }
}
