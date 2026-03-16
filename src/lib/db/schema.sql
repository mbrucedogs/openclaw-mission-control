-- ============================================================================
-- ALEX MISSION CONTROL - DATABASE SCHEMA
-- ============================================================================

-- Enable foreign keys
PRAGMA foreign_keys = ON;

-- ============================================================================
-- CORE TABLES
-- ============================================================================

CREATE TABLE tasks (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL,
    priority TEXT NOT NULL DEFAULT 'normal',
    owner TEXT NOT NULL,
    requestedBy TEXT NOT NULL,
    reviewer TEXT,
    project TEXT,
    executionMode TEXT NOT NULL,
    scheduleRef TEXT,
    
    -- Time tracking
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL,
    startedAt TEXT,
    completedAt TEXT,
    
    -- Retry tracking
    retryCount INTEGER DEFAULT 0,
    maxRetries INTEGER DEFAULT 3,
    lastError TEXT,
    
    -- Blocker tracking
    isStuck INTEGER DEFAULT 0,
    stuckReason TEXT,
    stuckSince TEXT,
    
    -- Pipeline
    handoverFrom TEXT,
    
    -- Validation criteria (JSON)
    validationCriteria TEXT
);

CREATE TABLE projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL,
    progress REAL DEFAULT 0
);

CREATE TABLE agents (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    mission TEXT,
    status TEXT
);

CREATE TABLE responsibilities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    agentId TEXT NOT NULL,
    description TEXT NOT NULL,
    FOREIGN KEY (agentId) REFERENCES agents(id)
);

-- ============================================================================
-- TASK ENHANCEMENT TABLES
-- ============================================================================

CREATE TABLE task_comments (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL,
    author TEXT NOT NULL,
    author_type TEXT NOT NULL CHECK (author_type IN ('agent', 'user', 'system')),
    content TEXT NOT NULL,
    comment_type TEXT NOT NULL DEFAULT 'note' 
        CHECK (comment_type IN ('note', 'blocker', 'handover', 'qa_finding', 'evidence_ref', 'system')),
    parent_id TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_id) REFERENCES task_comments(id) ON DELETE CASCADE
);

CREATE INDEX idx_task_comments_task_id ON task_comments(task_id);
CREATE INDEX idx_task_comments_type ON task_comments(comment_type);
CREATE INDEX idx_task_comments_created_at ON task_comments(created_at DESC);

CREATE TABLE task_activity (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL,
    actor TEXT NOT NULL,
    actor_type TEXT NOT NULL CHECK (actor_type IN ('agent', 'user', 'system')),
    activity_type TEXT NOT NULL CHECK (
        activity_type IN (
            'created', 'updated', 'status_changed', 'assigned',
            'handover', 'comment_added', 'evidence_added', 'evidence_removed',
            'blocked', 'unblocked', 'retry_attempt', 'started', 'completed'
        )
    ),
    details TEXT,  -- JSON
    created_at TEXT NOT NULL,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
);

CREATE INDEX idx_task_activity_task_id ON task_activity(task_id);
CREATE INDEX idx_task_activity_created_at ON task_activity(created_at DESC);
CREATE INDEX idx_task_activity_type ON task_activity(activity_type);

CREATE TABLE task_evidence (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL,
    evidence_type TEXT NOT NULL CHECK (evidence_type IN ('file', 'url', 'document', 'screenshot', 'log')),
    url TEXT NOT NULL,
    description TEXT,
    added_by TEXT NOT NULL,
    added_at TEXT NOT NULL,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
);

CREATE INDEX idx_task_evidence_task_id ON task_evidence(task_id);

-- ============================================================================
-- OTHER TABLES
-- ============================================================================

CREATE TABLE activity (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    message TEXT NOT NULL,
    actor TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    metadata TEXT
);

CREATE TABLE memories (
    id TEXT PRIMARY KEY,
    content TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    category TEXT NOT NULL
);

CREATE TABLE document_folders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    summary TEXT,
    content TEXT,
    source_url TEXT,
    document_type TEXT NOT NULL DEFAULT 'note',
    folder_id INTEGER,
    tags TEXT DEFAULT '[]',
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (folder_id) REFERENCES document_folders(id)
);

CREATE TABLE document_tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    document_id INTEGER NOT NULL,
    task_id TEXT NOT NULL,
    link_type TEXT NOT NULL DEFAULT 'related',
    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
    FOREIGN KEY (task_id) REFERENCES tasks(id)
);

CREATE TABLE local_documents (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    path TEXT NOT NULL,
    category TEXT NOT NULL,
    projectId TEXT,
    updatedAt TEXT NOT NULL
);

CREATE TABLE schedule_jobs (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    cron TEXT,
    nextRunAt TEXT,
    taskId TEXT,
    agentId TEXT NOT NULL
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_owner ON tasks(owner);
CREATE INDEX idx_tasks_project ON tasks(project);
CREATE INDEX idx_tasks_is_stuck ON tasks(isStuck);
CREATE INDEX idx_tasks_created_at ON tasks(createdAt DESC);
CREATE INDEX idx_tasks_updated_at ON tasks(updatedAt DESC);

-- ============================================================================
-- INITIAL DATA
-- ============================================================================

INSERT INTO projects (id, name, description, status, progress) VALUES
    ('general', 'General', 'Default project for uncategorized tasks', 'active', 0);
