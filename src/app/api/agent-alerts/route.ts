import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const alerts = db.prepare(`
      SELECT * FROM agent_alerts 
      WHERE resolved = 0 
      ORDER BY created_at DESC
      LIMIT 50
    `).all();

    return NextResponse.json(alerts);
  } catch (error) {
    console.error('Error fetching alerts:', error);
    return NextResponse.json({ error: 'Failed to fetch alerts' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { alertType, taskId, agentId, message } = body;

    if (!alertType || !message) {
      return NextResponse.json({ error: 'alertType and message required' }, { status: 400 });
    }

    const result = db.prepare(`
      INSERT INTO agent_alerts (alert_type, task_id, agent_id, message, created_at)
      VALUES (?, ?, ?, ?, datetime('now'))
    `).run(alertType, taskId || null, agentId || null, message);

    const alert = db.prepare('SELECT * FROM agent_alerts WHERE id = ?').get(result.lastInsertRowid);

    return NextResponse.json(alert, { status: 201 });
  } catch (error) {
    console.error('Error creating alert:', error);
    return NextResponse.json({ error: 'Failed to create alert' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, resolved } = body;

    if (!id) {
      return NextResponse.json({ error: 'id required' }, { status: 400 });
    }

    db.prepare(`
      UPDATE agent_alerts 
      SET resolved = ?, resolved_at = datetime('now')
      WHERE id = ?
    `).run(resolved ? 1 : 0, id);

    const alert = db.prepare('SELECT * FROM agent_alerts WHERE id = ?').get(id);

    return NextResponse.json(alert);
  } catch (error) {
    console.error('Error updating alert:', error);
    return NextResponse.json({ error: 'Failed to update alert' }, { status: 500 });
  }
}
