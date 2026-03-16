# Product Requirements Document (PRD)
# Mission Control

**Version:** 1.0  
**Last Updated:** 2026-03-16  
**Status:** Production Ready

---

## 1. Executive Summary

Mission Control is a task management and agent orchestration system built for OpenClaw autonomous organizations. It provides a hybrid pipeline model combining predefined workflows with dynamic assembly, enabling the Primary AI to orchestrate multi-agent task execution.

### Key Features
- **Task Management** - Kanban board with structured comments, activity tracking, and evidence
- **Agent Orchestration** - Hybrid pipeline system (predefined + dynamic)
- **Workflow Templates** - Reusable work definitions with timeout enforcement
- **Dynamic Pipelines** - Primary AI assembles custom pipelines on-the-fly
- **Full Audit Trail** - Every action logged with actor, timestamp, and details

---

## 2. Architecture Overview

### 2.1 System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Client (Next.js 16)                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │  Tasks   │  │Orchestr. │  │  Agents  │  │  Docs    │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              API Layer (Next.js App Router)               │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ /tasks   │  │/workflows│  │/pipelines│  │ /agents  │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                 Data Layer (SQLite)                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │  tasks   │  │workflows │  │pipelines │  │  agents  │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              OpenClaw Integration                           │
│         (Primary AI + Agent Spawning)                       │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Technology Stack

- **Frontend:** Next.js 16, React 19, TypeScript, Tailwind CSS
- **Backend:** Next.js App Router API Routes
- **Database:** SQLite (better-sqlite3)
- **State:** React hooks, no external state management
- **Styling:** Tailwind CSS with custom dark theme
- **Icons:** Lucide React

---

## 3. Database Schema

### 3.1 Core Tables

#### tasks
```sql
CREATE TABLE tasks (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL CHECK (status IN (
        'Recurring', 'Backlog', 'Research', 'Ready for Implementation',
        'In Progress', 'Implementation', 'Ready for QA', 'QA',
        'Ready for Review', 'Review', 'Changes Requested', 'Complete', 'Scheduled'
    )),
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

CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_owner ON tasks(owner);
CREATE INDEX idx_tasks_project ON tasks(project);
CREATE INDEX idx_tasks_is_stuck ON tasks(isStuck);
```

#### task_comments
```sql
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
```

#### task_activity
```sql
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
```

#### task_evidence
```sql
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
```

### 3.2 Orchestration Tables

#### workflow_templates
```sql
CREATE TABLE workflow_templates (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    agent_role TEXT NOT NULL CHECK (agent_role IN ('researcher', 'builder', 'tester', 'reviewer', 'approver', 'automation')),
    agent_id TEXT,  -- specific agent like 'alice', 'bob'
    timeout_seconds INTEGER DEFAULT 1800,  -- Hard limit
    system_prompt TEXT,
    validation_checklist TEXT,  -- JSON array
    tags TEXT,  -- JSON array
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    use_count INTEGER DEFAULT 0,
    last_used_at TEXT
);

CREATE INDEX idx_workflow_templates_agent_role ON workflow_templates(agent_role);
```

#### pipelines
```sql
CREATE TABLE pipelines (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    steps TEXT NOT NULL,  -- JSON array of {workflow_id, on_failure}
    is_dynamic INTEGER DEFAULT 0,
    created_from_task_id TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    use_count INTEGER DEFAULT 0,
    last_used_at TEXT
);

CREATE INDEX idx_pipelines_dynamic ON pipelines(is_dynamic);
```

#### task_pipelines
```sql
CREATE TABLE task_pipelines (
    task_id TEXT PRIMARY KEY,
    pipeline_id TEXT,
    workflow_ids TEXT,  -- JSON array for dynamic pipelines
    current_step INTEGER DEFAULT 0,
    is_dynamic INTEGER DEFAULT 0,
    matched_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (pipeline_id) REFERENCES pipelines(id)
);
```

#### pipeline_runs
```sql
CREATE TABLE pipeline_runs (
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
```

### 3.3 Supporting Tables

#### agents
```sql
CREATE TABLE agents (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    mission TEXT,
    status TEXT CHECK (status IN ('online', 'offline', 'busy', 'idle', 'error')),
    last_seen TEXT,
    last_activity TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

#### projects
```sql
CREATE TABLE projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL CHECK (status IN ('active', 'completed', 'on-hold')),
    progress REAL DEFAULT 0
);
```

#### activity (global)
```sql
CREATE TABLE activity (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    message TEXT NOT NULL,
    actor TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    metadata TEXT  -- JSON
);
```

---

## 4. API Specification

### 4.1 Tasks API

#### List Tasks
```
GET /api/tasks
Query Parameters:
  - status (optional): Filter by status
  - owner (optional): Filter by owner
  - project (optional): Filter by project
  - isStuck (optional): Filter stuck tasks
  - include (optional): Comma-separated relations (comments,activity,evidence)

Response: Task[]
```

#### Get Task
```
GET /api/tasks/:id
Query Parameters:
  - include (optional): relations to include

Response: Task
```

#### Create Task
```
POST /api/tasks
Body: {
  title: string (required)
  description?: string
  status?: TaskStatus
  priority?: Priority
  owner?: string
  requestedBy?: string
  project?: string
  executionMode?: 'local' | 'cloud'
  validationCriteria?: ValidationCriteria
}

Response: Task with _meta.pipelineMatch
```

#### Update Task
```
PATCH /api/tasks/:id
Body: {
  title?: string
  description?: string
  status?: TaskStatus
  priority?: Priority
  owner?: string
  isStuck?: boolean
  stuckReason?: string
  actor?: string  // for activity logging
}

Response: Task
```

#### Delete Task
```
DELETE /api/tasks/:id
Response: { success: boolean }
```

#### Task Actions
```
PATCH /api/tasks/:id
Body: {
  action: 'start' | 'complete' | 'block' | 'unblock' | 'retry' | 'handover'
  // action-specific fields
}
```

### 4.2 Task Comments API

```
GET    /api/tasks/:id/comments?type={type}
POST   /api/tasks/:id/comments
Body: {
  content: string (required)
  commentType?: 'note' | 'blocker' | 'handover' | 'qa_finding' | 'evidence_ref' | 'system'
  author?: string
  authorType?: 'agent' | 'user' | 'system'
  parentId?: string
}
```

### 4.3 Task Activity API

```
GET /api/tasks/:id/activity?limit={number}
Response: TaskActivity[]
```

### 4.4 Task Evidence API

```
GET    /api/tasks/:id/evidence
POST   /api/tasks/:id/evidence
Body: {
  evidenceType: 'file' | 'url' | 'document' | 'screenshot' | 'log'
  url: string (required)
  description?: string
  addedBy: string
}
DELETE /api/tasks/:id/evidence?evidenceId={id}&actor={actor}
```

### 4.5 Workflows API

```
GET    /api/workflows?role={role}
POST   /api/workflows
Body: {
  name: string (required)
  description?: string
  agentRole: AgentRole (required)
  agentId?: string
  timeoutSeconds?: number
  systemPrompt?: string
  validationChecklist?: string[]
  tags?: string[]
}
PUT    /api/workflows
Body: { id: string } + update fields
DELETE /api/workflows
Body: { id: string }
```

### 4.6 Pipelines API

```
GET    /api/pipelines?includeDynamic={boolean}
POST   /api/pipelines
Body: {
  name: string (required)
  description?: string
  steps: PipelineStep[] (required)
}
PUT    /api/pipelines
Body: { id: string } + update fields
DELETE /api/pipelines
Body: { id: string }
```

### 4.7 Agents API

```
GET /api/agents
Response: Agent[]
```

---

## 5. TypeScript Types

### 5.1 Core Types

```typescript
// Task Types
export type TaskStatus =
  | 'Recurring' | 'Backlog' | 'Research' | 'Ready for Implementation'
  | 'In Progress' | 'Implementation' | 'Ready for QA' | 'QA'
  | 'Ready for Review' | 'Review' | 'Changes Requested' | 'Complete' | 'Scheduled';

export type Priority = 'urgent' | 'high' | 'normal' | 'low';
export type AuthorType = 'agent' | 'user' | 'system';
export type CommentType = 'note' | 'blocker' | 'handover' | 'qa_finding' | 'evidence_ref' | 'system';
export type ActivityType = 
  | 'created' | 'updated' | 'status_changed' | 'assigned'
  | 'handover' | 'comment_added' | 'evidence_added' | 'evidence_removed'
  | 'blocked' | 'unblocked' | 'retry_attempt' | 'started' | 'completed';
export type EvidenceType = 'file' | 'url' | 'document' | 'screenshot' | 'log';
export type AgentRole = 'researcher' | 'builder' | 'tester' | 'reviewer' | 'approver' | 'automation';

// Task Interface
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
  
  // Relations
  comments?: TaskComment[];
  activity?: TaskActivity[];
  evidence?: TaskEvidence[];
}

export interface ValidationCriteria {
  checklist: string[];
  doneMeans: string;
  codeRequirements?: string[];
  verificationSteps?: string[];
}

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

export interface TaskActivity {
  id: string;
  taskId: string;
  actor: string;
  actorType: AuthorType;
  activityType: ActivityType;
  details?: ActivityDetails;
  createdAt: string;
}

export interface TaskEvidence {
  id: string;
  taskId: string;
  evidenceType: EvidenceType;
  url: string;
  description?: string;
  addedBy: string;
  addedAt: string;
}

// Workflow Types
export interface WorkflowTemplate {
  id: string;
  name: string;
  description?: string;
  agentRole: AgentRole;
  agentId?: string;
  timeoutSeconds: number;
  systemPrompt?: string;
  validationChecklist: string[];
  tags: string[];
  createdAt: string;
  updatedAt: string;
  useCount: number;
  lastUsedAt?: string;
}

// Pipeline Types
export interface Pipeline {
  id: string;
  name: string;
  description?: string;
  steps: PipelineStep[];
  isDynamic: boolean;
  createdFromTaskId?: string;
  createdAt: string;
  updatedAt: string;
  useCount: number;
  lastUsedAt?: string;
}

export interface PipelineStep {
  workflowId: string;
  workflowName?: string;
  onFailure: 'stop' | 'continue' | 'skip';
}

export interface PipelineMatchResult {
  matched: boolean;
  pipelineId?: string;
  pipelineName?: string;
  workflowIds?: string[];
  isDynamic: boolean;
  confidence: number;
  reason: string;
}
```

---

## 6. UI Components

### 6.1 Page Structure

```
/app
├── page.tsx                    # Dashboard
├── tasks/
│   └── page.tsx               # Kanban board
├── orchestration/
│   └── page.tsx               # Workflows & Pipelines
├── agents/
│   └── page.tsx               # Agent management
├── projects/
│   └── page.tsx               # Project management
├── api/
│   ├── tasks/
│   │   ├── route.ts
│   │   └── [id]/
│   │       ├── route.ts
│   │       ├── comments/
│   │       │   └── route.ts
│   │       ├── activity/
│   │       │   └── route.ts
│   │       └── evidence/
│   │           └── route.ts
│   ├── workflows/
│   │   └── route.ts
│   ├── pipelines/
│   │   └── route.ts
│   └── agents/
│       └── route.ts
└── layout.tsx
```

### 6.2 Key Components

#### TaskCard
- Displays task summary
- Shows owner badge, priority, status
- Comment/evidence count badges
- Blocker indicator
- Click to open detail modal

#### TaskDetailModal
- Tabs: Overview, Comments, Activity, Evidence
- Overview: Description, validation criteria, recent activity
- Comments: Add/edit/delete with type selector
- Activity: Timeline of all changes
- Evidence: Add/remove evidence files

#### WorkflowCard
- Shows workflow name, agent role, timeout
- Expandable details: system prompt, checklist
- Edit/delete actions

#### PipelineCard
- Visual step sequence
- Shows workflow chain with arrows
- Step failure behavior indicators
- Edit/delete actions

#### KanbanBoard
- 5 columns: Recurring, Backlog, In Progress, Review, Done
- Drag-and-drop (future enhancement)
- Filter by owner, project
- Search functionality

---

## 7. Orchestration System

### 7.1 Pipeline Matching Algorithm

```typescript
function matchPipelineToTask(title: string, description?: string): PipelineMatchResult {
  const text = (title + ' ' + (description || '')).toLowerCase();
  
  // 1. Check for explicit pipeline hint
  if (text.includes('[pipeline:')) {
    // Extract and match pipeline name
  }
  
  // 2. Match to predefined pipelines
  const patterns = {
    'quick fix': 'Quick Fix',
    'research only': 'Research Only',
    'documentation': 'Documentation',
    'automate': 'Automation',
    'standard build': 'Standard Build',
  };
  
  // 3. Dynamic Assembly (fallback)
  return assembleDynamicPipeline(text);
}

function assembleDynamicPipeline(text: string): PipelineMatchResult {
  const workflowIds: string[] = [];
  
  // Detect work types from keywords
  if (isResearchTask(text)) workflowIds.push('wf-research');
  if (isBuildTask(text)) workflowIds.push('wf-build');
  if (isDocTask(text)) workflowIds.push('wf-document');
  if (isTestTask(text)) workflowIds.push('wf-test');
  if (isAutomationTask(text)) workflowIds.push('wf-automate');
  
  // Always add review
  workflowIds.push('wf-review');
  
  return {
    matched: true,
    workflowIds,
    isDynamic: true,
    confidence: 0.7,
    reason: 'Dynamically assembled: ' + reasons.join(', ')
  };
}
```

### 7.2 Communication Loop

```
Primary AI → Spawns Agent A (Step 1)
    ↓
Agent A → Works → Posts findings as comments
    ↓
Primary AI ← Reviews deliverables
    ↓
Primary AI → Asks questions (if needed) → Agent A responds
    ↓
Primary AI → Satisfied? → Spawns Agent B (Step 2)
    ↓
Repeat for each step...
```

### 7.3 Timeout Enforcement

The Primary AI enforces `timeoutSeconds` when spawning agents:

```typescript
sessions_spawn({
  task: workflow.systemPrompt,
  timeoutSeconds: workflow.timeoutSeconds,
  // If exceeded, agent killed, task marked failed
});
```

---

## 8. Built-in Data

### 8.1 Default Workflows

| ID | Name | Agent | Timeout | Purpose |
|----|------|-------|---------|---------|
| wf-research | Research | alice | 1800s | Investigate and document |
| wf-build | Build | bob | 3600s | Implement features |
| wf-quick-fix | Quick Fix | bob | 900s | Fix bugs quickly |
| wf-test | Test | charlie | 1200s | QA and validation |
| wf-review | Review | aegis | 900s | Final approval |
| wf-document | Document | alice | 1800s | Write documentation |
| wf-automate | Automate | tron | 1800s | Create automation |

### 8.2 Default Pipelines

| ID | Name | Steps |
|----|------|-------|
| pl-standard | Standard Build | Research → Build → Test → Review |
| pl-quick-fix | Quick Fix | Quick Fix → Review |
| pl-research | Research Only | Research → Document → Review |
| pl-docs | Documentation | Document → Review |
| pl-automation | Automation | Automate → Review |

### 8.3 Required Agents

```json
{
  "agents": [
    { "id": "alice", "name": "Alice", "role": "researcher" },
    { "id": "bob", "name": "Bob", "role": "builder" },
    { "id": "charlie", "name": "Charlie", "role": "tester" },
    { "id": "aegis", "name": "Aegis", "role": "reviewer" },
    { "id": "tron", "name": "Tron", "role": "automation" },
    { "id": "max", "name": "Max", "role": "orchestrator" }
  ]
}
```

---

## 9. File Structure

```
alex-mission-control/
├── README.md
├── PRD.md                      # This document
├── package.json
├── next.config.js
├── tailwind.config.js
├── tsconfig.json
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── tasks/
│   │   │   └── page.tsx
│   │   ├── orchestration/
│   │   │   └── page.tsx
│   │   ├── agents/
│   │   │   └── page.tsx
│   │   └── api/
│   │       ├── tasks/
│   │       │   ├── route.ts
│   │       │   └── [id]/
│   │       │       ├── route.ts
│   │       │       ├── comments/
│   │       │       │   └── route.ts
│   │       │       ├── activity/
│   │       │       │   └── route.ts
│   │       │       └── evidence/
│   │       │           └── route.ts
│   │       ├── workflows/
│   │       │   └── route.ts
│   │       ├── pipelines/
│   │       │   └── route.ts
│   │       └── agents/
│   │           └── route.ts
│   ├── components/
│   │   ├── Sidebar.tsx
│   │   └── ui/                  # shadcn components
│   ├── lib/
│   │   ├── db/
│   │   │   ├── index.ts
│   │   │   ├── schema.sql
│   │   │   └── workflows-schema.sql
│   │   ├── domain/
│   │   │   ├── tasks.ts
│   │   │   ├── workflows.ts
│   │   │   └── agents.ts
│   │   ├── types/
│   │   │   ├── index.ts
│   │   │   └── workflows.ts
│   │   └── utils.ts
│   └── styles/
│       └── globals.css
├── docs/
│   ├── ORCHESTRATION.md
│   ├── AGENT_PIPELINE_SETUP.md
│   ├── QUICKSTART.md
│   └── task-model-enhancement.md
└── public/
```

---

## 10. Environment Variables

```bash
# Database
DATABASE_URL=./mission-control.db

# OpenClaw
OPENCLAW_WORKSPACE=/path/to/workspace
OPENCLAW_CONFIG=~/.openclaw/openclaw.json

# Server
PORT=4000
NODE_ENV=development
```

---

## 11. Deployment

### 11.1 Development

```bash
npm install
npm run dev
```

### 11.2 Production Build

```bash
npm run build
npm start
```

### 11.3 Database Migration

Database auto-initializes on first run with all tables and default data.

---

## 12. Testing

### 12.1 Manual Testing Checklist

- [ ] Create task with pipeline matching
- [ ] Add comments with different types
- [ ] View activity timeline
- [ ] Add evidence files
- [ ] Create workflow template
- [ ] Create pipeline
- [ ] Test dynamic pipeline assembly
- [ ] Verify timeout enforcement
- [ ] Test handoff between agents

### 12.2 API Testing

```bash
# Create task
curl -X POST http://localhost:4000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"title":"Test task"}'

# List workflows
curl http://localhost:4000/api/workflows

# List pipelines
curl http://localhost:4000/api/pipelines
```

---

## 13. Future Enhancements

- [ ] Drag-and-drop kanban
- [ ] Real-time WebSocket updates
- [ ] Pipeline visualization graph
- [ ] Agent performance analytics
- [ ] Conditional pipeline branches
- [ ] Parallel workflow execution
- [ ] Webhook integrations
- [ ] Custom workflow triggers

---

## 14. Changelog

### v1.0 (2026-03-16)
- Initial release
- Task management with comments, activity, evidence
- Workflow and pipeline system
- Dynamic pipeline assembly
- Full CRUD for workflows and pipelines
- Agent orchestration with Primary AI

---

**Document Owner:** Engineering Team  
**Review Cycle:** Monthly  
**Next Review:** 2026-04-16
