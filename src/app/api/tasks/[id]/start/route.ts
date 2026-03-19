import { NextResponse } from 'next/server';
import { startTaskRun } from '@/lib/domain/task-runs';

export const dynamic = 'force-dynamic';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const task = startTaskRun(id, {
      actor: body.actor || 'max',
      reason: body.reason,
      templateId: body.templateId,
    });
    return NextResponse.json(task);
  } catch (error) {
    console.error('POST /api/tasks/[id]/start error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to start task' }, { status: 400 });
  }
}
