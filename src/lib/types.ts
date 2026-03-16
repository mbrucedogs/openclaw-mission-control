export type Priority = 'urgent' | 'high' | 'normal' | 'low';

export type TaskStatus =
    'Recurring' |
    'Backlog' |
    'Research' |
    'Ready for Implementation' |
    'In Progress' |
    'Implementation' |
    'Ready for QA' |
    'QA' |
    'Ready for Review' |
    'Review' |
    'Changes Requested' |
    'Complete' |
    'Scheduled';

export interface Task {
    id: string;
    title: string;
    description?: string;
    status: TaskStatus;
    priority: Priority;
    owner: string;
    requestedBy: string;
    reviewer?: string;
    project?: string;
    executionMode: 'local' | 'cloud';
    scheduleRef?: string;
    evidence?: string; // Links or evidence descriptions
    retryCount?: number;
    handoverFrom?: string; // For named-agent handoff
    supervisorNotes?: string;
    isStuck?: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface Project {
    id: string;
    name: string;
    description?: string;
    status: 'active' | 'completed' | 'on-hold';
    progress: number;
    taskIds: string[];
}

export interface Agent {
    id: string;
    name: string;
    role: string;
    mission?: string;
    status: 'idle' | 'busy' | 'offline';
    responsibilities: string[];
    layer?: 'governance' | 'pipeline' | 'automation';
    order?: number;
}

export interface ScheduleJob {
    id: string;
    name: string;
    cron?: string;
    nextRunAt?: string;
    taskId?: string;
    agentId: string;
}

export interface ActivityEvent {
    id: string;
    type: 'task_created' | 'task_updated' | 'task_moved' | 'comment_added' | 'status_changed';
    message: string;
    actor: string;
    timestamp: string;
    metadata?: Record<string, any>;
}

export interface MemoryEntry {
    id: string;
    content: string;
    timestamp: string;
    category: 'daily' | 'long-term';
    tags: string[];
}

// ─── Repo Document (Database-backed) ──────────────────────────────────────────

export type DocumentType = 'note' | 'research' | 'decision' | 'reference' | 'plan';

export interface RepoDocument {
    id: number;
    title: string;
    summary?: string;
    content?: string;
    source_url?: string;
    document_type: DocumentType;
    folder_id?: number;
    tags: string[];
    updated_at: string;
}

export interface DocumentFolder {
    id: number;
    name: string;
    created_at: string;
}

export interface LinkedTask {
    id: number;
    task_id: string;
    title: string;
    status: string;
    link_type: string;
}

// ─── Local File (Filesystem-backed Viewer) ────────────────────────────────────

export interface LocalFile {
    path: string;
    name: string;
    size: number;
    modified: number;
    root: string;
    content?: string;
}

// Legacy alias for backward compat
export interface DocumentEntry {
    id: string;
    title: string;
    path: string;
    category: string;
    projectId?: string;
    updatedAt: string;
}
