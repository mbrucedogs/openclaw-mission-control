import { NextResponse } from 'next/server';
import { deleteTask, getTaskById, updateTask } from '@/lib/domain/tasks';
import type { TaskStatus } from '@/lib/types';

export const dynamic = 'force-dynamic';

function parseInclude(url: URL) {
  const includeParam = url.searchParams.get('include');
  const include = new Set((includeParam || '').split(',').map((value) => value.trim()).filter(Boolean));
  return {
    includeComments: include.has('comments'),
    includeActivity: include.has('activity'),
    includeEvidence: include.has('evidence'),
    includeCurrentRun: include.has('currentRun'),
    includePlan: include.has('plan'),
    includeIssues: include.has('issues'),
  };
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const task = getTaskById(id, parseInclude(new URL(request.url)));
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }
    return NextResponse.json(task);
  } catch (error) {
    console.error('GET /api/tasks/[id] error:', error);
    return NextResponse.json({ error: 'Failed to fetch task' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const updated = updateTask(id, {
      title: body.title,
      goal: body.goal,
      description: body.description,
      priority: body.priority,
      owner: body.owner,
      project: body.project,
      acceptanceCriteria: body.acceptanceCriteria,
      status: body.status as TaskStatus | undefined,
    }, body.actor || 'system');

    if (!updated) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error('PATCH /api/tasks/[id] error:', error);
    return NextResponse.json({ error: 'Failed to update task' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
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
