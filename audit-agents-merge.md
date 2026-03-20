# Audit: Merge Live Gateway Data into getAgents()

## Discovery Fields (file-based, from getAgents())

Per agent from `discoverAgents()` → `TEAM-REGISTRY.md` + `SOUL.md`:

| Field | Source | Example |
|---|---|---|
| `id` | parsed from registry (e.g. `agent-alice`) | `agent-max`, `alice-researcher` |
| `name` | SOUL.md or identity.md | `Max`, `Alice` |
| `role` | TEAM-REGISTRY.md | `Primary Orchestrator & Companion` |
| `mission` | SOUL.md `## Core Identity` section | `An autonomous organization of AI agents...` |
| `status` | SQLite DB (default `idle`) | `idle` |
| `type` | SQLite DB (user-set via UI) | `orchestrator`, `builder` |
| `layer` | derived: governance/pipeline/automation | `governance`, `pipeline` |
| `order` | derived: pipeline order | `0`, `1`, `3` |
| `folder` | TEAM-REGISTRY.md | `agents/alice` |
| `model` | SOUL.md `**Model:**` line | `openai-codex/gpt-5.4` |
| `soulContent` | SOUL.md raw content | full text |
| `responsibilities` | AGENTS.md skills section | `["Task Routing", "System Monitoring"]` |

## Gateway Fields (live, from `openclaw gateway call health`)

Per agent from `health.agents[]`:

| Field | Gateway Path | Example |
|---|---|---|
| `agentId` | `health.agents[].agentId` | `main`, `alice-researcher` |
| `isDefault` | `health.agents[].isDefault` | `true` for `main` |
| `heartbeat.enabled` | `health.agents[].heartbeat.enabled` | `true` / `false` |
| `heartbeat.every` | `health.agents[].heartbeat.every` | `"30m"` |
| `heartbeat.everyMs` | `health.agents[].heartbeat.everyMs` | `1800000` |
| `sessions.count` | `health.agents[].sessions.count` | `16`, `80`, `0` |
| `sessions.recent` | `health.agents[].sessions.recent` | array of session keys |

From `status.sessions.byAgent[]` (joined by agentId):

| Field | Path | Example |
|---|---|---|
| `percentUsed` | `status.sessions.byAgent[].recent[].percentUsed` | `29`, `7` |
| `model` | `status.sessions.byAgent[].recent[].model` | `minimax-m2.7:cloud` |
| `age` | `status.sessions.byAgent[].recent[].age` | `6833` (ms) |

## Critical ID Mapping Issue

**Discovery IDs ≠ Gateway IDs:**

| Discovery ID | Gateway ID | Note |
|---|---|---|
| `agent-max` | `main` | Different naming schemes |
| `alice-researcher` | `alice-researcher` | Match |
| `bob-implementer` | `bob-implementer` | Match |
| `charlie-tester` | `charlie-tester` | Match |
| `aegis` | `aegis` | Match |
| `tron` | `tron` | Match |
| `nova` | `nova` | Match |
| `marcus` | `marcus` | Match |
| `freya` | `freya` | Match |
| `phoenix` | `phoenix` | Match |
| `atlas` | `atlas` | Match |
| `knox` | `knox` | Match |
| `diana` | `diana` | Match |

**Only `agent-max` ↔ `main` needs special mapping.** All others are identical.

**Mapping function to implement:**
```typescript
function gatewayIdForAgent(agentId: string): string {
  if (agentId === 'agent-max') return 'main';
  return agentId; // alice-researcher, bob-implementer, etc. are same in both
}
```

## Merge Strategy

**Principle:** Discovery fields are source of truth for identity/metadata. Gateway fields augment with live operational data.

### Fields to ADD to getAgents() return (not overwrite existing):

| New Field | Source | Logic |
|---|---|---|
| `gatewaySessionCount` | `health.agents[].sessions.count` | Direct value |
| `isActive` | derived | `gatewaySessionCount > 0` |
| `heartbeatEnabled` | `health.agents[].heartbeat.enabled` | Direct value |
| `heartbeatEvery` | `health.agents[].heartbeat.every` | Direct value |
| `recentSessions` | `health.agents[].sessions.recent` | Array of `{key, updatedAt, age}` |

### Status Override Logic:
- `isActive = gatewaySessionCount > 0` → UI shows **Active** (green dot)
- `isActive = false` → UI shows **Standby** (grey dot)
- Keep SQLite `status` field separate — it's manually set, not gateway-derived

### Token/Model Info (from status endpoint):
- `currentModel`: most recent session model from `status.sessions.byAgent[].recent[].model`
- `percentUsed`: most recent session percentUsed
- Only merge if `gatewaySessionCount > 0`

## Edge Cases

### Gateway Unreachable
- Catch errors in `getGatewayHealth()` / `getGatewayStatus()`
- Return `gatewaySessionCount: 0, isActive: false, heartbeatEnabled: false` for all agents
- Do NOT throw — discovery + SQLite data is still valid without live data
- Log warning: `console.warn('[agents] Gateway unreachable, using cached data')`

### Agent in Discovery but Not in Gateway
- Agents like `agent-max` (the orchestrator) may not be in gateway agents list
- Treat missing gateway data as `gatewaySessionCount: 0, isActive: false`
- Never filter out agents because they're not in gateway

### Agent in Gateway but Not in Discovery
- Some gateway agents may not be in TEAM-REGISTRY.md
- Do NOT auto-add them — discovery is the authoritative roster
- They won't appear in MC's agent list, which is correct

### Stale Session Data
- Gateway sessions include `age` in ms
- A session with `age > 24h` is effectively inactive
- Consider: `isActive = gatewaySessionCount > 0 AND mostRecentSessionAge < 3600000` (1 hour)

## Implementation Notes for Bob

1. In `src/lib/domain/agents.ts`, add `getGatewayHealth()` import from `@/lib/openclaw/gateway`
2. Inside `getAgents()`, call `getGatewayHealth()` and build a `Map<gatewayId, GatewayAgent>` for O(1) lookup
3. Apply mapping: `gatewayId = agent.id === 'agent-max' ? 'main' : agent.id`
4. Spread gateway fields onto each agent object
5. Wrap in try/catch — gateway failure is non-fatal
6. Add new fields to `Agent` type in `src/lib/types.ts`:
   ```typescript
   gatewaySessionCount?: number;
   isActive?: boolean;
   heartbeatEnabled?: boolean;
   heartbeatEvery?: string;
   recentSessions?: Array<{ key: string; updatedAt: number; age: number }>;
   currentModel?: string;
   percentUsed?: number;
   ```

## Evidence Sources
- `openclaw gateway call health --json` — agent list with sessions and heartbeat
- `GET /api/gateway` — normalized version (100 total sessions, 13 agents)
- `src/lib/domain/agents.ts` — current implementation
- `src/lib/types.ts` — `Agent` type definition
