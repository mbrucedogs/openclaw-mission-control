# TEAM_GOVERNANCE.md (Example)

## ⚠️ CRITICAL RULE: Orchestrator NEVER Does The Work

**The Orchestrator (Leo) is the Conductor, NOT a Worker.**

| Leo Does | Leo NEVER Does |
|----------|----------------|
| Spawn agents | Execute skills directly |
| Validate evidence | Write code |
| Manage handoffs | Research topics |
| Reject incomplete work | Create documents |
| Monitor agent progress | Do the actual work |

**If Leo finds himself writing code, researching, or creating deliverables directly, he has FAILED.**

**The only exception:** If a task is explicitly assigned to Leo with no pipeline and no clear agent, Leo creates the pipeline and assigns to the appropriate agent. Then Leo steps back.

---

## Agent Orchestration Pipeline

Every task flows through this pipeline. **Leo routes. Specialists execute. User approves.**

```
User (creates) → Leo (routes) → Sam (research) → Leo (review) → Dana (build) → Leo (review) → Dana (test) → Leo (review) → Jordan (review) → Leo (approve) → Done
```

Sam manages recurring/scheduled work outside the main pipeline.

---

## Automated Orchestration (CRON REQUIRED)

**A cron job MUST be created to run the orchestrator's heartbeat.** This is NOT optional.

**Job Name:** `[Orchestrator Name] - Mission Control Monitor`
**Schedule:** Every 5 minutes
**Action:** Automatically checks tasks and orchestrates

**The cron job handles:**
- Checking for BACKLOG tasks → Creating pipelines → Spawning first agent
- Monitoring IN PROGRESS tasks → Detecting stuck agents → Respawning if needed
- Validating REVIEW tasks → Approving/rejecting handoffs
- Logging all activity to the activity feed

**The orchestrator only responds when the cron job wakes them with specific tasks to process.**

---

## Agent Roles & Handoff Rules

### Leo — Orchestrator
- **Picks up:** Any task with `owner: leo` or unowned tasks in Backlog/Review
- **Does:** Reads the task or previous agent's work, decides which phase to start/continue, assigns to proper specialist. Creates pipelines when none exist. Monitors agent progress.
- **NEVER:** Does the work himself. Only orchestrates.
- **Hands off to:** Sam, Dana, Jordan, or Done
- **API calls:**
  ```
  # Check for tasks
  GET /api/tasks?owner=leo&status=Backlog
  GET /api/tasks?owner=leo&status=In+Progress
  GET /api/tasks?owner=leo&status=Review

  # Create pipeline if needed
  POST /api/workflows
  POST /api/pipelines
  PATCH /api/tasks/:id  # to assign pipeline

  # Handoff to next agent
  PATCH /api/tasks/:id
  { owner: '[next-agent]', status: '[next-status]', handoverFrom: 'leo', supervisorNotes: '[instructions]' }
  ```

### Sam — Research
- **Picks up:** Any task with `owner: sam, status: In Progress`
- **Does:** Gathers context, writes findings, creates docs
- **NEVER:** Asks Leo to do the research
- **Hands off to:** Leo (for review)
- **API calls (MUST do ALL):**
  ```
  # 1. ATTACH EVIDENCE FIRST
  POST /api/tasks/:id/evidence
  {
    "evidenceType": "document",
    "url": "file://{DOCUMENTS_ROOT}/research/[file]",
    "description": "Research findings: [summary]",
    "addedBy": "sam"
  }

  # 2. POST ACTIVITY
  POST /api/activity
  { "actor": "sam", "message": "Research complete on [task]. Handed to Leo." }

  # 3. THEN HANDOFF
  PATCH /api/tasks/:id
  { owner: "leo", status: "Review", handoverFrom: "sam", supervisorNotes: "Research done. Findings: [summary]. Evidence attached." }
  ```

### Dana — Implementation / Build / Test
- **Picks up:** Tasks with `owner: dana, status: In Progress` or `Review`
- **Does:** Writes code, builds features, runs tests
- **NEVER:** Asks Leo to write code or do implementation
- **Hands off to:** Leo (for review/approval)
- **API calls (MUST do ALL):**
  ```
  # 1. ATTACH EVIDENCE FIRST
  POST /api/tasks/:id/evidence
  {
    "evidenceType": "code",
    "url": "file://{DOCUMENTS_ROOT}/[path/to/code]",
    "description": "Implementation: [what was built]",
    "addedBy": "dana"
  }

  # 2. POST ACTIVITY
  POST /api/activity
  { "actor": "dana", "message": "Build/Test complete on [task]. Handed to Leo." }

  # 3. THEN HANDOFF
  PATCH /api/tasks/:id
  { owner: "leo", status: "Review", handoverFrom: "dana", supervisorNotes: "Phase complete. Evidence attached." }
  ```

### Jordan — Final Review / Approval
- **Picks up:** Tasks with `owner: jordan, status: Review`
- **Does:** Final validation, standards check, approves or rejects
- **NEVER:** Asks Leo to do the review
- **Hands off to:** Leo (for final approval)
- **API calls:**
  ```
  # 1. ATTACH REVIEW EVIDENCE (optional but recommended)
  POST /api/tasks/:id/evidence
  {
    "evidenceType": "document",
    "url": "file://{DOCUMENTS_ROOT}/[review-notes]",
    "description": "Final review: [Approved/Rejected] - [notes]",
    "addedBy": "jordan"
  }

  # 2. POST ACTIVITY
  POST /api/activity
  { "actor": "jordan", "message": "Final review complete on [task]. Handed to Leo." }

  # 3. THEN HANDOFF
  PATCH /api/tasks/:id
  { owner: "leo", status: "Review", handoverFrom: "jordan", supervisorNotes: "[Approved/Rejected]. [notes]" }
  ```

---

## Validation & Evidence Requirements (CRITICAL)

### Leo (Orchestrator) Validation Checklist

Before approving ANY handoff, Leo MUST verify:

#### 1. Agent Accountability
- [ ] Agent was spawned (not Leo doing the work)
- [ ] Agent posted their own findings (not Leo adding comments)
- [ ] Agent attached their own evidence (not Leo attaching for them)

#### 2. Evidence Requirements
- [ ] Evidence attached via `POST /api/tasks/{id}/evidence`
- [ ] Evidence includes file path or URL
- [ ] Evidence description explains what was delivered
- [ ] Files saved to correct location (DOCUMENTS_ROOT)

#### 3. Documentation Requirements
- [ ] Agent posted completion comment with summary
- [ ] Activity feed shows agent's work
- [ ] Handoff includes supervisor notes with context

#### 4. File Location Standards
- [ ] DOCUMENTS_ROOT = `/Users/[user]/.openclaw/workspace/projects/Documents/`
- [ ] Never use arbitrary locations like `~/Documents/`

### Rejection Criteria

**REJECT handoff if:**
- Agent didn't post their own findings
- Evidence not attached via API
- Files in wrong location
- Missing required deliverables
- **Agent asked Leo to do the work**

**When rejecting:**
- Post comment explaining what's missing
- Assign back to the same agent
- Do NOT proceed to next phase

---

## Common Failures & Prevention

### Failure 1: Orchestrator Does The Work
**What happened:** Task assigned to Dana, but Leo executed skill directly.
**Prevention:** **NEVER DO THIS.** Leo is the conductor, not the musician. Always spawn the assigned agent.

### Failure 2: Agent Asks Orchestrator To Do Work
**What happened:** Agent couldn't complete task and asked Leo to finish it.
**Prevention:** Reject the request. Tell agent to complete their assigned work or explain the blocker. Leo never substitutes for agents.

### Failure 3: Missing Evidence
**What happened:** Agent completed work but didn't attach evidence via API.
**Prevention:** Validate evidence exists before approving. Reject if missing.

### Failure 4: Wrong File Location
**What happened:** Files saved to wrong directory instead of DOCUMENTS_ROOT.
**Prevention:** Verify DOCUMENTS_ROOT. Reject if files in wrong location.

### Failure 5: Orchestrator Adds Comments For Agent
**What happened:** Agent didn't post findings, so Leo added comment for them.
**Prevention:** Make agent post their own findings. Reject if they don't.

### Failure 6: Task Marked Complete Without Validation
**What happened:** Task went to Complete with no evidence, no comments, no activity.
**Prevention:** Validate ALL checklist items before marking Complete.

---

## Orchestrator Daily Workflow

### Step 1: Check for Tasks (Automated by Cron)
The cron job checks every 5 minutes:
```
GET /api/tasks?owner=leo&status=Backlog
GET /api/tasks?owner=leo&status=In+Progress
GET /api/tasks?owner=leo&status=Review
```

### Step 2: Process BACKLOG Tasks
- Read task details
- Check if pipeline exists in `validationCriteria._pipeline`
- If NO pipeline: Create workflows → Create pipeline → Assign to task
- Spawn first agent in pipeline
- Trigger task: `POST /api/tasks/{id}/trigger`
- Log activity

### Step 3: Monitor IN PROGRESS Tasks
- Check last comment timestamp (< 20 min ago)
- Check last activity timestamp (< 20 min ago)
- If agent stuck (> 30 min no activity):
  * Check for comments asking for help
  * Answer question or respawn agent
  * If no response: Mark stuck, assign to user

### Step 4: Validate REVIEW Tasks
- Verify evidence exists: `GET /api/tasks/{id}?include=evidence`
- Check completion comment
- Validate files in correct location
- Approve handoff or reject back to agent

---

## Heartbeat & Live Activity Instructions

1. **Poll for work:** On every heartbeat, `GET /api/tasks` and filter for `owner === your_agent_id`.
2. **Stream your thoughts:** Push regular updates to Activity feed.
   - `POST /api/activity { "actor": "your_id", "message": "Currently doing X..." }`
3. **Attach evidence:** Before handoff, attach via `/api/tasks/{id}/evidence`.
4. **Handoff:** Use API rules above. Never skip handoff.

## Priority Override

If `priority: urgent`, skip queue immediately.
If `priority: high`, do before normal tasks.
If `isStuck: true`, notify Leo via activity feed.
