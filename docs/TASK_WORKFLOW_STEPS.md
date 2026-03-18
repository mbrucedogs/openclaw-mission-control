# Task Workflow Steps

> **Full audit trail for each step in a pipeline**

---

## Overview

Every task in a pipeline now has **TaskWorkflowStep** objects that track:
- Who did the work
- What was delivered
- Pass/fail status
- Evidence links
- Duration
- Blockers/questions
- Handoff notes

---

## Database Schema

```sql
CREATE TABLE task_workflow_steps (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL,
    step_number INTEGER NOT NULL,
    
    -- Workflow definition
    workflow_id TEXT NOT NULL,
    workflow_name TEXT NOT NULL,
    agent_id TEXT NOT NULL,
    agent_name TEXT,
    
    -- Status tracking
    status TEXT NOT NULL CHECK (status IN ('pending', 'in-progress', 'complete', 'failed', 'blocked')),
    started_at TEXT,
    completed_at TEXT,
    duration_minutes INTEGER,
    
    -- Evidence & deliverables
    evidence_ids TEXT DEFAULT '[]',
    deliverables TEXT DEFAULT '[]',
    
    -- Agent notes
    completion_notes TEXT,
    blockers TEXT,
    questions TEXT,
    
    -- Validation
    validated_by TEXT,
    validation_notes TEXT,
    pass_fail TEXT CHECK (pass_fail IN ('pass', 'fail')),
    
    -- Next step
    next_step_id TEXT,
    handoff_notes TEXT,
    
    -- Audit
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
```

---

## API Endpoints

### Create Step
```
POST /api/tasks/{taskId}/steps
{
  "workflowId": "wf-research",
  "workflowName": "Research",
  "agentId": "sam-scout",
  "agentName": "Sam-Scout",
  "stepNumber": 1,
  "nextStepId": "step-xyz789"  // optional
}
```

### Get All Steps
```
GET /api/tasks/{taskId}/steps
```

### Start Step
```
POST /api/tasks/{taskId}/steps/{stepId}
{
  "action": "start"
}
```

### Complete Step
```
POST /api/tasks/{taskId}/steps/{stepId}
{
  "action": "complete",
  "evidenceIds": ["ev-abc123"],
  "deliverables": ["Document 13", "Document 14"],
  "completionNotes": "Downloaded 5 articles",
  "passFail": "pass",
  "validatedBy": "jordan-reviewer",
  "validationNotes": "All docs verified",
  "handoffNotes": "Ready for review"
}
```

### Fail Step
```
POST /api/tasks/{taskId}/steps/{stepId}
{
  "action": "fail",
  "blockers": "Could not access paywalled content",
  "questions": "Should I try alternative source?"
}
```

### Block Step
```
POST /api/tasks/{taskId}/steps/{stepId}
{
  "action": "block",
  "blockers": "Waiting for API key"
}
```

---

## Pipeline Enforcement

**Workflow steps are now automatically created** whenever a `pipelineId` is assigned to a task (either during initial `POST /api/tasks` or via `PATCH /api/tasks/{id}`).

**Task CANNOT be marked complete until:**
1. All steps are created for the pipeline
2. Each step is explicitly completed with `action: "complete"`
3. Each step has evidence attached
4. Final step (review) passes validation

**Agent Handoff Protocol:**
```typescript
// Agent completes step
const step = await fetch(`/api/tasks/${taskId}/steps/${stepId}`, {
  method: 'POST',
  body: JSON.stringify({
    action: 'complete',
    evidenceIds: ['ev-123'],
    completionNotes: 'Work done',
    passFail: 'pass'
  })
});

// System checks for next step
const steps = await fetch(`/api/tasks/${taskId}/steps`).then(r => r.json());
const currentStep = steps.find(s => s.status === 'pending');

// If next step exists, spawn next agent
if (currentStep) {
  sessions_spawn({
    task: `Step ${currentStep.stepNumber}: ${currentStep.workflowName}`,
    label: `${currentStep.agentName}-Step-${taskId}`,
    agentId: currentStep.agentId
  });
}
```

---

## UI Display

```
Task: Download 5 articles
├── Step 1: Document [COMPLETE] ✓ (3m 35s)
│   ├── Agent: Sam-Scout
│   ├── Evidence: ev-abc123
│   ├── Deliverables: 5 documents (13-17)
│   └── Notes: "All articles downloaded"
│
├── Step 2: Review [COMPLETE] ✓ (2m 10s)
│   ├── Agent: Jordan-Reviewer
│   ├── Validated By: Jordan-Reviewer
│   ├── Pass/Fail: PASS
│   └── Notes: "All docs verified"
│
└── Status: COMPLETE ✓
```

---

## Migration

**Existing tasks need steps created:**
```typescript
// For each task with a pipeline
const steps = pipeline.steps.map((step, index) => ({
  taskId: task.id,
  stepNumber: index + 1,
  workflowId: step.workflow_id,
  workflowName: workflow.name,
  agentId: workflow.agentId,
  agentName: agent.name
}));

// Create steps
for (const step of steps) {
  await fetch(`/api/tasks/${task.id}/steps`, {
    method: 'POST',
    body: JSON.stringify(step)
  });
}
```

---

## Task Completion Blocker

**API Enforcement:** The task completion endpoint (`PATCH /api/tasks/{id}` with `status: "Complete"`) now validates steps before allowing completion.

**Blocked if:**
- Any steps have status other than `complete`
- Any steps are `failed`
- Steps exist but weren't created properly

**Error Response:**
```json
{
  "error": "Cannot complete task with incomplete steps",
  "incompleteSteps": [
    { "stepNumber": 1, "workflowName": "Research", "status": "pending" }
  ],
  "message": "Task has 1 incomplete step(s). Complete all steps before marking task done."
}
```

**Orchestrator Must:**
1. Complete each step via API with evidence
2. Validate step status before marking task complete
3. Handle rejection gracefully if steps incomplete

---

## See Also
- [PIPELINE_PROTOCOL.md](./PIPELINE_PROTOCOL.md) - 5-phase protocol
- [ORCHESTRATION.md](./ORCHESTRATION.md) - Full orchestration guide
- [TASK_CREATION_REQUIREMENTS.md](./TASK_CREATION_REQUIREMENTS.md) - Task requirements with step tracking

**Last Updated:** 2026-03-17
**Version:** 1.1
