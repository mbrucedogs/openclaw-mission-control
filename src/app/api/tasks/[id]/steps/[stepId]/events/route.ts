import { NextResponse } from 'next/server';
import { getRunStepById, recordRunStepEvent } from '@/lib/domain/task-runs';
import { db } from '@/lib/db';
import type { RunStepEvent } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; stepId: string }> },
) {
  try {
    const { stepId } = await params;
    type EventRow = {
      id: string;
      task_id: string;
      run_id: string;
      step_id: string;
      actor: string;
      actor_type: RunStepEvent['actorType'];
      event_type: RunStepEvent['eventType'];
      message: string;
      payload: string | null;
      created_at: string;
    };
    const rows = db.prepare(`
      SELECT * FROM run_step_events
      WHERE step_id = ?
      ORDER BY created_at DESC
    `).all(stepId) as EventRow[];

    return NextResponse.json(rows.map((row) => ({
      id: row.id,
      taskId: row.task_id,
      runId: row.run_id,
      stepId: row.step_id,
      actor: row.actor,
      actorType: row.actor_type,
      eventType: row.event_type,
      message: row.message,
      payload: row.payload ? JSON.parse(row.payload) : undefined,
      createdAt: row.created_at,
    })));
  } catch (error) {
    console.error('GET /api/tasks/[id]/steps/[stepId]/events error:', error);
    return NextResponse.json({ error: 'Failed to fetch step events' }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; stepId: string }> },
) {
  try {
    const { stepId } = await params;
    if (!getRunStepById(stepId)) {
      return NextResponse.json({ error: 'Step not found' }, { status: 404 });
    }
    const body = await request.json();
    recordRunStepEvent(stepId, {
      actor: body.actor || 'system',
      actorType: body.actorType || 'system',
      eventType: body.eventType,
      message: body.message || '',
      payload: body.payload,
      heartbeatAt: body.heartbeatAt,
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('POST /api/tasks/[id]/steps/[stepId]/events error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to append step event' }, { status: 400 });
  }
}
