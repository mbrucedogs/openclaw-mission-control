import { NextResponse } from 'next/server';
import { getTasks } from '@/lib/domain/tasks';
import { db } from '@/lib/db';
import { TaskStatus } from '@/lib/types';
import { randomUUID } from 'crypto';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const tasks = getTasks();
        return NextResponse.json(tasks);
    } catch (error) {
        console.error('API Error:', error);
        return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const now = new Date().toISOString();
        const id = 'task-' + randomUUID().split('-')[0];

        db.prepare(`
            INSERT INTO tasks (id, title, description, status, priority, owner, requestedBy, project, executionMode, evidence, retryCount, isStuck, createdAt, updatedAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'local', ?, 0, 0, ?, ?)
        `).run(
            id,
            body.title,
            body.description || '',
            (body.status as TaskStatus) || 'Backlog',
            body.priority || 'normal',
            body.owner || 'matt',
            body.requestedBy || 'matt',
            body.project || null,
            body.evidence || null,
            now,
            now,
        );

        // Log activity
        db.prepare(`INSERT OR IGNORE INTO activity (id, type, message, actor, timestamp) VALUES (?, 'task_created', ?, ?, ?)`)
            .run(`act-${id}`, `Task "${body.title}" created in ${body.status || 'Backlog'}`, body.owner || 'matt', now);

        return NextResponse.json({ id }, { status: 201 });
    } catch (error) {
        console.error('POST /api/tasks error:', error);
        return NextResponse.json({ error: 'Failed to create task' }, { status: 500 });
    }
}
