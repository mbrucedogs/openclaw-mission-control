import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const rows = db.prepare(`
      SELECT 
        sh.agent_id,
        sh.agent_name,
        sh.step_id,
        sh.task_id,
        sh.run_id,
        sh.last_activity,
        sh.heartbeat_count,
        sh.is_stuck,
        sh.stuck_reason,
        sh.updated_at as last_seen,
        sh.created_at as first_seen,
        t.title as task_title,
        rs.title as step_title
      FROM step_heartbeats sh
      LEFT JOIN tasks t ON sh.task_id = t.id
      LEFT JOIN run_steps rs ON sh.step_id = rs.id
      ORDER BY sh.heartbeat_count DESC, sh.updated_at DESC
    `).all() as Record<string, unknown>[];
    
    const agents = rows.map(row => ({
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
      firstSeen: row.created_at,
      status: row.is_stuck ? 'stuck' : 'active',
    }));
    
    return NextResponse.json({ agents });
  } catch (error) {
    console.error('GET /api/activity/agents error:', error);
    return NextResponse.json({ error: 'Failed to fetch agents' }, { status: 500 });
  }
}
