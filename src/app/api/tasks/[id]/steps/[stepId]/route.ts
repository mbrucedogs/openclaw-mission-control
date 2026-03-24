import { NextResponse } from 'next/server';
import { getRunStepById, getTaskStagePlanById, updateRunStep, updateTaskStagePlan, validateRunStep } from '@/lib/domain/task-runs';
import { blockTaskStageRuntime, retryTaskStageRuntime, startTaskStageRuntime } from '@/lib/openclaw/task-stage-runtime';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; stepId: string }> },
) {
  try {
    const { stepId } = await params;
    const step = getRunStepById(stepId) || getTaskStagePlanById(stepId);
    if (!step) {
      return NextResponse.json({ error: 'Step not found' }, { status: 404 });
    }
    return NextResponse.json(step);
  } catch (error) {
    console.error('GET /api/tasks/[id]/steps/[stepId] error:', error);
    return NextResponse.json({ error: 'Failed to fetch step' }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; stepId: string }> },
) {
  try {
    const { stepId } = await params;
    const body = await request.json();
    const runStep = getRunStepById(stepId);
    if (!runStep) {
      return NextResponse.json({ error: 'Only active run stages support runtime actions' }, { status: 400 });
    }
    const action = body.action;

    switch (action) {
      case 'start':
        return NextResponse.json(await startTaskStageRuntime(stepId, {
          actor: body.actor || 'max',
          reason: body.reason,
        }));
      case 'block':
        return NextResponse.json(await blockTaskStageRuntime(stepId, {
          actor: body.actor || 'max',
          reason: body.reason || 'Blocked by operator',
        }));
      case 'retry':
        return NextResponse.json(await retryTaskStageRuntime(stepId, {
          actor: body.actor || 'max',
          reason: body.reason || 'Retry requested',
        }));
      case 'validate':
        return NextResponse.json(validateRunStep(stepId, {
          actor: body.actor || 'max',
          decision: body.decision,
          notes: body.notes,
        }));
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('POST /api/tasks/[id]/steps/[stepId] error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to update step' }, { status: 400 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; stepId: string }> },
) {
  try {
    const { stepId } = await params;
    const body = await request.json();
    const packet = {
      title: body.title,
      role: body.role,
      assignedAgentId: body.assignedAgentId,
      assignedAgentName: body.assignedAgentName,
      goal: body.goal,
      inputs: body.inputs,
      requiredOutputs: body.requiredOutputs,
      doneCondition: body.doneCondition,
      boundaries: body.boundaries,
      dependencies: body.dependencies,
      notesForMax: body.notesForMax ?? body.notesForOrchestrator,
      notesForOrchestrator: body.notesForOrchestrator,
    };

    const updated = getRunStepById(stepId)
      ? updateRunStep(stepId, { actor: body.actor || 'max', packet })
      : updateTaskStagePlan(stepId, { actor: body.actor || 'max', packet });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('PATCH /api/tasks/[id]/steps/[stepId] error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to edit step' }, { status: 400 });
  }
}
