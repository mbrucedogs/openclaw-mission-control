PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS app_meta (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    goal TEXT,
    description TEXT,
    status TEXT NOT NULL CHECK (status IN ('Backlog', 'In Progress', 'In Review', 'Blocked', 'Done')),
    priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('urgent', 'high', 'normal', 'low')),
    owner TEXT NOT NULL,
    initiated_by TEXT NOT NULL,
    project TEXT,
    acceptance_criteria TEXT NOT NULL DEFAULT '[]',
    current_run_id TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    completed_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_owner ON tasks(owner);
CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project);
CREATE INDEX IF NOT EXISTS idx_tasks_updated_at ON tasks(updated_at DESC);

CREATE TABLE IF NOT EXISTS task_stage_plans (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL,
    step_number INTEGER NOT NULL,
    title TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('researcher', 'builder', 'tester', 'reviewer')),
    assigned_agent_id TEXT,
    assigned_agent_name TEXT,
    goal TEXT NOT NULL,
    inputs TEXT NOT NULL DEFAULT '[]',
    required_outputs TEXT NOT NULL DEFAULT '[]',
    done_condition TEXT NOT NULL,
    boundaries TEXT NOT NULL DEFAULT '[]',
    dependencies TEXT NOT NULL DEFAULT '[]',
    notes_for_max TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_task_stage_plans_task ON task_stage_plans(task_id);
CREATE INDEX IF NOT EXISTS idx_task_stage_plans_task_step ON task_stage_plans(task_id, step_number);

CREATE TABLE IF NOT EXISTS task_runs (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL,
    run_number INTEGER NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('draft', 'ready', 'running', 'blocked', 'completed', 'failed')),
    created_by TEXT NOT NULL,
    trigger_type TEXT NOT NULL CHECK (trigger_type IN ('initial', 'retry', 'rerun')),
    trigger_reason TEXT,
    template_id TEXT,
    current_step_id TEXT,
    created_at TEXT NOT NULL,
    started_at TEXT,
    completed_at TEXT,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_task_runs_task ON task_runs(task_id);
CREATE INDEX IF NOT EXISTS idx_task_runs_status ON task_runs(status);

CREATE TABLE IF NOT EXISTS run_steps (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL,
    run_id TEXT NOT NULL,
    step_number INTEGER NOT NULL,
    title TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('researcher', 'builder', 'tester', 'reviewer')),
    assigned_agent_id TEXT,
    assigned_agent_name TEXT,
    status TEXT NOT NULL CHECK (status IN ('draft', 'ready', 'running', 'submitted', 'blocked', 'complete', 'failed')),
    goal TEXT NOT NULL,
    inputs TEXT NOT NULL DEFAULT '[]',
    required_outputs TEXT NOT NULL DEFAULT '[]',
    done_condition TEXT NOT NULL,
    boundaries TEXT NOT NULL DEFAULT '[]',
    dependencies TEXT NOT NULL DEFAULT '[]',
    notes_for_max TEXT,
    retry_count INTEGER NOT NULL DEFAULT 0,
    started_at TEXT,
    completed_at TEXT,
    heartbeat_at TEXT,
    block_reason TEXT,
    completion_packet TEXT,
    validation_status TEXT CHECK (validation_status IN ('pending', 'passed', 'rejected')),
    validation_notes TEXT,
    validated_by TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (run_id) REFERENCES task_runs(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_run_steps_run ON run_steps(run_id);
CREATE INDEX IF NOT EXISTS idx_run_steps_task ON run_steps(task_id);
CREATE INDEX IF NOT EXISTS idx_run_steps_status ON run_steps(status);

CREATE TABLE IF NOT EXISTS run_step_events (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL,
    run_id TEXT NOT NULL,
    step_id TEXT NOT NULL,
    actor TEXT NOT NULL,
    actor_type TEXT NOT NULL CHECK (actor_type IN ('agent', 'user', 'system')),
    event_type TEXT NOT NULL,
    message TEXT NOT NULL,
    payload TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (run_id) REFERENCES task_runs(id) ON DELETE CASCADE,
    FOREIGN KEY (step_id) REFERENCES run_steps(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_run_step_events_run ON run_step_events(run_id);
CREATE INDEX IF NOT EXISTS idx_run_step_events_step ON run_step_events(step_id);
CREATE INDEX IF NOT EXISTS idx_run_step_events_created_at ON run_step_events(created_at DESC);

CREATE TABLE IF NOT EXISTS task_templates (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_by TEXT NOT NULL,
    task_defaults TEXT,
    steps TEXT NOT NULL DEFAULT '[]',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_task_templates_name ON task_templates(name);

CREATE TABLE IF NOT EXISTS task_issues (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL,
    run_id TEXT,
    step_id TEXT,
    title TEXT NOT NULL,
    summary TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('open', 'waiting_on_orchestrator', 'waiting_on_human', 'resolved')),
    assigned_to TEXT NOT NULL CHECK (assigned_to IN ('orchestrator', 'human')),
    created_by TEXT NOT NULL,
    resolved_by TEXT,
    resolution TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    resolved_at TEXT,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (run_id) REFERENCES task_runs(id) ON DELETE CASCADE,
    FOREIGN KEY (step_id) REFERENCES run_steps(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_task_issues_task ON task_issues(task_id);
CREATE INDEX IF NOT EXISTS idx_task_issues_status ON task_issues(status);

CREATE TABLE IF NOT EXISTS task_comments (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL,
    run_id TEXT,
    step_id TEXT,
    issue_id TEXT,
    author TEXT NOT NULL,
    author_type TEXT NOT NULL CHECK (author_type IN ('agent', 'user', 'system')),
    content TEXT NOT NULL,
    comment_type TEXT NOT NULL DEFAULT 'note',
    parent_id TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (run_id) REFERENCES task_runs(id) ON DELETE CASCADE,
    FOREIGN KEY (step_id) REFERENCES run_steps(id) ON DELETE CASCADE,
    FOREIGN KEY (issue_id) REFERENCES task_issues(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_id) REFERENCES task_comments(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_task_comments_task_id ON task_comments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_issue_id ON task_comments(issue_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_step_id ON task_comments(step_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_created_at ON task_comments(created_at DESC);

CREATE TABLE IF NOT EXISTS task_activity (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL,
    run_id TEXT,
    step_id TEXT,
    actor TEXT NOT NULL,
    actor_type TEXT NOT NULL CHECK (actor_type IN ('agent', 'user', 'system')),
    activity_type TEXT NOT NULL,
    details TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (run_id) REFERENCES task_runs(id) ON DELETE CASCADE,
    FOREIGN KEY (step_id) REFERENCES run_steps(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_task_activity_task_id ON task_activity(task_id);
CREATE INDEX IF NOT EXISTS idx_task_activity_created_at ON task_activity(created_at DESC);

-- Activity logging tables for Tron agent heartbeats
CREATE TABLE IF NOT EXISTS step_heartbeats (
    id TEXT PRIMARY KEY,
    step_id TEXT NOT NULL,
    agent_id TEXT NOT NULL,
    agent_name TEXT NOT NULL,
    run_id TEXT NOT NULL,
    task_id TEXT NOT NULL,
    is_stuck INTEGER NOT NULL DEFAULT 0,
    stuck_reason TEXT,
    last_activity TEXT,
    heartbeat_count INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE(step_id, agent_id)
);

CREATE INDEX IF NOT EXISTS idx_heartbeats_step ON step_heartbeats(step_id);
CREATE INDEX IF NOT EXISTS idx_heartbeats_task ON step_heartbeats(task_id);

CREATE TABLE IF NOT EXISTS task_evidence (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL,
    run_id TEXT,
    step_id TEXT,
    evidence_type TEXT NOT NULL,
    url TEXT NOT NULL,
    description TEXT,
    added_by TEXT NOT NULL,
    added_at TEXT NOT NULL,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (run_id) REFERENCES task_runs(id) ON DELETE CASCADE,
    FOREIGN KEY (step_id) REFERENCES run_steps(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_task_evidence_task_id ON task_evidence(task_id);
CREATE INDEX IF NOT EXISTS idx_task_evidence_step_id ON task_evidence(step_id);

CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL,
    progress REAL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS agents (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    type TEXT,
    mission TEXT,
    status TEXT
);

CREATE TABLE IF NOT EXISTS responsibilities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    agentId TEXT NOT NULL,
    description TEXT NOT NULL,
    FOREIGN KEY (agentId) REFERENCES agents(id)
);

CREATE TABLE IF NOT EXISTS activity (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    message TEXT NOT NULL,
    actor TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    metadata TEXT
);

CREATE TABLE IF NOT EXISTS memories (
    id TEXT PRIMARY KEY,
    content TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    category TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS document_folders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS documents (
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

CREATE TABLE IF NOT EXISTS document_tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    document_id INTEGER NOT NULL,
    task_id TEXT NOT NULL,
    link_type TEXT NOT NULL DEFAULT 'related',
    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS local_documents (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    path TEXT NOT NULL,
    category TEXT NOT NULL,
    projectId TEXT,
    updatedAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
    username TEXT PRIMARY KEY,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user',
    createdAt TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS schedule_jobs (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    cron TEXT,
    nextRunAt TEXT,
    taskId TEXT,
    agentId TEXT NOT NULL
);

INSERT OR IGNORE INTO projects (id, name, description, status, progress) VALUES
    ('general', 'General', 'Default project for uncategorized tasks', 'active', 0);

-- Runtime events for Tron/agent durability and cursor-based replay
CREATE TABLE IF NOT EXISTS runtime_events (
    cursor INTEGER PRIMARY KEY AUTOINCREMENT,
    id TEXT NOT NULL UNIQUE,
    event_type TEXT NOT NULL,
    actor TEXT NOT NULL,
    payload TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_runtime_events_cursor ON runtime_events(cursor);
CREATE INDEX IF NOT EXISTS idx_runtime_events_type ON runtime_events(event_type);
CREATE INDEX IF NOT EXISTS idx_runtime_events_created ON runtime_events(created_at);
