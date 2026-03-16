import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { TaskStatus } from '@/lib/types';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const body = await req.json();
        const now = new Date().toISOString();

        if (body.status) {
            db.prepare('UPDATE tasks SET status = ?, updatedAt = ? WHERE id = ?')
                .run(body.status as TaskStatus, now, id);

            // Log activity
            const task = db.prepare('SELECT title, owner FROM tasks WHERE id = ?').get(id) as any;
            if (task) {
                db.prepare(`INSERT OR IGNORE INTO activity (id, type, message, actor, timestamp) VALUES (?, 'status_changed', ?, ?, ?)`)
                    .run(`act-mv-${id}-${Date.now()}`, `Moved "${task.title}" to ${body.status}`, task.owner, now);
            }
        }

        if (body.title !== undefined || body.description !== undefined || body.owner !== undefined || body.project !== undefined || body.evidence !== undefined || body.priority !== undefined || body.supervisorNotes !== undefined) {
            const updates: string[] = [];
            const vals: any[] = [];
            if (body.title !== undefined) { updates.push('title = ?'); vals.push(body.title); }
            if (body.description !== undefined) { updates.push('description = ?'); vals.push(body.description); }
            if (body.owner !== undefined) { updates.push('owner = ?'); vals.push(body.owner); }
            if (body.project !== undefined) { updates.push('project = ?'); vals.push(body.project); }
            if (body.evidence !== undefined) { updates.push('evidence = ?'); vals.push(body.evidence); }
            if (body.priority !== undefined) { updates.push('priority = ?'); vals.push(body.priority); }
            if (body.supervisorNotes !== undefined) { updates.push('supervisorNotes = ?'); vals.push(body.supervisorNotes); }
            updates.push('updatedAt = ?'); vals.push(now);
            vals.push(id);
            db.prepare(`UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`).run(...vals);
        }

        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error('PATCH /api/tasks/[id] error:', error);
        return NextResponse.json({ error: 'Failed to update task' }, { status: 500 });
    }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        db.prepare('DELETE FROM tasks WHERE id = ?').run(id);
        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error('DELETE /api/tasks/[id] error:', error);
        return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 });
    }
}
