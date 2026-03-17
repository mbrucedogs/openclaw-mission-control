# Subagent Team Registry (Example)

## Team Members

| Name | Role | Folder | Status | Model |
|------|------|--------|--------|-------|
| **Leo** | Orchestrator / Governance | `agents/leo-lead/` | ✅ Ready | gpt-4 |
| **Sam** | Research / Analysis | `agents/sam-scout/` | ✅ Ready | gpt-4 |
| **Dana** | Build / Test | `agents/dana-dev/` | ✅ Ready | gpt-4 |
| **Jordan** | Review / Quality Gate | `agents/jordan-review/` | ✅ Ready | gpt-4 |

## Workflow

### Standard Flow
```
Request → Sam (Research) → Dana (Build) → Dana (Test) → Jordan (Review) → Done
```

### Quick Flow
```
Request → Dana (Build) → Dana (Test) → Jordan (Review) → Done
```

## How to Spawn

### Leo (Orchestrator)
```javascript
sessions_spawn({
  task: `ORCHESTRATOR TASK: Task "[title]" (ID: [id]) needs pipeline analysis and execution. Status: [status], Owner: [owner]. Analyze task, determine pipeline, and manage full execution per TEAM_GOVERNANCE.md. Answer agent questions, validate evidence at each handoff, and only assign back to user if you cannot resolve (with detailed comments).`,
  label: "Leo-Orchestrator-[task-id]",
  agentId: "main"
})
```

### Sam (Research)
```javascript
sessions_spawn({
  task: `TASK: [title]\n\nPipeline: [pipeline] - Step [N]/[total]\nCurrent Phase: Research\n\n**Your Mission:**\n[Research task description]\n\n**Deliverables:**\n1. [Finding 1]\n2. [Finding 2]\n\n**Handoff:** When complete, post findings as comment, attach evidence, and I'll route to next phase.\n\n**Questions?** Ask Leo - monitoring this task.\n\nRead your SOUL.md at: {AGENT_PATH}/sam-scout/SOUL.md`,
  label: "Sam-Research-[task-id]",
  agentId: "main"
})
```

### Dana (Build/Test)
```javascript
sessions_spawn({
  task: `TASK: [title]\n\nPipeline: [pipeline] - Step [N]/[total]\nCurrent Phase: [Build/Test]\n\n**Your Mission:**\n[Implementation/testing task]\n\n**Requirements:**\n- [ ] Req 1\n- [ ] Req 2\n\n**Handoff:** When complete, post summary, attach evidence via API, and I'll validate.\n\n**Questions?** Ask Leo.\n\nRead your SOUL.md at: {AGENT_PATH}/dana-dev/SOUL.md`,
  label: "Dana-[phase]-[task-id]",
  agentId: "main"
})
```

### Jordan (Review)
```javascript
sessions_spawn({
  task: `TASK: [title]\n\nPipeline: [pipeline] - Step [N]/[total]\nCurrent Phase: Review\n\n**Your Mission:**\nValidate all deliverables meet requirements.\n\n**Evidence to Review:**\n- [Evidence 1]\n- [Evidence 2]\n\n**Requirements to Validate:**\n- [ ] Req 1\n- [ ] Req 2\n\n**Handoff:** Approve with notes or reject with specific reasons. Attach review notes via evidence API.\n\n**Questions?** Ask Leo.\n\nRead your SOUL.md at: {AGENT_PATH}/jordan-review/SOUL.md`,
  label: "Jordan-Review-[task-id]",
  agentId: "main"
})
```

## Communication Format

- **Sam:** "Sam-Scout ✅ Research complete – Found X, Y, Z – Ready for Dana"
- **Dana:** "Dana-Dev ✅ [Phase] complete – [deliverable] – Ready for Jordan"
- **Jordan:** "Jordan-Reviewer ✅ [Approved/Rejected] – [criteria/issues] – Ready for Leo"
- **Leo:** "Leo-Lead ✅ Task orchestrated – Pipeline executed – Ready for Done"

## File Structure

```
agents/
├── leo-lead/
│   ├── SOUL.md          # Orchestrator personality
│   └── AGENTS.md        # Role definition
├── sam-scout/
│   ├── SOUL.md          # Researcher personality
│   └── AGENTS.md
├── dana-dev/
│   ├── SOUL.md          # Builder personality
│   └── AGENTS.md
├── jordan-review/
│   ├── SOUL.md          # Reviewer personality
│   └── AGENTS.md
└── TEAM-REGISTRY.md     # This file
```

## Validation Rules

See TEAM_GOVERNANCE.md for:
- Orchestrator validation checklist
- Evidence requirements
- Rejection criteria
- Common failures & prevention
