-- ============================================================================
-- ALEX MISSION CONTROL - DATABASE SCHEMA
-- ============================================================================

-- Enable foreign keys
PRAGMA foreign_keys = ON;

-- ============================================================================
-- STATUS VALIDATION
-- Valid task statuses (normalized to prevent inconsistencies)
-- ============================================================================

-- NOTE: Status values must be one of these exact strings:
-- 'Recurring', 'Backlog', 'Research', 'Ready for Implementation', 
-- 'In Progress', 'Implementation', 'Ready for QA', 'QA',
-- 'Ready for Review', 'Review', 'Changes Requested', 'Complete'
-- 
-- API layer enforces this. Invalid values will be rejected.

-- ============================================================================
-- CORE TABLES
-- ============================================================================

CREATE TABLE tasks (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL CHECK (status IN ('Recurring', 'Backlog', 'Research', 'Ready for Implementation', 'In Progress', 'Implementation', 'Ready for QA', 'QA', 'Ready for Review', 'Review', 'Changes Requested', 'Complete')),
    priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('urgent', 'high', 'normal', 'low')),
    owner TEXT NOT NULL,
    requestedBy TEXT NOT NULL,
    reviewer TEXT,
    project TEXT,
    executionMode TEXT NOT NULL CHECK (executionMode IN ('local', 'cloud')),
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

CREATE TABLE users (
    username TEXT PRIMARY KEY,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user',
    createdAt TEXT NOT NULL DEFAULT (datetime('now'))
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
-- ============================================================================
-- WORKFLOW TEMPLATES
-- Reusable agent work definitions
-- ============================================================================

CREATE TABLE IF NOT EXISTS workflow_templates (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    agent_role TEXT NOT NULL CHECK (agent_role IN ('researcher', 'builder', 'tester', 'reviewer', 'approver', 'automation')),
    agent_id TEXT,
    estimated_minutes INTEGER DEFAULT 30,
    model TEXT DEFAULT 'gemini-2.5-flash',
    system_prompt TEXT,
    validation_checklist TEXT,
    tags TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    use_count INTEGER DEFAULT 0,
    last_used_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_workflow_templates_agent_role ON workflow_templates(agent_role);
CREATE INDEX IF NOT EXISTS idx_workflow_templates_tags ON workflow_templates(tags);

-- ============================================================================
-- PIPELINES
-- Ordered sequences of workflows
-- ============================================================================

CREATE TABLE IF NOT EXISTS pipelines (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    steps TEXT NOT NULL,
    is_dynamic INTEGER DEFAULT 0,
    created_from_task_id TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    use_count INTEGER DEFAULT 0,
    last_used_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_pipelines_dynamic ON pipelines(is_dynamic);

-- ============================================================================
-- PIPELINE RUNS
-- Track execution of pipelines on tasks
-- ============================================================================

CREATE TABLE IF NOT EXISTS pipeline_runs (
    id TEXT PRIMARY KEY,
    pipeline_id TEXT,
    task_id TEXT NOT NULL,
    current_step INTEGER DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed', 'paused')),
    started_at TEXT NOT NULL DEFAULT (datetime('now')),
    completed_at TEXT,
    error_message TEXT,
    FOREIGN KEY (pipeline_id) REFERENCES pipelines(id),
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_pipeline_runs_task ON pipeline_runs(task_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_runs_status ON pipeline_runs(status);

-- ============================================================================
-- TASK PIPELINE MATCHES
-- Link tasks to their assigned pipelines
-- ============================================================================

CREATE TABLE IF NOT EXISTS task_pipelines (
    task_id TEXT PRIMARY KEY,
    pipeline_id TEXT,
    workflow_ids TEXT,
    current_step INTEGER DEFAULT 0,
    is_dynamic INTEGER DEFAULT 0,
    matched_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (pipeline_id) REFERENCES pipelines(id)
);

-- ============================================================================
-- INITIAL WORKFLOW TEMPLATES
-- ============================================================================

INSERT OR IGNORE INTO workflow_templates (id, name, description, agent_role, agent_id, estimated_minutes, system_prompt, validation_checklist, tags) VALUES
    ('wf-research', 'Research', 'Investigate and document findings', 'researcher', 'alice', 30, 
     'You are a researcher. Investigate thoroughly and document findings with sources.',
     '["Research completed", "Findings documented", "Sources cited"]', 
     '["research", "investigation", "analysis"]'),
     
    ('wf-build', 'Build', 'Implement code or features', 'builder', 'bob', 60,
     'You are a builder. Implement the solution with clean, tested code.',
     '["Code implemented", "Tests passing", "Documentation updated"]',
     '["build", "implement", "code", "develop"]'),
     
    ('wf-quick-fix', 'Quick Fix', 'Fix bugs or small issues', 'builder', 'bob', 15,
     'You are fixing a bug. Identify root cause and implement minimal fix.',
     '["Bug identified", "Fix implemented", "Fix verified"]',
     '["fix", "bug", "quick", "patch"]'),
     
    ('wf-test', 'Test', 'QA and validation', 'tester', 'charlie', 20,
     'You are QA. Test thoroughly and report issues clearly.',
     '["Tests executed", "Edge cases checked", "Results documented"]',
     '["test", "qa", "verify", "validate"]'),
     
    ('wf-review', 'Review', 'Final review and approval', 'reviewer', 'aegis', 15,
     'You are reviewing work. Check quality and approve or reject with clear feedback.',
     '["Code reviewed", "Requirements met", "Decision made"]',
     '["review", "approve", "audit"]'),
     
    ('wf-document', 'Document', 'Create documentation', 'researcher', 'alice', 30,
     'You are documenting. Create clear, comprehensive documentation.',
     '["Documentation written", "Examples provided", "Reviewed for clarity"]',
     '["document", "docs", "write", "readme"]'),
     
    ('wf-automate', 'Automate', 'Create automation/script', 'automation', 'tron', 30,
     'You are creating automation. Build reliable scripts with error handling.',
     '["Script created", "Tested and working", "Scheduled/configured"]',
     '["automation", "script", "cron", "schedule"]');

-- ============================================================================
-- AGENT ALERTS
-- Alerts from monitoring agents when work needs orchestrator attention
-- ============================================================================

CREATE TABLE IF NOT EXISTS agent_alerts (
    id TEXT PRIMARY KEY,
    alert_type TEXT NOT NULL CHECK (alert_type IN ('task_needs_routing', 'agent_stuck', 'task_needs_review', 'custom')),
    task_id TEXT,
    assigned_agent TEXT,
    reason TEXT NOT NULL,
    details TEXT, -- JSON string
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'acknowledged', 'resolved')),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    acknowledged_at TEXT,
    resolved_at TEXT,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
);

-- Index for quick lookup of pending alerts
CREATE INDEX IF NOT EXISTS idx_agent_alerts_status ON agent_alerts(status);
CREATE INDEX IF NOT EXISTS idx_agent_alerts_task ON agent_alerts(task_id);

-- ============================================================================
-- INITIAL PIPELINES
-- ============================================================================

INSERT OR IGNORE INTO pipelines (id, name, description, steps, is_dynamic) VALUES
    ('pl-standard', 'Standard Build', 'Research → Build → Test → Review', 
     '[{"workflow_id": "wf-research", "on_failure": "stop"}, {"workflow_id": "wf-build", "on_failure": "stop"}, {"workflow_id": "wf-test", "on_failure": "stop"}, {"workflow_id": "wf-review", "on_failure": "stop"}]',
     0),
     
    ('pl-quick-fix', 'Quick Fix', 'Quick Fix → Review',
     '[{"workflow_id": "wf-quick-fix", "on_failure": "stop"}, {"workflow_id": "wf-review", "on_failure": "stop"}]',
     0),
     
    ('pl-research', 'Research Only', 'Research → Review',
     '[{"workflow_id": "wf-research", "on_failure": "stop"}, {"workflow_id": "wf-review", "on_failure": "stop"}]',
     0),
     
    ('pl-docs', 'Documentation', 'Document → Review',
     '[{"workflow_id": "wf-document", "on_failure": "stop"}, {"workflow_id": "wf-review", "on_failure": "stop"}]',
     0),
     
    ('pl-automation', 'Automation', 'Automate → Review',
     '[{"workflow_id": "wf-automate", "on_failure": "stop"}, {"workflow_id": "wf-review", "on_failure": "stop"}]',
     0);
