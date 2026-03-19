import { db } from '../db';
import type { Project, Task } from '../types';
import { getTasks } from './tasks';

export function getProjects(): Project[] {
    const projects = db.prepare('SELECT * FROM projects').all() as Project[];

    return projects.map(p => {
        const taskRows = db.prepare('SELECT id FROM tasks WHERE project = ?')
            .all(p.id) as { id: string }[];
        const doneCount = db.prepare("SELECT COUNT(*) as count FROM tasks WHERE project = ? AND status = 'Done'")
            .get(p.id) as { count: number };

        return {
            ...p,
            taskIds: taskRows.map(r => r.id),
            progress: taskRows.length > 0 ? (doneCount.count / taskRows.length) * 100 : p.progress ?? 0
        };
    });
}

export function getProject(id: string): Project | null {
    const row = db.prepare('SELECT * FROM projects WHERE id = ?').get(id) as Project | undefined;
    if (!row) return null;

    const taskRows = db.prepare('SELECT id FROM tasks WHERE project = ?')
        .all(id) as { id: string }[];
    const doneCount = db.prepare("SELECT COUNT(*) as count FROM tasks WHERE project = ? AND status = 'Done'")
        .get(id) as { count: number };

    return {
        ...row,
        taskIds: taskRows.map(r => r.id),
        progress: taskRows.length > 0 ? (doneCount.count / taskRows.length) * 100 : row.progress ?? 0
    };
}

export function getProjectTasks(projectId: string): Task[] {
    return getTasks({ project: projectId });
}
