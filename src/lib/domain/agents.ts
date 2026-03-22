import { Agent, RunStepRole } from '../types'
import { discoverAgents, toGatewayAgentId } from '../openclaw/discovery'
import { db } from '../db'
import { agentMatchesStepRole, inferStepRoleForAgent } from '../agent-matching'
import { hasFreshPresence } from '../agent-presence'
import {
  getGatewayHealth,
  getGatewayStatus,
  type GatewayHealthResponse,
  type GatewayStatusResponse,
} from '../openclaw/gateway'

type DbAgentData = {
  status: string
  type: string | null
}

export type GatewayAgentRuntime = {
  sessionCount: number
  heartbeatEnabled: boolean
  heartbeatEvery?: string
  recentSessions: Array<{ key: string; updatedAt: number; age: number }>
  currentModel?: string
  percentUsed?: number
}

// Gateway data cache with 60-second TTL.
// `getAgents()` uses this cached runtime map.
let gatewayCache: {
  map: Map<string, GatewayAgentRuntime>
  timestamp: number
} | null = null
const GATEWAY_CACHE_TTL_MS = 60_000

export function buildGatewayRuntimeMap(
  health: GatewayHealthResponse | null,
  status: GatewayStatusResponse | null,
): Map<string, GatewayAgentRuntime> {
  const healthAgents = new Map((health?.agents ?? []).map((agent) => [agent.agentId, agent]))
  const statusByAgent = new Map((status?.sessions.byAgent ?? []).map((group) => [group.agentId, group]))
  const heartbeatByAgent = new Map((status?.heartbeat.agents ?? []).map((agent) => [agent.agentId, agent]))
  const agentIds = new Set<string>([
    ...healthAgents.keys(),
    ...statusByAgent.keys(),
    ...heartbeatByAgent.keys(),
  ])

  const runtimeMap = new Map<string, GatewayAgentRuntime>()

  for (const agentId of agentIds) {
    const healthAgent = healthAgents.get(agentId)
    const sessionGroup = statusByAgent.get(agentId)
    const heartbeat = heartbeatByAgent.get(agentId)
    const mostRecentSession = sessionGroup?.recent?.[0]

    runtimeMap.set(agentId, {
      sessionCount: sessionGroup?.count ?? healthAgent?.sessions.count ?? 0,
      heartbeatEnabled: healthAgent?.heartbeat.enabled ?? heartbeat?.enabled ?? false,
      heartbeatEvery: healthAgent?.heartbeat.every || heartbeat?.every || undefined,
      recentSessions: sessionGroup?.recent ?? healthAgent?.sessions.recent ?? [],
      currentModel: mostRecentSession?.model,
      percentUsed: mostRecentSession?.percentUsed,
    })
  }

  return runtimeMap
}

async function refreshGatewayCache(): Promise<Map<string, GatewayAgentRuntime>> {
  const [health, status] = await Promise.all([getGatewayHealth(), getGatewayStatus()])
  const map = buildGatewayRuntimeMap(health, status)

  if (!health && !status) {
    console.warn('[agents] Gateway unreachable, using cached session data')
  }

  gatewayCache = { map, timestamp: Date.now() }
  return map
}

async function getGatewayRuntimeMap(): Promise<Map<string, GatewayAgentRuntime>> {
  const now = Date.now()
  if (!gatewayCache || now - gatewayCache.timestamp > GATEWAY_CACHE_TTL_MS) {
    return refreshGatewayCache()
  }
  return gatewayCache.map
}

function upsertDiscoveredAgents(discovered: Agent[]) {
  const upsertAgent = db.prepare(`
    INSERT INTO agents (id, name, role, mission, status) 
    VALUES (?, ?, ?, ?, 'idle')
    ON CONFLICT(id) DO UPDATE SET 
      name=excluded.name, 
      role=excluded.role, 
      mission=excluded.mission
  `)

  discovered.forEach((agent) => {
    upsertAgent.run(agent.id, agent.name, agent.role, agent.mission)
  })
}

function getDbAgentDataMap(): Map<string, DbAgentData> {
  const dbAgents = db.prepare('SELECT id, status, type FROM agents').all() as Array<{
    id: string
    status: string
    type: string | null
  }>

  return new Map(dbAgents.map((agent) => [agent.id, { status: agent.status, type: agent.type }]))
}

export function mergeAgentsWithRuntime(
  discovered: Agent[],
  dbDataMap: Map<string, DbAgentData>,
  runtimeMap: Map<string, GatewayAgentRuntime>,
): Agent[] {
  return discovered.map((agent) => {
    const dbData = dbDataMap.get(agent.id)
    const runtime = runtimeMap.get(toGatewayAgentId(agent.id))
    const gatewaySessionCount = runtime?.sessionCount ?? 0
    const isLive = hasFreshPresence(runtime?.recentSessions)

    return {
      ...agent,
      gatewaySessionCount,
      isActive: isLive,
      heartbeatEnabled: runtime?.heartbeatEnabled ?? false,
      heartbeatEvery: runtime?.heartbeatEvery,
      recentSessions: runtime?.recentSessions ?? [],
      currentModel: runtime?.currentModel,
      percentUsed: runtime?.percentUsed,
      status: dbData?.status || 'idle',
      type: dbData?.type || undefined,
    }
  })
}

// Cached sync path for setup-oriented screens.
export function getAgents(): Agent[] {
  const discovered = discoverAgents()
  upsertDiscoveredAgents(discovered)

  return mergeAgentsWithRuntime(
    discovered,
    getDbAgentDataMap(),
    gatewayCache?.map ?? new Map<string, GatewayAgentRuntime>(),
  )
}

// Fresh async path for runtime-oriented screens and APIs.
export async function getAgentsWithGateway(): Promise<Agent[]> {
  const discovered = discoverAgents()
  upsertDiscoveredAgents(discovered)

  return mergeAgentsWithRuntime(
    discovered,
    getDbAgentDataMap(),
    await getGatewayRuntimeMap(),
  )
}

// Keep sync versions for backward compat
export function getAgentById(id: string): Agent | null {
  const agents = getAgents()
  return agents.find(a => a.id === id) || null
}

export function getAssignableAgents(role: RunStepRole): Agent[] {
  return getAgents().filter((agent) => agentMatchesStepRole(agent, role))
}

export function getAssignableAgentById(role: RunStepRole, id: string): Agent | null {
  return getAssignableAgents(role).find((agent) => agent.id === id) || null
}

export function getOrchestrationAgentById(id: string): Agent | null {
  const agent = getAgentById(id)
  if (!agent) {
    return null
  }
  return inferStepRoleForAgent(agent) ? agent : null
}

export function updateAgentType(id: string, type: string): void {
  const normalizedId = String(id || '').trim()
  const normalizedType = String(type || '').trim()

  if (!normalizedId) {
    throw new Error('Agent id is required')
  }

  if (!normalizedType) {
    throw new Error('Agent type is required')
  }

  const result = db
    .prepare('UPDATE agents SET type = ? WHERE id = ?')
    .run(normalizedType, normalizedId)

  if (result.changes === 0) {
    throw new Error(`Agent not found: ${normalizedId}`)
  }
}

/**
 * System is ready only when all agents have an assigned system type.
 */
export function isSystemReady(): boolean {
  const agents = getAgents()
  if (agents.length === 0) return false
  return agents.every(a => !!a.type)
}

// Also export async versions that call the gateway
export async function getAgentByIdAsync(id: string): Promise<Agent | null> {
  const agents = await getAgentsWithGateway()
  return agents.find(a => a.id === id) || null
}

export async function getAssignableAgentsAsync(role: RunStepRole): Promise<Agent[]> {
  const agents = await getAgentsWithGateway()
  return agents.filter((agent) => agentMatchesStepRole(agent, role))
}

export async function getAssignableAgentByIdAsync(role: RunStepRole, id: string): Promise<Agent | null> {
  const agents = await getAssignableAgentsAsync(role)
  return agents.find((agent) => agent.id === id) || null
}

export async function getOrchestrationAgentByIdAsync(id: string): Promise<Agent | null> {
  const agent = await getAgentByIdAsync(id)
  if (!agent) {
    return null
  }
  return inferStepRoleForAgent(agent) ? agent : null
}

export async function isSystemReadyAsync(): Promise<boolean> {
  const agents = await getAgentsWithGateway()
  if (agents.length === 0) return false
  return agents.every(a => !!a.type)
}
