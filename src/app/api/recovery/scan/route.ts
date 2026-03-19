import { NextResponse } from 'next/server';
import { scanForRecovery } from '@/lib/domain/task-runs';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const staleMinutes = parseInt(url.searchParams.get('staleMinutes') || '20', 10);
    const alerts = scanForRecovery({ staleMinutes });
    return NextResponse.json({
      alerts,
      count: alerts.length,
    });
  } catch (error) {
    console.error('GET /api/recovery/scan error:', error);
    return NextResponse.json({ error: 'Failed to scan for recovery events' }, { status: 500 });
  }
}
