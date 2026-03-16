import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const activity = db.prepare('SELECT * FROM activity ORDER BY timestamp DESC LIMIT 50').all();
        return NextResponse.json(activity);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch activity' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const now = new Date().toISOString();
        const id = `act-${Date.now()}`;

        db.prepare(`INSERT INTO activity (id, type, message, actor, timestamp) VALUES (?, ?, ?, ?, ?)`)
            .run(id, body.type || 'task_updated', body.message, body.actor, now);

        return NextResponse.json({ id }, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to create activity' }, { status: 500 });
    }
}
