# OpenClaw Orchestration Guide: Mission Control Integration

This guide explains how to configure any OpenClaw agent team to interact with the Mission Control API. By following these patterns, your agents will appear "live" on the dashboard, update their statuses, and seamlessly hand off tasks.

---

## 🏗 The Architecture

Agents poll the Mission Control API during their **heartbeat** to find work. They report their progress to the **Activity Feed** and update **Task Owners** to move work through the pipeline.

### API Base URL
Default: `http://localhost:4000/api`

---

## 📡 Essential API Patterns

### 1. Polling for Work
Agents should check for tasks assigned to them every session or heartbeat.

**API Call:** `GET /tasks`
**Filter Logic:** `owner === {your_agent_id} && status === 'In Progress'`

---

### 2. Live Activity Updates (The "Pulse")
To make agents feel alive on the Office floor plan, they should report their current "thought" or action frequently.

**API Call:** `POST /activity`
**Payload:**
```json
{
  "actor": "{your_agent_id}",
  "type": "thought",
  "message": "Searching the workspace for documentation on X...",
  "timestamp": "2026-03-15T23:45:00Z"
}
```
*Note: Use descriptive messages like "Synthesizing research results" or "Refactoring the API layer" to reflect real-time progress in the UI.*

---

### 3. Task Handoff (The Pipeline)
When an agent finishes their phase, they must hand the task back to the **Orchestrator** (usually the agent in the Governance layer) or the next specialist.

**API Call:** `PATCH /tasks/:id`
**Payload:**
```json
{
  "owner": "{next_agent_id}",
  "status": "Review",
  "handoverFrom": "{your_agent_id}",
  "supervisorNotes": "Task phase complete. Summary of work: [details]. Ready for technical review."
}
```

---

## 📋 Agent Implementation Checklist

### [ ] Step 1: Identity Alignment
Ensure the `agentId` used in your OpenClaw `sessions_spawn` matches the technical `id` in your technical configuration (e.g., `main`, `researcher-agent`).

### [ ] Step 2: Session Heartbeat
Include logic in the agent's startup (or `SOUL.md` rules) to:
1.  Read assigned tasks from `/api/tasks`.
2.  Post a "Starting work" activity to `/api/activity`.

### [ ] Step 3: Evidence Capture
Before handing off, the agent should update the `evidence` field in the task with links to generated files, logs, or test results.

---

## 🧩 Orchestration Metadata

The Mission Control UI automatically categorizes agents based on your `TEAM_GOVERNANCE.md`. 

- **Governance Layer**: Usually the lead Orchestrator. Assigned to the primary "Control" desk.
- **Automation Layer**: Agents managing cron jobs or monitors. Assigned to the secondary "Monitoring" desk.
- **Pipeline Layer**: Functional specialists positioned in the collaborative workspace.

**Rules for Success:**
- **Always update `updatedAt`**: Ensure your API calls update the timestamp so the UI knows the data is fresh.
- **Use friendly `supervisorNotes`**: These appear in the task details and provide the human-readable context for the handoff.
