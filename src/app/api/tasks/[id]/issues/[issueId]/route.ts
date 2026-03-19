import { NextResponse } from 'next/server';
import { updateTaskIssue } from '@/lib/domain/tasks';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; issueId: string }> },
) {
  try {
    const { issueId } = await params;
    const body = await request.json();
    const issue = updateTaskIssue(issueId, {
      actor: body.actor || 'max',
      status: body.status,
      assignedTo: body.assignedTo,
      summary: body.summary,
      title: body.title,
      resolution: body.resolution,
    });

    if (!issue) {
      return NextResponse.json({ error: 'Issue not found' }, { status: 404 });
    }

    return NextResponse.json(issue);
  } catch (error) {
    console.error('PATCH /api/tasks/[id]/issues/[issueId] error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to update issue' }, { status: 400 });
  }
}
