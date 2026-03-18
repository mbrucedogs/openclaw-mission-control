export type Priority = 'urgent' | 'high' | 'normal' | 'low';

// TASK STATUS
// Valid statuses for tasks. Use ONLY these exact values.
// 'Complete' means done/finished - no other values (Completed, Done, etc.)
export type TaskStatus =
    | 'Recurring'
    | 'Backlog'
    | 'Research'
    | 'Ready for Implementation'
    | 'In Progress'
    | 'Implementation'
    | 'Ready for QA'
    | 'QA'
    | 'Ready for Review'
    | 'Review'
    | 'Changes Requested'
    | 'Complete';

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
    commentType?: string;
    evidenceType?: string;
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
// ENHANCED TASK
// ============================================================================

export interface ValidationCriteria {
    _pipelineId?: string;
    _currentStep?: number;
    checklist: string[];
    doneMeans: string;
    codeRequirements?: string[];
    verificationSteps?: string[];
}

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
    pipelineId?: string;
    pipelineName?: string;
    handoverFrom?: string;
    
    // Validation
    validationCriteria?: ValidationCriteria;
    
    // Relations (populated on fetch with ?include=...)
    comments?: TaskComment[];
    activity?: TaskActivity[];
    evidence?: TaskEvidence[];
}
export interface Agent {
    id: string;
    name: string;
    role: string;
    type?: string;
    mission?: string;
    status?: string;
    layer?: string;
    order?: number;
    responsibilities?: string[];
    folder?: string;
    soulContent?: string;
}

export interface Project {
    taskIds?: string[];
    id: string;
    name: string;
    description?: string;
    status: string;
    progress: number;
}

export interface ScheduleJob {
    id: string;
    name: string;
    cron?: string;
    nextRunAt?: string;
    lastRunAt?: string;
    status?: string;
}

// ============================================================================
// DOCUMENTS
// ============================================================================

export interface DocumentEntry {
    id: string;
    title: string;
    path: string;
    category: string;
    updatedAt: string;
}

export interface RepoDocument {
    id: number;
    title: string;
    summary?: string;
    content?: string;
    source_url?: string;
    document_type: string;
    folder_id?: number;
    tags: string[];
    updated_at: string;
}

export interface DocumentFolder {
    id: number;
    name: string;
}

export interface LinkedTask {
    id: number;
    task_id: string;
    link_type: string;
    title: string;
    status: string;
}

export interface MemoryEntry {
    id: string;
    content: string;
    timestamp: string;
    category: 'daily' | 'long-term';
}
