import { NextResponse } from 'next/server';
import { getTaskComments, addTaskComment } from '@/lib/domain/tasks';
import type { CommentType, AuthorType } from '@/lib/types';

export const dynamic = 'force-dynamic';

// GET /api/tasks/[id]/comments
export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const url = new URL(request.url);
        const type = url.searchParams.get('type') as CommentType | null;
        const issueId = url.searchParams.get('issueId');
        
        const comments = getTaskComments(id, type || undefined, issueId || undefined);
        return NextResponse.json(comments);
    } catch (error) {
        console.error('GET /api/tasks/[id]/comments error:', error);
        return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 });
    }
}

// POST /api/tasks/[id]/comments
export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();
        
        if (!body.content) {
            return NextResponse.json({ error: 'Content is required' }, { status: 400 });
        }

        const comment = addTaskComment(
            id,
            body.content,
            body.author || 'system',
            (body.authorType as AuthorType) || 'agent',
            (body.commentType as CommentType) || 'note',
            body.parentId,
            body.runId,
            body.stepId,
            body.issueId
        );

        return NextResponse.json(comment, { status: 201 });
    } catch (error) {
        console.error('POST /api/tasks/[id]/comments error:', error);
        return NextResponse.json({ error: 'Failed to add comment' }, { status: 500 });
    }
}
