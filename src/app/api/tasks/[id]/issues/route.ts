import { NextResponse } from 'next/server';
import { createTaskIssue, getTaskIssues } from '@/lib/domain/tasks';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    return NextResponse.json(getTaskIssues(id));
  } catch (error) {
    console.error('GET /api/tasks/[id]/issues error:', error);
    return NextResponse.json({ error: 'Failed to fetch issues' }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();

    if (!body.title?.trim() || !body.summary?.trim()) {
      return NextResponse.json({ error: 'title and summary are required' }, { status: 400 });
    }

    const issue = createTaskIssue({
      taskId: id,
      title: body.title.trim(),
      summary: body.summary.trim(),
      assignedTo: body.assignedTo === 'orchestrator' ? 'orchestrator' : 'human',
      createdBy: body.createdBy || body.actor || 'max',
      runId: body.runId,
      stepId: body.stepId,
      status: body.status,
    });

    return NextResponse.json(issue, { status: 201 });
  } catch (error) {
    console.error('POST /api/tasks/[id]/issues error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to create issue' }, { status: 400 });
  }
}
