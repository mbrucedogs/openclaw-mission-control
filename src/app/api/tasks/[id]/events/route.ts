import { NextResponse } from 'next/server';
import { getCurrentRunForTask } from '@/lib/domain/task-runs';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const run = getCurrentRunForTask(id, true);
    return NextResponse.json(run?.events || []);
  } catch (error) {
    console.error('GET /api/tasks/[id]/events error:', error);
    return NextResponse.json({ error: 'Failed to fetch task events' }, { status: 500 });
  }
}
