import {
  getGatewayHealth,
  getGatewayStatus,
  type GatewayHealthResponse,
  type GatewayStatusResponse,
} from './gateway';
import {
  appendRuntimeEvent,
  getLatestEventByType,
  type AppendEventOptions,
} from '@/lib/db/runtime';

export type GatewayRuntimeSnapshot = {
  connected: boolean;
  defaultAgentId: string | null;
  sessionCount: number;
  agents: Array<{
    agentId: string;
    name: string;
    isDefault: boolean;
    sessionCount: number;
    recentSessionKey: string | null;
    recentUpdatedAt: number | null;
  }>;
};

type GatewayRuntimeDelta = AppendEventOptions;

type RuntimeBridgeState = {
  snapshot: GatewayRuntimeSnapshot | null;
  lastPolledAt: number;
  inFlight: Promise<GatewayRuntimeSnapshot | null> | null;
};

const POLL_DEBOUNCE_MS = 1500;
const SNAPSHOT_EVENT_TYPE = 'openclaw.runtime.snapshot';

function getBridgeState(): RuntimeBridgeState {
  const globalKey = '__openclawRuntimeBridgeState';
  const globalScope = globalThis as typeof globalThis & {
    __openclawRuntimeBridgeState?: RuntimeBridgeState;
  };

  if (!globalScope[globalKey]) {
    globalScope[globalKey] = {
      snapshot: null,
      lastPolledAt: 0,
      inFlight: null,
    };
  }

  return globalScope[globalKey];
}

export function createGatewayRuntimeSnapshot(
  health: GatewayHealthResponse | null,
  status: GatewayStatusResponse | null,
): GatewayRuntimeSnapshot | null {
  if (!health && !status) return null;

  const defaultAgentId = health?.defaultAgentId ?? status?.heartbeat.defaultAgentId ?? null;
  const statusByAgent = new Map(
    (status?.sessions.byAgent ?? []).map((group) => [group.agentId, group]),
  );

  const healthAgents = health?.agents ?? [];
  const agentIds = new Set<string>([
    ...healthAgents.map((agent) => agent.agentId),
    ...(status?.sessions.byAgent ?? []).map((group) => group.agentId),
  ]);

  const agents = [...agentIds].map((agentId) => {
    const healthAgent = healthAgents.find((agent) => agent.agentId === agentId);
    const sessionGroup = statusByAgent.get(agentId);
    const recentSession = sessionGroup?.recent?.[0] ?? healthAgent?.sessions.recent?.[0] ?? null;

    return {
      agentId,
      name: healthAgent?.name ?? agentId,
      isDefault: healthAgent?.isDefault ?? agentId === defaultAgentId,
      sessionCount: sessionGroup?.count ?? healthAgent?.sessions.count ?? 0,
      recentSessionKey: recentSession?.key ?? null,
      recentUpdatedAt: recentSession?.updatedAt ?? null,
    };
  }).sort((left, right) => left.agentId.localeCompare(right.agentId));

  return {
    connected: Boolean(health?.ok ?? status),
    defaultAgentId,
    sessionCount: status?.sessions.count ?? health?.sessions.count ?? 0,
    agents,
  };
}

export function diffGatewayRuntimeSnapshots(
  previous: GatewayRuntimeSnapshot | null,
  next: GatewayRuntimeSnapshot | null,
): GatewayRuntimeDelta[] {
  if (!next) return [];

  const deltas: GatewayRuntimeDelta[] = [];
  if (!previous) return deltas;

  if (previous.connected !== next.connected) {
    deltas.push({
      eventType: next.connected ? 'openclaw.gateway.connected' : 'openclaw.gateway.disconnected',
      actor: next.defaultAgentId ?? previous.defaultAgentId ?? 'gateway',
      payload: {
        connected: next.connected,
        sessionCount: next.sessionCount,
      },
    });
  }

  if (previous.sessionCount !== next.sessionCount) {
    deltas.push({
      eventType: 'openclaw.sessions.changed',
      actor: next.defaultAgentId ?? 'gateway',
      payload: {
        previousCount: previous.sessionCount,
        nextCount: next.sessionCount,
      },
    });
  }

  const previousAgents = new Map(previous.agents.map((agent) => [agent.agentId, agent]));
  for (const agent of next.agents) {
    const prevAgent = previousAgents.get(agent.agentId);
    if (!prevAgent) {
      if (agent.sessionCount > 0) {
        deltas.push({
          eventType: 'openclaw.agent.active',
          actor: agent.agentId,
          payload: {
            sessionCount: agent.sessionCount,
            recentSessionKey: agent.recentSessionKey,
          },
        });
      }
      continue;
    }

    if (prevAgent.sessionCount === 0 && agent.sessionCount > 0) {
      deltas.push({
        eventType: 'openclaw.agent.active',
        actor: agent.agentId,
        payload: {
          previousCount: prevAgent.sessionCount,
          nextCount: agent.sessionCount,
          recentSessionKey: agent.recentSessionKey,
        },
      });
    } else if (prevAgent.sessionCount > 0 && agent.sessionCount === 0) {
      deltas.push({
        eventType: 'openclaw.agent.idle',
        actor: agent.agentId,
        payload: {
          previousCount: prevAgent.sessionCount,
          nextCount: agent.sessionCount,
        },
      });
    } else if (prevAgent.sessionCount !== agent.sessionCount) {
      deltas.push({
        eventType: 'openclaw.agent.session-count.changed',
        actor: agent.agentId,
        payload: {
          previousCount: prevAgent.sessionCount,
          nextCount: agent.sessionCount,
        },
      });
    }

    if (prevAgent.recentSessionKey !== agent.recentSessionKey) {
      deltas.push({
        eventType: 'openclaw.agent.recent-session.changed',
        actor: agent.agentId,
        payload: {
          previousSessionKey: prevAgent.recentSessionKey,
          nextSessionKey: agent.recentSessionKey,
          nextUpdatedAt: agent.recentUpdatedAt,
        },
      });
    }
  }

  return deltas;
}

function parseStoredSnapshot(): GatewayRuntimeSnapshot | null {
  const event = getLatestEventByType(SNAPSHOT_EVENT_TYPE);
  if (!event) return null;

  try {
    const payload = JSON.parse(event.payload) as { snapshot?: GatewayRuntimeSnapshot };
    return payload.snapshot ?? null;
  } catch {
    return null;
  }
}

async function pollGatewayRuntimeSnapshot(): Promise<GatewayRuntimeSnapshot | null> {
  const [health, status] = await Promise.all([getGatewayHealth(), getGatewayStatus()]);
  return createGatewayRuntimeSnapshot(health, status);
}

export async function syncGatewayRuntimeEvents(source: string): Promise<GatewayRuntimeSnapshot | null> {
  const state = getBridgeState();
  const now = Date.now();

  if (state.inFlight) {
    return state.inFlight;
  }

  if (!state.snapshot) {
    state.snapshot = parseStoredSnapshot();
  }

  if (now - state.lastPolledAt < POLL_DEBOUNCE_MS) {
    return state.snapshot;
  }

  state.lastPolledAt = now;
  state.inFlight = (async () => {
    const previousSnapshot = state.snapshot;
    const nextSnapshot = await pollGatewayRuntimeSnapshot();
    const deltas = diffGatewayRuntimeSnapshots(previousSnapshot, nextSnapshot);

    for (const delta of deltas) {
      appendRuntimeEvent({
        eventType: delta.eventType,
        actor: delta.actor,
        payload: {
          source,
          ...(delta.payload ?? {}),
        },
      });
    }

    if (nextSnapshot && (!previousSnapshot || deltas.length > 0)) {
      appendRuntimeEvent({
        eventType: SNAPSHOT_EVENT_TYPE,
        actor: nextSnapshot.defaultAgentId ?? 'gateway',
        payload: {
          source,
          snapshot: nextSnapshot,
        },
      });
    }

    state.snapshot = nextSnapshot;
    return nextSnapshot;
  })();

  try {
    return await state.inFlight;
  } finally {
    state.inFlight = null;
  }
}
