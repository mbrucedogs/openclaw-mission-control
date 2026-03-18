# Dynamic Workflow Creation Rules

> **Critical rules for creating workflows and pipelines dynamically in Mission Control**

---

## Rule 1: Always Validate Against API

**When creating workflows dynamically, you MUST:**

1. **Call `/api/agents` first** - Get the list of valid agents
2. **Validate agentId exists** - Before assigning to workflow
3. **Use exact agent IDs** - Don't hardcode or assume agent names

**Example:**
```typescript
// WRONG - Hardcoded agent
const workflow = {
  agentId: "sam-scout",  // Might not exist
  agentRole: "researcher"
};

// CORRECT - Validate against API
const agents = await fetch('/api/agents').then(r => r.json());
const agent = agents.find(a => a.role === 'researcher');
const workflow = {
  agentId: agent?.id,  // Guaranteed to exist
  agentRole: agent?.role
};
```

---

## Rule 2: Pipeline Steps Must Reference Valid Workflows

**When creating pipelines dynamically:**

1. **Call `/api/workflows` first** - Get valid workflow IDs
2. **Validate each step's workflowId** - Must exist in the workflows list
3. **Reject invalid workflow IDs** - Don't create pipelines with missing workflows

**Example:**
```typescript
// WRONG - Workflow might not exist
const pipeline = {
  steps: [
    { workflowId: "wf-custom-research" }  // Might not exist
  ]
};

// CORRECT - Validate against API
const workflows = await fetch('/api/workflows').then(r => r.json());
const validWorkflowIds = new Set(workflows.map(w => w.id));

const pipeline = {
  steps: [
    { workflowId: "wf-research" }  // Verified to exist
  ]
};

// Validate before saving
if (!pipeline.steps.every(s => validWorkflowIds.has(s.workflowId))) {
  throw new Error('Invalid workflow ID in pipeline steps');
}
```

---

## Rule 3: UI Forms Must Sync with API Data

**React forms must update when props change:**

```typescript
// WRONG - useState only initializes once
const [formData, setFormData] = useState({
  agentId: workflow?.agentId || ''  // Stays empty after prop changes
});

// CORRECT - Update when prop changes
useEffect(() => {
  if (workflow) {
    setFormData({
      agentId: workflow.agentId || ''  // Updates when workflow changes
    });
  }
}, [workflow?.id]);
```

---

## Rule 4: Dynamic Assembly Must Check Existing Workflows

**When dynamically assembling pipelines:**

```typescript
// Get existing workflows first
const workflows = await fetch('/api/workflows').then(r => r.json());
const workflowMap = new Map(workflows.map(w => [w.id, w]));

// Only add workflows that exist
const workflowIds: string[] = [];

if (isResearchTask && workflowMap.has('wf-research')) {
  workflowIds.push('wf-research');
}

if (isBuildTask && workflowMap.has('wf-build')) {
  workflowIds.push('wf-build');
}

// Always add review if it exists
if (workflowMap.has('wf-review')) {
  workflowIds.push('wf-review');
}
```

---

## Rule 5: Database Constraints

**The database enforces these rules:**

1. **Workflows table:**
   - `agent_id` is NOT NULL (every workflow MUST have an agent)
   - Foreign key to `agents(id)`

2. **Pipelines table:**
   - Steps stored as JSON array
   - No foreign key constraint (allows dynamic creation)
   - But API validates workflow IDs exist

3. **Task pipelines:**
   - Links tasks to pipelines
   - Stores workflow_ids as JSON array

---

## Rule 6: Error Handling

**Always handle these errors:**

```typescript
try {
  const agents = await fetch('/api/agents').then(r => r.json());
  if (!agents.length) {
    throw new Error('No agents configured');
  }
  
  const workflows = await fetch('/api/workflows').then(r => r.json());
  if (!workflows.length) {
    throw new Error('No workflows configured');
  }
  
  // Now safe to create pipeline
} catch (err) {
  console.error('Failed to load required data:', err);
  // Show error to user
}
```

---

## Rule 7: Documentation Requirements

**When creating dynamic workflows/pipelines:**

1. **Document the matching logic** - How tasks map to workflows
2. **Document fallback behavior** - What happens if no match
3. **Document agent assignments** - Which agent does what
4. **Log pipeline creation** - Activity feed should show what was created

---

## Rule 8: Database Schema Naming Convention

**The database uses snake_case. The UI must match:**

| Database (snake_case) | UI Must Use |
|-----------------------|-------------|
| `workflow_id` | `workflow_id` (NOT `workflowId`) |
| `on_failure` | `on_failure` (NOT `onFailure`) |
| `agent_id` | `agent_id` (NOT `agentId`) |

**Why:** The API returns database values directly. The UI must use the same naming convention.

**Example:**
```typescript
// WRONG - camelCase
const step = {
  workflowId: "wf-research",  // UI will fail
  onFailure: "stop"
};

// CORRECT - snake_case
const step = {
  workflow_id: "wf-research",  // Matches database
  on_failure: "stop"
};
```

**PipelineStep Interface:**
```typescript
interface PipelineStep {
  workflow_id: string;      // snake_case
  on_failure: 'stop' | 'continue' | 'skip';  // snake_case
}
```

---

## Rule 9: TypeScript Interface Alignment

**Interfaces must match database schema exactly:**

```typescript
// Database schema
CREATE TABLE pipelines (
    steps TEXT  -- JSON with snake_case keys
);

// UI interface - MUST match
interface PipelineStep {
  workflow_id: string;      // NOT workflowId
  on_failure: string;       // NOT onFailure
}

// API returns database values directly
const pipeline = {
  steps: [
    { workflow_id: "wf-research", on_failure: "stop" }
  ]
};
```

**Never transform between snake_case and camelCase.** Use database values directly throughout the stack.

| Action | Required API Calls | Validation |
|--------|-------------------|------------|
| Create workflow | `/api/agents` | agentId exists |
| Create pipeline | `/api/workflows` | All workflowIds exist |
| Edit workflow | `/api/agents` | agentId exists |
| Edit pipeline | `/api/workflows` | All workflowIds exist |
| Dynamic assembly | `/api/workflows` | Check workflowMap.has(id) |

---

**See Also:**
- [ORCHESTRATION.md](./ORCHESTRATION.md) - Pipeline orchestration
- [TASK_CREATION_REQUIREMENTS.md](./TASK_CREATION_REQUIREMENTS.md) - Task requirements
- [PIPELINE_PROTOCOL.md](./PIPELINE_PROTOCOL.md) - 5-phase protocol
