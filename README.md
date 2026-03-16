# Mission Control - Autonomous Organization Dashboard

Mission Control is a living dashboard for your OpenClaw autonomous organization. It provides a real-time "Command Center" view of your agents, their statuses, tasks, and the overall orchestration pipeline.

> [!IMPORTANT]
> This application is **dynamically driven** by your OpenClaw workspace. It pulls identities, roles, and hierarchy directly from your Markdown configuration and technical JSON files.

---

## 🛠 Prerequisites

To run this application, you need:

- **Node.js 18+**
- **OpenClaw Workspace**: A local directory containing your agent configuration.
- **OpenClaw Config**: The global `openclaw.json` file (usually at `~/.openclaw/openclaw.json`).

## 🚀 Quick Start

1.  **Clone and Install**:
    ```bash
    npm install
    ```

2.  **Environment Setup**:
    Ensure your workspace path is correctly set in `src/lib/openclaw/discovery.ts` (currently defaults to `/Volumes/Data/openclaw/workspace`).

3.  **Launch Dashboard**:
    ```bash
    npm run dev
    ```
    Access at `http://localhost:3000`.

---

## 🏗 The "Holistic Discovery" System

Mission Control merges four distinct data sources to build the team roster:

### 1. Global Identity (`openclaw.json`)
Located at `~/.openclaw/openclaw.json`.
- **Primary Source for Technical IDs**: This maps "friendly" IDs to technical ones (e.g., `Max` -> `main`). 
- **Session Correlation**: The app uses these IDs to poll for live agent activity.

### 2. Team Roster (`agents/TEAM-REGISTRY.md`)
The core list of agents.
- **Table Detection**: Looks for a Markdown table with `Name`, `Role`, and `Folder`.
- **Folder Mapping**: Tells the app where to find the "Soul" of each agent.

### 3. Orchestration Flow (`TEAM_GOVERNANCE.md`)
Defines the hierarchy.
- **Pipeline Parsing**: The app parses strings like `Matt -> Max -> Alice -> Done` to determine the display order on the **Team** screen.
- **Layer Assignment**: Automatically categorizes agents into **Governance**, **Pipeline**, and **Automation** layers based on roles and the pipeline flow.

### 4. Agent Profiles (`SOUL.md` & `AGENTS.md`)
Every agent folder found in the registry must contain these:
- **`SOUL.md`**: Mission statement extraction from the "Core Identity" section.
- **`AGENTS.md`**: Skill extraction from the "Skills" or "Roles" section.

---

## 📂 Project Structure

- `src/lib/openclaw/discovery.ts`: The bridge that parses the workspace and merges the data.
- `src/lib/domain/agents.ts`: Syncs discovered agents into the local SQLite database for status tracking.
- `src/app/office/OfficeClient.tsx`: The premium 2D floor plan rendering.
- `src/app/team/page.tsx`: The organizational hierarchy and role cards.

## 🔄 Adding an Agent

To add an agent so they show up in Mission Control:
1.  Add them to your **Global Config** (`openclaw.json`) if they need session tracking.
2.  Add a row to your `TEAM-REGISTRY.md`.
3.  Create their folder with `SOUL.md` and `AGENTS.md`.
4.  Optionally add them to the arrow-flow in `TEAM_GOVERNANCE.md`.
