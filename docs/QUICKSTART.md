# Quick Start Guide

## New Installation

### 1. Clone and Install

```bash
git clone <repo-url>
cd alex-mission-control
npm install
```

### 2. Database Setup

Database auto-initializes on first run with:
- 7 built-in workflows
- 5 built-in pipelines
- All required tables

### 3. Configure OpenClaw

Ensure your OpenClaw `openclaw.json` has these agents:

```json
{
  "agents": [
    { "id": "alice", "name": "Alice", "role": "researcher" },
    { "id": "bob", "name": "Bob", "role": "builder" },
    { "id": "charlie", "name": "Charlie", "role": "tester" },
    { "id": "aegis", "name": "Aegis", "role": "reviewer" },
    { "id": "tron", "name": "Tron", "role": "automation" },
    { "id": "max", "name": "Max", "role": "orchestrator" }
  ]
}
```

### 4. Start the Webapp

```bash
npm run dev
```

Access at: `http://localhost:4000`

### 5. Verify Setup

1. Go to **Orchestration** → **Workflows** - should see 7 workflows
2. Go to **Orchestration** → **Pipelines** - should see 5 pipelines
3. Create a test task: "Research something"
4. Check task has owner (alice) and pipeline assigned

## Existing OpenClaw Session

### Connecting to Existing Setup

1. **Start webapp** - Runs independently
2. **Agents auto-sync** - Webapp fetches from OpenClaw `/api/agents`
3. **MAX takes over** - Can process existing tasks through pipelines
4. **Backward compatible** - Tasks without pipelines work as before

### Migration Path

Existing tasks can be:
- Left as-is (no pipeline)
- Assigned pipeline retroactively
- Processed by MAX going forward

## First Task Test

Create a task and watch MAX assign pipeline:

```bash
curl -X POST http://localhost:4000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"title":"Research best practices for React"}'
```

Response shows:
- `owner: "alice"` (matched to researcher)
- `pipelineMatch` with workflows

## Troubleshooting

**No workflows showing?**
- Check database initialized: `sqlite3 mission-control.db ".tables"`
- Should see: `workflow_templates`, `pipelines`, `task_pipelines`

**Agents not appearing?**
- Verify OpenClaw running: `openclaw status`
- Check `/api/agents` returns agents

**Pipeline not matching?**
- Check task has descriptive title
- Review keywords in matching logic
- Try explicit: `[pipeline: standard]` in title

## Next Steps

1. Read [ORCHESTRATION.md](./ORCHESTRATION.md) for full docs
2. Customize workflows for your use case
3. Create custom pipelines
4. Train MAX on your patterns

## Support

- Issues: GitHub Issues
- Docs: `/docs` folder
- MAX: Ask your primary AI orchestrator
