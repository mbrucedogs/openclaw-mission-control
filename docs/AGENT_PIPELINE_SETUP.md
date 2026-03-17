# Agent Pipeline Setup Guide

This document explains how to configure agents for the alex-mission-control orchestration system.

## Overview

The orchestration system uses a **hybrid pipeline model**:

1. **Predefined Workflows** - Reusable work templates (Research, Build, Document, etc.)
2. **Predefined Pipelines** - Common sequences (Research → Build → Review)
3. **Dynamic Assembly** - Primary AI builds custom pipelines when no match exists

## Required Agents

Configure these agents in your OpenClaw `openclaw.json`:

```json
{
  "agents": [
    {
      "id": "alice",
      "name": "Alice",
      "role": "researcher",
      "description": "Research and analysis specialist"
    },
    {
      "id": "bob", 
      "name": "Bob",
      "role": "builder",
      "description": "Code implementation specialist"
    },
    {
      "id": "charlie",
      "name": "Charlie", 
      "role": "tester",
      "description": "QA and testing specialist"
    },
    {
      "id": "aegis",
      "name": "Aegis",
      "role": "reviewer", 
      "description": "Final review and approval"
    },
    {
      "id": "tron",
      "name": "Tron",
      "role": "automation",
      "description": "Automation and scripting"
    },
    {
      "id": "primary-ai",
      "name": "Primary AI",
      "role": "orchestrator",
      "description": "System Orchestrator - manages pipeline execution"
    }
  ]
}
```

## Agent Roles Explained

### Alice (Researcher)
- **Workflows:** wf-research, wf-document
- **Tasks:** Research topics, analyze videos, write documentation
- **Skills:** Information gathering, analysis, documentation

### Bob (Builder)
- **Workflows:** wf-build, wf-quick-fix
- **Tasks:** Implement features, fix bugs, write code
- **Skills:** Coding, implementation, debugging

### Charlie (Tester)
- **Workflows:** wf-test
- **Tasks:** QA testing, verification, edge case testing
- **Skills:** Testing, validation, quality assurance

### Aegis (Reviewer)
- **Workflows:** wf-review
- **Tasks:** Final approval, quality gates, sign-off
- **Skills:** Review, judgment, decision making

### Tron (Automation)
- **Workflows:** wf-automate
- **Tasks:** Create scripts, automation, cron jobs
- **Skills:** Scripting, automation, system integration

### Primary AI (Orchestrator)
- **Role:** Pipeline conductor, not musician
- **Responsibilities:**
  - Analyzes tasks and matches to pipelines
  - Spawns agents for each workflow step
  - Monitors progress and reviews deliverables
  - Communicates with agents (asks questions, requests changes)
  - Resolves blockers and manages handoffs
  - Enforces workflow timeouts
  - Saves successful dynamic patterns

## Workflow Configuration

Workflows are stored in the database and define:

```typescript
interface WorkflowTemplate {
  id: string;              // e.g., "wf-research"
  name: string;            // e.g., "Research"
  agentRole: string;       // researcher, builder, tester, reviewer, automation
  agentId?: string;        // Specific agent (alice, bob, etc.)
  timeoutSeconds: number;  // Hard limit - killed if exceeded
  systemPrompt?: string;   // Instructions for the agent
  validationChecklist: string[];  // What "done" means
}
```

## Built-in Workflows

| ID | Name | Agent | Timeout | Purpose |
|----|------|-------|---------|---------|
| wf-research | Research | alice | 1800s | Investigate and document |
| wf-build | Build | bob | 3600s | Implement features |
| wf-quick-fix | Quick Fix | bob | 900s | Fix bugs quickly |
| wf-test | Test | charlie | 1200s | QA and validation |
| wf-review | Review | aegis | 900s | Final approval |
| wf-document | Document | alice | 1800s | Write documentation |
| wf-automate | Automate | tron | 1800s | Create automation |

## Pipeline Configuration

Pipelines are sequences of workflows:

```typescript
interface Pipeline {
  id: string;
  name: string;
  steps: PipelineStep[];
  isDynamic: boolean;  // true if Primary AI assembled it
}

interface PipelineStep {
  workflowId: string;
  onFailure: 'stop' | 'continue' | 'skip';
}
```

## Built-in Pipelines

| ID | Name | Steps | Purpose |
|----|------|-------|---------|
| pl-standard | Standard Build | Research → Build → Test → Review | Full development cycle |
| pl-research | Research Only | Research → Document → Review | Research tasks |
| pl-quick-fix | Quick Fix | Quick Fix → Review | Bug fixes |
| pl-docs | Documentation | Document → Review | Documentation tasks |
| pl-automation | Automation | Automate → Review | Automation scripts |

## How Execution Works

1. **Task Created** → Primary AI analyzes content
2. **Pipeline Matched** → Predefined or dynamically assembled
3. **Agent Spawned** → First workflow step executes
4. **Primary AI Monitors** → Reviews deliverables, asks questions
5. **Communication Loop** → Iterate until satisfied
6. **Handoff** → Route to next agent
7. **Complete** → Final review and approval

## Example Task Flow

**Task:** "Research YouTube video on AI patterns"

**Pipeline Matched:** Research → Document → Review

**Step 1: Research (Alice)**
```
Primary AI → Spawns Alice
"Research this video, extract key patterns"
↓
Alice → Extracts transcript → Analyzes → Posts findings
↓
Primary AI ← Reviews
"What tools were mentioned?"
↓
Alice → Responds with tools list
↓
Primary AI → Satisfied → Spawns Document workflow
```

**Step 2: Document (Alice)**
```
Primary AI → Spawns Alice
"Create summary document from research"
↓
Alice → Writes document → Saves to /docs
↓
Primary AI ← Reviews document
"Add code examples"
↓
Alice → Updates document
↓
Primary AI → Satisfied → Spawns Review workflow
```

**Step 3: Review (Aegis)**
```
Primary AI → Spawns Aegis
"Review document for accuracy"
↓
Aegis → Reviews → Approves
↓
Primary AI → Marks task complete
```

## Customization

### Adding New Workflows

1. Go to **Orchestration** → **Workflows**
2. Click **New Workflow**
3. Fill in:
   - Name
   - Description
   - Agent (required)
   - Timeout (seconds)
   - System Prompt
   - Validation Checklist
   - Tags

### Adding New Pipelines

1. Go to **Orchestration** → **Pipelines**
2. Click **New Pipeline**
3. Fill in:
   - Name
   - Description
   - Steps (add workflows in order)
   - Configure on-failure behavior for each step

## Troubleshooting

**Agent not appearing?**
- Check OpenClaw config has agent defined
- Verify `/api/agents` returns the agent
- Ensure agent role matches workflow requirement

**Pipeline not matching?**
- Check task has descriptive title
- Review keyword matching logic
- Use explicit hint: `[pipeline: research]` in title

**Workflow timing out?**
- Increase timeoutSeconds for that workflow
- Check agent has proper tools/skills
- Review system prompt clarity

## See Also

- [ORCHESTRATION.md](./ORCHESTRATION.md) - Full system documentation
- [QUICKSTART.md](./QUICKSTART.md) - Get started in 5 minutes
- [README.md](../README.md) - Project overview
