import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

interface FeedParams {
  taskId?: string;
  agent?: string;
  limit?: string;
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const taskId = url.searchParams.get('taskId');
    const agent = url.searchParams.get('agent');
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10), 200);

    // Build query
    let query = `
      SELECT 
        ta.id,
        ta.task_id,
        ta.run_id,
        ta.step_id,
        ta.actor as agentName,
        ta.actor_type,
        ta.activity_type as eventType,
        ta.details,
        ta.created_at,
        t.title as taskTitle,
        rs.title as stepTitle
      FROM task_activity ta
      LEFT JOIN tasks t ON ta.task_id = t.id
      LEFT JOIN run_steps rs ON ta.step_id = rs.id
      WHERE ta.actor_type = 'agent'
    `;
    
    const params: (string | number)[] = [];
    
    if (taskId) {
      query += ' AND ta.task_id = ?';
      params.push(taskId);
    }
    
    if (agent) {
      query += ' AND ta.actor = ?';
      params.push(agent);
    }
    
    query += ' ORDER BY ta.created_at DESC LIMIT ?';
    params.push(limit);
    
    const rows = db.prepare(query).all(...params) as Record<string, unknown>[];
    
    // Get active agents from step_heartbeats
    const agentsQuery = `
      SELECT 
        sh.agent_id,
        sh.agent_name,
        sh.step_id,
        sh.task_id,
        sh.run_id,
        sh.last_activity,
        sh.heartbeat_count,
        sh.is_stuck,
        sh.updated_at as lastSeen,
        t.title as taskTitle,
        rs.title as stepTitle
      FROM step_heartbeats sh
      LEFT JOIN tasks t ON sh.task_id = t.id
      LEFT JOIN run_steps rs ON sh.step_id = rs.id
      ORDER BY sh.updated_at DESC
    `;
    
    const agents = db.prepare(agentsQuery).all() as Record<string, unknown>[];
    
    const events = rows.map(row => ({
      id: row.id,
      agentId: row.actor,
      agentName: row.agentName,
      stepId: row.step_id,
      stepTitle: row.stepTitle || null,
      taskId: row.task_id,
      taskTitle: row.taskTitle || null,
      eventType: row.eventType,
      message: row.details ? JSON.parse(row.details as string)?.message : null,
      metadata: row.details ? JSON.parse(row.details as string)?.metadata : {},
      createdAt: row.created_at,
    }));
    
    const activeAgents = agents.map(a => ({
      agentId: a.agent_id,
      agentName: a.agent_name,
      currentTask: a.task_id,
      currentStep: a.step_id,
      taskTitle: a.taskTitle || null,
      stepTitle: a.stepTitle || null,
      lastActivity: a.last_activity,
      heartbeatCount: a.heartbeat_count,
      isStuck: Boolean(a.is_stuck),
      lastSeen: a.lastSeen,
      status: a.is_stuck ? 'stuck' : 'working',
    }));
    
    return NextResponse.json({ events, agents: activeAgents });
  } catch (error) {
    console.error('GET /api/activity/feed error:', error);
    return NextResponse.json({ error: 'Failed to fetch activity feed' }, { status: 500 });
  }
}
