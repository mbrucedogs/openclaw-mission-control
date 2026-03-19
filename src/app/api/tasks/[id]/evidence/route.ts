import { NextResponse } from 'next/server';
import { getTaskEvidence, addTaskEvidence, removeTaskEvidence } from '@/lib/domain/tasks';
import type { EvidenceType } from '@/lib/types';

export const dynamic = 'force-dynamic';

// GET /api/tasks/[id]/evidence
export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const evidence = getTaskEvidence(id);
        return NextResponse.json(evidence);
    } catch (error) {
        console.error('GET /api/tasks/[id]/evidence error:', error);
        return NextResponse.json({ error: 'Failed to fetch evidence' }, { status: 500 });
    }
}

// POST /api/tasks/[id]/evidence
export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();
        
        if (!body.url) {
            return NextResponse.json({ error: 'URL is required' }, { status: 400 });
        }

        const evidence = addTaskEvidence(
            id,
            (body.evidenceType as EvidenceType) || 'file',
            body.url,
            body.addedBy || 'system',
            body.description,
            body.runId,
            body.stepId
        );

        return NextResponse.json(evidence, { status: 201 });
    } catch (error) {
        console.error('POST /api/tasks/[id]/evidence error:', error);
        return NextResponse.json({ error: 'Failed to add evidence' }, { status: 500 });
    }
}

// DELETE /api/tasks/[id]/evidence
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await params;
        const url = new URL(request.url);
        const evidenceId = url.searchParams.get('evidenceId');
        const actor = url.searchParams.get('actor') || 'system';
        
        if (!evidenceId) {
            return NextResponse.json({ error: 'evidenceId is required' }, { status: 400 });
        }

        const success = removeTaskEvidence(evidenceId, actor);
        if (!success) {
            return NextResponse.json({ error: 'Evidence not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('DELETE /api/tasks/[id]/evidence error:', error);
        return NextResponse.json({ error: 'Failed to remove evidence' }, { status: 500 });
    }
}
