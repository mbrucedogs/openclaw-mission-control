import { NextResponse } from 'next/server';
import { listFreshStepHeartbeats, pruneStaleStepHeartbeats } from '@/lib/activity-heartbeats';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    pruneStaleStepHeartbeats();
    const rows = listFreshStepHeartbeats() as Record<string, unknown>[];
    
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
