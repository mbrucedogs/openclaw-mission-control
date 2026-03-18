# Knowledge Index

**Single source of truth for Mission Control concepts**

**When you ask about these topics, the Orchestrator reads the referenced documents.**

---

## Quick Reference

| Concept | One-Sentence Summary | Full Docs |
|---------|---------------------|-----------|
| **Task Orchestration** | Multi-agent pipeline where tasks flow through specialized agents | [ORCHESTRATION.md](./ORCHESTRATION.md) |
| **Workflow Execution** | Complete step-by-step guide for executing multi-step pipelines | [WORKFLOW_EXECUTION_GUIDE.md](./WORKFLOW_EXECUTION_GUIDE.md) |
| **Pipeline Protocol** | 5-phase mandatory workflow: Route → Monitor → Validate → Complete → Report | [PIPELINE_PROTOCOL.md](./PIPELINE_PROTOCOL.md) |
| **Task Creation** | Required fields and template for creating tasks that succeed | [TASK_CREATION_REQUIREMENTS.md](./TASK_CREATION_REQUIREMENTS.md) |
| **Task Workflow Steps** | Automatic step tracking per pipeline with evidence requirements | [TASK_WORKFLOW_STEPS.md](./TASK_WORKFLOW_STEPS.md) |
| **Dynamic Workflows** | Rules for creating workflows/pipelines with API validation | [DYNAMIC_WORKFLOW_RULES.md](./DYNAMIC_WORKFLOW_RULES.md) |
| **Fresh Install** | Database starts empty, workflows created dynamically at runtime | [ORCHESTRATION.md#part-4](./ORCHESTRATION.md) |
| **Agent Pipeline** | Researcher → Builder → Tester → Reviewer workflow sequence | [ORCHESTRATION.md](./ORCHESTRATION.md) |
| **Monitoring** | Automation Agent detects issues, wakes Orchestrator only when needed | [ORCHESTRATION.md#part-5](./ORCHESTRATION.md) |
| **Setup** | Installation and configuration steps | [QUICKSTART.md](./QUICKSTART.md) |

---

## Trigger Phrases

**Say these to load full knowledge:**

### Task Orchestration
- "task orchestration"
- "task pipeline"
- "how does orchestration work"
- "create a task"
- "mission control task"
- "agent pipeline"
- "workflow pipeline"

**Loads:** ORCHESTRATION.md, PIPELINE_PROTOCOL.md, TASK_CREATION_REQUIREMENTS.md

### Task Workflow Steps
- "task workflow steps"
- "pipeline steps"
- "step tracking"
- "step evidence"
- "task completion blocker"
- "step status"

**Loads:** TASK_WORKFLOW_STEPS.md, TASK_CREATION_REQUIREMENTS.md

### Pipeline Protocol
- "5 phase protocol"
- "pipeline protocol"
- "orchestration protocol"
- "how to complete tasks"
- "spawned vs done"
- "task completion"

**Loads:** PIPELINE_PROTOCOL.md

### Task Requirements
- "how to create tasks"
- "task requirements"
- "what does a task need"
- "task template"
- "required fields"

**Loads:** TASK_CREATION_REQUIREMENTS.md

### Fresh Install / Setup
- "mission control setup"
- "fresh install"
- "how to set up"
- "getting started"
- "installation"

**Loads:** QUICKSTART.md, ORCHESTRATION.md#part-4

### Monitoring / Automation
- "how does monitoring work"
- "automated monitoring"
- "cron job"
- "local model monitoring"

**Loads:** ORCHESTRATION.md#part-5

---

## Critical Facts (Always Know These)

### Workflows & Pipelines
- ❌ **NOT pre-seeded** on fresh install
- ✅ Created **dynamically** when first task arrives
- ✅ Based on **actual configured agents** (from TEAM-REGISTRY.md)
- ✅ Multiple pipelines exist: standard, quick-fix, research, docs, automation

### Task Workflow Steps (NEW)
- ✅ Steps **auto-created** when task matches pipeline OR assigned explicitly
- ✅ Explicitly choose pipeline with `pipelineId` in `POST /api/tasks`
- ✅ **Manual Wire-up**: Use `PATCH /api/tasks/{id}` with `pipelineId` later
- ✅ Each step tracks: status, agent, evidence, deliverables
- ✅ Task **CANNOT complete** until ALL steps are `complete`
- ✅ Steps flow: `pending` → `in-progress` → `complete` | `failed` | `blocked`
- ✅ Evidence **required** per step before completion
- ✅ API enforces: rejects task completion if steps incomplete
- ⚠️ **KNOWN BUG**: Handoff endpoint fails with same-agent consecutive steps. Use manual PATCH progression. See ORCHESTRATION.md.
- 🔥 **CRITICAL**: Validate and mark EACH step immediately after agent completion. See "Step-Level Validation Protocol" in ORCHESTRATION.md.

### Task Keywords → Pipeline Mapping

| Keywords | Pipeline | Workflows |
|----------|----------|-----------|
| research, investigate, analyze | pl-research | Research → Review |
| build, implement, create, code | pl-standard | Research → Build → Test → Review |
| fix, bug + quick | pl-quick-fix | Quick Fix → Review |
| document, readme, docs | pl-docs | Document → Review |
| automate, script, cron | pl-automation | Automate → Review |
| deploy, release, publish | pl-deploy | Deploy → Review |

### Required Task Fields
Every task MUST include:
1. **Clear description** - what to do
2. **Input specification** - what agent receives
3. **Required deliverables** - numbered checklist
4. **Save location** - `{DOCUMENTS_ROOT}/path`
5. **Evidence format** - exact API call
6. **Tool requirements** - primary + fallback
7. **Fallback plan** - what if primary fails
8. **Validation checklist** - how to verify done

### Monitoring Design
- **Automation Agent** (local model) - checks every 2 min, FREE
- **Orchestrator** (cloud model) - only wakes when system finds work
- **Why:** Saves tokens - no cloud cost for monitoring

### Agent Roles
- **Researcher** - Research, investigation, documentation
- **Builder** - Build, implementation, coding
- **Tester** - Test, QA, validation
- **Reviewer** - Final approval, quality gate
- **Automation** - Automation, monitoring (no pipeline)

### Evidence API
```bash
POST /api/tasks/{id}/evidence
{
  "evidenceType": "document|code|test|screenshot|link",
  "url": "file://{DOCUMENTS_ROOT}/path",
  "description": "what was delivered",
  "addedBy": "agent-name"
}
```

---

## Document Map

```
docs/
├── README.md                          # Start here - critical rules
├── AI_TRAINING_GUIDE.md               # How to train your AI
├── KNOWLEDGE_INDEX.md (this file)     # What to read when
├── ORCHESTRATION.md                   # Full system documentation
├── TASK_CREATION_REQUIREMENTS.md      # Task template and requirements
├── QUICKSTART.md                      # Installation guide
└── plans/                             # Example implementation plans
```

**Read order:**
1. README.md (first time)
2. AI_TRAINING_GUIDE.md (if training new AI)
3. KNOWLEDGE_INDEX.md (find what you need)
4. Specific docs based on topic

---

## Common Questions

**Q: Why aren't workflows pre-created?**
A: Because I don't know your agent names until runtime. You configure agents first, then tasks arrive. By task time, I know the team.

**Q: What happens on fresh install?**
A: Database tables exist but are empty. First task triggers dynamic workflow creation based on your actual agents.

**Q: How do I know which pipeline a task will use?**
A: Keywords in title/description. See "Task Keywords → Pipeline Mapping" above.

**Q: Why two-tier monitoring?**
A: Automation agent (local) checks every 2 min for free. Orchestrator (cloud) only wakes when work detected. Saves ~90% of token cost.

**Q: What if a task fails?**
A: Fallback plan kicks in. If all fail, task marked blocked with error details.

---

## For Orchestrators

**When user asks about task orchestration:**
1. Read this KNOWLEDGE_INDEX.md (quick refresh)
2. Read ORCHESTRATION.md (full details)
3. Read TASK_CREATION_REQUIREMENTS.md (task template)
4. Answer with complete knowledge

**When creating a task:**
1. Read TASK_CREATION_REQUIREMENTS.md
2. Use the template provided
3. Ensure all 8 required fields present
4. Include fallback plan

**When handling fresh install:**
1. Read ORCHESTRATION.md#part-4
2. Discover agents from TEAM-REGISTRY.md
3. Create workflows dynamically
4. Create pipelines
5. Match task to pipeline

---

**Last Updated:** 2026-03-17
**Version:** 1.1
**Purpose:** Single source of truth - quick reference + trigger phrases + document map
**Maintainer:** Orchestrator