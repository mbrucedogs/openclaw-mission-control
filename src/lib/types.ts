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

// ============================================================================
// TASK COMMENTS
// ============================================================================

export type CommentType = 'note' | 'blocker' | 'handover' | 'qa_finding' | 'evidence_ref' | 'system';
export type AuthorType = 'agent' | 'user' | 'system';

export interface TaskComment {
    id: string;
    taskId: string;
    author: string;
    authorType: AuthorType;
    content: string;
    commentType: CommentType;
    parentId?: string;
    createdAt: string;
    updatedAt: string;
}

// ============================================================================
// TASK ACTIVITY
// ============================================================================

export type ActivityType = 
    | 'created' 
    | 'updated' 
    | 'status_changed' 
    | 'assigned'
    | 'handover' 
    | 'comment_added' 
    | 'evidence_added' 
    | 'evidence_removed'
    | 'blocked' 
    | 'unblocked' 
    | 'retry_attempt' 
    | 'started' 
    | 'completed';

export interface ActivityDetails {
    oldStatus?: TaskStatus;
    newStatus?: TaskStatus;
    fromOwner?: string;
    toOwner?: string;
    handoverNotes?: string;
    blockerReason?: string;
    blockerType?: 'infrastructure' | 'dependency' | 'clarification' | 'external';
    attemptNumber?: number;
    errorMessage?: string;
    evidenceId?: string;
    commentId?: string;
}

export interface TaskActivity {
    id: string;
    taskId: string;
    actor: string;
    actorType: AuthorType;
    activityType: ActivityType;
    details?: ActivityDetails;
    createdAt: string;
}

// ============================================================================
// TASK EVIDENCE
// ============================================================================

export type EvidenceType = 'file' | 'url' | 'document' | 'screenshot' | 'log';

export interface TaskEvidence {
    id: string;
    taskId: string;
    evidenceType: EvidenceType;
    url: string;
    description?: string;
    addedBy: string;
    addedAt: string;
}

// ============================================================================
// VALIDATION CRITERIA
// ============================================================================

export interface ValidationCriteria {
    checklist: string[];
    doneMeans: string;
    codeRequirements?: string[];
    verificationSteps?: string[];
}

// ============================================================================
// ENHANCED TASK
// ============================================================================

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
    
    // Time tracking
    createdAt: string;
    updatedAt: string;
    startedAt?: string;
    completedAt?: string;
    
    // Retry tracking
    retryCount: number;
    maxRetries: number;
    lastError?: string;
    
    // Blocker tracking
    isStuck: boolean;
    stuckReason?: string;
    stuckSince?: string;
    
    // Pipeline
    handoverFrom?: string;
    
    // Validation
    validationCriteria?: ValidationCriteria;
    
    // Relations (populated on fetch with ?include=...)
    comments?: TaskComment[];
    activity?: TaskActivity[];
    evidence?: TaskEvidence[];
}

// ============================================================================
// OTHER TYPES
// ============================================================================

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
    folder?: string;
    soulContent?: string;
}

export interface ScheduleJob {
    id: string;
    name: string;
    cron?: string;
    nextRunAt?: string;
    taskId?: string;
    agentId: string;
}

// Legacy global activity (kept for backward compat)
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
