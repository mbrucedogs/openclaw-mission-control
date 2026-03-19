import { NextResponse } from 'next/server';
import { getRecentTaskActivity } from '@/lib/domain/tasks';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const limit = Number.parseInt(url.searchParams.get('limit') || '50', 10);
    return NextResponse.json(getRecentTaskActivity(Number.isFinite(limit) ? limit : 50));
  } catch (error) {
    console.error('GET /api/tasks/activity error:', error);
    return NextResponse.json({ error: 'Failed to fetch activity feed' }, { status: 500 });
  }
}
