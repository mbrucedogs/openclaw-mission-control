import { db } from '../db';
import { Project, Task } from '../types';

export function getProjects(): Project[] {
    const projects = db.prepare('SELECT * FROM projects').all() as any[];

    return projects.map(p => {
        const taskRows = db.prepare('SELECT id FROM tasks WHERE project = ?')
            .all(p.id) as { id: string }[];
        const doneCount = db.prepare("SELECT COUNT(*) as count FROM tasks WHERE project = ? AND status = 'Complete'")
            .get(p.id) as { count: number };

        return {
            ...p,
            taskIds: taskRows.map(r => r.id),
            progress: taskRows.length > 0 ? (doneCount.count / taskRows.length) * 100 : p.progress ?? 0
        };
    });
}

export function getProject(id: string): Project | null {
    const row = db.prepare('SELECT * FROM projects WHERE id = ?').get(id) as any;
    if (!row) return null;

    const taskRows = db.prepare('SELECT id FROM tasks WHERE project = ?')
        .all(id) as { id: string }[];
    const doneCount = db.prepare("SELECT COUNT(*) as count FROM tasks WHERE project = ? AND status = 'Complete'")
        .get(id) as { count: number };

    return {
        ...row,
        taskIds: taskRows.map(r => r.id),
        progress: taskRows.length > 0 ? (doneCount.count / taskRows.length) * 100 : row.progress ?? 0
    };
}

export function getProjectTasks(projectId: string): Task[] {
    return db.prepare('SELECT * FROM tasks WHERE project = ? ORDER BY updatedAt DESC')
        .all(projectId) as Task[];
}
