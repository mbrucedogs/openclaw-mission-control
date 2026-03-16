import { NextRequest, NextResponse } from 'next/server';
import { unlinkTask } from '@/lib/domain/documents';

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; task_id: string }> }) {
    const { id, task_id } = await params;
    const ok = unlinkTask(Number(id), task_id);
    if (!ok) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ ok: true });
}
