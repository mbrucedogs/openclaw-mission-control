import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getProject } from '@/lib/domain/projects';

type ProjectUpdateBody = {
    name?: string;
    description?: string;
    status?: string;
};

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const project = getProject(id);
        if (!project) {
            return NextResponse.json({ error: 'Project not found' }, { status: 404 });
        }
        return NextResponse.json(project);
    } catch (error) {
        console.error('API Error:', error);
        return NextResponse.json({ error: 'Failed to fetch project' }, { status: 500 });
    }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const body = await request.json() as ProjectUpdateBody;
        const { name, description, status } = body;

        const existing = db.prepare('SELECT id FROM projects WHERE id = ?').get(id);
        if (!existing) {
            return NextResponse.json({ error: 'Project not found' }, { status: 404 });
        }

        const updates: string[] = [];
        const values: string[] = [];

        if (name !== undefined) { updates.push('name = ?'); values.push(name); }
        if (description !== undefined) { updates.push('description = ?'); values.push(description); }
        if (status !== undefined) { updates.push('status = ?'); values.push(status); }

        if (updates.length > 0) {
            values.push(id);
            db.prepare(`UPDATE projects SET ${updates.join(', ')} WHERE id = ?`).run(...values);
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('API Error:', error);
        return NextResponse.json({ error: 'Failed to update project' }, { status: 500 });
    }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const result = db.prepare('DELETE FROM projects WHERE id = ?').run(id);
        if (result.changes === 0) {
            return NextResponse.json({ error: 'Project not found' }, { status: 404 });
        }
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('API Error:', error);
        return NextResponse.json({ error: 'Failed to delete project' }, { status: 500 });
    }
}
