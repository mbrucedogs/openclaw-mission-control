# Orchestration System Documentation

## Overview

The alex-mission-control orchestration system uses a **hybrid pipeline model** that combines:

1. **Predefined Workflows** - Reusable work templates for agents
2. **Predefined Pipelines** - Sequences of workflows for common patterns
3. **Dynamic Pipeline Assembly** - the Primary AI builds custom pipelines on-the-fly when no predefined match exists

## Core Concepts

### Workflows

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

### Pipelines

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

## The Hybrid Model

### How Pipeline Matching Works

When a task is created, the Primary AI analyzes it:

1. **Check for explicit pipeline hint**
   ```
   "Build user dashboard [pipeline: standard]"
   ```

2. **Match to predefined pipeline**
   - Keywords in task title/description
   - Pattern matching against existing pipelines

3. **Dynamic Assembly (fallback)**
   - If no match, the Primary AI builds custom pipeline
   - Detects required work types from content
   - Assembles appropriate workflow sequence

### Dynamic Assembly Logic

the Primary AI looks for keywords:

| Keyword Detected | Workflow Added |
|-----------------|----------------|
| research, investigate, analyze | wf-research |
| build, implement, create, code | wf-build |
| fix, bug, quick | wf-quick-fix |
| document, readme, docs | wf-document |
| test, qa, verify | wf-test |
| automate, script, cron | wf-automate |

**Always adds:** `wf-review` at the end (unless explicitly skipped)

### Example Matches

| Task | Matched Pipeline | Workflows |
|------|-----------------|-----------|
| "Research YouTube API" | pl-research | Research → Review |
| "Fix the broken cron" | Dynamic | Quick Fix → Automate → Review |
| "Build new dashboard" | pl-standard | Research → Build → Test → Review |
| "Document the API" | pl-docs | Document → Review |

## Primary AI's Role

As the orchestrator, the Primary AI manages the entire pipeline execution:

### Core Responsibilities

1. **Analyzes incoming tasks** - Determines what work is needed
2. **Selects or builds pipeline** - Uses predefined or assembles dynamic
3. **Spawns agents for each step** - Creates subagent sessions for workflow execution
4. **Monitors progress** - Waits for agent completion, reviews deliverables
5. **Communicates with agents** - Asks clarifying questions, requests changes
6. **Resolves blockers** - Helps unblock stuck agents or reassigns work
7. **Manages handoffs** - Routes completed work to next agent in pipeline
8. **Enforces timeouts** - Kills workflows exceeding timeoutSeconds
9. **Saves successful patterns** - Dynamic pipelines can become predefined

### Communication Loop

The Primary AI maintains active communication throughout the pipeline:

```
Primary AI → Spawns Agent A (Step 1)
    ↓
Agent A → Works → Posts findings as comments
    ↓
Primary AI ← Reviews deliverables
    ↓
Primary AI → Asks questions (if needed) → Agent A responds
    ↓
Primary AI → Satisfied? → Spawns Agent B (Step 2)
    ↓
Repeat for each step...
```

### Agent Interaction Pattern

**For each workflow step:**

1. **Spawn** - Create subagent with task context
2. **Monitor** - Wait for completion or timeout
3. **Review** - Check comments, activity, evidence
4. **Communicate** - Ask questions if deliverables unclear
5. **Iterate** - Loop until work meets criteria
6. **Hand off** - Pass to next agent with full context

**The Primary AI is the conductor** - agents are the musicians. The Primary AI keeps the orchestra playing in harmony, resolving issues as they arise.

### Example: Research Pipeline Execution

**Task:** "Research YouTube video on AI patterns and document findings"

**Pipeline:** Research → Document → Review

**Step 1: Research (Alice)**
```
Primary AI → Spawns Alice
    "Research this video, extract key patterns"
    ↓
Alice → Watches video → Posts findings
    "Found 3 patterns: Chain-of-Thought, ReAct, Reflexion"
    ↓
Primary AI ← Reviews
    "What tools were mentioned?"
    ↓
Alice → Responds
    "Tools: LangChain, AutoGPT, BabyAGI"
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
    "Add code examples for ReAct pattern"
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
    "Document complete, 2 minor typos fixed"
    ↓
Primary AI → Marks task complete
```

**Key Point:** The Primary AI stayed involved at every step, asked questions, requested changes, and only proceeded when satisfied.

### Timeout Enforcement

the Primary AI enforces `timeoutSeconds` when spawning agents:

```javascript
// the Primary AI spawns agent with timeout
sessions_spawn({
  task: workflow.systemPrompt,
  timeoutSeconds: workflow.timeoutSeconds,
  // If exceeded, agent killed, task marked failed
});
```

## Dynamic → Predefined Pipeline Flow

When the Primary AI assembles a dynamic pipeline that works well:

1. Task completes successfully with dynamic pipeline
2. the Primary AI offers: "Save this pipeline for reuse?"
3. If yes, pipeline saved to database
4. Future similar tasks use the now-predefined pipeline

This creates a **learning system** where successful patterns become reusable.

## API Endpoints

### Workflows

```
GET    /api/workflows              # List all workflows
POST   /api/workflows              # Create new workflow
PUT    /api/workflows              # Update workflow
DELETE /api/workflows              # Delete workflow
```

### Pipelines

```
GET    /api/pipelines              # List pipelines
POST   /api/pipelines              # Create new pipeline
PUT    /api/pipelines              # Update pipeline
DELETE /api/pipelines              # Delete pipeline
```

### Task Pipeline Matching

```
POST   /api/tasks                  # Creates task + matches pipeline
```

Response includes:
```json
{
  "_meta": {
    "pipelineMatch": {
      "pipelineId": "pl-research",
      "isDynamic": false,
      "confidence": 0.9,
      "reason": "Matched pattern: research"
    }
  }
}
```

## Database Schema

### workflow_templates

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
    tags TEXT,                   -- JSON array
    created_at TEXT,
    updated_at TEXT,
    use_count INTEGER DEFAULT 0
);
```

### pipelines

```sql
CREATE TABLE pipelines (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    steps TEXT NOT NULL,  -- JSON array of {workflow_id, on_failure}
    is_dynamic INTEGER DEFAULT 0,
    created_from_task_id TEXT,
    created_at TEXT,
    updated_at TEXT,
    use_count INTEGER DEFAULT 0
);
```

### task_pipelines

```sql
CREATE TABLE task_pipelines (
    task_id TEXT PRIMARY KEY,
    pipeline_id TEXT,
    workflow_ids TEXT,  -- For dynamic pipelines
    current_step INTEGER DEFAULT 0,
    is_dynamic INTEGER DEFAULT 0,
    matched_at TEXT
);
```

## Setup for New Installations

### 1. Database Setup

The schema automatically initializes with built-in workflows and pipelines.

### 2. Agent Configuration

Ensure agents are registered in OpenClaw:

```json
// openclaw.json agents section
{
  "agents": [
    { "id": "alice", "name": "Alice", "role": "researcher" },
    { "id": "bob", "name": "Bob", "role": "builder" },
    { "id": "charlie", "name": "Charlie", "role": "tester" },
    { "id": "aegis", "name": "Aegis", "role": "reviewer" },
    { "id": "tron", "name": "Tron", "role": "automation" }
  ]
}
```

### 3. the Primary AI Configuration

the Primary AI should be configured as the orchestrator:

```json
{
  "id": "max",
  "name": "Max",
  "role": "orchestrator",
  "responsibilities": [
    "Analyze tasks and match to pipelines",
    "Spawn agents for workflow steps",
    "Manage handoffs between agents",
    "Enforce workflow timeouts",
    "Save successful dynamic pipelines"
  ]
}
```

## Integration with Existing OpenClaw Sessions

When connecting to an existing OpenClaw setup:

1. **Import existing agents** - Webapp fetches from `/api/agents`
2. **Map agent roles** - Ensure agent roles match workflow requirements
3. **the Primary AI takes over** - Existing tasks can be processed through pipelines
4. **Backward compatible** - Tasks without pipelines work as before

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

### For the Primary AI (Primary AI)

1. **Prefer predefined** - Use existing pipelines when possible
2. **Document dynamic** - Log why dynamic pipeline was chosen
3. **Learn from success** - Save working dynamic patterns
4. **Respect timeouts** - Always enforce workflow timeoutSeconds
5. **Clear handoffs** - Pass context between agents

## Troubleshooting

### Pipeline not matching?

- Check task title/description for keywords
- Verify workflow templates exist
- Review MAX's matching logic

### Agent not spawning?

- Verify agent is registered in OpenClaw
- Check agent role matches workflow requirement
- Review timeoutSeconds is reasonable

### Dynamic pipeline not saving?

- Ensure task completed successfully
- Check pipeline has unique name
- Verify the Primary AI has permission to create pipelines

## Future Enhancements

- **Conditional pipelines** - Branch based on task content
- **Parallel workflows** - Multiple agents work simultaneously
- **Pipeline templates** - Import/export pipeline definitions
- **Usage analytics** - See which pipelines are most effective
- **Auto-optimization** - the Primary AI learns optimal timeouts

---

**Last Updated:** 2026-03-16
**Version:** 1.0
**Maintainer:** the Primary AI (Primary AI Orchestrator)
