# OpenClaw Mission Control - Knowledge Index

**Welcome.** This is the central reference point for the OpenClaw Mission Control orchestration system. Whether you're a Primary AI learning to orchestrate, or setting up your own agent team, start here.

---

## 📚 Documentation Structure

### For Primary AIs (Orchestrators)

Start here to learn how to manage agent pipelines:

1. **[ORCHESTRATION.md](./ORCHESTRATION.md)** - Master orchestration guide
   - Part 1: Your role as conductor (validation, spawn commands, common failures)
   - Part 2: Technical reference (APIs, database schemas)
   - Part 3: Generic examples for any team

2. **[QUICKSTART.md](./QUICKSTART.md)** - Get started in 5 minutes

### For Agent Teams (Your Specific Setup)

**Configure your own team** (example: Researcher/Builder/Tester/Reviewer/Automation):

3. **AGENT_PIPELINE_SETUP.md** (in your workspace root) - Your team setup
   - Agent roles and responsibilities
   - Spawn commands for your agents
   - Example flows (e.g., Researcher → Builder → Tester → Reviewer)
   - Troubleshooting for your team

4. **TEAM_GOVERNANCE.md** (in your workspace root) - Handoff rules and validation
   - Pipeline flow: User → Orchestrator → Agent1 → Agent2 → Agent3 → Done
   - Validation checklist
   - Evidence requirements
   - Common failures & prevention

5. **TEAM-REGISTRY.md** (in your workspace root) - Agent registry
   - Team member table
   - Spawn command templates
   - Communication formats

### For New Installations (Generic Template)

**Setting up your own agent team?** Use these examples:

6. **[examples/openclaw-workspace/](./examples/openclaw-workspace/)** - Complete generic template
   - `openclaw.json.example` - Agent configuration template
   - `TEAM-REGISTRY.md` - Generic team registry (Leo/Sam/Dana/Jordan)
   - `TEAM_GOVERNANCE.md` - Generic governance rules
   - `AGENT_PIPELINE_SETUP.md` - Generic setup guide
   - `agents/` - Agent templates (SOUL.md + AGENTS.md for each role)

---

## 🎯 Quick Reference

### Validation Checklist (CRITICAL)

Before approving ANY handoff:

- [ ] **Agent was spawned** (not you doing the work)
- [ ] **Agent posted their own findings** (not you adding comments)
- [ ] **Agent attached their own evidence** via `/api/tasks/{id}/evidence`
- [ ] **Files in DOCUMENTS_ROOT** (not arbitrary locations like `~/Documents/`)
- [ ] **Completion comment with summary** exists

### Evidence Attachment

```
POST /api/tasks/{id}/evidence
{
  "evidenceType": "document",
  "url": "file://{DOCUMENTS_ROOT}/plans/example.md",
  "description": "What was delivered",
  "addedBy": "agent-name"
}
```

### Common Failures

| Failure | Prevention |
|---------|------------|
| **You Did The Work** | Always spawn assigned agent. Never execute skills yourself. |
| **Missing Evidence** | Validate evidence exists before approving. Reject if missing. |
| **Wrong File Location** | Verify DOCUMENTS_ROOT. Reject if files in wrong location. |
| **You Added Comments For Agent** | Make agent post their own findings. Reject if they don't. |
| **Task Complete Without Validation** | Validate ALL checklist items before marking Complete. |

---

## 🚀 For New Teams

Want to set up your own agent team? Copy the example:

```bash
# Copy generic template to your workspace
cp -r examples/openclaw-workspace/ ~/your-workspace/

# Customize agents/
# - Rename agent folders
# - Edit SOUL.md for each agent
# - Update TEAM-REGISTRY.md with your names
# - Configure openclaw.json

# Start orchestrating
```

---

## 📁 File Locations

### In This Project (`alex-mission-control/`)
- `docs/ORCHESTRATION.md` - Master orchestration guide
- `docs/QUICKSTART.md` - Quick start guide
- `docs/README.md` - Project overview
- `examples/openclaw-workspace/` - Generic template for new teams

### In Your Workspace (loaded at runtime)
Located at `~/.openclaw/workspace/` (or your configured workspace):
- `AGENT_PIPELINE_SETUP.md` - Your team setup (customize with your agent names)
- `TEAM_GOVERNANCE.md` - Your governance rules
- `TEAM-REGISTRY.md` - Your agent registry
- `ORCHESTRATION.md` - Quick reference (if copied from docs)
- `SOUL.md` - Your identity (if applicable)
- `USER.md` - User preferences
- `AGENTS.md` - Your role definition

---

## 🔗 Related Resources

- **OpenClaw Documentation:** See your OpenClaw installation docs
- **Mission Control API:** http://localhost:4000/api (when running)
- **Web UI:** http://localhost:4000 (when running)

---

## 📝 Version

**Last Updated:** 2026-03-16
**Version:** 2.0
**Purpose:** Central knowledge index for OpenClaw Mission Control

---

**Remember:** You are the CONDUCTOR, not the MUSICIAN. Spawn agents, validate their work, manage handoffs. Never do the work yourself.
