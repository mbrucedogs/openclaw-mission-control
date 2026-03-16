import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const now = new Date().toISOString();

        const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as any;
        if (!task) {
            return NextResponse.json({ error: 'Task not found' }, { status: 404 });
        }

        // Move to In Progress if still Backlog
        if (task.status === 'Backlog') {
            db.prepare(`UPDATE tasks SET status = 'In Progress', updatedAt = ? WHERE id = ?`).run(now, id);
        }

        // Log the dispatch — the agent will see this under their owner ID on next heartbeat poll
        db.prepare(`INSERT INTO activity (id, type, message, actor, timestamp) VALUES (?, 'task_updated', ?, 'system', ?)`)
            .run(
                `act-dispatch-${id}-${Date.now()}`,
                `Task "${task.title}" dispatched to ${task.owner} [${task.priority ?? 'normal'} priority]. Agent will pick up on next heartbeat.`,
                now
            );

        return NextResponse.json({ ok: true, owner: task.owner, taskId: id });
    } catch (error) {
        console.error('Dispatch error:', error);
        return NextResponse.json({ error: 'Failed to dispatch task' }, { status: 500 });
    }
}
