# Task Creation Requirements

**Required for every task created by the Orchestrator (Max)**

---

## Critical Fields

Every task MUST include:

| Field | Required | Purpose |
|-------|----------|---------|
| `title` | ✅ Yes | Clear, descriptive task name |
| `description` | ✅ Yes | Detailed requirements |
| `DOCUMENTS_ROOT` | ✅ Yes | Where files must be saved |
| `requiredDeliverables` | ✅ Yes | Specific checklist of outputs |
| `evidenceFormat` | ✅ Yes | How to attach evidence via API |
| `toolRequirements` | ⚠️ Conditional | What tools must be available |
| `fallback` | ⚠️ Conditional | What to do if primary method fails |

---

## Task Description Template

```markdown
**Task:** [Clear action statement]

**Input:** [What the agent receives]

**Required Output:**
1. [Specific deliverable 1]
2. [Specific deliverable 2]
3. [Specific deliverable 3]

**Save Location:** {DOCUMENTS_ROOT}/[folder]/[filename]

**Evidence to Attach:**
- File path: file://{DOCUMENTS_ROOT}/[path]
- Description: "[What was delivered]"
- Type: [document/code/test/screenshot/link]

**Tool Requirements:**
- Primary: [tool name] - [how to check if available]
- Fallback: [alternative tool] - [when to use]

**Validation Checklist:**
- [ ] Output file exists at specified location
- [ ] File has content (not empty)
- [ ] Evidence attached via API
- [ ] Summary comment posted

**Questions?** Ask Max - monitoring this task.

Read your SOUL.md at: [path]
```

---

## Evidence Attachment Format

**Exact API call:**
```bash
curl -X POST http://localhost:4000/api/tasks/{task-id}/evidence \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{
    "evidenceType": "document",
    "url": "file:///Users/mattbruce/.openclaw/workspace/projects/Documents/[path]",
    "description": "[What was created/delivered]",
    "addedBy": "[agent-name]"
  }'
```

**Evidence Types:**
- `document` - Markdown, text files, reports
- `code` - Source code files
- `test` - Test results, QA reports
- `screenshot` - Images, visual evidence
- `link` - URLs, external resources

---

## Environment Variables

**Must be set in agent environment:**

| Variable | Value | Purpose |
|----------|-------|---------|
| `DOCUMENTS_ROOT` | `/Users/mattbruce/.openclaw/workspace/projects/Documents` | Where to save files |
| `API_KEY` | From `.env` | Mission Control API auth |
| `API_URL` | `http://localhost:4000` | Mission Control endpoint |

---

## File Naming Conventions

**Research documents:**
- `YouTube-Video-{ID}-Analysis-YYYY-MM-DD.md`
- `Research-{Topic}-Findings-YYYY-MM-DD.md`

**Code deliverables:**
- `{Project}-{Feature}-Implementation.md`
- `{Project}-{Feature}-Code.{ext}`

**Summaries:**
- `{Source}-Summary-YYYY-MM-DD.md`

**Plans:**
- `{PROJECT}-Plan-v{N}.md`

---

## Tool Availability

**Always check tools exist before assigning:**

```bash
# Check if tool exists
which yt-dlp || echo "yt-dlp not found"
which python3 || echo "python3 not found"
pip3 list | grep -i youtube || echo "youtube-transcript-api not installed"
```

**Common Tools:**
- `yt-dlp` - YouTube downloads (installed)
- `python3` - Script execution (installed at `/opt/homebrew/bin/python3`)
- `pip3` - Package management (installed)
- `curl` - API calls (installed)

**If tool missing:**
1. Try alternative tool
2. If no alternative, mark task blocked
3. Post comment explaining blocker
4. Assign back to Max for resolution

---

## Fallback Patterns

**YouTube transcript download:**
1. Primary: `yt-dlp --write-auto-sub --sub-lang en --skip-download`
2. Fallback: `youtube-transcript-api` Python library
3. Last resort: Browser automation

**Research:**
1. Primary: Direct API/tool access
2. Fallback: Browser automation skill
3. Last resort: Manual research by user

---

## Example Complete Task

```javascript
sessions_spawn({
  task: `TASK: Download YouTube transcript and create summary

**Video:** https://www.youtube.com/watch?v=vxpuLIA17q4

**Pipeline:** Research → Document → Review - Step 1/3
**Current Phase:** Research

**Required Output:**
1. Download transcript using yt-dlp (auto-generated subtitles)
2. Save SRT file to: {DOCUMENTS_ROOT}/Research/
3. Extract clean text version
4. Identify key topics and timestamps

**Save Location:** 
- Raw: {DOCUMENTS_ROOT}/Research/Video-{ID}.en.srt
- Clean: {DOCUMENTS_ROOT}/Research/Video-{ID}-transcript.txt

**Evidence to Attach:**
- Type: document
- Path: file://{DOCUMENTS_ROOT}/Research/Video-{ID}.en.srt
- Description: "YouTube transcript downloaded with yt-dlp"

**Tool Requirements:**
- Primary: yt-dlp (check: which yt-dlp)
- Fallback: None - if yt-dlp fails, mark task blocked

**Validation Checklist:**
- [ ] SRT file exists in Research folder
- [ ] File has content (> 100 lines expected)
- [ ] Evidence attached via API
- [ ] Comment posted with summary

**Questions?** Ask Max - monitoring this task.

Read your SOUL.md at: ~/.openclaw/workspace/agents/alice-researcher/SOUL.md`,
  label: "Alice-Research-task-[id]",
  agentId: "main"
})
```

---

## Common Failures

| Failure | Why | Prevention |
|---------|-----|------------|
| File saved wrong location | DOCUMENTS_ROOT not specified | Always include exact path in task |
| Evidence not attached | No API format provided | Include exact curl command |
| Tool not found | Didn't check availability | Specify tool check in requirements |
| Empty deliverable | No validation checklist | Include checklist in task |
| Agent stuck | No fallback specified | Always provide fallback options |

---

**Document Location:** `alex-mission-control/docs/TASK_CREATION_REQUIREMENTS.md`
**Last Updated:** 2026-03-16
**Applies To:** All tasks created by Orchestrator (Max)