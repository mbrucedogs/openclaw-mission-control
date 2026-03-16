import { db } from '../db';
import { 
    Task, TaskStatus, Priority, TaskComment, TaskActivity, TaskEvidence, 
    ActivityType, CommentType, AuthorType, EvidenceType, ValidationCriteria, ActivityDetails 
} from '../types';
import { randomUUID } from 'crypto';

// ============================================================================
// TASK CRUD
// ============================================================================

export interface TaskFilters {
    status?: TaskStatus;
    owner?: string;
    project?: string;
    isStuck?: boolean;
}

export function getTasks(filters?: TaskFilters, include?: ('comments' | 'activity' | 'evidence')[]): Task[] {
    let query = 'SELECT * FROM tasks';
    const whereClauses: string[] = [];
    const params: any[] = [];

    if (filters?.status) {
        whereClauses.push('status = ?');
        params.push(filters.status);
    }
    if (filters?.owner) {
        whereClauses.push('owner = ?');
        params.push(filters.owner);
    }
    if (filters?.project) {
        whereClauses.push('project = ?');
        params.push(filters.project);
    }
    if (filters?.isStuck !== undefined) {
        whereClauses.push('isStuck = ?');
        params.push(filters.isStuck ? 1 : 0);
    }

    if (whereClauses.length > 0) {
        query += ' WHERE ' + whereClauses.join(' AND ');
    }
    query += ' ORDER BY updatedAt DESC';

    const tasks = db.prepare(query).all(...params) as any[];
    
    return tasks.map(t => hydrateTask(t, include));
}

export function getTaskById(id: string, include?: ('comments' | 'activity' | 'evidence')[]): Task | null {
    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as any;
    if (!task) return null;
    return hydrateTask(task, include);
}

export interface CreateTaskInput {
    title: string;
    description?: string;
    status?: TaskStatus;
    priority?: Priority;
    owner?: string;
    requestedBy?: string;
    reviewer?: string;
    project?: string;
    executionMode?: 'local' | 'cloud';
    validationCriteria?: ValidationCriteria;
}

export function createTask(input: CreateTaskInput): Task {
    const now = new Date().toISOString();
    const id = 'task-' + randomUUID().split('-')[0];
    
    const task: Task = {
        id,
        title: input.title,
        description: input.description,
        status: input.status || 'Backlog',
        priority: input.priority || 'normal',
        owner: input.owner || 'matt',
        requestedBy: input.requestedBy || 'matt',
        reviewer: input.reviewer,
        project: input.project,
        executionMode: input.executionMode || 'local',
        retryCount: 0,
        maxRetries: 3,
        isStuck: false,
        createdAt: now,
        updatedAt: now,
        validationCriteria: input.validationCriteria,
    };

    db.prepare(`
        INSERT INTO tasks (id, title, description, status, priority, owner, requestedBy, reviewer, project, executionMode, scheduleRef, createdAt, updatedAt, startedAt, completedAt, retryCount, maxRetries, lastError, isStuck, stuckReason, stuckSince, handoverFrom, validationCriteria)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
        task.id, task.title, task.description || null, task.status, task.priority, 
        task.owner, task.requestedBy, task.reviewer || null, task.project || null, 
        task.executionMode, task.scheduleRef || null, task.createdAt, task.updatedAt,
        task.startedAt || null, task.completedAt || null, task.retryCount, task.maxRetries,
        task.lastError || null, task.isStuck ? 1 : 0, task.stuckReason || null, 
        task.stuckSince || null, task.handoverFrom || null, 
        task.validationCriteria ? JSON.stringify(task.validationCriteria) : null
    );

    // Log activity
    logTaskActivity(task.id, task.requestedBy, 'user', 'created', { 
        newStatus: task.status 
    });

    return task;
}

export interface UpdateTaskInput {
    title?: string;
    description?: string;
    status?: TaskStatus;
    priority?: Priority;
    owner?: string;
    reviewer?: string;
    project?: string;
    isStuck?: boolean;
    stuckReason?: string;
    maxRetries?: number;
    validationCriteria?: ValidationCriteria;
}

export function updateTask(id: string, input: UpdateTaskInput, actor: string = 'system'): Task | null {
    const task = getTaskById(id);
    if (!task) return null;

    const oldStatus = task.status;
    const now = new Date().toISOString();

    // Build update dynamically
    const updates: string[] = [];
    const values: any[] = [];

    if (input.title !== undefined) { updates.push('title = ?'); values.push(input.title); }
    if (input.description !== undefined) { updates.push('description = ?'); values.push(input.description); }
    if (input.status !== undefined) { updates.push('status = ?'); values.push(input.status); }
    if (input.priority !== undefined) { updates.push('priority = ?'); values.push(input.priority); }
    if (input.owner !== undefined) { updates.push('owner = ?'); values.push(input.owner); }
    if (input.reviewer !== undefined) { updates.push('reviewer = ?'); values.push(input.reviewer); }
    if (input.project !== undefined) { updates.push('project = ?'); values.push(input.project); }
    if (input.isStuck !== undefined) { updates.push('isStuck = ?'); values.push(input.isStuck ? 1 : 0); }
    if (input.stuckReason !== undefined) { updates.push('stuckReason = ?'); values.push(input.stuckReason); }
    if (input.maxRetries !== undefined) { updates.push('maxRetries = ?'); values.push(input.maxRetries); }
    if (input.validationCriteria !== undefined) { updates.push('validationCriteria = ?'); values.push(JSON.stringify(input.validationCriteria)); }
    
    updates.push('updatedAt = ?');
    values.push(now);
    values.push(id); // for WHERE clause

    db.prepare(`UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`).run(...values);

    // Log status change if applicable
    if (input.status && input.status !== oldStatus) {
        logTaskActivity(id, actor, 'user', 'status_changed', { oldStatus, newStatus: input.status });
    } else {
        logTaskActivity(id, actor, 'user', 'updated', {});
    }

    return getTaskById(id);
}

export function deleteTask(id: string): boolean {
    // Comments, activity, evidence will cascade delete
    const result = db.prepare('DELETE FROM tasks WHERE id = ?').run(id);
    return result.changes > 0;
}

// ============================================================================
// TASK COMMENTS
// ============================================================================

export function getTaskComments(taskId: string, type?: CommentType): TaskComment[] {
    let query = 'SELECT * FROM task_comments WHERE task_id = ?';
    const params: any[] = [taskId];
    
    if (type) {
        query += ' AND comment_type = ?';
        params.push(type);
    }
    query += ' ORDER BY created_at DESC';
    
    return db.prepare(query).all(...params).map(row => ({
        id: (row as any).id,
        taskId: (row as any).task_id,
        author: (row as any).author,
        authorType: (row as any).author_type as AuthorType,
        content: (row as any).content,
        commentType: (row as any).comment_type as CommentType,
        parentId: (row as any).parent_id,
        createdAt: (row as any).created_at,
        updatedAt: (row as any).updated_at,
    }));
}

export function addTaskComment(
    taskId: string, 
    content: string, 
    author: string, 
    authorType: AuthorType = 'agent',
    commentType: CommentType = 'note',
    parentId?: string
): TaskComment {
    const now = new Date().toISOString();
    const id = 'cmt-' + randomUUID().split('-')[0];
    
    db.prepare(`
        INSERT INTO task_comments (id, task_id, author, author_type, content, comment_type, parent_id, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, taskId, author, authorType, content, commentType, parentId || null, now, now);

    // Log activity
    logTaskActivity(taskId, author, authorType, 'comment_added', { commentId: id, commentType });

    return {
        id, taskId, author, authorType, content, commentType, parentId, createdAt: now, updatedAt: now
    };
}

export function updateTaskComment(commentId: string, content: string): boolean {
    const now = new Date().toISOString();
    const result = db.prepare('UPDATE task_comments SET content = ?, updated_at = ? WHERE id = ?').run(content, now, commentId);
    return result.changes > 0;
}

export function deleteTaskComment(commentId: string): boolean {
    const result = db.prepare('DELETE FROM task_comments WHERE id = ?').run(commentId);
    return result.changes > 0;
}

// ============================================================================
// TASK ACTIVITY
// ============================================================================

export function getTaskActivity(taskId: string, limit: number = 50): TaskActivity[] {
    return db.prepare('SELECT * FROM task_activity WHERE task_id = ? ORDER BY created_at DESC LIMIT ?')
        .all(taskId, limit)
        .map(row => ({
            id: (row as any).id,
            taskId: (row as any).task_id,
            actor: (row as any).actor,
            actorType: (row as any).actor_type as AuthorType,
            activityType: (row as any).activity_type as ActivityType,
            details: (row as any).details ? JSON.parse((row as any).details) : undefined,
            createdAt: (row as any).created_at,
        }));
}

export function logTaskActivity(
    taskId: string,
    actor: string,
    actorType: AuthorType,
    activityType: ActivityType,
    details?: ActivityDetails
): TaskActivity {
    const now = new Date().toISOString();
    const id = 'act-' + randomUUID().split('-')[0];
    
    db.prepare(`
        INSERT INTO task_activity (id, task_id, actor, actor_type, activity_type, details, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, taskId, actor, actorType, activityType, details ? JSON.stringify(details) : null, now);

    return {
        id, taskId, actor, actorType, activityType, details, createdAt: now
    };
}

// ============================================================================
// TASK EVIDENCE
// ============================================================================

export function getTaskEvidence(taskId: string): TaskEvidence[] {
    return db.prepare('SELECT * FROM task_evidence WHERE task_id = ? ORDER BY added_at DESC')
        .all(taskId)
        .map(row => ({
            id: (row as any).id,
            taskId: (row as any).task_id,
            evidenceType: (row as any).evidence_type as EvidenceType,
            url: (row as any).url,
            description: (row as any).description,
            addedBy: (row as any).added_by,
            addedAt: (row as any).added_at,
        }));
}

export function addTaskEvidence(
    taskId: string,
    evidenceType: EvidenceType,
    url: string,
    addedBy: string,
    description?: string
): TaskEvidence {
    const now = new Date().toISOString();
    const id = 'ev-' + randomUUID().split('-')[0];
    
    db.prepare(`
        INSERT INTO task_evidence (id, task_id, evidence_type, url, description, added_by, added_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, taskId, evidenceType, url, description || null, addedBy, now);

    // Log activity
    logTaskActivity(taskId, addedBy, 'user', 'evidence_added', { evidenceId: id, evidenceType });

    return {
        id, taskId, evidenceType, url, description, addedBy, addedAt: now
    };
}

export function removeTaskEvidence(evidenceId: string, actor: string): boolean {
    const evidence = db.prepare('SELECT * FROM task_evidence WHERE id = ?').get(evidenceId) as any;
    if (!evidence) return false;
    
    const result = db.prepare('DELETE FROM task_evidence WHERE id = ?').run(evidenceId);
    
    if (result.changes > 0) {
        logTaskActivity(evidence.task_id, actor, 'user', 'evidence_removed', { evidenceId });
    }
    
    return result.changes > 0;
}

// ============================================================================
// HANDOVER
// ============================================================================

export interface HandoverInput {
    to: string;
    notes?: string;
    actor?: string;
    actorType?: AuthorType;
}

export function handoverTask(taskId: string, input: HandoverInput): Task | null {
    const task = getTaskById(taskId);
    if (!task) return null;

    const from = task.owner;
    const to = input.to;
    const actor = input.actor || from;
    const actorType = input.actorType || 'agent';
    const now = new Date().toISOString();

    // Update task
    db.prepare('UPDATE tasks SET owner = ?, handoverFrom = ?, updatedAt = ? WHERE id = ?')
        .run(to, from, now, taskId);

    // Add handover comment if notes provided
    if (input.notes) {
        addTaskComment(taskId, input.notes, actor, actorType, 'handover');
    }

    // Log activity
    logTaskActivity(taskId, actor, actorType, 'handover', { 
        fromOwner: from, 
        toOwner: to, 
        handoverNotes: input.notes 
    });

    return getTaskById(taskId);
}

// ============================================================================
// STATUS & WORKFLOW
// ============================================================================

export function startTask(taskId: string, actor: string = 'system'): Task | null {
    const now = new Date().toISOString();
    db.prepare('UPDATE tasks SET startedAt = ?, updatedAt = ? WHERE id = ?').run(now, now, taskId);
    logTaskActivity(taskId, actor, 'user', 'started', {});
    return getTaskById(taskId);
}

export function completeTask(taskId: string, actor: string = 'system'): Task | null {
    const now = new Date().toISOString();
    db.prepare('UPDATE tasks SET status = ?, completedAt = ?, updatedAt = ? WHERE id = ?')
        .run('Complete', now, now, taskId);
    logTaskActivity(taskId, actor, 'user', 'completed', {});
    return getTaskById(taskId);
}

export function blockTask(taskId: string, reason: string, blockerType: ActivityDetails['blockerType'] = 'dependency', actor: string = 'system'): Task | null {
    const now = new Date().toISOString();
    db.prepare('UPDATE tasks SET isStuck = 1, stuckReason = ?, stuckSince = ?, updatedAt = ? WHERE id = ?')
        .run(1, reason, now, now, taskId);
    logTaskActivity(taskId, actor, 'user', 'blocked', { blockerReason: reason, blockerType });
    return getTaskById(taskId);
}

export function unblockTask(taskId: string, actor: string = 'system'): Task | null {
    const now = new Date().toISOString();
    db.prepare('UPDATE tasks SET isStuck = 0, stuckReason = NULL, stuckSince = NULL, updatedAt = ? WHERE id = ?')
        .run(now, taskId);
    logTaskActivity(taskId, actor, 'user', 'unblocked', {});
    return getTaskById(taskId);
}

export function retryTask(taskId: string, errorMessage: string, actor: string = 'system'): Task | null {
    const task = getTaskById(taskId);
    if (!task) return null;

    const newRetryCount = (task.retryCount || 0) + 1;
    const now = new Date().toISOString();
    
    db.prepare('UPDATE tasks SET retryCount = ?, lastError = ?, updatedAt = ? WHERE id = ?')
        .run(newRetryCount, errorMessage, now, taskId);
    
    logTaskActivity(taskId, actor, 'agent', 'retry_attempt', { 
        attemptNumber: newRetryCount, 
        errorMessage 
    });
    
    return getTaskById(taskId);
}

// ============================================================================
// HELPERS
// ============================================================================

function hydrateTask(row: any, include?: ('comments' | 'activity' | 'evidence')[]): Task {
    const task: Task = {
        id: row.id,
        title: row.title,
        description: row.description,
        status: row.status,
        priority: row.priority,
        owner: row.owner,
        requestedBy: row.requestedBy,
        reviewer: row.reviewer,
        project: row.project,
        executionMode: row.executionMode,
        scheduleRef: row.scheduleRef,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        startedAt: row.startedAt,
        completedAt: row.completedAt,
        retryCount: row.retryCount || 0,
        maxRetries: row.maxRetries || 3,
        lastError: row.lastError,
        isStuck: !!row.isStuck,
        stuckReason: row.stuckReason,
        stuckSince: row.stuckSince,
        handoverFrom: row.handoverFrom,
        validationCriteria: row.validationCriteria ? JSON.parse(row.validationCriteria) : undefined,
    };

    if (include) {
        if (include.includes('comments')) {
            task.comments = getTaskComments(task.id);
        }
        if (include.includes('activity')) {
            task.activity = getTaskActivity(task.id);
        }
        if (include.includes('evidence')) {
            task.evidence = getTaskEvidence(task.id);
        }
    }

    return task;
}

// Legacy compatibility
export function updateTaskStatus(taskId: string, status: TaskStatus) {
    return updateTask(taskId, { status }, 'system');
}

// Global activity (for dashboard)
export function getRecentActivity(limit: number = 50): any[] {
    return db.prepare('SELECT * FROM activity ORDER BY timestamp DESC LIMIT ?').all(limit);
}
