import { NextRequest, NextResponse } from 'next/server';
import { linkTask } from '@/lib/domain/documents';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const { task_id, link_type } = await req.json();
    if (!task_id) return NextResponse.json({ error: 'task_id required' }, { status: 400 });
    linkTask(Number(id), task_id, link_type || 'related');
    return NextResponse.json({ ok: true }, { status: 201 });
}
