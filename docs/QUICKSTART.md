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

Copy the example agent configuration:

```bash
cp examples/openclaw/workspace/openclaw.json.example ~/.openclaw/openclaw.json
```

Or manually configure agents in your OpenClaw `openclaw.json`:

```json
{
  "agents": [
    { "id": "leo-lead", "name": "Leo", "agentDir": "agents/leo-lead" },
    { "id": "sam-scout", "name": "Sam", "agentDir": "agents/sam-scout" },
    { "id": "dana-dev", "name": "Dana", "agentDir": "agents/dana-dev" },
    { "id": "jordan-review", "name": "Jordan", "agentDir": "agents/jordan-review" }
  ]
}
```

See `examples/openclaw/workspace/` for complete agent templates.

### 4. Start the Webapp

```bash
npm run dev
```

Access at: `http://localhost:4000`

### 5. Verify Setup

1. Go to **Orchestration** → **Workflows** - should see 7 workflows
2. Go to **Orchestration** → **Pipelines** - should see 5 pipelines
3. Create a test task: "Research something"
4. Check task has owner (sam) and pipeline assigned

## Existing OpenClaw Session

### Connecting to Existing Setup

1. **Start webapp** - Runs independently
2. **Agents auto-sync** - Webapp fetches from OpenClaw `/api/agents`
3. **Identity Sync** - Webapp uses your configured `AUTH_USER` and `AUTH_PASS`
4. **Primary AI Orchestration** - Can process existing tasks through pipelines
4. **Backward compatible** - Tasks without pipelines work as before

### Migration Path

Existing tasks can be:
- Left as-is (no pipeline)
- Assigned pipeline retroactively
- Processed by the Primary AI going forward

## First Task Test

Create a task and watch the Primary AI assign pipeline:

```bash
curl -X POST http://localhost:4000/api/tasks \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your_api_key_here" \
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
4. Train the Primary AI on your patterns

## Support

- Issues: GitHub Issues
- Docs: `/docs` folder
- Primary AI: Ask your primary AI orchestrator
