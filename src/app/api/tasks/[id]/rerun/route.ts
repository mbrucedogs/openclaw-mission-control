import { NextResponse } from 'next/server';
import { rerunTaskFromStep } from '@/lib/domain/task-runs';

export const dynamic = 'force-dynamic';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();
    if (!body.stepNumber) {
      return NextResponse.json({ error: 'stepNumber is required' }, { status: 400 });
    }

    const task = rerunTaskFromStep(id, body.stepNumber, {
      actor: body.actor || 'max',
      reason: body.reason || `Rerun requested from step ${body.stepNumber}`,
    });

    return NextResponse.json(task);
  } catch (error) {
    console.error('POST /api/tasks/[id]/rerun error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to rerun task' }, { status: 400 });
  }
}
