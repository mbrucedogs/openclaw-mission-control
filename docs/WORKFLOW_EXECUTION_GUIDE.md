# Workflow Execution Guide

> **Complete step-by-step guide for executing multi-step pipelines with proper isolation and validation.**

---

## Overview

This guide covers the complete process for executing multi-step agent workflows in Mission Control, from pipeline creation through final task completion.

**Key Principles:**
- **Brutal Isolation**: Each agent sees ONLY their step
- **Immediate Validation**: Validate and mark each step immediately after completion
- **Fail Fast**: One failed step stops the entire pipeline
- **Evidence First**: Every step requires attached evidence before marking complete

---

## Phase 1: Pipeline Creation

### Step 1.1: Check Existing Pipelines

```bash
curl -s http://localhost:4000/api/pipelines \
  -H "X-API-Key: $API_KEY"
```

**Decision:**
- If suitable pipeline exists → Use existing pipeline ID
- If no suitable pipeline → Create new pipeline (Step 1.2)

### Step 1.2: Create New Pipeline

```bash
curl -s -X POST http://localhost:4000/api/pipelines \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{
    "name": "Pipeline Name",
    "description": "What this pipeline does",
    "steps": [
      {"workflow_id": "wf-research", "on_failure": "stop"},
      {"workflow_id": "wf-build", "on_failure": "stop"},
      {"workflow_id": "wf-test", "on_failure": "stop"},
      {"workflow_id": "wf-review", "on_failure": "stop"}
    ]
  }'
```

**Response:**
```json
{
  "id": "pl-xxxxxxxx",
  "name": "Pipeline Name",
  "steps": [...]
}
```

**Save the pipeline ID** (e.g., `pl-xxxxxxxx`) for task creation.

---

## Phase 2: Task Creation

### Step 2.1: Create Task with Step Overrides

```bash
curl -s -X POST http://localhost:4000/api/tasks \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{
    "title": "Task Title",
    "description": "Brief description",
    "pipelineId": "pl-xxxxxxxx",
    "stepOverrides": {
      "1": {
        "description": "STEP 1 ONLY: [Specific isolated scope]. Input: [file/URL]. Output: [filename]. DO NOT: [list what NOT to do].",
        "requiredDeliverables": ["filename.ext"]
      },
      "2": {
        "description": "STEP 2 ONLY: [Specific isolated scope]. Input: [file from step 1]. Output: [filename]. DO NOT: [list what NOT to do].",
        "requiredDeliverables": ["filename.ext"]
      }
    },
    "validationCriteria": {
      "doneMeans": "Clear statement of completion",
      "checklist": ["Item 1", "Item 2", "Item 3"]
    },
    "status": "Backlog",
    "priority": "normal",
    "requestedBy": "orchestrator-name"
  }'
```

**Critical: Step Override Format**

Each step override MUST include:
- `description`: Isolated scope with explicit DO NOT list
- `requiredDeliverables`: Array of expected output files

**Example Step Override:**
```json
"1": {
  "description": "STEP 1 ONLY: Extract raw transcript from YouTube video. Input: https://youtube.com/watch?v=xxx. Output: transcript.txt in DOCUMENTS_ROOT/research/. Tools: yt-dlp. DO NOT: Summarize, analyze, or plan. DO NOT think about next steps.",
  "requiredDeliverables": ["transcript.txt"]
}
```

### Step 2.2: Verify Task and Steps Created

```bash
# Get task details
curl -s http://localhost:4000/api/tasks/{taskId} \
  -H "X-API-Key: $API_KEY"

# Get steps
curl -s http://localhost:4000/api/tasks/{taskId}/steps \
  -H "X-API-Key: $API_KEY"
```

**Verify:**
- Task has `pipelineId` assigned
- Steps exist with correct `stepNumber`
- Each step has isolated `description` from override
- Each step has `requiredDeliverables`

---

## Phase 3: Step-by-Step Execution

### The Execution Loop

For EACH step in the pipeline:

```
┌─────────────────┐
│ 1. Spawn Agent  │
│    (isolated    │
│     scope only) │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 2. Wait for     │
│    completion   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 3. Validate     │
│    deliverable  │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌───────┐ ┌───────┐
│ PASS  │ │ FAIL  │
└───┬───┘ └───┬───┘
    │         │
    ▼         ▼
┌───────┐ ┌───────┐
│ Mark  │ │ Mark  │
│ step  │ │ step  │
│complete│ │ failed│
└───┬───┘ └───┬───┘
    │         │
    ▼         ▼
┌───────┐ ┌───────┐
│ Spawn │ │ STOP  │
│ next  │ │ task  │
│ step  │ │       │
└───────┘ └───────┘
```

### Step 3.1: Spawn Agent with Brutal Isolation

**CRITICAL: Agent ONLY sees their step. No pipeline context. No future steps.**

```javascript
sessions_spawn({
  agentId: "main",
  label: "Agent-Step{N}-{Action}",
  mode: "run",
  task: `**TASK: [Step Name]**

**Your ONLY job:** [One sentence description]

**Input:**
- [File path or URL]

**What you MUST do:**
1. [Action 1]
2. [Action 2]
3. Save output to: [Full file path]

**What you MUST NOT do:**
- Do NOT [action from other steps]
- Do NOT [another forbidden action]
- Do NOT think about what comes next
- Do NOT do anything else

**When you are done:**
Post a message saying exactly this:
"STEP {N} COMPLETE: [Deliverable] created at [full file path]. File size: [X] bytes."

**Then STOP.** Wait for me to tell you what to do next.

**Questions?** Ask me. Do not proceed without my OK.`
});
```

**Key Elements:**
- "Your ONLY job" — sets isolation
- "What you MUST NOT do" — explicit boundaries
- "Then STOP" — prevents continuation
- "Wait for me" — enforces orchestrator control

### Step 3.2: Wait for Agent Completion

**DO NOT:**
- Poll for status
- Check subagents list
- Use exec sleep
- Do anything else

**DO:**
- Wait for the completion event to arrive as a message
- The agent will report back when done

### Step 3.3: Validate Deliverable

When agent reports back:

```bash
# Verify file exists and has content
ls -la {DOCUMENTS_ROOT}/path/to/deliverable.ext
wc -l {DOCUMENTS_ROOT}/path/to/deliverable.ext

# Check file size > 0
# Check line count > 0 (for text files)
# Verify content matches expected format
```

**Validation Checklist:**
- [ ] File exists at expected path
- [ ] File size > 0 bytes
- [ ] Content is valid (open and check if needed)
- [ ] Format matches requirements

### Step 3.4: Attach Evidence

```bash
curl -s -X POST http://localhost:4000/api/tasks/{taskId}/evidence \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{
    "evidenceType": "document",
    "url": "file://{DOCUMENTS_ROOT}/path/to/deliverable.ext",
    "description": "[What was delivered] ([size], [lines] lines)",
    "addedBy": "agent-name"
  }'
```

### Step 3.5: Mark Step Complete (PASS)

```bash
curl -s -X PATCH http://localhost:4000/api/tasks/{taskId}/steps/{stepId} \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{
    "status": "complete",
    "completionNotes": "Deliverable validated: [filename] ([size], [lines] lines)",
    "deliverables": ["filename.ext"],
    "evidenceIds": ["ev-xxxxx"]
  }'
```

### Step 3.6: Mark Step Failed (FAIL)

If validation fails:

```bash
curl -s -X PATCH http://localhost:4000/api/tasks/{taskId}/steps/{stepId} \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{
    "status": "failed",
    "completionNotes": "Failed: [specific reason]",
    "blockers": "[what went wrong and why]"
  }'
```

**Then STOP.** Do not proceed to next step. Report failure to user.

---

## Phase 4: Final Task Completion

After ALL steps are marked `complete`:

### Step 4.1: Verify All Steps Complete

```bash
curl -s http://localhost:4000/api/tasks/{taskId}/steps \
  -H "X-API-Key: $API_KEY"
```

**Verify:**
- All steps have `status: "complete"`
- No steps have `status: "pending"` or `"failed"`

### Step 4.2: Mark Task Complete

```bash
curl -s -X PATCH http://localhost:4000/api/tasks/{taskId} \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{
    "status": "Complete"
  }'
```

**Note:** The API will reject this if any steps are not marked `complete`.

### Step 4.3: Report to User

```
Task {taskId} COMPLETE.

Summary:
- Step 1: [Agent] - [Deliverable] ([size])
- Step 2: [Agent] - [Deliverable] ([size])
- Step 3: [Agent] - [Deliverable] ([size])
...

All deliverables saved to:
- {DOCUMENTS_ROOT}/research/...
- {DOCUMENTS_ROOT}/plans/...

Evidence attached for all steps.
```

---

## Complete Example: 5-Step Pipeline

### 1. Create Pipeline

```bash
curl -s -X POST http://localhost:4000/api/pipelines \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{
    "name": "YouTube Research to Plan",
    "description": "Extract, summarize, analyze, plan, review",
    "steps": [
      {"workflow_id": "wf-research", "on_failure": "stop"},
      {"workflow_id": "wf-research", "on_failure": "stop"},
      {"workflow_id": "wf-research", "on_failure": "stop"},
      {"workflow_id": "wf-document", "on_failure": "stop"},
      {"workflow_id": "wf-review", "on_failure": "stop"}
    ]
  }'
```

**Response:** `{"id": "pl-oscgf1t6", ...}`

### 2. Create Task

```bash
curl -s -X POST http://localhost:4000/api/tasks \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{
    "title": "YouTube Research: Extract, Summarize, Analyze, Plan",
    "description": "Process YouTube video through 5-step pipeline",
    "pipelineId": "pl-oscgf1t6",
    "stepOverrides": {
      "1": {
        "description": "STEP 1 ONLY: Extract transcript. Input: https://youtube.com/watch?v=xxx. Output: transcript.txt. DO NOT: Summarize, analyze, or plan.",
        "requiredDeliverables": ["transcript.txt"]
      },
      "2": {
        "description": "STEP 2 ONLY: Summarize transcript. Input: transcript.txt. Output: summary.md. DO NOT: Extract, analyze, or plan.",
        "requiredDeliverables": ["summary.md"]
      },
      "3": {
        "description": "STEP 3 ONLY: Analyze for features. Input: summary.md. Output: features.md. DO NOT: Extract, summarize, or plan.",
        "requiredDeliverables": ["features.md"]
      },
      "4": {
        "description": "STEP 4 ONLY: Create plan. Input: features.md. Output: plan.md. DO NOT: Extract, summarize, or analyze.",
        "requiredDeliverables": ["plan.md"]
      },
      "5": {
        "description": "STEP 5 ONLY: Review all deliverables. Validate completeness. DO NOT: Create new content.",
        "requiredDeliverables": ["review-complete"]
      }
    },
    "validationCriteria": {
      "doneMeans": "All 5 steps complete with deliverables",
      "checklist": ["Transcript", "Summary", "Features", "Plan", "Review"]
    },
    "status": "Backlog",
    "priority": "normal",
    "requestedBy": "max"
  }'
```

**Response:** `{"id": "task-2505a012", ...}`

### 3. Execute Steps

**Step 1:**
```javascript
sessions_spawn({
  agentId: "main",
  label: "Alice-Step1-Extract",
  mode: "run",
  task: `**TASK: Extract Transcript**

**Your ONLY job:** Extract transcript from YouTube video.

**Input:** https://youtube.com/watch?v=xxx

**What you MUST do:**
1. Use yt-dlp to extract transcript
2. Save to: /Users/.../Documents/research/transcript.txt

**What you MUST NOT do:**
- Do NOT summarize
- Do NOT analyze
- Do NOT plan
- Do NOT think about next steps

**When done:**
Post: "STEP 1 COMPLETE: Transcript at [path]. Size: [X] bytes."

**Then STOP.** Wait for my OK.`
});
```

**Wait for completion → Validate → Mark complete → Attach evidence**

**Step 2:**
```javascript
sessions_spawn({
  agentId: "main",
  label: "Alice-Step2-Summarize",
  mode: "run",
  task: `**TASK: Summarize Transcript**

**Your ONLY job:** Create summary of transcript.

**Input:** /Users/.../Documents/research/transcript.txt

**What you MUST do:**
1. Read transcript
2. Create structured summary
3. Save to: /Users/.../Documents/research/summary.md

**What you MUST NOT do:**
- Do NOT extract (already done)
- Do NOT analyze
- Do NOT plan
- Do NOT think about next steps

**When done:**
Post: "STEP 2 COMPLETE: Summary at [path]. Size: [X] bytes."

**Then STOP.** Wait for my OK.`
});
```

**Wait for completion → Validate → Mark complete → Attach evidence**

**Steps 3-5:** Repeat same pattern.

### 4. Complete Task

After all 5 steps marked complete:

```bash
curl -s -X PATCH http://localhost:4000/api/tasks/task-2505a012 \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{"status": "Complete"}'
```

---

## Common Mistakes to Avoid

### ❌ Mistake 1: Agent Sees Full Pipeline

**Wrong:**
```javascript
task: `Task: Build feature

Pipeline: Research → Build → Test → Review
Step 1: Research...`
```

**Right:**
```javascript
task: `**TASK: Research ONLY**

**Your ONLY job:** Research topic X.

**What you MUST NOT do:**
- Do NOT build
- Do NOT test
- Do NOT review
- Do NOT think about next steps`
```

### ❌ Mistake 2: Batch Marking Steps

**Wrong:**
- Wait for all steps to finish
- Then mark all steps complete at once

**Right:**
- Mark Step 1 complete immediately after validation
- Then spawn Step 2
- Mark Step 2 complete immediately after validation
- Then spawn Step 3
- etc.

### ❌ Mistake 3: Missing Evidence

**Wrong:**
- Agent completes step
- Mark step complete
- No evidence attached

**Right:**
- Agent completes step
- Attach evidence via POST /api/tasks/{id}/evidence
- Then mark step complete

### ❌ Mistake 4: Proactive Handoff

**Wrong:**
- Use POST /api/tasks/{id}/handoff to "progress" steps

**Right:**
- Use PATCH /api/tasks/{id}/steps/{stepId} to mark individual steps
- Spawn next agent manually with isolated scope

---

## Quick Reference

### API Endpoints

| Action | Endpoint | Method |
|--------|----------|--------|
| Create Pipeline | `/api/pipelines` | POST |
| Create Task | `/api/tasks` | POST |
| Get Task | `/api/tasks/{id}` | GET |
| Get Steps | `/api/tasks/{id}/steps` | GET |
| Attach Evidence | `/api/tasks/{id}/evidence` | POST |
| Mark Step Complete | `/api/tasks/{id}/steps/{stepId}` | PATCH |
| Mark Task Complete | `/api/tasks/{id}` | PATCH |

### Status Flow

```
Step: pending → in-progress → complete
                          ↘ failed (stops pipeline)

Task: Backlog → In Progress → Complete
```

### Required Per Step

- [ ] Agent spawned with isolated scope
- [ ] Agent reports completion
- [ ] Deliverable validated (file exists, has content)
- [ ] Evidence attached via API
- [ ] Step marked complete via PATCH
- [ ] Next step spawned (if not final)

---

## Summary

**The Golden Workflow:**

1. **Create Pipeline** (if doesn't exist)
2. **Create Task** with stepOverrides for isolation
3. **For Each Step:**
   - Spawn agent with brutal isolation
   - Wait for completion
   - Validate deliverable
   - Attach evidence
   - Mark step complete
   - (If PASS) Spawn next step
   - (If FAIL) Stop task
4. **Mark Task Complete** (after all steps done)
5. **Report to User**

**Remember:**
- Isolation prevents scope creep
- Immediate validation catches errors early
- Evidence proves completion
- Fail fast stops wasted work

---

**Document Location:** `alex-mission-control/docs/WORKFLOW_EXECUTION_GUIDE.md`
**Last Updated:** 2026-03-17
**Version:** 1.0
