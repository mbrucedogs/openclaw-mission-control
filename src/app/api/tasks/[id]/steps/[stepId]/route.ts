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
        const { id: taskId, stepId } = await params;
        const body = await request.json();
        const { action } = body;

        // BLOCKER: For "complete" action, check if previous steps are done
        if (action === 'complete') {
            const { getTaskWorkflowSteps } = await import('@/lib/domain/workflows');
            const steps = getTaskWorkflowSteps(taskId);
            const currentStep = steps.find(s => s.id === stepId);

            if (currentStep) {
                // Find all steps with lower stepNumber that are NOT complete
                const incompletePriorSteps = steps.filter(s =>
                    s.stepNumber < currentStep.stepNumber &&
                    s.status !== 'complete'
                );

                if (incompletePriorSteps.length > 0) {
                    return NextResponse.json({
                        error: 'Cannot complete step with incomplete prior steps',
                        incompletePriorSteps: incompletePriorSteps.map(s => ({
                            stepNumber: s.stepNumber,
                            workflowName: s.workflowName,
                            status: s.status
                        })),
                        message: `Step ${currentStep.stepNumber} cannot be completed until prior steps are done.`
                    }, { status: 400 });
                }
            }
        }

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
