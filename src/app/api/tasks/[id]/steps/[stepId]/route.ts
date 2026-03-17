import { NextResponse } from 'next/server';
import { 
    startTaskWorkflowStep,
    completeTaskWorkflowStep,
    failTaskWorkflowStep,
    blockTaskWorkflowStep,
    getTaskWorkflowStepById
} from '@/lib/domain/workflows';

export const dynamic = 'force-dynamic';

// POST /api/tasks/{id}/steps/{stepId}/start
export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string; stepId: string }> }
) {
    try {
        const { stepId } = await params;
        const body = await request.json();
        const { action } = body;
        
        let step;
        switch (action) {
            case 'start':
                step = startTaskWorkflowStep(stepId);
                break;
            case 'complete':
                step = completeTaskWorkflowStep(stepId, {
                    evidenceIds: body.evidenceIds,
                    deliverables: body.deliverables,
                    completionNotes: body.completionNotes,
                    passFail: body.passFail,
                    validatedBy: body.validatedBy,
                    validationNotes: body.validationNotes,
                    handoffNotes: body.handoffNotes
                });
                break;
            case 'fail':
                step = failTaskWorkflowStep(stepId, {
                    blockers: body.blockers,
                    questions: body.questions
                });
                break;
            case 'block':
                step = blockTaskWorkflowStep(stepId, body.blockers);
                break;
            default:
                return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
        }
        
        if (!step) {
            return NextResponse.json({ error: 'Step not found' }, { status: 404 });
        }
        
        return NextResponse.json(step);
    } catch (error) {
        console.error('POST /api/tasks/{id}/steps/{stepId} error:', error);
        return NextResponse.json({ error: 'Failed to update step' }, { status: 500 });
    }
}

// GET /api/tasks/{id}/steps/{stepId}
export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string; stepId: string }> }
) {
    try {
        const { stepId } = await params;
        const step = getTaskWorkflowStepById(stepId);
        if (!step) {
            return NextResponse.json({ error: 'Step not found' }, { status: 404 });
        }
        return NextResponse.json(step);
    } catch (error) {
        console.error('GET /api/tasks/{id}/steps/{stepId} error:', error);
        return NextResponse.json({ error: 'Failed to fetch step' }, { status: 500 });
    }
}
