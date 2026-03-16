# Task Model Enhancement for alex-mission-control

## Current Schema (SQLite)

```sql
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
  evidence TEXT,           -- Single string, not structured
  retryCount INTEGER DEFAULT 0,
  handoverFrom TEXT,       -- Just previous owner name
  supervisorNotes TEXT,    -- Single text blob
  isStuck INTEGER DEFAULT 0,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

CREATE TABLE activity (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  message TEXT NOT NULL,
  actor TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  metadata TEXT            -- JSON string, not queryable
);
-- No foreign key to tasks!
```

## Problems

1. **No per-task activity history** - Activity table has no task_id FK
2. **Supervisor notes overwrite** - Single field, no history
3. **Evidence is a string** - Can't have multiple files with metadata
4. **No comments** - No way for agents/users to add threaded discussion
5. **No time tracking** - Missing startedAt, completedAt
6. **No structured blockers** - isStuck boolean without context
7. **No validation criteria** - "Done" is implicit

## Proposed Changes

### 1. New Table: `task_comments`
Replace supervisorNotes with structured comments.

```sql
CREATE TABLE task_comments (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  author TEXT NOT NULL,           -- agent name or user
  author_type TEXT NOT NULL CHECK (author_type IN ('agent', 'user', 'system')),
  content TEXT NOT NULL,
  comment_type TEXT NOT NULL DEFAULT 'note' 
    CHECK (comment_type IN ('note', 'blocker', 'handover', 'qa_finding', 'evidence_ref', 'system')),
  parent_id TEXT,                 -- for threading (reply to comment)
  created_at TEXT NOT NULL,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_id) REFERENCES task_comments(id) ON DELETE CASCADE
);

CREATE INDEX idx_task_comments_task_id ON task_comments(task_id);
CREATE INDEX idx_task_comments_type ON task_comments(comment_type);
```

### 2. New Table: `task_activity`
Task-specific activity log (separate from global activity).

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
  details TEXT,                   -- JSON: {oldStatus, newStatus, fromOwner, toOwner, etc}
  created_at TEXT NOT NULL,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
);

CREATE INDEX idx_task_activity_task_id ON task_activity(task_id);
CREATE INDEX idx_task_activity_created_at ON task_activity(created_at DESC);
```

### 3. New Table: `task_evidence`
Structured evidence with metadata.

```sql
CREATE TABLE task_evidence (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  evidence_type TEXT NOT NULL CHECK (evidence_type IN ('file', 'url', 'document', 'screenshot', 'log')),
  url TEXT NOT NULL,              -- full path or URL
  description TEXT,
  added_by TEXT NOT NULL,
  added_at TEXT NOT NULL,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
);

CREATE INDEX idx_task_evidence_task_id ON task_evidence(task_id);
```

### 4. Enhanced `tasks` Table

```sql
-- Add new columns to existing tasks table
ALTER TABLE tasks ADD COLUMN started_at TEXT;
ALTER TABLE tasks ADD COLUMN completed_at TEXT;
ALTER TABLE tasks ADD COLUMN stuck_reason TEXT;
ALTER TABLE tasks ADD COLUMN stuck_since TEXT;
ALTER TABLE tasks ADD COLUMN last_error TEXT;
ALTER TABLE tasks ADD COLUMN validation_criteria TEXT;  -- JSON: {checklist, doneMeans}
ALTER TABLE tasks ADD COLUMN max_retries INTEGER DEFAULT 3;

-- Deprecate these (keep for migration, remove later):
-- supervisorNotes -> migrate to task_comments
-- evidence -> migrate to task_evidence
```

### 5. TypeScript Types

```typescript
// types.ts additions

export interface TaskComment {
  id: string;
  taskId: string;
  author: string;
  authorType: 'agent' | 'user' | 'system';
  content: string;
  commentType: 'note' | 'blocker' | 'handover' | 'qa_finding' | 'evidence_ref' | 'system';
  parentId?: string;
  createdAt: string;
}

export interface TaskActivity {
  id: string;
  taskId: string;
  actor: string;
  actorType: 'agent' | 'user' | 'system';
  activityType: 'created' | 'updated' | 'status_changed' | 'assigned' |
                'handover' | 'comment_added' | 'evidence_added' | 'evidence_removed' |
                'blocked' | 'unblocked' | 'retry_attempt' | 'started' | 'completed';
  details?: ActivityDetails;
  createdAt: string;
}

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

export interface TaskEvidence {
  id: string;
  taskId: string;
  evidenceType: 'file' | 'url' | 'document' | 'screenshot' | 'log';
  url: string;
  description?: string;
  addedBy: string;
  addedAt: string;
}

export interface ValidationCriteria {
  checklist: string[];
  doneMeans: string;
  codeRequirements?: string[];
  verificationSteps?: string[];
}

// Enhanced Task interface
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
  
  // Relations (populated on fetch)
  comments?: TaskComment[];
  activity?: TaskActivity[];
  evidence?: TaskEvidence[];
}
```

## Migration Strategy

### Phase 1: Create New Tables
```sql
-- Run this first (safe, no data loss)
CREATE TABLE task_comments (...);
CREATE TABLE task_activity (...);
CREATE TABLE task_evidence (...);

-- Add new columns
ALTER TABLE tasks ADD COLUMN started_at TEXT;
ALTER TABLE tasks ADD COLUMN completed_at TEXT;
ALTER TABLE tasks ADD COLUMN stuck_reason TEXT;
ALTER TABLE tasks ADD COLUMN stuck_since TEXT;
ALTER TABLE tasks ADD COLUMN last_error TEXT;
ALTER TABLE tasks ADD COLUMN validation_criteria TEXT;
ALTER TABLE tasks ADD COLUMN max_retries INTEGER DEFAULT 3;
```

### Phase 2: Migrate Existing Data
```sql
-- Migrate supervisorNotes to task_comments
INSERT INTO task_comments (id, task_id, author, author_type, content, comment_type, created_at)
SELECT 
  'cmt-' || lower(hex(randomblob(16))),
  id,
  'system',
  'system',
  supervisorNotes,
  'note',
  updatedAt
FROM tasks 
WHERE supervisorNotes IS NOT NULL AND supervisorNotes != '';

-- Migrate evidence to task_evidence (if it looks like a path/URL)
INSERT INTO task_evidence (id, task_id, evidence_type, url, description, added_by, added_at)
SELECT 
  'ev-' || lower(hex(randomblob(16))),
  id,
  CASE 
    WHEN evidence LIKE 'http%' THEN 'url'
    WHEN evidence LIKE '/%' THEN 'file'
    ELSE 'document'
  END,
  evidence,
  'Migrated from legacy evidence field',
  owner,
  updatedAt
FROM tasks 
WHERE evidence IS NOT NULL AND evidence != '';
```

### Phase 3: Update Application Code
1. Update `types.ts` with new interfaces
2. Create data access functions:
   - `getTaskComments(taskId)`
   - `addTaskComment(taskId, comment)`
   - `getTaskActivity(taskId)`
   - `logTaskActivity(taskId, activity)`
   - `getTaskEvidence(taskId)`
   - `addTaskEvidence(taskId, evidence)`
3. Update API routes:
   - `GET /api/tasks/[id]/comments`
   - `POST /api/tasks/[id]/comments`
   - `GET /api/tasks/[id]/activity`
   - `GET /api/tasks/[id]/evidence`
   - `POST /api/tasks/[id]/evidence`
4. Update task fetch to optionally include relations

### Phase 4: Deprecate Old Fields
After migration is verified:
```sql
-- These are now redundant
-- supervisorNotes (data migrated to task_comments)
-- evidence (data migrated to task_evidence)
```

## API Changes

### New Endpoints
```typescript
// Comments
GET    /api/tasks/[id]/comments
POST   /api/tasks/[id]/comments        // { content, commentType, parentId? }
PATCH  /api/tasks/[id]/comments/[cid]  // { content }
DELETE /api/tasks/[id]/comments/[cid]

// Activity (read-only, auto-generated)
GET /api/tasks/[id]/activity

// Evidence
GET    /api/tasks/[id]/evidence
POST   /api/tasks/[id]/evidence        // { evidenceType, url, description }
DELETE /api/tasks/[id]/evidence/[eid]

// Handover (enhanced)
POST /api/tasks/[id]/handoff           // { to: 'bob', notes: '...' }
// This now:
// 1. Updates task.owner
// 2. Sets task.handoverFrom
// 3. Creates task_activity entry
// 4. Creates task_comment with type='handover'
```

### Updated Endpoints
```typescript
// Add activity logging to existing
POST /api/tasks              // logs 'created'
PATCH /api/tasks/[id]        // logs 'updated' or 'status_changed'

// Enhanced GET
GET /api/tasks/[id]?include=comments,activity,evidence
```

## Benefits

1. **Full audit trail** - Every change logged with actor and timestamp
2. **Rich comments** - Typed (note/blocker/handover/qa_finding), threaded
3. **Structured evidence** - Multiple files with metadata
4. **Time tracking** - startedAt, completedAt for metrics
5. **Blocker visibility** - Why stuck, when stuck, error details
6. **Handover audit** - Complete pipeline history
7. **Validation criteria** - Clear definition of done

## Implementation Priority

1. **P0** - Create tables, add columns (non-breaking)
2. **P1** - Migrate existing supervisorNotes/evidence
3. **P2** - Add comment/activity/evidence API endpoints
4. **P3** - Update agent handover to log activity
5. **P4** - UI updates to show activity feed, comments
