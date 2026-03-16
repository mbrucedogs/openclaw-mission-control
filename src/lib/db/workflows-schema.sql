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
