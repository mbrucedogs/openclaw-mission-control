import { NextResponse } from 'next/server';
import { getTaskById, updateTask, deleteTask, startTask, completeTask, blockTask, unblockTask, retryTask, handoverTask } from '@/lib/domain/tasks';
import { TaskStatus, Priority } from '@/lib/types';

export const dynamic = 'force-dynamic';

// GET /api/tasks/[id]
export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const url = new URL(request.url);
        
        // Parse includes
        const includeParam = url.searchParams.get('include');
        const include = includeParam ? includeParam.split(',') as ('comments' | 'activity' | 'evidence')[] : undefined;
        
        const task = getTaskById(id, include);
        
        if (!task) {
            return NextResponse.json({ error: 'Task not found' }, { status: 404 });
        }

        return NextResponse.json(task);
    } catch (error) {
        console.error('GET /api/tasks/[id] error:', error);
        return NextResponse.json({ error: 'Failed to fetch task' }, { status: 500 });
    }
}

// PATCH /api/tasks/[id]
export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();
        const actor = body.actor || 'system';

        // BLOCKER: Check if task has incomplete steps before allowing completion
        if (body.status === 'Complete' || body.action === 'complete') {
            const { getTaskWorkflowSteps } = await import('@/lib/domain/workflows');
            const steps = getTaskWorkflowSteps(id);
            
            if (steps.length > 0) {
                const incompleteSteps = steps.filter(s => s.status !== 'complete');
                const failedSteps = steps.filter(s => s.status === 'failed');
                
                if (incompleteSteps.length > 0) {
                    return NextResponse.json({ 
                        error: 'Cannot complete task with incomplete steps',
                        incompleteSteps: incompleteSteps.map(s => ({ 
                            stepNumber: s.stepNumber, 
                            workflowName: s.workflowName,
                            status: s.status 
                        })),
                        message: `Task has ${incompleteSteps.length} incomplete step(s). Complete all steps before marking task done.`
                    }, { status: 400 });
                }
                
                if (failedSteps.length > 0) {
                    return NextResponse.json({ 
                        error: 'Cannot complete task with failed steps',
                        failedSteps: failedSteps.map(s => ({ 
                            stepNumber: s.stepNumber, 
                            workflowName: s.workflowName 
                        })),
                        message: `Task has ${failedSteps.length} failed step(s). Fix or retry failed steps before marking task done.`
                    }, { status: 400 });
                }
            }
        }

        // Handle special actions
        if (body.action) {
            switch (body.action) {
                case 'start':
                    const started = startTask(id, actor);
                    if (!started) return NextResponse.json({ error: 'Task not found' }, { status: 404 });
                    return NextResponse.json(started);
                
                case 'complete':
                    const completed = completeTask(id, actor);
                    if (!completed) return NextResponse.json({ error: 'Task not found' }, { status: 404 });
                    return NextResponse.json(completed);
                
                case 'block':
                    if (!body.blockerReason) {
                        return NextResponse.json({ error: 'blockerReason is required' }, { status: 400 });
                    }
                    const blocked = blockTask(id, body.blockerReason, body.blockerType, actor);
                    if (!blocked) return NextResponse.json({ error: 'Task not found' }, { status: 404 });
                    return NextResponse.json(blocked);
                
                case 'unblock':
                    const unblocked = unblockTask(id, actor);
                    if (!unblocked) return NextResponse.json({ error: 'Task not found' }, { status: 404 });
                    return NextResponse.json(unblocked);
                
                case 'retry':
                    if (!body.errorMessage) {
                        return NextResponse.json({ error: 'errorMessage is required' }, { status: 400 });
                    }
                    const retried = retryTask(id, body.errorMessage, actor);
                    if (!retried) return NextResponse.json({ error: 'Task not found' }, { status: 404 });
                    return NextResponse.json(retried);
                
                case 'handover':
                    if (!body.to) {
                        return NextResponse.json({ error: 'to (new owner) is required' }, { status: 400 });
                    }
                    const handedOver = handoverTask(id, {
                        to: body.to,
                        notes: body.notes,
                        actor,
                        actorType: body.actorType || 'agent'
                    });
                    if (!handedOver) return NextResponse.json({ error: 'Task not found' }, { status: 404 });
                    return NextResponse.json(handedOver);
                
                default:
                    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
            }
        }

        // Regular update
        const task = updateTask(id, {
            title: body.title,
            description: body.description,
            status: body.status as TaskStatus,
            priority: body.priority as Priority,
            owner: body.owner,
            reviewer: body.reviewer,
            project: body.project,
            isStuck: body.isStuck,
            stuckReason: body.stuckReason,
            maxRetries: body.maxRetries,
            validationCriteria: body.validationCriteria,
        }, actor);

        if (!task) {
            return NextResponse.json({ error: 'Task not found' }, { status: 404 });
        }

        return NextResponse.json(task);
    } catch (error) {
        console.error('PATCH /api/tasks/[id] error:', error);
        return NextResponse.json({ error: 'Failed to update task' }, { status: 500 });
    }
}

// DELETE /api/tasks/[id]
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const success = deleteTask(id);
        
        if (!success) {
            return NextResponse.json({ error: 'Task not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('DELETE /api/tasks/[id] error:', error);
        return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 });
    }
}
