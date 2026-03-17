import { NextResponse } from 'next/server';
import { 
    createTaskWorkflowStep, 
    getTaskWorkflowSteps, 
    getCurrentTaskWorkflowStep,
    startTaskWorkflowStep,
    completeTaskWorkflowStep,
    failTaskWorkflowStep,
    blockTaskWorkflowStep
} from '@/lib/domain/workflows';

export const dynamic = 'force-dynamic';

// GET /api/tasks/{id}/steps - Get all steps for a task
export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const steps = getTaskWorkflowSteps(id);
        return NextResponse.json(steps);
    } catch (error) {
        console.error('GET /api/tasks/{id}/steps error:', error);
        return NextResponse.json({ error: 'Failed to fetch steps' }, { status: 500 });
    }
}

// POST /api/tasks/{id}/steps - Create a new step
export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { workflowId, workflowName, agentId, agentName, stepNumber, nextStepId } = body;
        
        if (!workflowId || !agentId || !stepNumber) {
            return NextResponse.json({ error: 'workflowId, agentId, and stepNumber required' }, { status: 400 });
        }
        
        const step = createTaskWorkflowStep({
            taskId: id,
            stepNumber,
            workflowId,
            workflowName: workflowName || workflowId,
            agentId,
            agentName,
            nextStepId
        });
        
        return NextResponse.json(step, { status: 201 });
    } catch (error) {
        console.error('POST /api/tasks/{id}/steps error:', error);
        return NextResponse.json({ error: 'Failed to create step' }, { status: 500 });
    }
}
