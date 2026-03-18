# AI Training Guide

**How to onboard an AI assistant to Mission Control**

**For:** Users setting up Mission Control with an AI orchestrator (an Orchestrator)
**Purpose:** Teach the AI how to learn and use this system

---

## The Learning Process

**AI assistants learn Mission Control in stages:**

### Stage 1: Critical Facts (Always Loaded)

**These facts are in the AI's MEMORY.md and available on every startup:**

- **What:** Multi-agent pipeline (Researcher → Builder → Tester → Reviewer)
- **Workflows:** NOT pre-seeded, created dynamically at runtime
- **Discovery:** Agents discovered from TEAM-REGISTRY.md
- **Pipelines:** Multiple types (standard, quick-fix, research, docs, automation)
- **Keywords:** Task text determines which pipeline is used
- **Requirements:** Every task needs DOCUMENTS_ROOT, deliverables, evidence format, tools, fallback
- **Monitoring:** Automation agent checks every 2 min, AI only wakes when work detected

**With just these facts, the AI can:**
- Answer basic questions about how orchestration works
- Know that workflows are created dynamically
- Understand the automated monitoring design

### Stage 2: Knowledge Index (First Deep Dive)

**When user asks about task orchestration, the AI reads:**

1. **KNOWLEDGE_INDEX.md** - Quick reference, trigger phrases, critical facts
2. Then specific docs based on the topic:
   - ORCHESTRATION.md - Full system documentation
   - TASK_CREATION_REQUIREMENTS.md - Task template
   - QUICKSTART.md - Setup guide

**This gives the AI:**
- Complete understanding of the system
- Document map for future reference
- Trigger phrases to recognize user intent
- All critical facts in one place

### Stage 3: Specific Topics (On Demand)

**When user asks specific questions, the AI reads:**

| User Asks | AI Reads |
|-----------|----------|
| "How do I create a task?" | TASK_CREATION_REQUIREMENTS.md |
| "What pipeline will this use?" | ORCHESTRATION.md (Dynamic Assembly section) |
| "How does monitoring work?" | ORCHESTRATION.md (Part 5) |
| "Fresh install, what happens?" | ORCHESTRATION.md (Part 4) |

---

## How to Train Your AI

### Day 1: Initial Setup

**You:** "What do you know about task orchestration?"

**AI should:**
1. Answer with critical facts from MEMORY.md
2. Mention that detailed docs exist
3. Ask if you want the full details

**You:** "Yes, give me the full picture"

**AI should:**
1. Read KNOWLEDGE_INDEX.md
2. Read ORCHESTRATION.md
3. Read TASK_CREATION_REQUIREMENTS.md
4. Answer with complete knowledge

### Day 2-3: Practice Tasks

**Create test tasks and verify the AI:**
- Creates tasks with all required fields
- Uses proper DOCUMENTS_ROOT paths
- Includes evidence attachment format
- Provides fallback plans
- Spawns agents correctly

**If the AI misses something:**
- Point out what was missing
- Reference the specific document
- Have it re-read that section

### Day 4+: Gap Analysis

**Ask the AI:**
- "Explain the full task pipeline"
- "What happens on fresh install?"
- "How do you determine which pipeline to use?"
- "What are the required task fields?"

**Check for:**
- Complete answers
- Correct understanding
- References to specific docs
- Proper use of templates

**If gaps found:**
- Update KNOWLEDGE_INDEX.md with missing info
- Add to critical facts in MEMORY.md
- Clarify in specific documents

---

## The Knowledge Index Pattern

**Why this works:**

1. **Startup is fast** - Only critical facts loaded
2. **Deep knowledge available** - Full docs on demand
3. **Clear trigger phrases** - AI knows when to load what
4. **Single source of truth** - KNOWLEDGE_INDEX.md has everything
5. **Easy to update** - Change one file, all AIs get updated

**For the AI:**
- Knows basics immediately
- Loads details when needed
- Never has stale information
- Can answer "I know the basics, want me to read the full docs?"

**For you:**
- Don't have to manage huge context
- AI learns incrementally
- Can verify understanding step by step
- Easy to correct gaps

---

## Common Training Issues

### Issue: AI Doesn't Know Critical Facts

**Symptom:** "What's task orchestration?" → "I don't know"

**Fix:** 
- Check MEMORY.md has Task Orchestration section
- Ensure critical facts are listed
- Restart AI session

### Issue: AI Can't Find Documents

**Symptom:** "I can't find ORCHESTRATION.md"

**Fix:**
- Verify docs are in `alex-mission-control/docs/`
- Check KNOWLEDGE_INDEX.md has correct paths
- Ensure AI has file system access

### Issue: AI Doesn't Load Full Docs

**Symptom:** Asks about orchestration → gives 1-sentence answer

**Fix:**
- Tell AI: "Read the full documentation"
- Check KNOWLEDGE_INDEX.md is referenced in MEMORY.md
- Verify trigger phrases are recognized

### Issue: AI Creates Tasks Wrong

**Symptom:** Tasks missing required fields

**Fix:**
- Have AI re-read TASK_CREATION_REQUIREMENTS.md
- Point out specific missing fields
- Reference the task template
- Practice with example tasks

---

## Verification Checklist

**After training, your AI should be able to:**

- [ ] Explain task orchestration with critical facts
- [ ] Load full documentation when asked
- [ ] Create tasks with all 8 required fields
- [ ] Know which pipeline a task will use based on keywords
- [ ] Understand fresh install behavior
- [ ] Explain the two-tier monitoring design
- [ ] Reference specific documents by name
- [ ] Use the task template correctly

---

## Quick Reference for Training

**To check if AI knows basics:**
"What do you know about task orchestration?"

**To load full knowledge:**
"Read the full documentation on task orchestration"

**To verify task creation:**
"Create a task to [do something]"

**To check understanding:**
"Explain how you determine which pipeline to use"

**To find gaps:**
"What happens on a fresh install of Mission Control?"

---

**Document Location:** `alex-mission-control/docs/AI_TRAINING_GUIDE.md`
**Last Updated:** 2026-03-16
**Version:** 1.0
**Purpose:** Guide users through training their AI on Mission Control
**See Also:** KNOWLEDGE_INDEX.md (what the AI reads), README.md (getting started)