# Task Creation Requirements

**Required checklist for every task created by the Orchestrator**

---

## The Golden Rule

**A task without proper requirements will fail.** Agents need clear instructions on:
- What to deliver
- Where to save it
- How to prove it's done
- What tools to use
- What to do if things break

---

## Required Fields (Every Task)

### 1. Clear Task Description
**What:** One sentence describing the action

**Good:** "Download YouTube transcript and extract key content"
**Bad:** "Handle the video thing"

---

### 2. Input Specification
**What:** What the agent receives to work with

**Examples:**
- URL: `https://youtube.com/watch?v=...`
- File path: `/path/to/input/file`
- Data: "Research topic X"
- Requirements: "Build feature Y"

---

### 3. Required Deliverables (Checklist)
**What:** Specific, verifiable outputs

**Format:** Numbered list with clear criteria

**Example:**
```
Required Output:
1. Raw transcript file in SRT format
2. Clean text version (no timestamps)
3. Summary of key topics (3-5 bullet points)
4. List of timestamps for important moments
```

**Bad example:**
```
Required Output:
- Do the thing
- Make it good
```

---

### 4. Save Location (DOCUMENTS_ROOT)
**What:** Exact path where files must be saved

**Format:** `{DOCUMENTS_ROOT}/[folder]/[filename]`

**Environment Variable:**
```
DOCUMENTS_ROOT=/Users/[user]/.openclaw/workspace/projects/Documents
```

**Why this matters:**
- Agents save to wrong locations without it
- Evidence attachments break
- Files get lost
- Can't validate completion

---

### 5. Evidence Attachment Format
**What:** Exact API call to attach proof of work

**Required API Call:**
```bash
curl -X POST http://localhost:4000/api/tasks/{task-id}/evidence \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{
    "evidenceType": "[document|code|test|screenshot|link]",
    "url": "file://{DOCUMENTS_ROOT}/[path/to/file]",
    "description": "[What was delivered - be specific]",
    "addedBy": "[agent-name]"
  }'
```

**Evidence Types:**
- `document` - Markdown, text, reports
- `code` - Source files
- `test` - Test results, QA reports
- `screenshot` - Images, visual proof
- `link` - URLs, external resources

---

### 6. Tool Requirements
**What:** What tools must be available

**Checklist:**
- [ ] Primary tool specified
- [ ] How to check availability included
- [ ] Fallback option identified
- [ ] Installation instructions if needed

**Example:**
```
Tool Requirements:
- Primary: yt-dlp
  Check: which yt-dlp
  Install: brew install yt-dlp
- Fallback: youtube-transcript-api (Python)
  Check: pip3 list | grep youtube
  Install: pip3 install youtube-transcript-api
```

---

### 7. Fallback Plan
**What:** What to do if primary method fails

**Required:** At least one fallback for critical steps

**Example:**
```
Fallback Plan:
1. Primary: yt-dlp --write-auto-sub
2. If fails: Try youtube-transcript-api Python library
3. If fails: Use browser automation skill
4. If all fail: Mark task blocked, post comment with error details
```

---

### 8. Validation Checklist
**What:** How to verify task is truly complete

**Format:** Checkbox list

**Example:**
```
Validation Checklist:
- [ ] Output file exists at specified location
- [ ] File has content (not empty, > 0 bytes)
- [ ] File format is correct (.srt, .md, etc.)
- [ ] Evidence attached via API
- [ ] Summary comment posted to task
- [ ] All required deliverables present
```

---

## File Naming Conventions

Use consistent patterns:

| Type | Pattern | Example |
|------|---------|---------|
| Research | `{Source}-{ID}-Analysis-YYYY-MM-DD.md` | `YouTube-Video-abc123-Analysis-2026-03-16.md` |
| Code | `{Project}-{Feature}-Implementation.{ext}` | `MissionControl-Auth-Implementation.ts` |
| Summary | `{Source}-Summary-YYYY-MM-DD.md` | `YouTube-Video-abc123-Summary-2026-03-16.md` |
| Plans | `{PROJECT}-Plan-v{N}.md` | `AUTH-Plan-v1.md` |
| Transcripts | `{Title}-transcript.{ext}` | `Video-Title-transcript.txt` |

---

## Environment Variables

**Must be available to agents:**

```bash
# Required
export DOCUMENTS_ROOT="/Users/[user]/.openclaw/workspace/projects/Documents"
export API_KEY="[from .env file]"
export API_URL="http://localhost:4000"

# Optional but recommended
export WORKSPACE_ROOT="/Users/[user]/.openclaw/workspace"
```

---

## Task Template (Copy This)

```markdown
**Task:** [Clear one-sentence description]

**Input:**
- [What the agent receives]

**Required Output:**
1. [Specific deliverable 1 with criteria]
2. [Specific deliverable 2 with criteria]
3. [Specific deliverable 3 with criteria]

**Save Location:**
- Primary: {DOCUMENTS_ROOT}/[Folder]/[filename.ext]
- Secondary: {DOCUMENTS_ROOT}/[Folder]/[filename-alt.ext]

**Evidence to Attach:**
- Type: [document|code|test|screenshot|link]
- Path: file://{DOCUMENTS_ROOT}/[path]
- Description: "[Specific description of what was delivered]"

**Tool Requirements:**
- Primary: [tool name]
  - Check: [command to verify]
  - Install: [how to install if missing]
- Fallback: [alternative tool]
  - When to use: [condition]

**Fallback Plan:**
1. Try [primary method]
2. If fails: Try [fallback method]
3. If fails: Mark task blocked, post comment with error

**Validation Checklist:**
- [ ] [Criterion 1]
- [ ] [Criterion 2]
- [ ] [Criterion 3]
- [ ] Evidence attached via API
- [ ] Summary comment posted

**Questions?** Ask [Orchestrator name] - monitoring this task.

Read your SOUL.md at: [path to agent SOUL.md]
```

---

## Common Failures (When Requirements Missing)

| Missing Requirement | What Happens | Prevention |
|---------------------|--------------|------------|
| No DOCUMENTS_ROOT | Agent saves to random location | Always specify exact path |
| No evidence format | Agent doesn't attach proof | Include exact API call |
| No tool requirements | Agent tries missing tools | List tools + check commands |
| No fallback | Agent gets stuck | Always provide Plan B |
| No validation checklist | Can't verify completion | Include checkbox list |
| Vague deliverables | Agent delivers wrong thing | Be specific and measurable |

---

## Quick Checklist (Before Creating Task)

- [ ] Task description is clear and specific
- [ ] Input is fully specified
- [ ] Deliverables are numbered and verifiable
- [ ] Save location uses {DOCUMENTS_ROOT}
- [ ] Evidence API call format included
- [ ] Tools listed with availability checks
- [ ] Fallback plan provided
- [ ] Validation checklist included
- [ ] File naming follows conventions
- [ ] Agent knows who to ask for help

---

**Document Location:** `alex-mission-control/docs/TASK_CREATION_REQUIREMENTS.md`
**Last Updated:** 2026-03-16
**Applies To:** All tasks created by Orchestrator
**See Also:** ORCHESTRATION.md (pipeline logic), README.md (getting started)