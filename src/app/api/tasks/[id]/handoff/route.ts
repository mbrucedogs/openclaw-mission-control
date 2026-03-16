import { NextResponse } from 'next/server';
import { getTaskById, handoverTask, completeTask, updateTask } from '@/lib/domain/tasks';
import { getNextAgent, getPreviousAgent, isPipelineComplete, getHandoffStatus } from '@/lib/pipeline';
import { TaskStatus } from '@/lib/types';

/**
 * POST /api/tasks/:id/handoff
 * Body: { toAgent?: string, notes: string, fail?: boolean, evidence?: { type, url, description }[] }
 *
 * Dynamic pipeline handoff based on task's stored pipeline.
 * - Uses stored pipeline from validationCriteria._pipeline
 * - Supports explicit override (toAgent)
 * - Supports fail/back scenarios
 * - Auto-completes if at end of pipeline
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

        // Get pipeline from task metadata (stored in validationCriteria)
        const pipeline: string[] = (task.validationCriteria as any)?._pipeline || ['alice', 'bob', 'charlie', 'aegis'];
        const currentStep = (task.validationCriteria as any)?._currentStep || pipeline.indexOf(fromAgent);

        let nextOwner: string | null;
        let nextStatus: TaskStatus;
        let newStep = currentStep;

        if (body.toAgent) {
            // Explicit override
            nextOwner = body.toAgent;
            nextStatus = body.status || 'In Progress';
            newStep = pipeline.indexOf(body.toAgent);
        } else if (body.fail) {
            // Fail: go back to previous agent in pipeline
            nextOwner = getPreviousAgent(fromAgent, pipeline);
            if (!nextOwner) {
                // Can't go back further, mark as stuck
                await updateTask(id, { 
                    isStuck: true, 
                    stuckReason: notes || 'Failed QA, no previous agent' 
                }, fromAgent);
                return NextResponse.json({ 
                    ok: true, 
                    action: 'marked_stuck',
                    from: fromAgent,
                    reason: notes || 'Failed QA'
                });
            }
            nextStatus = 'In Progress';
            newStep = pipeline.indexOf(nextOwner);
        } else {
            // Normal forward progression
            nextOwner = getNextAgent(fromAgent, pipeline);
            
            if (!nextOwner || isPipelineComplete(fromAgent, pipeline)) {
                // End of pipeline - complete the task
                const completed = completeTask(id, fromAgent);
                return NextResponse.json({ 
                    ok: true, 
                    action: 'completed',
                    from: fromAgent,
                    task: completed
                });
            }
            
            nextStatus = getHandoffStatus(nextOwner);
            newStep = pipeline.indexOf(nextOwner);
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

        // Update status and pipeline step
        const finalTask = await updateTask(id, { 
            status: nextStatus,
            validationCriteria: {
                ...task.validationCriteria,
                _currentStep: newStep,
            }
        }, fromAgent);

        return NextResponse.json({ 
            ok: true, 
            from: fromAgent, 
            to: nextOwner, 
            status: nextStatus,
            step: `${newStep + 1}/${pipeline.length}`,
            pipeline: pipeline
        });
    } catch (error) {
        console.error('Handoff error:', error);
        return NextResponse.json({ error: 'Failed to handoff task' }, { status: 500 });
    }
}
