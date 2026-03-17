# TEAM_GOVERNANCE.md (Example)

## Agent Orchestration Pipeline

Every task flows through this pipeline. **Leo routes. Specialists execute. User approves.**

User (creates) → Leo (routes) → Sam (research) → Leo (review) → Dana (build) → Leo (review) → Dana (test) → Leo (review) → Dana (review) → Leo (approve) → Done

Sam manages recurring/scheduled work outside the main pipeline.

---

## Agent Roles & Handoff Rules

### Leo — Orchestrator
- **Picks up:** Any task with `owner: leo` or unowned tasks in Backlog/Review
- **Does:** Reads the task or previous agent's work, decides which phase to start/continue, assigns to proper specialist
- **Hands off to:** Sam, Dana, or Done
- **API call:**
  ```
  PATCH http://localhost:4000/api/tasks/:id
  { owner: '[next-agent]', status: '[next-status]', handoverFrom: 'leo', supervisorNotes: '[instructions]' }
  ```

### Sam — Research
- **Picks up:** Any task with `owner: sam, status: In Progress`
- **Does:** Gathers context, writes findings, may create docs
- **Hands off to:** Leo (for review)
- **API call:**
  ```
  PATCH /api/tasks/:id
  { owner: 'leo', status: 'Review', handoverFrom: 'sam', supervisorNotes: 'Research done. Findings: [summary].' }
  POST /api/activity
  { actor: 'sam', message: 'Research complete. Handed to Leo.' }
  POST /api/tasks/:id/evidence
  { evidenceType: 'document', url: 'file://{DOCUMENTS_ROOT}/research/[file]', description: 'Research findings' }
  ```

### Dana — Implementation / Build / Test / Review
- **Picks up:** Tasks with `owner: dana, status: In Progress` or `Review`
- **Does:** Writes code, builds features, runs tests, final review
- **Hands off to:** Leo (for review/approval)
- **API call:**
  ```
  PATCH /api/tasks/:id
  { owner: 'leo', status: 'Review', handoverFrom: 'dana', supervisorNotes: 'Phase complete. Evidence: [what was done].' }
  POST /api/activity
  { actor: 'dana', message: 'Phase complete. Handed to Leo.' }
  POST /api/tasks/:id/evidence
  { evidenceType: 'code', url: 'file://{DOCUMENTS_ROOT}/[path]', description: 'Implementation' }
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
- [ ] DOCUMENTS_ROOT configured in environment
- [ ] Never use arbitrary locations like `~/Documents/`

### Rejection Criteria

**REJECT handoff if:**
- Agent didn't post their own findings
- Evidence not attached via API
- Files in wrong location
- Missing required deliverables

**When rejecting:**
- Post comment explaining what's missing
- Assign back to the same agent
- Do NOT proceed to next phase

---

## Common Failures & Prevention

### Failure 1: Orchestrator Does The Work
**What happened:** Task assigned to Dana, but Leo executed skill directly.
**Prevention:** Always spawn the assigned agent. Never execute skills yourself.

### Failure 2: Missing Evidence
**What happened:** Agent completed work but didn't attach evidence via API.
**Prevention:** Validate evidence exists before approving. Reject if missing.

### Failure 3: Wrong File Location
**What happened:** Files saved to wrong directory instead of DOCUMENTS_ROOT.
**Prevention:** Verify DOCUMENTS_ROOT. Reject if files in wrong location.

### Failure 4: Orchestrator Adds Comments For Agent
**What happened:** Agent didn't post findings, so Leo added comment for them.
**Prevention:** Make agent post their own findings. Reject if they don't.

### Failure 5: Task Marked Complete Without Validation
**What happened:** Task went to Complete with no evidence, no comments, no activity.
**Prevention:** Validate ALL checklist items before marking Complete.

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
