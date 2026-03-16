import { db } from '../db';
import { Task, TaskStatus } from '../types';

export function getTasks(): Task[] {
    return db.prepare('SELECT * FROM tasks ORDER BY updatedAt DESC').all() as Task[];
}

export function updateTaskStatus(taskId: string, status: TaskStatus) {
    const now = new Date().toISOString();
    db.prepare('UPDATE tasks SET status = ?, updatedAt = ? WHERE id = ?')
        .run(status, now, taskId);
}

export function getActivity(): any[] {
    return db.prepare('SELECT * FROM activity ORDER BY timestamp DESC LIMIT 50').all();
}
