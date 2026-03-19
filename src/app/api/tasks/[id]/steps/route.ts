import { NextResponse } from 'next/server';
import { getCurrentRunForTask } from '@/lib/domain/task-runs';
import { getTaskStagePlans } from '@/lib/domain/tasks';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const run = getCurrentRunForTask(id, false);
    if (!run) {
      return NextResponse.json(getTaskStagePlans(id));
    }
    return NextResponse.json(run.steps);
  } catch (error) {
    console.error('GET /api/tasks/[id]/steps error:', error);
    return NextResponse.json({ error: 'Failed to fetch steps' }, { status: 500 });
  }
}
