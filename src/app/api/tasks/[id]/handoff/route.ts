import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { TaskStatus } from '@/lib/types';

// Pipeline handoff order
// Every specialist hands back to Max by default
const NEXT_AGENT: Record<string, { owner: string; status: TaskStatus }> = {
    alice:   { owner: 'max',   status: 'Review' },
    bob:     { owner: 'max',   status: 'Review' },
    charlie: { owner: 'max',   status: 'Review' },
    aegis:   { owner: 'max',   status: 'Review' },
};

/**
 * POST /api/tasks/:id/handoff
 * Body: { toAgent?: string, notes: string, fail?: boolean, evidence?: string }
 *
 * Advances a task to the next stage in the pipeline.
 * - If `toAgent` is specified, sends directly to that agent.
 * - Otherwise follows the canonical pipeline order (specialists -> Max).
 * - Max must specify `toAgent` or manually complete the task.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const body = await req.json();
        const now = new Date().toISOString();

        const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as any;
        if (!task) {
            return NextResponse.json({ error: 'Task not found' }, { status: 404 });
        }

        const fromAgent = task.owner;
        const notes = body.notes ?? '';
        const evidence = body.evidence;

        // Determine next agent
        let nextOwner: string;
        let nextStatus: TaskStatus;

        if (body.toAgent) {
            // Explicit override (e.g., Charlie sending back to Bob on fail)
            nextOwner = body.toAgent;
            nextStatus = body.status ?? NEXT_AGENT[body.toAgent]?.status ?? 'In Progress';
        } else if (body.fail && fromAgent === 'charlie') {
            // QA fail: go back to Bob
            nextOwner = 'bob';
            nextStatus = 'In Progress';
        } else {
            const next = NEXT_AGENT[fromAgent];
            if (!next) {
                return NextResponse.json({ error: `No next agent defined for ${fromAgent}` }, { status: 400 });
            }
            nextOwner = next.owner;
            nextStatus = next.status;
        }

        // Update task
        const evidenceSql = evidence !== undefined ? ', evidence = ?' : '';
        const sqlParams = [nextOwner, nextStatus, fromAgent, notes, now];
        if (evidence !== undefined) sqlParams.push(evidence);
        sqlParams.push(id);

        db.prepare(`
            UPDATE tasks SET owner = ?, status = ?, handoverFrom = ?, supervisorNotes = ?, updatedAt = ?${evidenceSql}
            WHERE id = ?
        `).run(...sqlParams);

        // Log activity
        const actionVerb = nextStatus === 'Complete' ? 'completed' : `handed off to ${nextOwner}`;
        db.prepare(`INSERT INTO activity (id, type, message, actor, timestamp) VALUES (?, 'status_changed', ?, ?, ?)`)
            .run(
                `act-handoff-${id}-${Date.now()}`,
                `"${task.title}" ${actionVerb}${notes ? ` — ${notes.slice(0, 80)}` : ''}`,
                fromAgent,
                now
            );

        return NextResponse.json({ ok: true, from: fromAgent, to: nextOwner, status: nextStatus });
    } catch (error) {
        console.error('Handoff error:', error);
        return NextResponse.json({ error: 'Failed to handoff task' }, { status: 500 });
    }
}
