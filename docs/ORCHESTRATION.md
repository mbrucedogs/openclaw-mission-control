# Orchestration System Documentation

## Overview

The alex-mission-control orchestration system uses a **hybrid pipeline model** that combines:

1. **Predefined Workflows** - Reusable work templates for agents
2. **Predefined Pipelines** - Sequences of workflows for common patterns
3. **Dynamic Pipeline Assembly** - the Primary AI builds custom pipelines on-the-fly when no predefined match exists

---

## Part 1: For Primary AIs (Orchestrators)

### 🎭 Your Role: The Conductor

**You are the CONDUCTOR, not the MUSICIAN.**

| Role | Does | Does NOT |
|------|------|----------|
| **Orchestrator (You)** | Spawns agents, validates work, manages handoffs | Execute skills, write code, add comments for agents |
| **Agent** | Does the actual work, posts findings, attaches evidence | Decide pipeline, validate other agents' work |

### The Pipeline Flow

```
User → You → Researcher → You → Builder → You → Tester → You → Reviewer → You → Done
```

### CRITICAL: Validation Checklist

Before approving ANY handoff, you MUST verify:

#### 1. Agent Accountability
- [ ] Agent was spawned (not you doing the work)
- [ ] Agent posted their own findings (not you adding comments)
- [ ] Agent attached their own evidence (not you attaching for them)

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
- Work incomplete or unclear

**When rejecting:**
- Post comment explaining what's missing
- Assign back to the same agent
- Do NOT proceed to next phase

### Common Failures & Prevention

| Failure | What Happened | Prevention |
|---------|---------------|------------|
| **You Did The Work** | Task assigned to Agent, but you executed skill directly | Always spawn the assigned agent. Never execute skills yourself. |
| **Missing Evidence** | Agent completed work but didn't attach evidence via API | Validate evidence exists before approving. Reject if missing. |
| **Wrong File Location** | Files saved to wrong directory instead of DOCUMENTS_ROOT | Verify DOCUMENTS_ROOT. Reject if files in wrong location. |
| **You Added Comments For Agent** | Agent didn't post findings, so you added comment for them | Make agent post their own findings. Reject if they don't. |
| **Task Marked Complete Without Validation** | Task went to Complete with no evidence, no comments, no activity | Validate ALL checklist items before marking Complete. |

### Spawn Commands

#### Researcher
```javascript
sessions_spawn({
  task: `TASK: [title]\n\nPipeline: [pipeline] - Step [N]/[total]\nCurrent Phase: Research\n\n**Your Mission:**\n[Research description]\n\n**Deliverables:**\n1. [Finding 1]\n2. [Finding 2]\n\n**Handoff:** When complete, post findings as comment, attach evidence via API, and I'll route to next phase.\n\n**Questions?** Ask me - monitoring this task.\n\nRead your SOUL.md at: {AGENT_PATH}/researcher/SOUL.md`,
  label: "Researcher-[task-id]",
  agentId: "main"
})
```

#### Builder
```javascript
sessions_spawn({
  task: `TASK: [title]\n\nPipeline: [pipeline] - Step [N]/[total]\nCurrent Phase: Build\n\n**Your Mission:**\n[Implementation description]\n\n**Requirements:**\n- [ ] Req 1\n- [ ] Req 2\n\n**Handoff:** When complete, post summary, attach evidence via API, and I'll validate.\n\n**Questions?** Ask me.\n\nRead your SOUL.md at: {AGENT_PATH}/builder/SOUL.md`,
  label: "Builder-[task-id]",
  agentId: "main"
})
```

#### Tester
```javascript
sessions_spawn({
  task: `TASK: [title]\n\nPipeline: [pipeline] - Step [N]/[total]\nCurrent Phase: Test\n\n**Your Mission:**\n[Testing description]\n\n**Requirements:**\n- [ ] Test 1\n- [ ] Test 2\n\n**Handoff:** Post test results, attach evidence, and I'll review.\n\nRead your SOUL.md at: {AGENT_PATH}/tester/SOUL.md`,
  label: "Tester-[task-id]",
  agentId: "main"
})
```

#### Reviewer
```javascript
sessions_spawn({
  task: `TASK: [title]\n\nPipeline: [pipeline] - Step [N]/[total]\nCurrent Phase: Review\n\n**Your Mission:**\nValidate all deliverables meet requirements.\n\n**Evidence to Review:**\n- [Evidence 1]\n- [Evidence 2]\n\n**Handoff:** Approve or reject with specific reasons.\n\nRead your SOUL.md at: {AGENT_PATH}/reviewer/SOUL.md`,
  label: "Reviewer-[task-id]",
  agentId: "main"
})
```

---

## Part 2: Technical Reference

### Core Concepts

#### Workflows

A **workflow** is a reusable definition of work for a specific agent:

```typescript
interface WorkflowTemplate {
  id: string;           // e.g., "wf-research"
  name: string;         // e.g., "Research"
  agentRole: string;    // researcher, builder, tester, reviewer, automation
  agentId?: string;     // Specific agent (alice, bob, charlie, aegis, tron)
  timeoutSeconds: number;  // Hard limit - workflow killed if exceeded
  systemPrompt?: string;   // Instructions for the agent
  validationChecklist: string[];  // What "done" means
}
```

**Built-in Workflows:**
- `wf-research` - Alice investigates and documents
- `wf-build` - Bob implements code/features
- `wf-quick-fix` - Bob fixes bugs quickly
- `wf-test` - Charlie runs QA
- `wf-review` - Aegis approves/rejects
- `wf-document` - Alice writes documentation
- `wf-automate` - Tron creates automation

#### Pipelines

A **pipeline** is an ordered sequence of workflows:

```typescript
interface Pipeline {
  id: string;
  name: string;
  steps: PipelineStep[];
  isDynamic: boolean;  // true if the Primary AI assembled it
}

interface PipelineStep {
  workflowId: string;
  onFailure: 'stop' | 'continue' | 'skip';
}
```

**Built-in Pipelines:**
- `pl-standard` - Research → Build → Test → Review
- `pl-quick-fix` - Quick Fix → Review
- `pl-research` - Research → Review
- `pl-docs` - Document → Review
- `pl-automation` - Automate → Review

### Dynamic Assembly Logic

| Keyword Detected | Workflow Added |
|-----------------|----------------|
| research, investigate, analyze | wf-research |
| build, implement, create, code | wf-build |
| fix, bug, quick | wf-quick-fix |
| document, readme, docs | wf-document |
| test, qa, verify | wf-test |
| automate, script, cron | wf-automate |

**Always adds:** `wf-review` at the end (unless explicitly skipped)

### API Endpoints

#### Tasks
```
GET    /api/tasks              # List tasks
POST   /api/tasks              # Create task
GET    /api/tasks/:id          # Get task details
PATCH  /api/tasks/:id          # Update task / handoff
```

#### Activity
```
POST   /api/activity           # Post activity update
```

#### Evidence (CRITICAL)
```
POST   /api/tasks/:id/evidence # Attach evidence
```

Payload:
```json
{
  "evidenceType": "document",
  "url": "file://{DOCUMENTS_ROOT}/plans/example.md",
  "description": "Structured plan document generated from analysis",
  "addedBy": "agent-name"
}
```

**Evidence Types:** document, code, test, screenshot, link

#### Pipelines
```
GET    /api/pipelines          # List pipelines
POST   /api/pipelines          # Create new pipeline
```

### Database Schema

#### workflow_templates
```sql
CREATE TABLE workflow_templates (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    agent_role TEXT NOT NULL,
    agent_id TEXT,
    timeout_seconds INTEGER DEFAULT 1800,
    system_prompt TEXT,
    validation_checklist TEXT,  -- JSON array
    tags TEXT,
    created_at TEXT,
    updated_at TEXT,
    use_count INTEGER DEFAULT 0
);
```

#### pipelines
```sql
CREATE TABLE pipelines (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    steps TEXT NOT NULL,  -- JSON array
    is_dynamic INTEGER DEFAULT 0,
    created_from_task_id TEXT,
    created_at TEXT,
    updated_at TEXT,
    use_count INTEGER DEFAULT 0
);
```

#### task_pipelines
```sql
CREATE TABLE task_pipelines (
    task_id TEXT PRIMARY KEY,
    pipeline_id TEXT,
    workflow_ids TEXT,
    current_step INTEGER DEFAULT 0,
    is_dynamic INTEGER DEFAULT 0,
    matched_at TEXT
);
```

---

## Part 3: Generic Example (For New Teams)

### Example Team Structure

| Agent | Role | Responsibilities |
|-------|------|------------------|
| **Leo** | Orchestrator | Routes tasks, validates work, manages handoffs |
| **Sam** | Researcher | Information gathering, analysis, investigation |
| **Dana** | Builder | Code implementation, feature development |
| **Alex** | Tester | QA, testing, validation |
| **Jordan** | Reviewer | Final approval, quality gate |
| **Taylor** | Automation | Cron jobs, scheduled tasks, monitoring |

### Example Workflow

```
User → Leo → Sam (Research) → Leo → Dana (Build) → Leo → Alex (Test) → Leo → Jordan (Review) → Leo → Done
```

See `examples/openclaw-workspace/` for complete generic setup with Leo/Sam/Dana.

---

## Best Practices

### For Workflow Authors
1. **Clear validation checklist** - Define exactly what "done" means
2. **Reasonable timeouts** - 1800s (30min) for research, 3600s (60min) for builds
3. **Specific system prompts** - Give agents clear instructions
4. **Use tags** - Helps with discovery and organization

### For Pipeline Authors
1. **Logical flow** - Research → Build → Test → Review
2. **Failure handling** - Decide: stop, continue, or skip on failure?
3. **Keep it simple** - 2-4 steps is usually enough
4. **Name descriptively** - "Quick Fix" vs "Standard Build"

### For Primary AIs
1. **Prefer predefined** - Use existing pipelines when possible
2. **Document dynamic** - Log why dynamic pipeline was chosen
3. **Learn from success** - Save working dynamic patterns
4. **Respect timeouts** - Always enforce workflow timeoutSeconds
5. **Clear handoffs** - Pass context between agents
6. **NEVER do the work** - Spawn agents, don't execute skills yourself
7. **ALWAYS validate** - Check evidence exists before approving
8. **REJECT incomplete work** - Send back to agent if deliverables missing

---

## Troubleshooting

### Pipeline not matching?
- Check task title/description for keywords
- Verify workflow templates exist
- Review the Orchestrator's matching logic

### Agent not spawning?
- Verify agent is registered in OpenClaw
- Check agent role matches workflow requirement
- Review timeoutSeconds is reasonable

### Evidence not showing?
- Verify POST to `/api/tasks/{id}/evidence`
- Check evidence includes valid URL/path
- Ensure `addedBy` field is populated

---

**Last Updated:** 2026-03-16
**Version:** 2.0
**Maintainer:** the Primary AI (Primary AI Orchestrator)
**Changes:** Merged ORCHESTRATION.md + ORCHESTRATION_GUIDE.md, added validation checklist, common failures, evidence requirements
