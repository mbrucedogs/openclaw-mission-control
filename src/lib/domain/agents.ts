import { Agent, RunStepRole } from '../types';
import { discoverAgents } from '../openclaw/discovery';
import { db } from '../db';
import { agentMatchesStepRole, inferStepRoleForAgent } from '../agent-matching';
import { getGatewayHealth } from '../openclaw/gateway';

/**
 * Maps discovery agent IDs to gateway agent IDs.
 * Only `agent-max` differs — it maps to `main` in gateway.
 */
function gatewayId(id: string): string {
    return id === 'agent-max' ? 'main' : id;
}

// Gateway data cache with 60-second TTL
let gatewayCache: {
    map: Map<string, any>;
    timestamp: number;
} | null = null;
const GATEWAY_CACHE_TTL_MS = 60_000;

async function refreshGatewayCache(): Promise<Map<string, any>> {
    const map = new Map<string, any>();
    try {
        const health = await getGatewayHealth();
        if (health?.agents) {
            for (const ga of health.agents) {
                map.set(ga.agentId, ga);
            }
        }
    } catch {
        console.warn('[agents] Gateway unreachable, using cached session data');
    }
    gatewayCache = { map, timestamp: Date.now() };
    return map;
}

async function getGatewayMap(): Promise<Map<string, any>> {
    const now = Date.now();
    if (!gatewayCache || now - gatewayCache.timestamp > GATEWAY_CACHE_TTL_MS) {
        return refreshGatewayCache();
    }
    return gatewayCache.timestamp > 0 ? gatewayCache.map : refreshGatewayCache();
}

// Synchronous getAgents using cached gateway data (for backward compat with sync callers)
export function getAgents(): Agent[] {
    // Discovery from OpenClaw Workspace files (New Source of Truth)
    const discovered = discoverAgents();

    // Sync with DB (Ensure all discovered agents exist in SQLite for status tracking/tasks)
    const upsertAgent = db.prepare(`
        INSERT INTO agents (id, name, role, mission, status) 
        VALUES (?, ?, ?, ?, 'idle')
        ON CONFLICT(id) DO UPDATE SET 
            name=excluded.name, 
            role=excluded.role, 
            mission=excluded.mission
    `);

    discovered.forEach(agent => {
        upsertAgent.run(agent.id, agent.name, agent.role, agent.mission);
    });

    // Mapping live statuses and explicit types from DB
    const dbAgents = db.prepare('SELECT id, status, type FROM agents').all() as Array<{ id: string; status: string; type: string | null }>;
    const dbDataMap = new Map(dbAgents.map(a => [a.id, { status: a.status, type: a.type }]));

    // Use cached gateway data (synchronous access)
    const cached = gatewayCache?.map ?? new Map<string, any>();

    return discovered.map(agent => {
        const dbData = dbDataMap.get(agent.id);
        const gwId = gatewayId(agent.id);
        const gw = cached.get(gwId);

        const gatewaySessionCount = gw?.sessions?.count ?? 0;
        const isActive = gatewaySessionCount > 0;

        // Get most recent session for model/percentUsed
        const mostRecentSession = gw?.sessions?.recent?.[0];

        return {
            ...agent,
            // Gateway live data
            gatewaySessionCount,
            isActive,
            heartbeatEnabled: gw?.heartbeat?.enabled ?? false,
            heartbeatEvery: gw?.heartbeat?.every ?? null,
            recentSessions: gw?.sessions?.recent ?? [],
            currentModel: isActive ? mostRecentSession?.model : undefined,
            percentUsed: isActive ? mostRecentSession?.percentUsed : undefined,
            // SQLite data (overrides discovery)
            status: dbData?.status || 'idle',
            type: dbData?.type || undefined,
        };
    });
}

// Async version that ensures fresh gateway data
export async function getAgentsWithGateway(): Promise<Agent[]> {
    // Discovery from OpenClaw Workspace files (New Source of Truth)
    const discovered = discoverAgents();

    // Sync with DB (Ensure all discovered agents exist in SQLite for status tracking/tasks)
    const upsertAgent = db.prepare(`
        INSERT INTO agents (id, name, role, mission, status) 
        VALUES (?, ?, ?, ?, 'idle')
        ON CONFLICT(id) DO UPDATE SET 
            name=excluded.name, 
            role=excluded.role, 
            mission=excluded.mission
    `);

    discovered.forEach(agent => {
        upsertAgent.run(agent.id, agent.name, agent.role, agent.mission);
    });

    // Mapping live statuses and explicit types from DB
    const dbAgents = db.prepare('SELECT id, status, type FROM agents').all() as Array<{ id: string; status: string; type: string | null }>;
    const dbDataMap = new Map(dbAgents.map(a => [a.id, { status: a.status, type: a.type }]));

    // Fetch fresh gateway data
    const gatewayMap = await getGatewayMap();

    return discovered.map(agent => {
        const dbData = dbDataMap.get(agent.id);
        const gwId = gatewayId(agent.id);
        const gw = gatewayMap.get(gwId);

        const gatewaySessionCount = gw?.sessions?.count ?? 0;
        const isActive = gatewaySessionCount > 0;

        // Get most recent session for model/percentUsed
        const mostRecentSession = gw?.sessions?.recent?.[0];

        return {
            ...agent,
            // Gateway live data
            gatewaySessionCount,
            isActive,
            heartbeatEnabled: gw?.heartbeat?.enabled ?? false,
            heartbeatEvery: gw?.heartbeat?.every ?? null,
            recentSessions: gw?.sessions?.recent ?? [],
            currentModel: isActive ? mostRecentSession?.model : undefined,
            percentUsed: isActive ? mostRecentSession?.percentUsed : undefined,
            // SQLite data (overrides discovery)
            status: dbData?.status || 'idle',
            type: dbData?.type || undefined,
        };
    });
}

// Keep sync versions for backward compat
export function getAgentById(id: string): Agent | null {
    const agents = getAgents();
    return agents.find(a => a.id === id) || null;
}

export function getAssignableAgents(role: RunStepRole): Agent[] {
    return getAgents().filter((agent) => agentMatchesStepRole(agent, role));
}

export function getAssignableAgentById(role: RunStepRole, id: string): Agent | null {
    return getAssignableAgents(role).find((agent) => agent.id === id) || null;
}

export function getOrchestrationAgentById(id: string): Agent | null {
    const agent = getAgentById(id);
    if (!agent) {
        return null;
    }
    return inferStepRoleForAgent(agent) ? agent : null;
}

export function updateAgentType(id: string, type: string): void {
    const normalizedId = String(id || '').trim();
    const normalizedType = String(type || '').trim();

    if (!normalizedId) {
        throw new Error('Agent id is required');
    }

    if (!normalizedType) {
        throw new Error('Agent type is required');
    }

    const result = db
        .prepare('UPDATE agents SET type = ? WHERE id = ?')
        .run(normalizedType, normalizedId);

    if (result.changes === 0) {
        throw new Error(`Agent not found: ${normalizedId}`);
    }
}

/**
 * System is ready only when all agents have an assigned system type.
 */
export function isSystemReady(): boolean {
    const agents = getAgents();
    if (agents.length === 0) return false;
    return agents.every(a => !!a.type);
}

// Also export async versions that call the gateway
export async function getAgentByIdAsync(id: string): Promise<Agent | null> {
    const agents = await getAgentsWithGateway();
    return agents.find(a => a.id === id) || null;
}

export async function getAssignableAgentsAsync(role: RunStepRole): Promise<Agent[]> {
    const agents = await getAgentsWithGateway();
    return agents.filter((agent) => agentMatchesStepRole(agent, role));
}

export async function getAssignableAgentByIdAsync(role: RunStepRole, id: string): Promise<Agent | null> {
    const agents = await getAssignableAgentsAsync(role);
    return agents.find((agent) => agent.id === id) || null;
}

export async function getOrchestrationAgentByIdAsync(id: string): Promise<Agent | null> {
    const agent = await getAgentByIdAsync(id);
    if (!agent) {
        return null;
    }
    return inferStepRoleForAgent(agent) ? agent : null;
}

export async function isSystemReadyAsync(): Promise<boolean> {
    const agents = await getAgentsWithGateway();
    if (agents.length === 0) return false;
    return agents.every(a => !!a.type);
}
