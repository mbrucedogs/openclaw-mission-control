# Agent Pipeline Setup Guide (Example)

This document explains how to configure agents for the mission-control orchestration system.

## Overview

The orchestration system uses a **hybrid pipeline model**:

1. **Predefined Workflows** - Reusable work templates (Research, Build, Test, Review, etc.)
2. **Predefined Pipelines** - Common sequences (Research → Build → Test → Review)
3. **Dynamic Assembly** - Primary AI builds custom pipelines when no match exists

## Required Agents

Configure these agents in your OpenClaw `openclaw.json`:

```json
{
  "agents": [
    {
      "id": "leo-lead",
      "name": "Leo",
      "agentDir": "agents/leo-lead"
    },
    {
      "id": "sam-scout",
      "name": "Sam",
      "agentDir": "agents/sam-scout"
    },
    {
      "id": "dana-dev",
      "name": "Dana",
      "agentDir": "agents/dana-dev"
    },
    {
      "id": "jordan-review",
      "name": "Jordan",
      "agentDir": "agents/jordan-review"
    }
  ]
}
```

## Agent Roles Explained

### Leo (Orchestrator)
- **Role:** Pipeline conductor, not musician
- **Responsibilities:**
  - Analyzes tasks and matches to pipelines
  - Spawns agents for each workflow step
  - Monitors progress and reviews deliverables
  - Validates evidence before approving handoffs
  - Rejects incomplete work
  - Manages handoffs between agents

### Sam (Researcher)
- **Workflows:** Research, Documentation
- **Tasks:** Research topics, analyze content, write documentation
- **Skills:** Information gathering, analysis, documentation
- **Must Attach:** Research documents, analysis reports

### Dana (Builder/Tester)
- **Workflows:** Build, Test
- **Tasks:** Implement features, fix bugs, run QA
- **Skills:** Coding, implementation, testing
- **Must Attach:** Source code, test results, build artifacts

### Jordan (Reviewer)
- **Workflows:** Review
- **Tasks:** Final approval, quality gates, sign-off
- **Skills:** Review, judgment, standards enforcement
- **Must Attach:** Review notes, approval/rejection rationale

## CRITICAL: Validation & Evidence Requirements

### Primary AI (Orchestrator) Validation Checklist

Before approving ANY handoff, the Primary AI MUST verify:

#### 1. Agent Accountability
- [ ] Agent was spawned (not Primary AI doing the work)
- [ ] Agent posted their own findings (not Primary AI adding comments)
- [ ] Agent attached their own evidence (not Primary AI attaching for them)

#### 2. Evidence Requirements
- [ ] Evidence attached via `POST /api/tasks/{id}/evidence`
- [ ] Evidence includes file path or URL
- [ ] Evidence description explains what was delivered
- [ ] Files saved to correct location (DOCUMENTS_ROOT)

#### 3. Documentation Requirements
- [ ] Agent posted completion comment with summary
- [ ] Activity feed shows agent's work
- [ ] Handoff includes supervisor notes with context

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

## Workflow Configuration

Workflows define work for specific agents:

```typescript
interface WorkflowTemplate {
  id: string;              // e.g., "wf-research"
  name: string;            // e.g., "Research"
  agentRole: string;       // researcher, builder, tester, reviewer
  timeoutSeconds: number;  // Hard limit - killed if exceeded
  systemPrompt?: string;   // Instructions for the agent
  validationChecklist: string[];  // What "done" means
}
```

## Example Workflows

| ID | Name | Agent | Timeout | Purpose |
|----|------|-------|---------|---------|
| wf-research | Research | sam | 1800s | Investigate and document |
| wf-build | Build | dana | 3600s | Implement features |
| wf-test | Test | dana | 1200s | QA and validation |
| wf-review | Review | jordan | 900s | Final approval |

## Pipeline Configuration

Pipelines are sequences of workflows:

```typescript
interface Pipeline {
  id: string;
  name: string;
  steps: PipelineStep[];
  isDynamic: boolean;
}

interface PipelineStep {
  workflowId: string;
  onFailure: 'stop' | 'continue' | 'skip';
}
```

## Example Pipelines

| ID | Name | Steps | Purpose |
|----|------|-------|---------|
| pl-standard | Standard Build | Research → Build → Test → Review | Full development cycle |
| pl-research | Research Only | Research → Review | Research tasks |
| pl-quick-fix | Quick Fix | Build → Review | Quick fixes |

## How Execution Works

1. **Task Created** → Primary AI analyzes content
2. **Pipeline Matched** → Predefined or dynamically assembled
3. **Agent Spawned** → First workflow step executes
4. **Primary AI Monitors** → Reviews deliverables
5. **Communication Loop** → Iterate until satisfied
6. **Handoff** → Route to next agent
7. **Complete** → Final review and approval

## Example Task Flow

**Task:** "Research video on AI patterns"

**Pipeline:** Research → Build → Test → Review

**Step 1: Research (Sam)**
```
Leo → Spawns Sam
"Research this video, extract key patterns"
↓
Sam → Extracts content → Analyzes → Posts findings
↓
Leo ← Reviews
"What tools were mentioned?"
↓
Sam → Responds with tools list
↓
Leo → Satisfied → Spawns Dana
```

**Step 2: Build (Dana)**
```
Leo → Spawns Dana
"Implement feature from research"
↓
Dana → Writes code → Tests → Posts completion
↓
Leo ← Reviews
"Add error handling"
↓
Dana → Updates code
↓
Leo → Satisfied → Spawns Jordan
```

**Step 3: Review (Jordan)**
```
Leo → Spawns Jordan
"Review implementation for accuracy"
↓
Jordan → Reviews → Approves/Rejects
↓
Leo → Marks task complete
```

## Evidence Attachment API

```
POST /api/tasks/{id}/evidence
{
  "evidenceType": "document",
  "url": "file://{DOCUMENTS_ROOT}/plans/example.md",
  "description": "Structured plan document generated from analysis",
  "addedBy": "agent-name"
}
```

**Evidence Types:** document, code, test, screenshot, link

## Common Failures & Prevention

| Failure | What Happened | Prevention |
|---------|---------------|------------|
| **Primary AI Did The Work** | Task assigned to agent, but Primary AI executed directly | Always spawn the assigned agent. Never execute skills yourself. |
| **Missing Evidence** | Agent completed work but didn't attach evidence via API | Validate evidence exists before approving. Reject if missing. |
| **Wrong File Location** | Files saved to wrong directory instead of DOCUMENTS_ROOT | Verify DOCUMENTS_ROOT. Reject if files in wrong location. |
| **Primary AI Added Comments For Agent** | Agent didn't post findings, so Primary AI added comment for them | Make agent post their own findings. Reject if they don't. |
| **Task Marked Complete Without Validation** | Task went to Complete with no evidence, no comments, no activity | Validate ALL checklist items before marking Complete. |

## See Also

- [ORCHESTRATION.md](../docs/ORCHESTRATION.md) - Full system documentation
- [TEAM_GOVERNANCE.md](./TEAM_GOVERNANCE.md) - Governance rules
- [TEAM-REGISTRY.md](./TEAM-REGISTRY.md) - Team member details
