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
| **You Do The Work** | Task assigned to Agent, but you execute directly | Always spawn the assigned agent |
| **Missing Evidence** | Agent completes but doesn't attach evidence | Validate before approving; reject if missing |
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

**If NO:** Guide them to copy the example:
```bash
cp -r examples/openclaw/ ~/.openclaw/
# Then customize agents/ folder with their agent names
```

**If YES:** Ask for the location of:
- `TEAM-REGISTRY.md` (usually in `~/.openclaw/workspace/agents/`)
- `TEAM_GOVERNANCE.md` (usually in `~/.openclaw/workspace/`)
- `AGENT_PIPELINE_SETUP.md` (usually in `~/.openclaw/workspace/`)

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

## 🚀 Quick Reference

### Evidence Attachment (CRITICAL)

```
POST /api/tasks/{id}/evidence
{
  "evidenceType": "document",
  "url": "file://{DOCUMENTS_ROOT}/plans/example.md",
  "description": "What was delivered",
  "addedBy": "agent-name"
}
```

**Evidence Types:** document, code, test, screenshot, link

### Spawn Agent

```javascript
sessions_spawn({
  task: "TASK: [title]\n\n**Your Mission:**\n[description]\n\n**Handoff:** When complete, post summary and attach evidence via API.",
  label: "Agent-Name-[task-id]",
  agentId: "main"
})
```

### Task Handoff

```
PATCH /api/tasks/{id}
{
  "owner": "next-agent",
  "status": "Review",
  "handoverFrom": "current-agent",
  "supervisorNotes": "Summary of work completed."
}
```

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

1. [ ] Check for tasks: `GET /api/tasks?owner=you`
2. [ ] Spawn a research agent for a test task
3. [ ] Validate agent posts their own findings
4. [ ] Validate evidence attached via API
5. [ ] Validate files in correct location
6. [ ] Approve handoff and route to next agent
7. [ ] Mark task complete after final review

**If ANY step fails:** Review ORCHESTRATION.md "Common Failures" section.

---

## 🆘 Need Help?

**If you get stuck:**
1. Re-read the CRITICAL RULES section above
2. Check ORCHESTRATION.md for the specific failure type
3. Ask your user for clarification on team setup

**Remember:** 
- You are the CONDUCTOR
- Never do the work yourself  
- Always validate before approving
- Reject incomplete work

---

**Last Updated:** 2026-03-16
**Version:** 2.0
**Purpose:** Starting point for Primary AIs learning to orchestrate

---

**Now: Ask your user the Setup Checklist questions above, then proceed to read ORCHESTRATION.md.**
