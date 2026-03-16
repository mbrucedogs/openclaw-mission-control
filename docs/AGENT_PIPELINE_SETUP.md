# OpenClaw Multi-Agent Pipeline Setup Guide

This document explains the orchestrated multi-agent workflow for OpenClaw. Follow these steps to replicate this setup in your own OpenClaw instance.

---

## Overview

This is an **orchestrated pipeline** where multiple specialized agents work together to process tasks from a central task board (Mission Control). The system automatically:

- Monitors for new tasks every 2 minutes
- Routes work to the appropriate agent based on task type and status
- Tracks progress through the pipeline
- Ensures quality gates are passed before completion

---

## Agent Roles

### Max (Orchestrator)
**Role:** Conductor, not musician. Routes tasks, manages the pipeline, ensures nothing gets stuck.

**Responsibilities:**
- Monitors Mission Control task board via cron job every 2 minutes
- Spawns appropriate subagents when work is detected
- Tracks task flow through the pipeline
- Intervenes when tasks are blocked or stuck
- Creates tasks using proper contract format

**Never does:** Direct implementation work. Always delegates.

---

### Alice (Researcher)
**Role:** Gathers information, analyzes requirements, documents findings.

**Queue:** `owner=alice`, `status=In Progress`

**Typical Tasks:**
- Research topics
- Analyze feasibility
- Document blockers or capability gaps
- Create evidence files for downstream agents

**Handoff:** Completes research → hands to Bob

---

### Bob (Implementer)
**Role:** Does the actual work. Codes, builds, creates, executes.

**Queue:** `owner=bob`, `status=In Progress`

**Typical Tasks:**
- Write code
- Build features
- Execute plans
- Create deliverables

**Handoff:** Completes implementation → hands to Charlie

---

### Charlie (QA/Tester)
**Role:** Validates work, runs tests, checks quality gates.

**Queue:** `owner=charlie`, `status=Review`

**Typical Tasks:**
- Review implementation
- Run test suites
- Verify acceptance criteria
- Document QA findings

**Handoff:** Passes QA → hands to Aegis
**Handoff:** Fails QA → returns to Bob

---

### Aegis (Final Review)
**Role:** Final approval, merge decisions, completion sign-off.

**Queue:** `owner=aegis`, `status=Review`

**Typical Tasks:**
- Final review of evidence
- Approve task completion
- Mark tasks as Complete
- Document final notes

**Handoff:** Approves → marks Complete

---

## Task Lifecycle

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Backlog   │────▶│    Alice    │────▶│     Bob     │────▶│   Charlie   │────▶│    Aegis    │
│  (Created)  │     │  (Research) │     │(Implement)  │     │   (QA/Review)│    │(Final Review)│
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
                                                                                          │
                                                                                          ▼
                                                                                   ┌─────────────┐
                                                                                   │   Complete  │
                                                                                   └─────────────┘
```

### Status Flow
1. **Backlog** → Task created, not yet assigned
2. **In Progress** → Alice or Bob actively working
3. **Review** → Charlie or Aegis validating
4. **Complete** → Aegis approved, done

---

## Task Contract Format

All tasks MUST follow this structure:

```markdown
## Type
[Research | Implementation | QA Review | Final Review]

## Required Outcome
[Clear statement of what "done" looks like]

## Checklist
- [ ] Step 1
- [ ] Step 2
- [ ] Step 3

## Code Requirements
- [ ] Requirement 1
- [ ] Requirement 2

## Verification
[How to verify the task is complete]

## Done Means
[Specific, measurable definition of completion]
```

---

## Setup Instructions

### Step 1: Create the Dispatcher Cron Job

Add this cron job to check for tasks every 2 minutes:

```bash
openclaw cron add \
  --name "Pipeline Dispatcher" \
  --every 120000 \
  --isolated \
  --model "ollama/qwen3.5:35b-a3b" \
  --message "DISPATCHER: Check Mission Control for tasks.

Run these exact commands:
1. curl -s 'http://localhost:4000/api/tasks?owner=alice&status=In%20Progress' | jq '. | length'
2. curl -s 'http://localhost:4000/api/tasks?owner=bob&status=In%20Progress' | jq '. | length'
3. curl -s 'http://localhost:4000/api/tasks?owner=charlie&status=Review' | jq '. | length'
4. curl -s 'http://localhost:4000/api/tasks?owner=aegis&status=Review' | jq '. | length'

If any return >0, spawn that agent with sessions_spawn runtime='subagent'.
Reply HEARTBEAT_OK if all are 0."
```

### Step 2: Configure Mission Control API

Ensure your OpenClaw instance can reach:
- `http://localhost:4000/api/tasks`

Set environment variables if authentication is required:
```bash
export MISSION_CONTROL_API_KEY="your-key"
export MISSION_CONTROL_URL="http://localhost:4000"
```

### Step 3: Create Agent Skills (Optional)

For each agent role, create a skill file at `~/.agents/skills/`:

**alice-researcher/SKILL.md:**
```markdown
# Alice Researcher

## Role
Research tasks, analyze requirements, document findings.

## When to Use
- Task owner is "alice"
- Task status is "In Progress"
- Task type is "Research"

## Workflow
1. Read task description
2. Research the topic
3. Document findings in evidence file
4. Update task status to "Review"
5. Hand off to Charlie (QA)
```

**bob-implementer/SKILL.md:**
```markdown
# Bob Implementer

## Role
Execute implementation tasks, write code, build features.

## When to Use
- Task owner is "bob"
- Task status is "In Progress"
- Task type is "Implementation"

## Workflow
1. Read task requirements
2. Implement solution
3. Test implementation
4. Update task status to "Review"
5. Hand off to Charlie (QA)
```

**charlie-tester/SKILL.md:**
```markdown
# Charlie QA

## Role
Validate implementations, run tests, verify acceptance criteria.

## When to Use
- Task owner is "charlie"
- Task status is "Review"
- Task type is "QA Review"

## Workflow
1. Review evidence from Bob
2. Run verification steps
3. Document QA findings
4. If PASS: Update owner to "aegis", keep status "Review"
5. If FAIL: Return to Bob with notes
```

**aegis-reviewer/SKILL.md:**
```markdown
# Aegis Final Review

## Role
Final approval, merge decisions, completion sign-off.

## When to Use
- Task owner is "aegis"
- Task status is "Review"
- Task type is "Final Review"

## Workflow
1. Review all evidence
2. Verify QA passed
3. Make final decision
4. If APPROVE: Update status to "Complete"
5. If REJECT: Return to appropriate agent with notes
```

### Step 4: Test the Pipeline

Create a test task:

```bash
curl -X POST http://localhost:4000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Pipeline Task",
    "description": "Test the multi-agent pipeline",
    "owner": "alice",
    "status": "In Progress",
    "type": "Research"
  }'
```

Wait 2 minutes. The dispatcher should spawn Alice automatically.

---

## Task Handoff Protocol

When an agent completes work, they MUST:

1. **Update the task** via API:
   ```bash
   curl -X PATCH http://localhost:4000/api/tasks/<task-id> \
     -H "Content-Type: application/json" \
     -d '{"owner": "next-agent", "status": "next-status"}'
   ```

2. **Add handoff notes** in the task description or evidence field

3. **Create evidence file** if applicable (path referenced in task.evidence)

4. **Log activity** to Mission Control activity endpoint

---

## Monitoring

### Check Dispatcher Status
```bash
openclaw cron status
openclaw cron runs <dispatcher-job-id>
```

### Check Active Subagents
```bash
openclaw subagents list
```

### Check Task Board
```bash
curl -s http://localhost:4000/api/tasks | jq '.[] | {title, owner, status}'
```

---

## Troubleshooting

### Dispatcher Not Spawning Agents

**Symptom:** Tasks exist but no subagents spawn.

**Causes:**
1. Local model overthinking API calls (use cloud models)
2. API authentication issues
3. URL encoding problems

**Fix:**
- Switch to cloud model: `--model "openai-codex/gpt-5.2"`
- Verify API is accessible: `curl http://localhost:4000/api/tasks`
- Check auth tokens are configured

### Tasks Stuck in Review

**Symptom:** Task sits in Review status, no Aegis spawn.

**Causes:**
1. Charlie didn't properly hand off to Aegis
2. Evidence file missing
3. Task owner not updated

**Fix:**
- Manually update task: `curl -X PATCH ... {"owner": "aegis"}`
- Create missing evidence file
- Re-run dispatcher

### Subagent Failures

**Symptom:** Subagent spawns but fails immediately.

**Causes:**
1. Missing skills
2. Sandbox restrictions
3. Missing environment variables

**Fix:**
- Install required skills: `openclaw skills install <skill-name>`
- Check sandbox permissions
- Verify env vars are set

---

## Best Practices

1. **Always use task contracts** - Clear requirements prevent confusion
2. **Document evidence** - Every task should have traceable output
3. **Update status promptly** - Don't leave tasks in limbo
4. **Hand off explicitly** - Clear owner changes, clear notes
5. **Monitor the pipeline** - Check cron runs regularly
6. **Use cloud models for API work** - Local models struggle with complex API calls

---

## Example Task Flow

### Task: "Research YouTube Download Options"

**Created by:** User  
**Initial owner:** alice  
**Status:** In Progress

**Alice does:**
- Researches YouTube download methods
- Documents findings in `evidence/youtube-research.md`
- Updates task: owner → bob, status → In Progress

**Bob does:**
- Implements chosen solution
- Tests download functionality
- Updates task: owner → charlie, status → Review

**Charlie does:**
- Tests implementation
- Verifies download works
- Updates task: owner → aegis, status → Review

**Aegis does:**
- Reviews all evidence
- Approves completion
- Updates task: status → Complete

---

## Advanced Configuration

### Custom Agent Names

Edit the dispatcher cron job to use different agent names:

```bash
# Change these lines in the dispatcher message:
curl -s 'http://localhost:4000/api/tasks?owner=your-researcher&status=In%20Progress'
curl -s 'http://localhost:4000/api/tasks?owner=your-builder&status=In%20Progress'
```

### Different Check Intervals

Change from 2 minutes to 5 minutes:
```bash
openclaw cron update <job-id> --every 300000
```

### Add More Pipeline Stages

Add new agents by:
1. Creating a new skill file
2. Adding a new curl check to dispatcher
3. Adding spawn logic for the new agent
4. Updating handoff protocols

---

## Support

For issues with this workflow:
1. Check `openclaw logs --follow`
2. Verify Mission Control API is running
3. Ensure all skills are installed
4. Check cron job status: `openclaw cron status`

---

*Last updated: 2026-03-15*
*Version: 1.0*
