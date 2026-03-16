import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getProjects } from '@/lib/domain/projects';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        return NextResponse.json(getProjects());
    } catch (error) {
        console.error('API Error:', error);
        return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { id, name, description, status } = body;

        if (!id || !name) {
            return NextResponse.json({ error: 'id and name are required' }, { status: 400 });
        }

        db.prepare('INSERT INTO projects (id, name, description, status, progress) VALUES (?, ?, ?, ?, ?)')
            .run(id, name, description || '', status || 'active', 0);

        return NextResponse.json({ success: true, id }, { status: 201 });
    } catch (error) {
        console.error('API Error:', error);
        return NextResponse.json({ error: 'Failed to create project' }, { status: 500 });
    }
}
