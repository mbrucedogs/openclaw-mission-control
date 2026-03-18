# Orchestration System Documentation

> **Quick Reference:** See [KNOWLEDGE_INDEX.md](./KNOWLEDGE_INDEX.md) for trigger phrases, critical facts, and document map.

## Overview

The openclaw-mission-control orchestration system uses a **hybrid pipeline model** that combines:

1. **Predefined Workflows** - Reusable work templates for agents
2. **Predefined Pipelines** - Sequences of workflows for common patterns
3. **Dynamic Pipeline Assembly** - The Orchestrator builds custom pipelines on-the-fly when no predefined match exists

---

## Part 1: For Orchestrators (Conductors)

### 🎭 Your Role: The Conductor

**You are the CONDUCTOR, not the MUSICIAN.**

| Role | Does | Does NOT |
|------|------|----------|
| **Orchestrator (You)** | Spawns agents, validates work, manages handoffs | Execute skills, write code, add comments for agents |
| **Agent** | Does the actual work, posts findings, attaches evidence | Decide pipeline, validate other agents' work |

### The Pipeline Flow (Example)

**This is an example using the canon agent names from `examples/openclaw/workspace/`. Your workspace will have similar files with your own agent names.**

```
User → You (Leo) → Sam (Researcher) → You → Dana (Builder) → You → Jordan (Reviewer) → You → Done
```

### CRITICAL: Validation Checklist

Before approving ANY handoff, you MUST verify:

#### 0. Task Model Validation (MANDATORY)
**Always check `task.validationCriteria` for structured requirements:**

```typescript
interface ValidationCriteria {
  doneMeans: string;        // What completion looks like
  checklist: string[];      // Structured checklist items
  codeRequirements?: string[];
  verificationSteps?: string[];
}
```

**Validation Process:**
- [ ] Read `task.validationCriteria.doneMeans` - understand completion criteria
- [ ] Check `task.validationCriteria.checklist` - verify each item is complete
- [ ] Agent should reference checklist in completion comment
- [ ] Evidence must prove checklist items are done

**Why this matters:**
- `validationCriteria` = machine-readable requirements for agents
- `description` = human-readable context
- Both are required for proper task execution
- Pipeline tracking uses structured checklist for handoff validation

**When creating tasks:**
- ALWAYS include `validationCriteria` with `doneMeans` and `checklist`
- NEVER rely only on markdown checklists in description

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

---

## 🔥 5-Phase Pipeline Orchestration Protocol (MANDATORY)

**Every task must go through all 5 phases. No exceptions.**

### Phase 1: Route
**Orchestrator Actions:**
1. Read task completely (title, description, checklist, evidence requirements)
2. Determine correct agent from pipeline
3. Spawn agent with complete context
4. Update task status to "In Progress"
5. **Stay focused** - Do not spawn other tasks until this one is DONE

### Phase 2: Monitor
**Orchestrator Actions:**
1. Wait for agent to complete (check subagents list)
2. Poll for activity/comments if needed
3. **Do not get distracted** - One task at a time through completion

### Phase 3: Validate
**Orchestrator Actions:**
1. Check evidence attached via `GET /api/tasks/{id}?include=comments,activity,evidence`
2. Verify files exist in correct location (DOCUMENTS_ROOT)
3. Confirm all checklist items are complete
4. **Reject if anything missing** - Send back to same agent with specific feedback

### Phase 4: Complete
**Orchestrator Actions:**
1. Mark task "Complete" via `PATCH /api/tasks/{id}` or handoff endpoint
2. Attach final summary as evidence if appropriate
3. **Only then** report completion to user

### Phase 5: Report
**Orchestrator Actions:**
1. Tell user: "Task [ID] is COMPLETE"
2. Include: what was done, where evidence is located, any next steps

---

### Critical Rules

| Rule | Why It Matters |
|------|----------------|
| **"Spawned" ≠ "Done"** | Spawning an agent is Phase 1 of 5. The pipeline completes when YOU mark it complete. |
| **One task at a time** | Don't spawn multiple agents and hope for the best. Complete each task fully. |
| **Validate before reporting** | Never tell user "I spawned an agent" as if that's completion. |
| **Reject incomplete work** | If evidence is missing, send it back. Don't complete on behalf of agents. |

### When Automated Monitoring Alerts You

1. Check `/api/agent-alerts` for pending alerts
2. For each alert, execute the full 5-Phase Protocol
3. Mark alert as acknowledged via API
4. Report completion to user

**Remember:** Monitoring detects work. You complete the pipeline. That's the division of labor.

**⚠️ CRITICAL:** Before creating ANY task, read [TASK_CREATION_REQUIREMENTS.md](./TASK_CREATION_REQUIREMENTS.md) for the complete template and required fields.

### Spawn Commands (Example)

**These examples use the canon agent names from `examples/openclaw/workspace/`. Your workspace will have similar commands with your own agent names in your `agents/TEAM-REGISTRY.md`.**

#### Sam-Scout (Researcher)
```javascript
sessions_spawn({
  task: `TASK: [title]\n\nPipeline: [pipeline] - Step [N]/[total]\nCurrent Phase: Research\n\n**Your Mission:**\n[Research description]\n\n**Deliverables:**\n1. [Finding 1]\n2. [Finding 2]\n\n**Handoff:** When complete, post findings as comment, attach evidence via API, and I'll route to next phase.\n\n**Questions?** Ask Leo - monitoring this task.\n\nRead your SOUL.md at: agents/sam-scout/SOUL.md`,
  label: "Sam-Research-[task-id]",
  agentId: "main"
})
```

#### Dana-Dev (Builder)
```javascript
sessions_spawn({
  task: `TASK: [title]\n\nPipeline: [pipeline] - Step [N]/[total]\nCurrent Phase: Build\n\n**Your Mission:**\n[Implementation description]\n\n**Requirements:**\n- [ ] Req 1\n- [ ] Req 2\n\n**Handoff:** When complete, post summary, attach evidence via API, and I'll validate.\n\n**Questions?** Ask Leo.\n\nRead your SOUL.md at: agents/dana-dev/SOUL.md`,
  label: "Dana-Build-[task-id]",
  agentId: "main"
})
```

#### Jordan-Reviewer (Reviewer)
```javascript
sessions_spawn({
  task: `TASK: [title]\n\nPipeline: [pipeline] - Step [N]/[total]\nCurrent Phase: Review\n\n**Your Mission:**\nValidate all deliverables meet requirements.\n\n**Evidence to Review:**\n- [Evidence 1]\n- [Evidence 2]\n\n**Handoff:** Approve or reject with specific reasons.\n\nRead your SOUL.md at: agents/jordan-review/SOUL.md`,
  label: "Jordan-Review-[task-id]",
  agentId: "main"
})
```

---

## Part 2: Technical Reference

### Core Concepts

#### Workflows

A **workflow** is a reusable definition of work for a specific agent role:

```typescript
interface WorkflowTemplate {
  id: string;           // e.g., "wf-research"
  name: string;         // e.g., "Research"
  agentRole: string;    // researcher, builder, tester, reviewer, automation
  agentId?: string;     // Specific agent ID
  timeoutSeconds: number;  // Hard limit - workflow killed if exceeded
  systemPrompt?: string;   // Instructions for the agent
  validationChecklist: string[];  // What "done" means
}
```

**Common Workflows:**
- `wf-research` - Sam investigates and documents
- `wf-build` - Dana implements code/features
- `wf-quick-fix` - Dana fixes bugs quickly
- `wf-test` - Dana/Jordan runs QA
- `wf-review` - Jordan approves/rejects
- `wf-document` - Sam writes documentation
- `wf-automate` - Sam/Taylor creates automation

#### Pipelines

A **pipeline** is an ordered sequence of workflows:

```typescript
interface Pipeline {
  id: string;
  name: string;
  steps: PipelineStep[];
  isDynamic: boolean;  // true if the Orchestrator assembled it
}

interface PipelineStep {
  workflowId: string;
  onFailure: 'stop' | 'continue' | 'skip';
}
```

**Task-Specific Step Customization (NEW)**
Every task instantiated from a pipeline creates individual `TaskWorkflowStep` records. You SHOULD customize these for the specific task to provide "Isolated Scope" for agents.

```bash
PATCH /api/tasks/{taskId}/steps/{stepId}
{
  "description": "Specific instructions for THIS agent",
  "requiredDeliverables": ["file1.md", "file2.ts"]
}
```

**Common Pipelines:**
- `pl-standard` - Research → Build → Test → Review
- `pl-quick-fix` - Quick Fix → Review
- `pl-research` - Research → Review
- `pl-docs` - Document → Review
- `pl-automation` - Automate → Review

### Dynamic Assembly Logic

| Keyword Detected | Workflow Added | Agent Role |
|-----------------|----------------|------------|
| **Research:** research, investigate, analyze, study, extract, summarize, explore, discover, find out, look into, survey, compare, evaluate | wf-research | researcher |
| **Design:** design, ui, ux, wireframe, mockup, prototype | wf-design | designer |
| **Build:** build, implement, create code, write code, develop, code, program, engineer, construct, architect | wf-build | builder |
| **Refactor:** refactor, restructure, reorganize, clean up code | wf-refactor | builder |
| **Quick Fix:** fix, bug, patch, resolve, repair, debug, correct, address + quick | wf-quick-fix | builder |
| **Document:** document, readme, docs, write, explain, describe, guide, manual, tutorial, wiki | wf-document | researcher |
| **Test:** test, qa, check, ensure, confirm + run tests, verify, validate | wf-test | tester |
| **Performance:** optimize, improve performance, speed up, performance, efficiency | wf-perf | builder |
| **Security:** secure, security audit, vulnerability, pen test, security review | wf-security | researcher |
| **Migrate:** migrate, migration, port, upgrade | wf-migrate | builder |
| **Deploy:** deploy, release, publish, ship, launch | wf-deploy | builder |
| **Configure:** configure, setup, provision, install | wf-config | automation |
| **Automate:** automate, script, cron, bot, pipeline, workflow automation | wf-automate | automation |

**Always adds:** `wf-review` at the end (unless explicitly skipped)

**Note:** Keywords are checked in priority order. A task can trigger multiple workflows (e.g., "Research and build" = Research → Build → Review).

### API Endpoints

#### Tasks
```
PATCH  /api/tasks/:id          # Update task / assign pipeline
```

**New: Manual Pipeline Assignment**
You can now manually wire a pipeline to an existing task:
```bash
PATCH /api/tasks/{id}
{
  "pipelineId": "pl-mqs715mi"
}
```
This will automatically instantiate the workflow steps for that task.

#### Activity
```
POST   /api/activity           # Post activity update
```

#### Evidence (MANDATORY)
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
POST   /api/api/pipelines          # Create new pipeline
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

## Part 3: Complete Working Example

**See `examples/openclaw/workspace/` for a complete, working example you can copy and customize.**

This example uses the canon agent names (Leo, Sam, Dana, Jordan) to demonstrate the structure. When you set up your own workspace, you'll create similar files with your own agent names.

### Example Team Structure (from examples/openclaw/workspace/)

| Agent | Role | Responsibilities |
|-------|------|------------------|
| **Leo-Lead** | Orchestrator | Routes tasks, validates work, manages handoffs |
| **Sam-Scout** | Researcher | Information gathering, analysis, investigation |
| **Dana-Dev** | Builder | Code implementation, feature development |
| **Jordan-Reviewer** | Reviewer | Final approval, quality gate |

### Example Workflow

```
User → Leo-Lead → Sam-Scout (Research) → Leo-Lead → Dana-Dev (Build) → Leo-Lead → Jordan-Reviewer (Review) → Leo-Lead → Done
```

### Example File Structure (from examples/openclaw/workspace/)

```
workspace/
├── agents/
│   ├── leo-lead/
│   │   ├── SOUL.md          # Orchestrator personality
│   │   └── AGENTS.md        # Role definition
│   ├── sam-scout/
│   │   ├── SOUL.md          # Researcher personality
│   │   └── AGENTS.md
│   ├── dana-dev/
│   │   ├── SOUL.md          # Builder personality
│   │   └── AGENTS.md
│   ├── jordan-review/
│   │   ├── SOUL.md          # Reviewer personality
│   │   └── AGENTS.md
│   └── TEAM-REGISTRY.md     # Agent registry (in agents/ folder)
├── TEAM_GOVERNANCE.md       # Governance rules (in root)
├── AGENT_PIPELINE_SETUP.md  # Setup guide (in root)
└── openclaw.json            # Agent configuration
```

**Note:** In this example, TEAM-REGISTRY.md is in `agents/` folder, while TEAM_GOVERNANCE.md and AGENT_PIPELINE_SETUP.md are in the workspace root. This matches the actual structure you'll use in your own workspace.

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

### For Orchestrators (Conductors)
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

## Part 4: Fresh Install & Dynamic Workflow Creation

### The Problem: Fresh Install State

On a fresh install of Mission Control:
- Database tables exist but are **EMPTY**
- No workflows created yet
- No pipelines created yet
- **I don't know what agents exist**

### The Solution: Runtime Workflow Creation

**I create workflows dynamically when the first task arrives**, because by then:
1. The user has configured agents in `openclaw.json`
2. Agent directories exist with SOUL.md files
3. I can inspect the team and create appropriate workflows

### The Process

```
First task arrives in Backlog
  ↓
The Orchestrator wakes up
  ↓
Check: Do workflows exist?
  ↓
NO → Create workflows dynamically based on actual agents
  ↓
Create pipelines linking those workflows
  ↓
Now match task to newly created pipeline
```

### What I Create Dynamically

**Step 1: Discover Agents**
```javascript
// Read TEAM-REGISTRY.md or scan agents/ directory
// Find registered agents and their roles
```

**Step 2: Create Workflows** (POST /api/workflows)
| Workflow | Agent Role | Purpose |
|------------|------------|---------|
| `wf-research` | Researcher | Investigation, analysis |
| `wf-build` | Builder | Implementation, coding |
| `wf-quick-fix` | Builder | Quick bug fixes |
| `wf-test` | Tester | QA, validation |
| `wf-review` | Reviewer | Final approval |
| `wf-document` | Researcher | Documentation writing |
| `wf-automate` | Automation | Automation scripts |

**Step 3: Create Pipelines** (POST /api/pipelines)
| Pipeline | Steps | Use When |
|------------|-------|----------|
| `pl-standard` | Research → Build → Test → Review | Full feature development |
| `pl-quick-fix` | Quick Fix → Review | Bug fixes |
| `pl-research` | Research → Review | Investigation only |
| `pl-docs` | Document → Review | Documentation tasks |
| `pl-automate` | Automate → Review | Scripts, cron jobs |

**Step 4: Match Task**
Now use the matching logic with actual existing pipelines.

### Dynamic Assembly Fallback

If for some reason I can't create workflows (no agents configured yet), the system has a fallback:

```javascript
// assembleDynamicPipeline() in src/lib/domain/workflows.ts
// Builds workflow list from keywords without requiring DB records
// Always adds 'wf-review' at the end
```

This works immediately on fresh install without any DB setup.

### Why This Approach

| Approach | Problem |
|----------|---------|
| **Pre-seed workflows** | ❌ I don't know agent names/roles at install time |
| **Hardcode workflows** | ❌ Different teams have different agents |
| **Dynamic creation** | ✅ Created based on actual configured agents |

**Key Insight:** The user configures agents FIRST, then tasks arrive. By task time, I know the team.

---

## Part 5: Automated Monitoring (Cost-Optimized)

### ⚠️ WARNING: Use Local Models for Monitoring

**NEVER use cloud models for simple monitoring tasks.** This burns tokens unnecessarily.

### The Two-Tier Design

| Tier | Agent | Model | Cost | Responsibility |
|------|-------|-------|------|----------------|
| **Monitor** | Aiden (Automation Agent) | Local (free) | **FREE** | Detect problems only |
| **Orchestrator** | Orchestrator | Cloud (when needed) | Per-use | Solve problems, route tasks |

### How It Works

```
Aiden (every 2 min, local model)
  ↓
Checks Mission Control API
  ↓
All agents working? → HEARTBEAT_OK (done, no cloud cost)
Needs attention? → Wake the Orchestrator
  ↓
The Orchestrator (cloud model, only when needed)
  ↓
Routes/validates/orchestrates
```

### What Is Checked

1. **Query tasks:** Backlog, In Progress, Review
2. **Check agent activity:** Last comment/activity < 20 min?
3. **Detect stuck tasks:** > 30 min no activity?
4. **Decision:** Wake the Orchestrator only if work needed

### Detection Rules

| Condition | Action |
|-----------|--------|
| BACKLOG task with no owner | Wake the Orchestrator: "Task [ID] needs routing" |
| IN_PROGRESS but agent inactive (> 20 min) | Wake the Orchestrator: "Task [ID] appears stuck" |
| REVIEW task waiting | Wake the Orchestrator: "Task [ID] needs validation" |
| All agents working | `HEARTBEAT_OK` - no wake |

### Why This Matters

**Without this design:**
- The Orchestrator wakes every 2 minutes (cloud model)
- Burns cloud tokens 24/7
- ~720 wakes/day × token cost = $$$$

**With this design:**
- Automation Agent monitors every 2 minutes (local = free)
- The Orchestrator only wakes when there's actual work
- Maybe 10-20 wakes/day × token cost = $

### Implementation

**Cron Job:** `Mission Control Monitor`
- **Schedule:** Every 2 minutes
- **Model:** Local
- **Action:** Detect only, report to the Orchestrator
- **Delivery:** Announce when the Orchestrator needs to wake

**Critical Rules:**
3. Aiden ONLY detects and reports
4. The Orchestrator ONLY wakes when Aiden finds work

### Anti-Pattern: Cloud Monitoring

❌ **DON'T DO THIS:**
```json
{
  "name": "Orchestrator Monitor",
  "schedule": "every 5 min",
  "model": "gpt-4o",  // CLOUD - burns tokens!
  "action": "Check tasks and orchestrate"
}
```

✅ **DO THIS:**
```json
{
  "name": "Aiden Mission Control Monitor",
  "schedule": "every 2 min",
  "model": "ollama/qwen3.5:35b-a3b",  // LOCAL - free!
  "action": "Detect problems, wake the Orchestrator if needed"
}
```

---

**Last Updated:** 2026-03-18
**Version:** 2.3
**Maintainer:** The Orchestrator
**Changes:** Added task-specific step customization via PATCH API and "Isolated Scope" protocol for agent handoffs.
**See Also:** [TASK_WORKFLOW_STEPS.md](./TASK_WORKFLOW_STEPS.md) for detailed step API.
