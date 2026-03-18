import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * Agent Alert Webhook
 * 
 * Receives alerts from monitoring agents (Aiden-Auto) when work needs
 * orchestrator attention. Stores the alert and notifies the orchestrator.
 * 
 * POST /api/agent-alerts
 * Body: {
 *   alertType: 'task_needs_routing' | 'agent_stuck' | 'task_needs_review' | 'custom',
 *   taskId?: string,
 *   assignedAgent?: string,
 *   reason: string,
 *   details?: Record<string, unknown>
 * }
 */

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const now = new Date().toISOString();
        const alertId = `alert-${Date.now()}`;

        // Validate required fields
        if (!body.alertType || !body.reason) {
            return NextResponse.json(
                { error: 'alertType and reason are required' },
                { status: 400 }
            );
        }

        // Store the alert
        db.prepare(`
            INSERT INTO agent_alerts (
                id, 
                alert_type, 
                task_id, 
                assigned_agent, 
                reason, 
                details,
                status,
                created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            alertId,
            body.alertType,
            body.taskId || null,
            body.assignedAgent || null,
            body.reason,
            body.details ? JSON.stringify(body.details) : null,
            'pending',
            now
        );

        // Create activity entry for visibility
        const activityId = `act-${Date.now()}`;
        const activityMessage = body.taskId 
            ? `[${body.alertType}] Task ${body.taskId}: ${body.reason}`
            : `[${body.alertType}] ${body.reason}`;

        db.prepare(`
            INSERT INTO activity (id, type, message, actor, timestamp, metadata)
            VALUES (?, ?, ?, ?, ?, ?)
        `).run(
            activityId,
            'agent_alert',
            activityMessage,
            body.sourceAgent || 'monitor',
            now,
            JSON.stringify({ alertId, taskId: body.taskId, alertType: body.alertType })
        );

        // Return success with alert ID
        return NextResponse.json({
            id: alertId,
            status: 'received',
            message: 'Alert recorded and queued for orchestrator'
        }, { status: 201 });

    } catch (error) {
        console.error('POST /api/agent-alerts error:', error);
        return NextResponse.json(
            { error: 'Failed to process alert' },
            { status: 500 }
        );
    }
}

// GET /api/agent-alerts - List pending alerts for the orchestrator
export async function GET(request: Request) {
    try {
        const url = new URL(request.url);
        const status = url.searchParams.get('status') || 'pending';
        const limit = parseInt(url.searchParams.get('limit') || '50');

        const alerts = db.prepare(`
            SELECT * FROM agent_alerts 
            WHERE status = ?
            ORDER BY created_at DESC
            LIMIT ?
        `).all(status, limit);

        // Parse details JSON
        const parsedAlerts = alerts.map((alert: any) => ({
            ...alert,
            details: alert.details ? JSON.parse(alert.details) : null
        }));

        return NextResponse.json(parsedAlerts);

    } catch (error) {
        console.error('GET /api/agent-alerts error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch alerts' },
            { status: 500 }
        );
    }
}
