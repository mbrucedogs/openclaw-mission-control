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

      ('[{"workflow_id": "wf-automate", "on_failure": "stop"}, {"workflow_id": "wf-review", "on_failure": "stop"}]',
     0);
