import { NextResponse } from 'next/server';
import { getTaskById, handoverTask, completeTask } from '@/lib/domain/tasks';
import { TaskStatus } from '@/lib/types';

// Pipeline handoff order
const NEXT_AGENT: Record<string, { owner: string; status: TaskStatus }> = {
    alice:   { owner: 'max',   status: 'Review' },
    bob:     { owner: 'max',   status: 'Review' },
    charlie: { owner: 'max',   status: 'Review' },
    aegis:   { owner: 'max',   status: 'Review' },
};

/**
 * POST /api/tasks/:id/handoff
 * Body: { toAgent?: string, notes: string, fail?: boolean, evidence?: { type, url, description }[] }
 *
 * Advances a task to the next stage in the pipeline.
 * - If `toAgent` is specified, sends directly to that agent.
 * - Otherwise follows the canonical pipeline order (specialists -> Max).
 * - Max must specify `toAgent` or manually complete the task.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await (params as any);
        const body = await req.json();

        const task = getTaskById(id);
        if (!task) {
            return NextResponse.json({ error: 'Task not found' }, { status: 404 });
        }

        const fromAgent = task.owner;
        const notes = body.notes ?? '';

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

        // Handle evidence if provided
        if (body.evidence && Array.isArray(body.evidence)) {
            for (const ev of body.evidence) {
                const { addTaskEvidence } = await import('@/lib/domain/tasks');
                addTaskEvidence(
                    id,
                    ev.type || 'file',
                    ev.url,
                    fromAgent,
                    ev.description
                );
            }
        }

        // Perform handover
        const updatedTask = handoverTask(id, {
            to: nextOwner,
            notes: notes,
            actor: fromAgent,
            actorType: 'agent'
        });

        if (!updatedTask) {
            return NextResponse.json({ error: 'Failed to handover task' }, { status: 500 });
        }

        // Update status separately if different from handover result
        if (nextStatus !== updatedTask.status) {
            const { updateTask } = await import('@/lib/domain/tasks');
            updateTask(id, { status: nextStatus }, fromAgent);
        }

        // If completing
        if (nextStatus === 'Complete') {
            completeTask(id, fromAgent);
        }

        return NextResponse.json({ 
            ok: true, 
            from: fromAgent, 
            to: nextOwner, 
            status: nextStatus 
        });
    } catch (error) {
        console.error('Handoff error:', error);
        return NextResponse.json({ error: 'Failed to handoff task' }, { status: 500 });
    }
}
