# Pipeline Orchestration Protocol

> **This document defines the mandatory workflow for Primary AIs orchestrating tasks through Mission Control.**

## Overview

Every task must flow through **all 5 phases** of the orchestration protocol. No exceptions. "Spawned" does not mean "Done."

---

## The 5-Phase Protocol

### Phase 1: Route

**Purpose:** Get the task to the right agent

**Orchestrator Actions:**
1. Read task completely (title, description, checklist, evidence requirements)
2. Determine correct agent from pipeline
3. Spawn agent with complete context including:
   - Task ID
   - Full description
   - Deliverables checklist
   - Handoff instructions
   - API credentials
4. Update task status to "In Progress"
5. **Stay focused** - Do not spawn other tasks until this one is DONE

**Success Criteria:**
- Agent is spawned and running
- Task status is "In Progress"
- Agent has all required context

---

### Phase 2: Monitor

**Purpose:** Ensure agent completes their work

**Orchestrator Actions:**
1. Wait for agent to complete (check subagents list)
2. Poll for activity/comments if needed
3. Check for stuck agents (no activity > 20 min)
4. **Do not get distracted** - One task at a time through completion

**Success Criteria:**
- Agent has posted completion comment
- Activity feed shows agent's work
- Agent is ready for handoff

---

### Phase 3: Validate

**Purpose:** Verify work meets requirements before completing

**Orchestrator Actions:**
1. Check evidence attached via `GET /api/tasks/{id}?include=evidence`
2. Verify files exist in correct location (DOCUMENTS_ROOT)
3. Confirm all checklist items are complete
4. Validate deliverables match requirements
5. **Reject if anything missing** - Send back to same agent with specific feedback

**Validation Checklist:**
- [ ] Evidence exists and is accessible
- [ ] Files are in DOCUMENTS_ROOT (not arbitrary locations)
- [ ] All required deliverables are present
- [ ] Quality meets standards
- [ ] Agent posted their own findings (not orchestrator adding for them)

**Success Criteria:**
- All validation items pass
- OR task is rejected back to agent with clear feedback

---

### Phase 4: Complete

**Purpose:** Mark task as done and finalize

**Orchestrator Actions:**
1. Mark task "Complete" via API
2. Attach final summary as evidence if appropriate
3. Update any related tracking
4. **Only then** consider the task done

**API Calls:**
```
PATCH /api/tasks/{id}
{
  "status": "Complete",
  "completedAt": "2026-03-17T10:00:00Z"
}
```

**Success Criteria:**
- Task status is "Complete"
- Evidence is attached
- User can be notified

---

### Phase 5: Report

**Purpose:** Inform user that work is finished

**Orchestrator Actions:**
1. Tell user: "Task [ID] is COMPLETE"
2. Include summary of what was done
3. Reference where evidence is located
4. Mention any next steps if applicable

**Report Template:**
```
✅ Task [task-id] COMPLETE

**What was done:**
- [Summary of work]

**Evidence:**
- Location: [file path or URL]
- Document ID: [if applicable]

**Next steps:**
- [Any follow-up actions]
```

---

## Critical Rules

| Rule | Why It Matters |
|------|----------------|
| **"Spawned" ≠ "Done"** | Spawning an agent is Phase 1 of 5. The pipeline completes when YOU mark it complete. |
| **One task at a time** | Don't spawn multiple agents and hope for the best. Complete each task fully before moving on. |
| **Validate before reporting** | Never tell user "I spawned an agent" as if that's completion. |
| **Reject incomplete work** | If evidence is missing, send it back. Don't complete on behalf of agents. |
| **Stay focused** | Don't get distracted by new tasks until current one is done. |

---

## Common Failures

### Failure: Orchestrator Abandoned Pipeline
**What happened:** Orchestrator spawned agent then moved on without completing validation

**Prevention:** Follow all 5 phases. Never consider "spawned" as "done."

### Failure: Missing Evidence
**What happened:** Task marked complete but no evidence attached

**Prevention:** Phase 3 validation must pass before Phase 4 completion.

### Failure: Wrong File Location
**What happened:** Files saved to ~/Documents instead of DOCUMENTS_ROOT

**Prevention:** Phase 3 validation checks file locations.

---

## When Tron Alerts You

1. **Check alerts:** `GET /api/agent-alerts?status=pending`
2. **For each alert:** Execute the full 5-Phase Protocol
3. **Mark alert resolved:** Update alert status via API
4. **Report to user:** Only after task is fully complete

**Remember:** Tron detects work. You complete the pipeline. That's the division of labor.

---

## Task as Source of Truth

**The task object contains everything needed for pipeline execution:**

### What's in the Task
```typescript
interface Task {
  id: string;
  title: string;
  description: string;           // Human-readable context
  status: TaskStatus;            // Current state
  validationCriteria: {          // Machine-readable requirements
    doneMeans: string;           // Completion criteria
    checklist: string[];         // Step-by-step requirements
    codeRequirements?: string[];
    verificationSteps?: string[];
  };
  assigned_agent: string;        // Who's working on it
  // ... pipeline metadata
}
```

### How to Use Task for Pipeline Steps

**Each workflow step should reference the task:**

1. **Read `validationCriteria.checklist`** - Know what needs to be done
2. **Check current `status`** - Understand where we are
3. **Update `status` on handoff** - Mark progress
4. **Attach evidence** - Prove completion
5. **Reference checklist in comments** - Document what was done

### Failure Handling per Step

**If a step fails, the task tells you what to do:**

```typescript
// Pipeline step configuration
interface PipelineStep {
  workflow_id: string;
  on_failure: 'stop' | 'continue' | 'skip';
}
```

**Failure Actions:**
- **stop** - Halt pipeline, notify orchestrator
- **continue** - Log error, proceed to next step
- **skip** - Skip this step, continue pipeline

**Orchestrator Responsibility:**
1. Check step's `on_failure` setting
2. If `stop` - Mark task blocked, notify user
3. If `continue` - Log warning, proceed
4. If `skip` - Skip and continue

### Example: Task-Driven Pipeline

```typescript
// Task contains all pipeline info
const task = {
  id: "task-abc123",
  validationCriteria: {
    doneMeans: "Document created and saved",
    checklist: [
      "Download transcript",
      "Generate summary", 
      "Create document",
      "Attach evidence"
    ]
  },
  // Pipeline metadata
  _pipeline: ["alice", "aegis"],
  _currentStep: 0
};

// Alice reads checklist item 1-3
// Aegis reads checklist item 4 (validation)
// Each step knows what to do from the task
```

**Key Principle:** The task is the single source of truth. No external state needed.

---

## Quick Reference

```bash
# Check pending alerts
curl http://localhost:4000/api/agent-alerts?status=pending

# Get task with evidence
curl http://localhost:4000/api/tasks/{id}?include=evidence

# Mark task complete
curl -X PATCH http://localhost:4000/api/tasks/{id} \
  -H "Content-Type: application/json" \
  -d '{"status": "Complete"}'
```

---

**See Also:**
- [ORCHESTRATION.md](./ORCHESTRATION.md) - Full orchestration system documentation
- [TASK_CREATION_REQUIREMENTS.md](./TASK_CREATION_REQUIREMENTS.md) - Required fields for tasks
- [README.md](./README.md) - Getting started guide
