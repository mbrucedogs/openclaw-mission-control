import { NextResponse } from 'next/server';
import { getTaskActivity } from '@/lib/domain/tasks';

export const dynamic = 'force-dynamic';

// GET /api/tasks/[id]/activity
export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const url = new URL(request.url);
        const limit = parseInt(url.searchParams.get('limit') || '50');
        
        const activity = getTaskActivity(id, limit);
        return NextResponse.json(activity);
    } catch (error) {
        console.error('GET /api/tasks/[id]/activity error:', error);
        return NextResponse.json({ error: 'Failed to fetch activity' }, { status: 500 });
    }
}
