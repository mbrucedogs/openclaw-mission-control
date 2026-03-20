# Claw3D Research Report

## What It Does

Claw3D is a 3D visual workspace layer that sits on top of OpenClaw — think of it as an interactive "AI office" where your agents appear as workers in a shared 3D retro office environment. Instead of staring at logs, dashboards, and terminal output, you *walk through* a virtual space and watch agents work in real time: moving between desks, attending standups, reviewing PRs, running tests, and cleaning up sessions. It also provides a conventional 2D agents workspace (fleet management, chat, settings, approvals) alongside the immersive 3D office view.

**The "3D agent memory" concept** refers to spatially representing agent state and activity — agents are not just invisible background processes; they are animated entities occupying rooms, triggering events, and leaving visual traces of what they are doing. The "memory" part comes from the idea that the 3D world is a persistent, spatially-organized view of what OpenClaw agents have been doing (sessions, tasks, approvals, resets), derived live from gateway event streams rather than stored separately.

## Tech Stack

- **Framework:** Next.js 16 App Router (React 19, TypeScript)
- **3D Rendering:** Three.js, React Three Fiber, Drei (React Three Fiber helpers)
- **Game/Builder Engine:** Phaser 3 (for the /office/builder layout editor)
- **Custom Server:** Node.js server with `ws` WebSocket library for same-origin proxy to OpenClaw Gateway
- **Styling:** Tailwind CSS 4 + CSS animations (tw-animate-css)
- **Testing:** Vitest (unit) + Playwright (E2E)
- **Observability:** @vercel/otel (OpenTelemetry)
- **Key dependencies:** react-markdown, lucide-react, class-variance-authority
- **State/auth:** Gateway-owned; local Studio persists only UI preferences and connection settings

## Key Features

- **Live 3D Retro Office** — A navigable 3D environment where agents appear as workers. Desk assignments, room navigation, activity animations, and event-driven cues (janitor resets, standup meetings) all stream live from the OpenClaw gateway.
- **Agents Fleet Dashboard** — Conventional 2D UI for listing agents, chat, session controls, approvals, settings, and runtime status streaming. Includes per-agent skill allowlists and system-wide skill setup.
- **Office Builder** — A Phaser-based surface (/office/builder) for editing and publishing custom office layouts, decoupled from the main office runtime.
- **Studio Proxy Architecture** — Browser -> Studio (HTTP/WS same-origin) -> OpenClaw Gateway. This keeps gateway credentials server-side and enables remote gateway setups (Tailscale, SSH tunnels).
- **Gateway-First Design** — Claw3D is explicitly a UI layer. OpenClaw remains the source of truth for agents, sessions, files, and config. Claw3D never creates a competing local source of truth.
- **Skills Integration UI** — Per-agent allowlist toggles and gateway-wide skill setup/install flows surfaced through Studio settings tabs.
- **Real-time Event Streaming** — Runtime events from the gateway drive both the 2D agents workspace and the 3D office simultaneously.
- **SSH + Tailscale Remote Support** — Detailed docs for cross-machine setups (gateway on one machine, Studio on another).

## How It Works

1. **Browser <-> Studio:** User opens http://localhost:3000. Browser loads Studio (Next.js app) and opens a same-origin WebSocket to /api/gateway/ws.
2. **Studio <-> Gateway:** Studio server reads the configured gateway URL + token server-side and opens a second WebSocket to the OpenClaw gateway (local or remote via Tailscale/SSH).
3. **Gateway Events -> UI:** The gateway streams runtime events (agent activity, chat messages, session state, approvals). The 2D agents workspace renders these directly.
4. **Gateway Events -> 3D Office:** A separate "intent layer" inside Studio *derives* 3D spatial state from the same gateway event stream. Event types like agent.task.start, agent.chat.message, session.reset map to office behaviors: agent walks to a desk, speaks, janitor cleans up.
5. **Settings Persistence:** Studio stores local UI preferences in ~/.openclaw/claw3d/settings.json. This is separate from OpenClaw own config.
6. **Skills Flow:** skills.status / skills.install / skills.update gateway RPCs drive the Skills tab UI.

The 3D office is not a stored "memory" in the traditional database sense — it is a live, derived spatial projection of ephemeral gateway events. If you reload the page, the 3D world re-derives from current gateway state, not from persisted 3D state.

## Use Cases

- **Observability / Debugging:** Watch agent workflows execute visually rather than parsing logs — especially useful when running multiple concurrent agents.
- **Team Standups:** Agents connected to GitHub/Jira can run standup routines visualized in a conference room.
- **PR Review:** GitHub integration surfaces PR review flows in an immersive "review room."
- **QA Monitoring:** Pipeline runs and logs visible as agent activity in the 3D space.
- **Agent Training Gym:** A dedicated "gym" space for training agents in new skills.
- **Session Management:** Janitor system for resetting sessions and cleaning context.
- **Remote OpenClaw Access:** Cross-machine setup via Tailscale for non-local gateways.

## Pros for Matt Goals (iOS app empire + OpenClaw)

- **Deepens OpenClaw Investment:** Claw3D is a first-class visualization layer purpose-built for OpenClaw by a community developer (LukeTheDev). Using it reinforces the OpenClaw stack Matt already relies on.
- **Better Agent Observability:** Matt runs multiple agents and sub-agents. The 3D office gives a spatial, intuitive view of what is running — faster debugging, less log-tailing.
- **Skills Integration is Native:** Claw3D Skills UI surfaces OpenClaw skill system (allowlists, gating, setup/install). Directly relevant since Matt relies on skills for iOS build/deploy/test tasks.
- **Mission Control Synergy:** MC is the orchestration layer. Claw3D complements it as a visualization layer — different surfaces for the same underlying agent runtime. Not redundant; additive.
- **Single-User Focus Matches Matt:** Claw3D explicitly avoids multi-user/multi-tenant complexity. Designed for one person managing their own AI workforce.
- **Platform Agnostic:** Claw3D runs in the browser, connects to any OpenClaw gateway. Matt iOS empire context is just the workload.

## Integration Feasibility

**Assessment: MEDIUM — feasible but requires care.**

**Why it is feasible:**
- Claw3D is explicitly a UI/proxy layer that talks to an existing OpenClaw Gateway. Matt already runs OpenClaw + MC. Claw3D would run alongside, not replace, any of this.
- Architecture is clearly documented (ARCHITECTURE.md is thorough), with clean boundaries between browser, Studio server, and gateway.
- Node.js + Next.js stack is standard; deployment is npm install + npm run dev locally, or build + npm start for production.
- Gateway-first design means Claw3D cannot corrupt MC task/state data.

**Why it is not trivial:**
- **Node.js server requirement:** Claw3D requires running a custom Node server (WebSocket proxy + Studio server), not just a static Next.js export. Adds another long-running Node process to manage.
- **Port/network complexity:** Studio on port 3000 needs to reach OpenClaw gateway. Remote setups require Tailscale or SSH tunneling — additional configuration surface.
- **3D rendering overhead:** Three.js/WebGL is heavy browser workload. Running alongside Xcode, Safari, MC dashboards could be RAM/GPU-intensive on a Mac mini used for iOS builds.
- **Security review needed:** Current implementation loads upstream gateway URL/token into browser memory at runtime. Acknowledged as a known issue. Should not expose Studio to untrusted networks.
- **Community project stability:** Claw3D is explicitly unofficial and community-maintained. No corporate backing. Roadmap still lists "Open-source readiness" as in progress.

## Risks / Downsides

1. **Another running service to maintain.** Custom Node server adds operational overhead. If it crashes or falls behind on updates, debugging a stalled Studio is an extra surface to manage.
2. **Browser memory + GPU.** Three.js + React 19 + Phaser is a heavy browser workload. RAM/GPU-intensive alongside Xcode and other tools on a Mac mini.
3. **Security posture is incomplete.** Token/URL flow still loads secrets into browser memory — acknowledged known issue on roadmap but not yet resolved.
4. **Two UI paradigms to learn.** Claw3D 2D agents workspace is different from MC task-focused interface. Context-switching between two mental models of the same agents.
5. **3D office is mostly aesthetic.** Memory is ephemeral — derived from live events, not persisted. No historical playback or trace replay. Forward-looking only.
6. **Licensing/asset concerns on roadmap.** Roadmap flags "Replace or fully clear unresolved bundled assets and dependency licensing risks" — could require legal review.
7. **Single maintainer risk.** LukeTheDev appears to be the primary maintainer. Project could stall if he steps back.
8. **Potential overlap with MC.** MC already provides task/agent orchestration, observability, and workflow management. Claw3D 2D workspace overlaps meaningfully. Running both introduces duplication.

## Recommendation

**EVALUATE_LATER**

Claw3D is a genuinely interesting project — the idea of a spatial, immersive UI for AI agent observability is compelling and clearly resonates with OpenClaw philosophy of making agent systems visible and understandable. The architecture is well-documented, the gateway-first design is sound, and the code quality (TypeScript strict, Vitest + Playwright, clear feature boundaries) suggests it is more than a weekend hack.

However, for Matt specific situation, now is not the right moment. The main reasons: (1) Claw3D introduces another long-running Node service to manage on his Mac mini, adding operational complexity when he is in the middle of building and shipping iOS apps; (2) the 3D office, while visually striking, is primarily an observability layer that does not add capability his existing OpenClaw/MC setup does not already have — it is additive, not transformative; (3) the security model (browser memory token loading) is still a known gap per their own roadmap; and (4) the single-maintainer community project risk should be monitored rather than committed to at this stage.

**Revisit in 3-6 months** when: (a) Claw3D has a stable release (vs. current 0.1.0), (b) the security/token handling improvements land, (c) LukeTheDev has more contributors or the project gains broader adoption, and (d) Matt iOS empire is on more stable footing with less active firefighting. At that point, the 2D agents fleet view alone (without the 3D overhead) may be worth piloting as a lightweight supplement to MC task management.
