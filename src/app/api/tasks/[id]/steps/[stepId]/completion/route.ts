import { NextResponse } from 'next/server';
import { submitStepCompletion } from '@/lib/domain/task-runs';

export const dynamic = 'force-dynamic';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; stepId: string }> },
) {
  try {
    const { stepId } = await params;
    const body = await request.json();
    const step = submitStepCompletion(stepId, {
      actor: body.actor || 'unknown-agent',
      summary: body.summary || '',
      outputsProduced: body.outputsProduced || [],
      validationResult: body.validationResult || '',
      issues: body.issues || '',
      nextStepRecommendation: body.nextStepRecommendation || '',
    });
    return NextResponse.json(step);
  } catch (error) {
    console.error('POST /api/tasks/[id]/steps/[stepId]/completion error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to submit completion' }, { status: 400 });
  }
}
