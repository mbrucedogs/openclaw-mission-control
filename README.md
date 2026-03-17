# Mission Control

A task management and agent orchestration system for OpenClaw autonomous organizations.

## Features

- **Task Management** - Kanban board with status tracking
- **Agent Orchestration** - Automated pipeline execution with the Primary AI
- **Workflow Templates** - Reusable work definitions for agents
- **Dynamic Pipelines** - Hybrid model: predefined + on-the-fly assembly
- **Activity Tracking** - Full audit trail of all changes
- **Evidence Management** - Structured proof of completion

## Quick Start

```bash
npm install
npm run dev
```

Access at `http://localhost:4000`

## Documentation

### System Documentation
- **[docs/README.md](./docs/README.md)** - **START HERE** - Knowledge index and navigation
- **[docs/QUICKSTART.md](./docs/QUICKSTART.md)** - Get up and running in 5 minutes
- **[docs/ORCHESTRATION.md](./docs/ORCHESTRATION.md)** - Full orchestration system documentation

### Your Team Setup (in workspace)
- **AGENT_PIPELINE_SETUP.md** (workspace root) - Your specific agent configuration
- **TEAM_GOVERNANCE.md** (workspace root) - Handoff rules and validation
- **TEAM-REGISTRY.md** (workspace root) - Agent registry and spawn commands

### For New Teams
- **[examples/openclaw-workspace/](./examples/openclaw-workspace/)** - Complete generic template

## Core Concepts

### Workflows

Reusable work templates for agents:
- `wf-research` - Research and analysis
- `wf-build` - Code implementation
- `wf-document` - Documentation creation
- `wf-review` - Final approval

### Pipelines

Ordered sequences of workflows:
- `pl-standard` - Research → Build → Test → Review
- `pl-research` - Research → Document → Review
- `pl-quick-fix` - Quick Fix → Review

### The Hybrid Model

1. **Predefined Pipelines** - Common patterns stored in database
2. **Dynamic Assembly** - Primary AI builds custom pipelines when no match exists
3. **Learning System** - Successful dynamic pipelines become predefined

## How It Works

1. **Task Created** → Primary AI analyzes content
2. **Pipeline Matched** → Predefined or dynamically assembled
3. **Agent Spawned** → First workflow step executes
4. **Primary AI Monitors** → Reviews deliverables, asks questions
5. **Handoff** → Routes to next agent when satisfied
6. **Complete** → Final review and approval

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Task      │────▶│  Primary AI  │────▶│  Pipeline   │
│  Created    │     │  (Orchestrator)│    │  Matched    │
└─────────────┘     └──────────────┘     └─────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │  Agent Spawning  │
                    │  (Step-by-step)  │
                    └──────────────────┘
```

## Database

SQLite with tables:
- `tasks` - Task data with validation criteria
- `workflow_templates` - Reusable work definitions
- `pipelines` - Workflow sequences
- `task_pipelines` - Pipeline assignments
- `task_comments` - Structured comments
- `task_activity` - Audit log
- `task_evidence` - Proof of completion

## API Endpoint

**Default:** `http://localhost:4000`

```
GET    /api/tasks              # List tasks
POST   /api/tasks              # Create task (auto-matches pipeline)
GET    /api/workflows          # List workflows
POST   /api/workflows          # Create workflow
GET    /api/pipelines          # List pipelines
POST   /api/pipelines          # Create pipeline
```

### Authentication

All API requests require an `X-API-Key` header with the value defined in your `.env` file.

```bash
curl -H "X-API-Key: your_api_key_here" http://localhost:4000/api/tasks
```

### Configure Your Primary AI

**Tell your Primary AI to use this endpoint:**

```bash
# In your Primary AI environment:
export MISSION_CONTROL_URL=http://localhost:4000
export MC_API_KEY=your_api_key_here
```

**Or in your workspace config:**
```json
{
  "missionControl": {
    "url": "http://localhost:4000",
    "apiKey": "your_api_key_here"
  }
}
```

## Configuration

### Required Agents

Configure in OpenClaw `openclaw.json`:

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

See `examples/openclaw/` for a complete working template with agent SOUL.md and AGENTS.md files.
```

### Environment

```bash
# Database
DATABASE_URL=./mission-control.db

# OpenClaw
OPENCLAW_WORKSPACE=/path/to/workspace

# Authentication
AUTH_USER=admin
AUTH_PASS=your_secure_password_here
API_KEY=your_secure_api_key
```

## Development

```bash
# Run dev server
npm run dev

# Build for production
npm run build

# Run tests
npm test
```

## License

MIT
