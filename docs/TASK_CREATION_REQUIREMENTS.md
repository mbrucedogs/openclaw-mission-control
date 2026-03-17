# Task Creation Requirements

**Required checklist for every task created by the Orchestrator**

---

## The Golden Rule

**A task without proper requirements will fail.** Agents need clear instructions on:
- What to deliver
- Where to save it
- How to prove it's done
- What tools to use
- What to do if things break

---

## Required Fields (Every Task)

### 0. Validation Criteria (Structured Data)
**What:** Machine-readable validation criteria using the Task model's `validationCriteria` field

**Format:** JSON object with structured fields
```json
{
  "validationCriteria": {
    "doneMeans": "Clear statement of what completion looks like",
    "checklist": [
      "Specific step 1 with verifiable criteria",
      "Specific step 2 with verifiable criteria",
      "Specific step 3 with verifiable criteria"
    ],
    "codeRequirements": ["Optional: specific code requirements"],
    "verificationSteps": ["Optional: how to verify each item"]
  }
}
```

**Why this matters:**
- Agents can reference structured checklist programmatically
- UI displays checklist in task detail view
- Orchestrator can validate against structured criteria
- Pipeline tracking uses this for handoff validation

**Example:**
```json
{
  "validationCriteria": {
    "doneMeans": "YouTube transcript downloaded, summary created, and document saved to Mission Control",
    "checklist": [
      "Extract transcript using yt-dlp or fallback tool",
      "Generate structured summary with 10-15 key takeaways",
      "Create Mission Control document with proper metadata",
      "Save markdown file to {DOCUMENTS_ROOT}/research/",
      "Attach evidence via API with document ID and file path",
      "Post completion comment summarizing work done"
    ],
    "verificationSteps": [
      "Check file exists at specified path",
      "Verify document created in Mission Control",
      "Confirm evidence attached to task",
      "Validate comment posted with summary"
    ]
  }
}
```

**Note:** The `validationCriteria` field is stored as JSON in the database. The UI displays `doneMeans` and `checklist` in the task detail view. Agents should reference these fields when completing work.

---

### 1. Clear Task Description
**What:** One sentence describing the action

**Good:** "Download YouTube transcript and extract key content"
**Bad:** "Handle the video thing"

---

### 2. Input Specification
**What:** What the agent receives to work with

**Examples:**
- URL: `https://youtube.com/watch?v=...`
- File path: `/path/to/input/file`
- Data: "Research topic X"
- Requirements: "Build feature Y"

---

### 3. Required Deliverables (Checklist)
**What:** Specific, verifiable outputs

**Format:** Numbered list with clear criteria

**Example:**
```
Required Output:
1. Raw transcript file in SRT format
2. Clean text version (no timestamps)
3. Summary of key topics (3-5 bullet points)
4. List of timestamps for important moments
```

**Bad example:**
```
Required Output:
- Do the thing
- Make it good
```

---

### 4. Save Location (DOCUMENTS_ROOT)
**What:** Exact path where files must be saved

**Format:** `{DOCUMENTS_ROOT}/[folder]/[filename]`

**Environment Variable:**
```
DOCUMENTS_ROOT=/Users/[user]/.openclaw/workspace/projects/Documents
```

**Why this matters:**
- Agents save to wrong locations without it
- Evidence attachments break
- Files get lost
- Can't validate completion

---

### 5. Evidence Attachment Format
**What:** Exact API call to attach proof of work

**Required API Call:**
```bash
curl -X POST http://localhost:4000/api/tasks/{task-id}/evidence \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{
    "evidenceType": "[document|code|test|screenshot|link]",
    "url": "file://{DOCUMENTS_ROOT}/[path/to/file]",
    "description": "[What was delivered - be specific]",
    "addedBy": "[agent-name]"
  }'
```

**Evidence Types:**
- `document` - Markdown, text, reports
- `code` - Source files
- `test` - Test results, QA reports
- `screenshot` - Images, visual proof
- `link` - URLs, external resources

---

### 6. Tool Requirements
**What:** What tools must be available

**Checklist:**
- [ ] Primary tool specified
- [ ] How to check availability included
- [ ] Fallback option identified
- [ ] Installation instructions if needed

**Example:**
```
Tool Requirements:
- Primary: yt-dlp
  Check: which yt-dlp
  Install: brew install yt-dlp
- Fallback: youtube-transcript-api (Python)
  Check: pip3 list | grep youtube
  Install: pip3 install youtube-transcript-api
```

---

### 7. Fallback Plan
**What:** What to do if primary method fails

**Required:** At least one fallback for critical steps

**Example:**
```
Fallback Plan:
1. Primary: yt-dlp --write-auto-sub
2. If fails: Try youtube-transcript-api Python library
3. If fails: Use browser automation skill
4. If all fail: Mark task blocked, post comment with error details
```

---

### 8. Validation Checklist
**What:** How to verify task is truly complete

**Format:** Checkbox list

**Example:**
```
Validation Checklist:
- [ ] Output file exists at specified location
- [ ] File has content (not empty, > 0 bytes)
- [ ] File format is correct (.srt, .md, etc.)
- [ ] Evidence attached via API
- [ ] Summary comment posted to task
- [ ] All required deliverables present
```

---

## File Naming Conventions

Use consistent patterns:

| Type | Pattern | Example |
|------|---------|---------|
| Research | `{Source}-{ID}-Analysis-YYYY-MM-DD.md` | `YouTube-Video-abc123-Analysis-2026-03-16.md` |
| Code | `{Project}-{Feature}-Implementation.{ext}` | `MissionControl-Auth-Implementation.ts` |
| Summary | `{Source}-Summary-YYYY-MM-DD.md` | `YouTube-Video-abc123-Summary-2026-03-16.md` |
| Plans | `{PROJECT}-Plan-v{N}.md` | `AUTH-Plan-v1.md` |
| Transcripts | `{Title}-transcript.{ext}` | `Video-Title-transcript.txt` |

---

## Environment Variables

**Must be available to agents:**

```bash
# Required
export DOCUMENTS_ROOT="/Users/[user]/.openclaw/workspace/projects/Documents"
export API_KEY="[from .env file]"
export API_URL="http://localhost:4000"

# Optional but recommended
export WORKSPACE_ROOT="/Users/[user]/.openclaw/workspace"
```

---

## Task Template (Copy This)

```json
{
  "title": "[Clear one-sentence description]",
  "description": "**Task:** [Detailed description]\n\n**Input:**\n- [What the agent receives]\n\n**Required Output:**\n1. [Specific deliverable 1 with criteria]\n2. [Specific deliverable 2 with criteria]\n3. [Specific deliverable 3 with criteria]\n\n**Save Location:**\n- Primary: {DOCUMENTS_ROOT}/[Folder]/[filename.ext]\n- Secondary: {DOCUMENTS_ROOT}/[Folder]/[filename-alt.ext]\n\n**Evidence to Attach:**\n- Type: [document|code|test|screenshot|link]\n- Path: file://{DOCUMENTS_ROOT}/[path]\n- Description: "[Specific description of what was delivered]"\n\n**Tool Requirements:**\n- Primary: [tool name]\n  - Check: [command to verify]\n  - Install: [how to install if missing]\n- Fallback: [alternative tool]\n  - When to use: [condition]\n\n**Fallback Plan:**\n1. Try [primary method]\n2. If fails: Try [fallback method]\n3. If fails: Mark task blocked, post comment with error\n\n**Validation Checklist:**\n- [ ] [Criterion 1]\n- [ ] [Criterion 2]\n- [ ] [Criterion 3]\n- [ ] Evidence attached via API\n- [ ] Summary comment posted\n\n**Questions?** Ask [Orchestrator name] - monitoring this task.\n\nRead your SOUL.md at: [path to agent SOUL.md]",
  "validationCriteria": {
    "doneMeans": "[Clear statement of what completion looks like]",
    "checklist": [
      "[Specific step 1 with verifiable criteria]",
      "[Specific step 2 with verifiable criteria]",
      "[Specific step 3 with verifiable criteria]"
    ],
    "codeRequirements": ["[Optional: code requirements]"],
    "verificationSteps": ["[Optional: verification steps]"]
  },
  "status": "Backlog",
  "priority": "normal",
  "owner": "[agent-id]",
  "requestedBy": "[orchestrator-name]"
}
```

**API Call to Create Task:**
```bash
curl -X POST http://localhost:4000/api/tasks \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d @task-payload.json
```

---

## Common Failures (When Requirements Missing)

| Missing Requirement | What Happens | Prevention |
|---------------------|--------------|------------|
| No DOCUMENTS_ROOT | Agent saves to random location | Always specify exact path |
| No evidence format | Agent doesn't attach proof | Include exact API call |
| No tool requirements | Agent tries missing tools | List tools + check commands |
| No fallback | Agent gets stuck | Always provide Plan B |
| No validation checklist | Can't verify completion | Include checkbox list |
| Vague deliverables | Agent delivers wrong thing | Be specific and measurable |

---

## Quick Checklist (Before Creating Task)

- [ ] Task description is clear and specific
- [ ] Input is fully specified
- [ ] Deliverables are numbered and verifiable
- [ ] Save location uses {DOCUMENTS_ROOT}
- [ ] Evidence API call format included
- [ ] Tools listed with availability checks
- [ ] Fallback plan provided
- [ ] Validation checklist included
- [ ] File naming follows conventions
- [ ] Agent knows who to ask for help

---

## Pipeline Steps (NEW - Automatic)

**What:** When a task is created with a pipeline, steps are automatically generated from the pipeline definition.

**How it works:**
1. Task created → Pipeline matched (based on keywords)
2. Steps auto-created from pipeline workflow sequence
3. Each step tracks: status, agent, evidence, deliverables
4. Task CANNOT be marked complete until ALL steps are complete

**Example Pipeline Steps:**
```
Task: Research YouTube video
├── Step 1: Research [PENDING] → Alice
│   └── Download transcript, extract key content
├── Step 2: Document [PENDING] → Alice  
│   └── Create summary, save to Mission Control
└── Step 3: Review [PENDING] → Aegis
    └── Validate document, approve or reject
```

**Step Status Flow:**
- `pending` → `in-progress` → `complete` | `failed` | `blocked`

**API for Steps:**
```bash
# Get all steps for task
GET /api/tasks/{task-id}/steps

# Start step
POST /api/tasks/{task-id}/steps/{step-id}
{ "action": "start" }

# Complete step (REQUIRES evidence)
POST /api/tasks/{task-id}/steps/{step-id}
{
  "action": "complete",
  "passFail": "pass",
  "evidenceIds": ["ev-123"],
  "deliverables": ["Document 19"],
  "completionNotes": "Transcript downloaded, summary created"
}

# Fail step
POST /api/tasks/{task-id}/steps/{step-id}
{
  "action": "fail",
  "blockers": "Could not access video"
}
```

---

## Task Completion Blocker (NEW - Enforced)

**Rule:** Task CANNOT be marked `Complete` if:
1. Any steps are NOT `complete` (pending, in-progress, blocked)
2. Any steps are `failed`
3. Evidence is missing from completed steps

**API Response if Blocked:**
```json
{
  "error": "Cannot complete task with incomplete steps",
  "incompleteSteps": [
    { "stepNumber": 2, "workflowName": "Document", "status": "pending" }
  ],
  "message": "Task has 1 incomplete step(s). Complete all steps before marking task done."
}
```

**Orchestrator Responsibility:**
- Validate each step before marking complete
- Ensure evidence attached to each step
- Only mark task complete when ALL steps done

---

## Step-Level Evidence Requirements

**Each step MUST have:**
1. **Evidence attached via API** - File path or URL
2. **Completion comment** - Posted by the agent
3. **Deliverables listed** - What was produced
4. **Pass/fail status** - For review steps

**Evidence Checklist Per Step:**
- [ ] Evidence record created via `/api/tasks/{id}/evidence`
- [ ] Evidence type correct (document|code|test|screenshot|link)
- [ ] File path uses `{DOCUMENTS_ROOT}` format
- [ ] Description explains what was delivered
- [ ] Agent name in `addedBy` field
- [ ] Completion comment posted to task

---

## Orchestrator 5-Phase Protocol (REQUIRED)

**Every task MUST go through all 5 phases:**

### Phase 1: Route
- Read task completely (title, description, validationCriteria)
- Determine correct agent from pipeline step
- Spawn agent with full context
- Update task to "In Progress"

### Phase 2: Monitor  
- Wait for agent to complete
- Poll for activity/comments
- Check for stuck agents (>20 min no activity)

### Phase 3: Validate
- Check evidence attached via API
- Verify files in DOCUMENTS_ROOT
- Confirm checklist items complete
- **REJECT if anything missing**

### Phase 4: Complete
- Mark step complete via API
- Attach step evidence
- Handoff to next agent (if more steps)

### Phase 5: Report
- Tell user task is complete
- Include evidence locations
- Reference document IDs

**Critical Rule:** "Spawned" ≠ "Done". Spawning is Phase 1 of 5.

---

## Updated Quick Checklist (Before Creating Task)

- [ ] Task description is clear and specific
- [ ] Input is fully specified
- [ ] Deliverables are numbered and verifiable
- [ ] Save location uses {DOCUMENTS_ROOT}
- [ ] Evidence API call format included
- [ ] Tools listed with availability checks
- [ ] Fallback plan provided
- [ ] Validation checklist included
- [ ] File naming follows conventions
- [ ] Agent knows who to ask for help
- [ ] **Pipeline steps will be auto-created**
- [ ] **Each step requires evidence before completion**
- [ ] **Task blocked until all steps complete**

---

**Document Location:** `alex-mission-control/docs/TASK_CREATION_REQUIREMENTS.md`
**Last Updated:** 2026-03-17
**Applies To:** All tasks created by Orchestrator
**See Also:** 
- ORCHESTRATION.md (full system docs)
- TASK_WORKFLOW_STEPS.md (step tracking API)
- PIPELINE_PROTOCOL.md (5-phase protocol)
- README.md (getting started)