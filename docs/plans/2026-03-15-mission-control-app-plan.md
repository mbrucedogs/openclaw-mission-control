# Mission Control App Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a local-only Next.js Mission Control app for OpenClaw that turns real OpenClaw state into an operational dashboard for tasking, scheduling, project tracking, team routing, documents, and memory review.

**Architecture:** Use a phased operational-hub approach. OpenClaw files and runtime state remain the source of truth, while Mission Control adds a lightweight local cache/index for search, cross-linking, and fast UI reads. Deliver the highest-value operational screens first, then layer in document and memory indexing, and defer the visual office view until the workflow model is stable.

**Tech Stack:** Next.js App Router, TypeScript, local API routes or server actions, SQLite for cache/indexing, filesystem ingestion for OpenClaw state, React UI, local-only deployment on localhost.

---

## Summary

Build the app in `/Volumes/Data/openclaw/workspace/projects/Web/alex-mission-control/` as a local dashboard inspired by the transcript screens:
- `Task Board`
- `Calendar`
- `Projects`
- `Memories`
- `Docs`
- `Team`
- `Office`

The app should use this org structure as the canonical team model and workflow routing system:
- `Matt` = Real person (me) - strategic direction and approvals
- `Max` = chief of staff / orchestrator
- `Alice` = research
- `Bob` = implementation
- `Charlie` = testing / QA / review for local models
- `Aegis` = testing / QA / review for cloud models
- `Tron` = cron jobs / scheduled automation

Delivery should be phased:
- Phase 1: `Task Board`, `Calendar`, `Projects`, `Team`, app shell, ingestion, local cache/index
- Phase 2: `Memories`, `Docs`, search, richer cross-linking
- Phase 3: `Office` visualization and reverse-prompt recommendation surfaces

## Important Interfaces and Types

Define normalized internal types so UI code never depends directly on raw OpenClaw file formats:
- `Task`
- `Project`
- `Agent`
- `ScheduleJob`
- `ActivityEvent`
- `MemoryEntry`
- `DocumentEntry`

Define internal endpoints or server actions for:
- `/api/tasks`
- `/api/projects`
- `/api/team`
- `/api/calendar`
- `/api/activity`
- `/api/memories`
- `/api/docs`

Define workflow metadata on tasks:
- `owner`
- `requestedBy`
- `reviewer`
- `project`
- `executionMode` with values `local` or `cloud`
- `scheduleRef`

Use this fixed workflow state model in v1:
- `Backlog`
- `Ready`
- `In Progress`
- `Review`
- `Approved`
- `Done`
- `Scheduled`

## Implementation Changes

### Task 1: Scaffold the local app shell

**Files:**
- Create: `/Volumes/Data/openclaw/workspace/projects/Web/alex-mission-control/package.json`
- Create: `/Volumes/Data/openclaw/workspace/projects/Web/alex-mission-control/next.config.*`
- Create: `/Volumes/Data/openclaw/workspace/projects/Web/alex-mission-control/tsconfig.json`
- Create: `/Volumes/Data/openclaw/workspace/projects/Web/alex-mission-control/src/app/...`
- Create: `/Volumes/Data/openclaw/workspace/projects/Web/alex-mission-control/src/components/...`

**Step 1: Write the failing setup check**

Create a minimal startup verification target for the empty app.

**Step 2: Run startup verification**

Run: `npm install`
Expected: dependencies install successfully in the project directory

**Step 3: Write minimal shell implementation**

Create a Next.js app shell with:
- left navigation for all transcript-inspired screens
- dashboard layout
- placeholder routes for each screen
- localhost-focused configuration

**Step 4: Run the app locally**

Run: `npm run dev`
Expected: app serves locally and navigation renders with placeholder screens

**Step 5: Commit**

```bash
git add .
git commit -m "feat: scaffold mission control app shell"
```

### Task 2: Build the ingestion and cache/index layer

**Files:**
- Create: `/Volumes/Data/openclaw/workspace/projects/Web/alex-mission-control/src/lib/openclaw/...`
- Create: `/Volumes/Data/openclaw/workspace/projects/Web/alex-mission-control/src/lib/db/...`
- Create: `/Volumes/Data/openclaw/workspace/projects/Web/alex-mission-control/src/lib/domain/...`
- Create: `/Volumes/Data/openclaw/workspace/projects/Web/alex-mission-control/src/lib/types.ts`

**Step 1: Write failing tests for normalization**

Cover:
- raw task state maps to `Task`
- scheduled state maps to `ScheduleJob`
- memory files map to `MemoryEntry`
- documents map to `DocumentEntry`

**Step 2: Run targeted tests**

Run: `npm test`
Expected: failures indicate missing ingestion and mapping code

**Step 3: Write minimal implementation**

Implement:
- filesystem readers for relevant OpenClaw sources
- normalized mapping functions
- SQLite-backed index/cache for search and cross-linking
- refresh/sync entrypoints

**Step 4: Run tests**

Run: `npm test`
Expected: ingestion and normalization tests pass

**Step 5: Commit**

```bash
git add .
git commit -m "feat: add openclaw ingestion and cache layer"
```

### Task 3: Implement the Team screen and workflow routing

**Files:**
- Create: `/Volumes/Data/openclaw/workspace/projects/Web/alex-mission-control/src/data/team-config.*`
- Create: `/Volumes/Data/openclaw/workspace/projects/Web/alex-mission-control/src/app/team/...`
- Modify: `/Volumes/Data/openclaw/workspace/projects/Web/alex-mission-control/src/lib/domain/...`

**Step 1: Write failing tests for team routing**

Cover:
- research tasks route to `Alice`
- implementation tasks route to `Bob`
- local-model review routes to `Charlie`
- cloud-model review routes to `Aegis`
- scheduled work routes to `Tron`
- strategic approvals route to `Matt`
- orchestration defaults to `Max`

**Step 2: Run targeted tests**

Run: `npm test`
Expected: routing tests fail before the config and rules exist

**Step 3: Write minimal implementation**

Create:
- mission statement support
- team roster config seeded with your org structure
- routing rules and role descriptions
- Team screen UI showing responsibilities, runtime notes, and workflow ownership

**Step 4: Run tests**

Run: `npm test`
Expected: team routing tests pass and Team screen renders with the expected org structure

**Step 5: Commit**

```bash
git add .
git commit -m "feat: add team model and routing rules"
```

### Task 4: Implement Task Board with activity feed

**Files:**
- Create: `/Volumes/Data/openclaw/workspace/projects/Web/alex-mission-control/src/app/tasks/...`
- Create: `/Volumes/Data/openclaw/workspace/projects/Web/alex-mission-control/src/components/tasks/...`
- Modify: `/Volumes/Data/openclaw/workspace/projects/Web/alex-mission-control/src/lib/domain/...`

**Step 1: Write failing tests for task workflow actions**

Cover:
- creating a task
- assigning a task
- moving task states
- sending a task to review
- approving and rejecting tasks
- activity events emitted for each change

**Step 2: Run targeted tests**

Run: `npm test`
Expected: task workflow tests fail before board behavior exists

**Step 3: Write minimal implementation**

Implement:
- kanban board UI
- task cards with assignee, reviewer, project, and execution mode
- live activity feed
- safe write actions for the v1 workflow only

**Step 4: Run tests**

Run: `npm test`
Expected: task workflow tests pass

**Step 5: Commit**

```bash
git add .
git commit -m "feat: add task board and activity feed"
```

### Task 5: Implement Calendar and scheduled work visibility

**Files:**
- Create: `/Volumes/Data/openclaw/workspace/projects/Web/alex-mission-control/src/app/calendar/...`
- Create: `/Volumes/Data/openclaw/workspace/projects/Web/alex-mission-control/src/components/calendar/...`
- Modify: `/Volumes/Data/openclaw/workspace/projects/Web/alex-mission-control/src/lib/openclaw/...`

**Step 1: Write failing tests for schedule ingestion**

Cover:
- cron and scheduled work appear as calendar entries
- scheduled entries link back to tasks/projects
- missing or malformed schedule sources degrade gracefully

**Step 2: Run targeted tests**

Run: `npm test`
Expected: schedule tests fail before calendar mapping exists

**Step 3: Write minimal implementation**

Implement:
- calendar screen
- upcoming scheduled jobs list
- task/project linkage
- read-heavy schedule inspection with only safe refresh controls

**Step 4: Run tests**

Run: `npm test`
Expected: calendar ingestion and rendering tests pass

**Step 5: Commit**

```bash
git add .
git commit -m "feat: add calendar and scheduled work views"
```

### Task 6: Implement Projects aggregation

**Files:**
- Create: `/Volumes/Data/openclaw/workspace/projects/Web/alex-mission-control/src/app/projects/...`
- Create: `/Volumes/Data/openclaw/workspace/projects/Web/alex-mission-control/src/components/projects/...`
- Modify: `/Volumes/Data/openclaw/workspace/projects/Web/alex-mission-control/src/lib/domain/...`

**Step 1: Write failing tests for project summaries**

Cover:
- project progress aggregation
- linked tasks render correctly
- recent activity resolves correctly
- project relationships to docs and memories are ready for later phases

**Step 2: Run targeted tests**

Run: `npm test`
Expected: project tests fail before aggregation exists

**Step 3: Write minimal implementation**

Implement:
- project list and detail views
- progress summaries
- linked tasks
- recent activity

**Step 4: Run tests**

Run: `npm test`
Expected: project tests pass

**Step 5: Commit**

```bash
git add .
git commit -m "feat: add projects dashboard"
```

### Task 7: Implement Memories and Docs screens

**Files:**
- Create: `/Volumes/Data/openclaw/workspace/projects/Web/alex-mission-control/src/app/memories/...`
- Create: `/Volumes/Data/openclaw/workspace/projects/Web/alex-mission-control/src/app/docs/...`
- Create: `/Volumes/Data/openclaw/workspace/projects/Web/alex-mission-control/src/components/memories/...`
- Create: `/Volumes/Data/openclaw/workspace/projects/Web/alex-mission-control/src/components/docs/...`

**Step 1: Write failing tests for indexing and search**

Cover:
- memories group by day
- long-term memory renders separately
- documents categorize correctly
- full-text search works across docs and memories

**Step 2: Run targeted tests**

Run: `npm test`
Expected: indexing and search tests fail before UI and index queries exist

**Step 3: Write minimal implementation**

Implement:
- daily memories browser
- long-term memory view
- searchable docs list
- document categories and project linkage

**Step 4: Run tests**

Run: `npm test`
Expected: docs and memories tests pass

**Step 5: Commit**

```bash
git add .
git commit -m "feat: add memory and docs screens"
```

### Task 8: Implement Office visualization as a later-phase read-only view

**Files:**
- Create: `/Volumes/Data/openclaw/workspace/projects/Web/alex-mission-control/src/app/office/...`
- Create: `/Volumes/Data/openclaw/workspace/projects/Web/alex-mission-control/src/components/office/...`

**Step 1: Write failing tests for office-state mapping**

Cover:
- active agents map to display positions
- current work state maps to visual states
- empty state renders when no active work exists

**Step 2: Run targeted tests**

Run: `npm test`
Expected: office tests fail before visualization mapping exists

**Step 3: Write minimal implementation**

Implement:
- read-only office visualization
- display of active agents and current work
- simple lightweight animation or state changes only after data correctness is verified

**Step 4: Run tests**

Run: `npm test`
Expected: office mapping tests pass

**Step 5: Commit**

```bash
git add .
git commit -m "feat: add office visualization"
```

## Test Cases and Scenarios

- App boots locally and all routes render without requiring remote services.
- Empty-state rendering works when OpenClaw sources are missing or partially unavailable.
- Task creation, assignment, review, approval, and state changes preserve routing metadata.
- Tasks using local execution route review to `Charlie`.
- Tasks using cloud execution route review to `Aegis`.
- Scheduled tasks appear in `Calendar` and reference `Tron`.
- Strategic or approval-gated items reference `Matt`.
- Projects aggregate tasks and recent activity correctly.
- Daily memories and long-term memory render as separate navigable datasets.
- Docs search returns expected matches and categories.
- Office screen never becomes a dependency for core workflow correctness.

## Assumptions and Defaults

- The app is single-user and localhost-only in v1.
- No authentication is required in the initial build.
- OpenClaw remains the source of truth; Mission Control owns only cache/index and UI relationships.
- The org structure above is the exact default team configuration unless changed later.
- The app should be extendable so additional custom tools can be added later without redesigning the navigation or domain model.

Plan complete and saved to `docs/plans/2026-03-15-mission-control-app-plan.md`.

Two execution options:

1. Subagent-Driven (this session) - dispatch a fresh subagent per task, review between tasks, fast iteration
2. Parallel Session (separate) - open a new session with `executing-plans`, batch execution with checkpoints
