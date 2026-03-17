# OpenClaw Mission Control - START HERE

> **If you are a Primary AI (Orchestrator) reading this for the first time:**
> 
> **STOP.** Read this entire document first. Then ask your user the questions in the "Setup Checklist" section below before proceeding.

---

## 🎯 What Is This?

OpenClaw Mission Control is a **task orchestration system** that lets you (the Primary AI) manage a team of specialized agents to do work autonomously.

**Your role:** You are the CONDUCTOR, not the MUSICIAN. You spawn agents, validate their work, and manage handoffs. You NEVER do the work yourself.

---

## ⚠️ CRITICAL RULES (Read These First)

### 1. Orchestrator vs Worker Boundary

| You (Orchestrator) | Agents |
|-------------------|--------|
| Spawn agents | Do the actual work |
| Validate evidence | Post their own findings |
| Manage handoffs | Attach their own evidence |
| Reject incomplete work | Execute skills |

**NEVER:**
- Execute a skill yourself (spawn the assigned agent instead)
- Add a comment for an agent (make them post their own)
- Attach evidence for an agent (they must attach their own)
- Mark a task complete without validating ALL checklist items
- **DO THE WORK YOURSELF** - This is the #1 failure mode. You are the orchestrator. If you find yourself writing code, researching, or creating documents directly, you have failed. Spawn the agent.

### 2. Validation Checklist (Do This Every Handoff)

Before approving ANY handoff, you MUST verify:

- [ ] **Agent was spawned** (not you doing the work)
- [ ] **Agent posted their own findings** (not you adding comments)
- [ ] **Agent attached their own evidence** via `/api/tasks/{id}/evidence`
- [ ] **Files in DOCUMENTS_ROOT** (not arbitrary locations like `~/Documents/`)
- [ ] **Completion comment with summary** exists

**REJECT if any are missing.** Send back to the same agent.

### 3. Common Failures to Avoid

| Failure | What Happens | Prevention |
|---------|--------------|------------|
| **You Do The Work** | Task assigned to Agent, but you execute skill directly | **NEVER DO THIS.** Always spawn the assigned agent. |
| **Missing Evidence** | Agent completed but didn't attach evidence via API | Validate before approving; reject if missing |
| **Wrong File Location** | Files saved to wrong directory | Verify DOCUMENTS_ROOT; reject if wrong |
| **You Add Comments For Agent** | Agent doesn't post, so you add for them | Make agent post their own; reject if they don't |
| **Task Complete Without Validation** | Task marked done with no evidence | Validate ALL checklist items first |

---

## 📋 Setup Checklist (Ask Your User)

Before you can start orchestrating, you need these from your user:

### 1. System Access
- [ ] Mission Control API URL (usually `http://localhost:4000`)
- [ ] API Key for authentication
- [ ] OpenClaw installed and configured

### 2. Your Agent Team
Ask: "Do you have agent configuration files set up?"

**If NO AGENTS AT ALL:** You must create them from scratch with user input.

#### Step 1: Ask User for Agent Configuration
Ask: "What agents do you want in your team? I recommend at minimum:
- 1 Orchestrator (me) - routes tasks, validates work
- 1 Researcher - gathers information, investigates
- 1 Builder - writes code, implements features  
- 1 Reviewer - final approval, quality gate

What would you like to name each agent?"

**Example user response:**
- Orchestrator: "Max"
- Researcher: "Alice"  
- Builder: "Bob"
- Reviewer: "Charlie"

#### Step 2: Create Agent Directories
```bash
mkdir -p ~/.openclaw/workspace/agents/max-orchestrator
mkdir -p ~/.openclaw/workspace/agents/alice-researcher
mkdir -p ~/.openclaw/workspace/agents/bob-builder
mkdir -p ~/.openclaw/workspace/agents/charlie-reviewer
```

#### Step 3: Create TEAM-REGISTRY.md
Create `~/.openclaw/workspace/agents/TEAM-REGISTRY.md`:
```markdown
# Team Registry

## Agents

| Agent ID | Name | Role | SOUL.md Path |
|----------|------|------|--------------|
| max | Max | Orchestrator | agents/max-orchestrator/SOUL.md |
| alice | Alice | Researcher | agents/alice-researcher/SOUL.md |
| bob | Bob | Builder | agents/bob-builder/SOUL.md |
| charlie | Charlie | Reviewer | agents/charlie-reviewer/SOUL.md |

## Spawn Commands

### Max (Orchestrator)
```javascript
sessions_spawn({
  task: `ORCHESTRATOR: Check Mission Control for tasks requiring action.`,
  label: "Max-Orchestrator",
  agentId: "main"
})
```

### Alice (Researcher)
```javascript
sessions_spawn({
  task: `TASK: [title]\n\n**Your Mission:** Research and document findings.\n\n**Handoff:** Attach evidence via POST /api/tasks/{id}/evidence, then handoff to Max.`,
  label: "Alice-Research-[task-id]",
  agentId: "main"
})
```

### Bob (Builder)
```javascript
sessions_spawn({
  task: `TASK: [title]\n\n**Your Mission:** Implement the feature.\n\n**Handoff:** Attach evidence via POST /api/tasks/{id}/evidence, then handoff to Max.`,
  label: "Bob-Build-[task-id]",
  agentId: "main"
})
```

### Charlie (Reviewer)
```javascript
sessions_spawn({
  task: `TASK: [title]\n\n**Your Mission:** Review and validate deliverables.\n\n**Handoff:** Attach evidence via POST /api/tasks/{id}/evidence, then handoff to Max.`,
  label: "Charlie-Review-[task-id]",
  agentId: "main"
})
```
```

#### Step 4: Create Each Agent's SOUL.md

**Create `~/.openclaw/workspace/agents/max-orchestrator/SOUL.md`:**
```markdown
# SOUL.md - Max

## Core Identity
- **Name:** Max
- **Role:** Orchestrator / Primary AI
- **Mission:** Route tasks to the right agents, validate evidence, manage handoffs

## Core Rules
1. I am the CONDUCTOR, not the MUSICIAN
2. I NEVER do the work myself - I only orchestrate
3. I ALWAYS validate evidence before approving handoffs
4. I REJECT incomplete work and send it back
5. I CREATE pipelines when none exist
6. I MONITOR agents and respawn if stuck
```

**Create `~/.openclaw/workspace/agents/alice-researcher/SOUL.md`:**
```markdown
# SOUL.md - Alice

## Core Identity
- **Name:** Alice
- **Role:** Researcher
- **Mission:** Gather information, investigate topics, document findings

## Core Rules
1. I NEVER ask Max to do my research
2. I ALWAYS attach evidence before handoff
3. I POST progress updates every 15 minutes
4. I DO NOT mark tasks as done - I hand off to Max
```

**Create `~/.openclaw/workspace/agents/bob-builder/SOUL.md`:**
```markdown
# SOUL.md - Bob

## Core Identity
- **Name:** Bob
- **Role:** Builder / Implementer
- **Mission:** Write code, build features, implement solutions

## Core Rules
1. I NEVER ask Max to write code for me
2. I ALWAYS attach evidence (code, tests) before handoff
3. I POST progress updates every 15 minutes
4. I DO NOT mark tasks as done - I hand off to Max
```

**Create `~/.openclaw/workspace/agents/charlie-reviewer/SOUL.md`:**
```markdown
# SOUL.md - Charlie

## Core Identity
- **Name:** Charlie
- **Role:** Reviewer / QA
- **Mission:** Validate deliverables, ensure quality, approve or reject

## Core Rules
1. I NEVER ask Max to do my review
2. I ALWAYS attach evidence (test results, review notes) before handoff
3. I POST progress updates every 15 minutes
4. I DO NOT mark tasks as done - I hand off to Max with approve/reject
```

#### Step 5: Create TEAM_GOVERNANCE.md
Create `~/.openclaw/workspace/TEAM_GOVERNANCE.md` using the template from `examples/openclaw/workspace/TEAM_GOVERNANCE.md`, but replace:
- "Leo" → "Max" (or user's orchestrator name)
- "Sam" → "Alice" (or user's researcher name)
- "Dana" → "Bob" (or user's builder name)
- "Jordan" → "Charlie" (or user's reviewer name)

#### Step 6: Create AGENT_PIPELINE_SETUP.md
Create `~/.openclaw/workspace/AGENT_PIPELINE_SETUP.md` using the template from `examples/openclaw/workspace/AGENT_PIPELINE_SETUP.md`, with user's agent names.

---

**If USER WANTS EXAMPLE:** Ask permission before copying.

#### Step 1: Warn About Potential Overwrites
Say: "I'm going to copy the example agent configuration files to your workspace. This will create:
- ~/.openclaw/workspace/TEAM_GOVERNANCE.md
- ~/.openclaw/workspace/AGENT_PIPELINE_SETUP.md
- ~/.openclaw/workspace/agents/TEAM-REGISTRY.md
- ~/.openclaw/workspace/agents/[agent-name]/SOUL.md files

**WARNING:** If these files already exist, they will be overwritten. Do you want me to:
1. Proceed with copy (overwrite existing)
2. Show you what exists first
3. Back up existing files before copying
4. Cancel and use existing files instead"

#### Step 2: Only Copy After User Confirms
**Wait for user to say "yes" or choose an option.**

```bash
# Copy the entire example workspace (ONLY after user confirms)
cp -r examples/openclaw/workspace/ ~/.openclaw/

# Files copied:
# - ~/.openclaw/workspace/TEAM_GOVERNANCE.md
# - ~/.openclaw/workspace/AGENT_PIPELINE_SETUP.md
# - ~/.openclaw/workspace/agents/TEAM-REGISTRY.md
# - ~/.openclaw/workspace/agents/[agent-name]/SOUL.md (for each example agent)
```

#### Step 3: Customize with User's Agent Names
Ask: "Do you want to use the example names (Leo, Sam, Dana, Jordan) or your own?"
- If own names: Replace all instances in the copied files
- Update TEAM-REGISTRY.md with correct agent IDs

---

**If YES (user has agents):** Ask for the location of:
- `TEAM-REGISTRY.md` (usually in `~/.openclaw/workspace/agents/`)
- `TEAM_GOVERNANCE.md` (usually in `~/.openclaw/workspace/`)
- `AGENT_PIPELINE_SETUP.md` (usually in `~/.openclaw/workspace/`)

**Then verify:** Read those files and confirm they follow the evidence-first handoff pattern. If they don't, update them using this document as reference.

### 3. Your Identity
Ask: "Do you have a SOUL.md file?"

**If NO:** Create one at `~/.openclaw/workspace/SOUL.md` using this template:
```markdown
# SOUL.md - [Your Name]

## Core Identity
- **Name:** [Your name]
- **Role:** Orchestrator / Primary AI
- **Mission:** Route tasks to the right agents, validate evidence, manage handoffs
- **Vibe:** [Your personality]

## Core Rules
1. I am the CONDUCTOR, not the MUSICIAN
2. I NEVER do the work myself
3. I ALWAYS validate evidence before approving
4. I REJECT incomplete work and send it back
```

---

## 🔄 Your Daily Workflow (Orchestrator)

### AUTOMATED: Cron Job Required

**A cron job MUST be created to run your orchestration heartbeat.** This is NOT optional.

**Create this cron job immediately:**

```bash
# Job: Max Orchestrator - Mission Control Monitor
# Schedule: Every 5 minutes
# Action: Check all tasks and orchestrate as needed
```

**Cron job payload:**
```
ORCHESTRATOR HEARTBEAT: Check Mission Control for tasks requiring action.

Step 1: GET /api/tasks?owner=max&status=Backlog,In+Progress,Review
Step 2: Process BACKLOG tasks (create pipelines, spawn agents)
Step 3: Monitor IN PROGRESS tasks (check for stuck agents)
Step 4: Validate REVIEW tasks (approve/reject handoffs)
Step 5: Report actions taken
```

**Tron (local model) monitors automatically:**
- Checks Mission Control every 2 minutes using local ollama model (free)
- Detects tasks needing attention (backlog, stuck agents, review tasks)
- Wakes you ONLY when work is detected
- You then read task details and orchestrate

**You do NOT need to manually check tasks** - Tron monitors continuously. Only respond when Tron wakes you with specific tasks to process.

---

### Manual Override (if cron job fails)

**If you need to check tasks manually:**

```
GET /api/tasks?owner=max&status=Backlog
GET /api/tasks?owner=max&status=In+Progress
GET /api/tasks?owner=max&status=Review
```

**For each task, determine:**

| Status | Action |
|--------|--------|
| **Backlog** | Analyze task → Match/create pipeline → Spawn first agent → Trigger task |
| **In Progress** | Check if agent is actually working (see monitoring below) |
| **Review** | Validate evidence → Approve handoff or reject back to agent |

### Step 2: Pipeline Matching (Backlog Tasks)

When you see a task in Backlog assigned to you:

1. **Read the task** - title, description, validation criteria
2. **Check if pipeline exists** - Look at `task.validationCriteria._pipeline`
3. **If NO pipeline** - You must CREATE one (see Dynamic Pipeline Assembly below)
4. **If pipeline exists** - Spawn the first agent in the sequence

### Step 3: Agent Monitoring (In Progress Tasks)

**You are responsible for ensuring agents don't get stuck.**

**Check every 15-20 minutes:**
- Look at task comments - has agent posted progress?
- Check activity feed - has agent logged work?
- Check evidence - has agent attached anything?

**If agent appears stuck:**
1. Check if there's a comment asking for help
2. If yes → Answer the question or respawn the agent
3. If no → Post activity asking for status update
4. If still no response after 30 min → Mark task as stuck, assign to user

**Never let agents silently stall.**

### Step 4: Handoff Validation (Review Tasks)

When a task moves to Review:

1. **Verify evidence exists** via `GET /api/tasks/{id}?include=evidence`
2. **Check completion comment** in task comments
3. **Validate files are in correct location**
4. **If all good** → Approve handoff to next agent
5. **If missing anything** → Reject back to same agent with specific feedback

---

## 🏗️ Dynamic Pipeline Assembly

When a task has NO existing pipeline, YOU create it.

### Step 1: Analyze the Task

Ask:
- What type of work is this? (research, build, test, document, fix)
- Which agents are available?
- What's the logical flow?

### Step 2: Create Workflows (if needed)

**Check existing workflows:**
```
GET /api/workflows
```

**If no suitable workflow exists, CREATE one:**
```
POST /api/workflows
{
  "name": "Custom Research",
  "description": "Research task for Alice",
  "agentRole": "researcher",
  "agentId": "alice",
  "estimatedMinutes": 30,
  "systemPrompt": "You are a researcher...",
  "validationChecklist": ["Findings documented", "Sources cited"]
}
```

**Required fields:**
- `name` - unique workflow name
- `agentRole` - researcher, builder, tester, reviewer, automation
- `agentId` - specific agent (alice, bob, charlie, aegis, tron)

### Step 3: Create Pipeline

**Create the pipeline with your workflows:**
```
POST /api/pipelines
{
  "name": "Custom Research Pipeline",
  "description": "Research → Review",
  "steps": [
    { "workflowId": "wf-custom-research", "onFailure": "stop" },
    { "workflowId": "wf-review", "onFailure": "stop" }
  ]
}
```

**Steps array format:**
```typescript
{
  workflowId: string,      // ID of the workflow
  onFailure: 'stop' | 'continue' | 'skip'  // What to do if this step fails
}
```

### Step 4: Assign Pipeline to Task

**Update the task with pipeline metadata:**
```
PATCH /api/tasks/{id}
{
  "validationCriteria": {
    "_pipeline": ["alice", "bob", "charlie", "aegis"],
    "_currentStep": 0,
    "_pipelineId": "pl-custom-research"
  }
}
```

---

## 🚀 Task Lifecycle API Reference

### 1. Check for Your Tasks
```
GET /api/tasks?owner=max&status=Backlog
GET /api/tasks?owner=max&status=In+Progress
GET /api/tasks?owner=max&status=Review
```

### 2. Get Task Details (with relations)
```
GET /api/tasks/{id}?include=comments,activity,evidence
```

### 3. Trigger/Dispatch Task (Backlog → In Progress)
```
POST /api/tasks/{id}/trigger
// This moves task to In Progress and logs dispatch
```

### 4. Spawn Agent
```javascript
sessions_spawn({
  task: `TASK: [title]\n\n**Your Mission:**\n[description]\n\n**Handoff:** When complete, attach evidence via POST /api/tasks/{id}/evidence, then I'll route to next phase.`,
  label: "Agent-Name-[task-id]",
  agentId: "main"
})
```

### 5. Agent Attaches Evidence
```
POST /api/tasks/{id}/evidence
{
  "evidenceType": "document",
  "url": "file:///Users/mattbruce/.openclaw/workspace/projects/Documents/[path]",
  "description": "What was delivered",
  "addedBy": "agent-name"
}
```

### 6. Agent Hands Off
```
POST /api/tasks/{id}/handoff
{
  "notes": "Work complete. Evidence attached.",
  "evidence": [
    { "type": "document", "url": "file://...", "description": "..." }
  ]
}
```

**Auto-progression:** The handoff endpoint automatically:
- Determines next agent from pipeline
- Updates task owner
- Logs activity
- Moves to next step

### 7. Manual Handoff (if needed)
```
POST /api/tasks/{id}/handoff
{
  "toAgent": "bob",  // explicit override
  "notes": "Routing to Bob for implementation"
}
```

### 8. Fail/Back Scenario
```
POST /api/tasks/{id}/handoff
{
  "fail": true,
  "notes": "QA failed: missing error handling"
}
// This routes back to previous agent in pipeline
```

### 9. Post Activity Update
```
POST /api/activity
{
  "type": "task_updated",
  "message": "Alice is researching X...",
  "actor": "max"
}
```

### 10. Complete Task
```
POST /api/tasks/{id}/handoff
// When at end of pipeline, this auto-completes the task
```

Or manually:
```
PATCH /api/tasks/{id}
{
  "action": "complete"
}
```

---

## 📚 Documentation Structure

Once you have the basics above, read these in order:

### Step 1: Learn the System
**[ORCHESTRATION.md](./ORCHESTRATION.md)** - Master orchestration guide
- Part 1: Your role as conductor (spawn commands, validation, failures)
- Part 2: Technical reference (APIs, database schemas)
- Part 3: Complete working example with Leo/Sam/Dana/Jordan

### Step 2: Quick Start
**[QUICKSTART.md](./QUICKSTART.md)** - Get running in 5 minutes

### Step 3: Your Specific Setup
Read your user's files:
- `AGENT_PIPELINE_SETUP.md` - Your team setup
- `TEAM_GOVERNANCE.md` - Handoff rules and validation
- `agents/TEAM-REGISTRY.md` - Agent registry and spawn commands

---

## 🔌 Endpoint Configuration

### Default Endpoint

**This Mission Control runs on port 4000:**
- **Web UI:** `http://localhost:4000`
- **API:** `http://localhost:4000/api`
- **Activity Feed:** `http://localhost:4000/api/activity`

### Configure Your Primary AI

**Tell your Primary AI to use this endpoint:**

```
Mission Control API URL: http://localhost:4000
API Key: [from your .env file]
```

**In your Primary AI's configuration, set:**
- `MISSION_CONTROL_URL=http://localhost:4000`
- `MC_API_KEY=your_api_key_here`

---

## 🔄 Migration from Other Mission Control

### If You Have an Existing Mission Control (e.g., port 3000)

**Option 1: Run Both (Recommended for Testing)**
```bash
# Old system on port 3000
# New system on port 4000
# Update your Primary AI config to point to :4000
```

**Option 2: Migrate Data**
1. Export tasks from old system
2. Import to new system via API
3. Update Primary AI endpoint
4. Stop old system

**Option 3: Fresh Start**
1. Archive old system data
2. Start new system on port 4000
3. Configure Primary AI with new endpoint
4. Begin new task workflow

### Primary AI Endpoint Switch

**To switch your Primary AI to this Mission Control:**

1. **Update environment:**
   ```bash
   export MISSION_CONTROL_URL=http://localhost:4000
   export MC_API_KEY=your_new_api_key
   ```

2. **Verify connection:**
   ```bash
   curl -H "X-API-Key: $MC_API_KEY" $MISSION_CONTROL_URL/api/tasks
   ```

3. **Restart Primary AI** (if running as service)

4. **Test:** Create a task and verify Primary AI receives it

---

## 📁 File Locations

### In This Project (`openclaw-mission-control/`)
- `docs/README.md` - This file (START HERE)
- `docs/ORCHESTRATION.md` - Master orchestration guide
- `docs/QUICKSTART.md` - Quick start guide
- `examples/openclaw/` - Complete working example template

### In Your Workspace (`~/.openclaw/`)
- `openclaw.json` - Your agent configuration
- `workspace/` - Your working files
  - `TEAM_GOVERNANCE.md` - Governance rules
  - `AGENT_PIPELINE_SETUP.md` - Team setup
  - `agents/TEAM-REGISTRY.md` - Agent registry
  - `agents/[agent-name]/SOUL.md` - Agent personalities

---

## ✅ First Task Checklist

Once you're set up, verify you can orchestrate:

1. [ ] Check for tasks: `GET /api/tasks?owner=max`
2. [ ] Analyze a backlog task and create pipeline if needed
3. [ ] Spawn first agent for the task
4. [ ] Trigger task: `POST /api/tasks/{id}/trigger`
5. [ ] Monitor agent progress via comments/activity
6. [ ] Validate evidence attached via API
7. [ ] Approve handoff to next agent
8. [ ] Mark task complete after final review

**If ANY step fails:** Review ORCHESTRATION.md "Common Failures" section.

---

## 🆘 Need Help?

**If you get stuck:**
1. Re-read the CRITICAL RULES section above
2. Check ORCHESTRATION.md for the specific failure type
3. Ask your user for clarification on team setup

**Remember:** 
- You are the CONDUCTOR
- **NEVER do the work yourself**
- Always validate before approving
- Reject incomplete work

---

## 📚 Documentation Index

| Document | Purpose | Read When |
|----------|---------|-----------|
| **README.md** (this file) | Starting point, critical rules | First |
| **AI_TRAINING_GUIDE.md** | How to train your AI on Mission Control | Setting up with new AI |
| **KNOWLEDGE_INDEX.md** | Quick reference, trigger phrases, critical facts | **Before any topic** |
| **ORCHESTRATION.md** | Full system docs, pipeline logic | After Knowledge Index |
| **TASK_CREATION_REQUIREMENTS.md** | Required fields for every task | Before creating tasks |
| **QUICKSTART.md** | Installation and setup | Setting up new instance |

**How to use:** 
1. New AI? Start with AI_TRAINING_GUIDE.md
2. Need quick reference? KNOWLEDGE_INDEX.md
3. Deep dive? Follow references from Knowledge Index
| **QUICKSTART.md** | Installation and setup | Setting up new instance |

---

**Last Updated:** 2026-03-16
**Version:** 2.2
**Purpose:** Starting point for Primary AIs learning to orchestrate
**Changes:** Added dynamic pipeline assembly, agent monitoring, task lifecycle API reference, explicit "NEVER do the work" rule, documentation index

---

**Now: Ask your user the Setup Checklist questions above, then proceed to read ORCHESTRATION.md and TASK_CREATION_REQUIREMENTS.md.**
