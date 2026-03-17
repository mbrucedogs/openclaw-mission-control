# Orchestration System Documentation

## Overview

The openclaw-mission-control orchestration system uses a **hybrid pipeline model** that combines:

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

### The Pipeline Flow (Example)

**This is an example using the fake agent names from `examples/openclaw/workspace/`. Your workspace will have similar files with your own agent names.**

```
User → You (Leo) → Sam (Researcher) → You → Dana (Builder) → You → Dana (Tester) → You → Jordan (Reviewer) → You → Done
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

### Spawn Commands (Example)

**These examples use the fake agent names from `examples/openclaw/workspace/`. Your workspace will have similar commands with your own agent names in your `agents/TEAM-REGISTRY.md`.**

#### Sam (Researcher)
```javascript
sessions_spawn({
  task: `TASK: [title]\n\nPipeline: [pipeline] - Step [N]/[total]\nCurrent Phase: Research\n\n**Your Mission:**\n[Research description]\n\n**Deliverables:**\n1. [Finding 1]\n2. [Finding 2]\n\n**Handoff:** When complete, post findings as comment, attach evidence via API, and I'll route to next phase.\n\n**Questions?** Ask Leo - monitoring this task.\n\nRead your SOUL.md at: agents/sam-scout/SOUL.md`,
  label: "Sam-Research-[task-id]",
  agentId: "main"
})
```

#### Dana (Builder)
```javascript
sessions_spawn({
  task: `TASK: [title]\n\nPipeline: [pipeline] - Step [N]/[total]\nCurrent Phase: Build\n\n**Your Mission:**\n[Implementation description]\n\n**Requirements:**\n- [ ] Req 1\n- [ ] Req 2\n\n**Handoff:** When complete, post summary, attach evidence via API, and I'll validate.\n\n**Questions?** Ask Leo.\n\nRead your SOUL.md at: agents/dana-dev/SOUL.md`,
  label: "Dana-Build-[task-id]",
  agentId: "main"
})
```

#### Dana (Tester)
```javascript
sessions_spawn({
  task: `TASK: [title]\n\nPipeline: [pipeline] - Step [N]/[total]\nCurrent Phase: Test\n\n**Your Mission:**\n[Testing description]\n\n**Requirements:**\n- [ ] Test 1\n- [ ] Test 2\n\n**Handoff:** Post test results, attach evidence, and I'll review.\n\nRead your SOUL.md at: agents/dana-dev/SOUL.md`,
  label: "Dana-Test-[task-id]",
  agentId: "main"
})
```

#### Jordan (Reviewer)
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
- `wf-research` - Sam investigates and documents
- `wf-build` - Dana implements code/features
- `wf-quick-fix` - Dana fixes bugs quickly
- `wf-test` - Dana runs QA
- `wf-review` - Jordan approves/rejects
- `wf-document` - Sam writes documentation
- `wf-automate` - Taylor creates automation

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

## Part 3: Complete Working Example

**See `examples/openclaw/workspace/` for a complete, working example you can copy and customize.**

This example uses fake agent names (Leo, Sam, Dana, Jordan) to demonstrate the structure. When you set up your own workspace, you'll create similar files with your own agent names.

### Example Team Structure (from examples/openclaw/workspace/)

| Agent | Role | Responsibilities |
|-------|------|------------------|
| **Leo** | Orchestrator | Routes tasks, validates work, manages handoffs |
| **Sam** | Researcher | Information gathering, analysis, investigation |
| **Dana** | Builder | Code implementation, feature development |
| **Jordan** | Reviewer | Final approval, quality gate |

### Example Workflow

```
User → Leo → Sam (Research) → Leo → Dana (Build) → Leo → Dana (Test) → Leo → Jordan (Review) → Leo → Done
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

## Part 4: Fresh Install & Dynamic Workflow Creation

### The Problem: Fresh Install State

On a fresh install of Mission Control:
- Database tables exist but are **EMPTY**
- No workflows created yet
- No pipelines created yet
- **I don't know what agents exist** (Alice? Bob? Sam? Dana?)

### The Solution: Runtime Workflow Creation

**I create workflows dynamically when the first task arrives**, because by then:
1. The user has configured agents in `openclaw.json`
2. Agent directories exist with SOUL.md files
3. I can inspect the team and create appropriate workflows

### The Process

```
First task arrives in Backlog
  ↓
Max wakes up (cloud model)
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
// Find: alice, bob, charlie, aegis, etc.
```

**Step 2: Create Workflows** (POST /api/workflows)
| Workflow | Agent Role | Purpose |
|------------|------------|---------|
| `wf-research` | Alice (or whoever does research) | Investigation, analysis |
| `wf-build` | Bob (or whoever builds) | Implementation, coding |
| `wf-quick-fix` | Bob | Quick bug fixes |
| `wf-test` | Charlie (or whoever tests) | QA, validation |
| `wf-review` | Aegis (or whoever reviews) | Final approval |
| `wf-document` | Alice | Documentation writing |
| `wf-automate` | Tron | Automation scripts |

**Step 3: Create Pipelines** (POST /api/pipelines)
| Pipeline | Steps | Use When |
|------------|-------|----------|
| `pl-standard` | Research → Build → Test → Review | Full feature development |
| `pl-quick-fix` | Quick Fix → Review | Bug fixes |
| `pl-research` | Research → Review | Investigation only |
| `pl-docs` | Document → Review | Documentation tasks |
| `pl-automate` | Automate → Review | Scripts, cron jobs |

**Step 4: Match Task**
Now use `matchPipelineToTask()` with actual existing pipelines.

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
| **Monitor** | Tron | Local (ollama/qwen3.5:35b-a3b) | **FREE** | Detect problems only |
| **Orchestrator** | Max | Cloud (when needed) | Per-use | Solve problems, route tasks |

### How It Works

```
Tron (every 2 min, local model)
  ↓
Checks Mission Control API
  ↓
All agents working? → HEARTBEAT_OK (done, no cloud cost)
Needs attention? → Wake Max
  ↓
Max (cloud model, only when needed)
  ↓
Routes/validates/orchestrates
```

### What Tron Checks

1. **Query tasks:** Backlog, In Progress, Review
2. **Check agent activity:** Last comment/activity < 20 min?
3. **Detect stuck tasks:** > 30 min no activity?
4. **Decision:** Wake Max only if work needed

### Tron's Detection Rules

| Condition | Action |
|-----------|--------|
| BACKLOG task with no owner | Wake Max: "Task TASK-XXX needs routing" |
| IN_PROGRESS but agent inactive (> 20 min) | Wake Max: "Task TASK-XXX assigned to Alice appears stuck" |
| REVIEW task waiting | Wake Max: "Task TASK-XXX needs validation" |
| All agents working | `HEARTBEAT_OK` - no wake |

### Why This Matters

**Without this design:**
- Max wakes every 5 minutes
- Burns cloud tokens 24/7
- ~288 wakes/day × token cost = $$$$

**With this design:**
- Tron monitors every 2 minutes (local = free)
- Max only wakes when there's actual work
- Maybe 10-20 wakes/day × token cost = $

### Implementation

**Cron Job:** `Tron Mission Control Monitor`
- **Schedule:** Every 2 minutes
- **Model:** `ollama/qwen3.5:35b-a3b` (local)
- **Action:** Detect only, report to Max
- **Delivery:** Announce to webchat when Max needs to wake

**Critical Rules:**
1. Tron NEVER spawns agents
2. Tron NEVER does the work
3. Tron ONLY detects and reports
4. Max ONLY wakes when Tron finds work

### Anti-Pattern: Cloud Monitoring

❌ **DON'T DO THIS:**
```json
{
  "name": "Max Orchestrator Monitor",
  "schedule": "every 5 min",
  "model": "gpt-4o",  // CLOUD - burns tokens!
  "action": "Check tasks and orchestrate"
}
```

✅ **DO THIS:**
```json
{
  "name": "Tron Mission Control Monitor",
  "schedule": "every 2 min",
  "model": "ollama/qwen3.5:35b-a3b",  // LOCAL - free!
  "action": "Detect problems, wake Max if needed"
}
```

---

**Last Updated:** 2026-03-16
**Version:** 2.2
**Maintainer:** the Primary AI (Primary AI Orchestrator)
**Changes:** Added Part 4 - Fresh Install workflow, Part 5 - Automated Monitoring. Clarified dynamic workflow creation based on runtime agent discovery.
**See Also:** [examples/openclaw/workspace/](../examples/openclaw/workspace/) - Complete working example with Leo/Sam/Dana/Jordan
