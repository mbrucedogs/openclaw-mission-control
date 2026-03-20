import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

interface HeartbeatRequest {
  runId: string;
  stepId: string;
  taskId: string;
  agentId: string;
  agentName: string;
  message?: string;
  metadata?: Record<string, unknown>;
  eventType?: 'started' | 'heartbeat' | 'completed' | 'blocked' | 'yielded' | 'error';
}

export async function POST(request: Request) {
  try {
    const body: HeartbeatRequest = await request.json();
    const {
      runId,
      stepId,
      taskId,
      agentId,
      agentName,
      message = '',
      metadata = {},
      eventType = 'heartbeat',
    } = body;

    if (!runId || !stepId || !taskId || !agentId || !agentName) {
      return NextResponse.json(
        { error: 'Missing required fields: runId, stepId, taskId, agentId, agentName' },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    const activityId = randomUUID();

    // Insert into task_activity (existing schema with actor/activity_type columns)
    const insertActivity = db.prepare(`
      INSERT INTO task_activity (id, task_id, run_id, step_id, actor, actor_type, activity_type, details, created_at)
      VALUES (?, ?, ?, ?, ?, 'agent', ?, ?, ?)
    `);

    insertActivity.run(
      activityId,
      taskId,
      runId,
      stepId,
      agentName,
      eventType,
      JSON.stringify({ message, metadata }),
      now
    );

    // Upsert step_heartbeats for stuck detection
    const existingHeartbeat = db.prepare(`
      SELECT id, heartbeat_count FROM step_heartbeats WHERE step_id = ? AND agent_id = ?
    `).get(stepId, agentId) as { id: string; heartbeat_count: number } | undefined;

    if (existingHeartbeat) {
      const updateHeartbeat = db.prepare(`
        UPDATE step_heartbeats
        SET last_activity = ?, heartbeat_count = heartbeat_count + 1, updated_at = ?
        WHERE step_id = ? AND agent_id = ?
      `);
      updateHeartbeat.run(message, now, stepId, agentId);
    } else {
      const insertHeartbeat = db.prepare(`
        INSERT INTO step_heartbeats (id, step_id, agent_id, agent_name, run_id, task_id, last_activity, heartbeat_count, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
      `);
      insertHeartbeat.run(randomUUID(), stepId, agentId, agentName, runId, taskId, message, now, now);
    }

    return NextResponse.json({ id: activityId, status: 'ok' }, { status: 201 });
  } catch (error) {
    console.error('POST /api/activity/heartbeat error:', error);
    return NextResponse.json({ error: 'Failed to log heartbeat' }, { status: 500 });
  }
}
