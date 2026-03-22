import fs from 'fs'
import os from 'os'
import path from 'path'

import type { Agent, AgentLayerHint } from '../types'
import { BASE_WORKSPACE } from '../config'

const WORKSPACE_ROOT = BASE_WORKSPACE
const ROOT_AGENT_ID = 'main'
const ROOT_FOLDER = '.'
const ROOT_AGENT_ROLE_FALLBACK = 'Primary Orchestrator'
const DISPLAY_NAME_SUFFIX_RE = /(?:-(?:agent|monitor|researcher|implementer|tester|orchestrator|scheduler|reviewer))+$/gi
const TECHNICAL_SLUG_SUFFIX_RE = /(?:[-\s]+(?:agent|monitor|researcher|implementer|tester|orchestrator|scheduler|reviewer|builder|qa|security))+$/gi

export interface DiscoveredAgent extends Agent {
  model?: string
  folder?: string
  layer?: AgentLayerHint
  order?: number
}

export interface RootAgentWorkspaceInput {
  identityContent?: string
  soulContent?: string
}

export interface TechnicalAgentConfig {
  id: string
  name?: string
  identity?: {
    name?: string
  }
  agentDir?: string
}

export interface MetadataEnrichmentInput {
  resolvedFolder?: string
  soulContent?: string
  agentsContent?: string
}

export interface AgentLayerHints {
  layer: AgentLayerHint
  order: number
}

function normalize(value: string | undefined): string {
  return String(value || '').trim()
}

function normalizeLower(value: string | undefined): string {
  return normalize(value).toLowerCase()
}

function cleanDisplayName(value: string): string {
  return normalize(value.replace(DISPLAY_NAME_SUFFIX_RE, '')) || normalize(value)
}

function toFriendlyAgentSlug(value: string): string {
  return normalize(value)
    .replace(TECHNICAL_SLUG_SUFFIX_RE, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function extractMarkdownField(content: string | undefined, field: string): string {
  if (!content) return ''

  const patterns = [
    new RegExp(`^-\\s*\\*\\*${field}:\\*\\*\\s*(.+)$`, 'im'),
    new RegExp(`^\\*\\*${field}:\\*\\*\\s*(.+)$`, 'im'),
    new RegExp(`^##\\s*${field}:\\s*(.+)$`, 'im'),
    new RegExp(`^${field}:\\s*(.+)$`, 'im'),
  ]

  for (const pattern of patterns) {
    const match = content.match(pattern)
    if (match?.[1]) {
      return normalize(match[1])
    }
  }

  return ''
}

function extractMission(content: string | undefined): string {
  if (!content) return ''

  const patterns = [
    /## Core Identity[\s\S]*?-\s*\*\*Mission:\*\*\s*(.+)/i,
    /-\s*\*\*Mission:\*\*\s*(.+)$/im,
    /You are \*\*.*?\*\*,\s*(.+)$/im,
  ]

  for (const pattern of patterns) {
    const match = content.match(pattern)
    if (match?.[1]) {
      return normalize(match[1])
    }
  }

  return ''
}

function extractResponsibilities(content: string | undefined): string[] {
  if (!content) return []

  const sectionMatch = content.match(/## Skills\n([\s\S]*?)(?:\n##|$)/i)
    || content.match(/## Typical Tasks\n([\s\S]*?)(?:\n##|$)/i)
    || content.match(/## Role\n([\s\S]*?)(?:\n##|$)/i)

  if (!sectionMatch?.[1]) {
    return []
  }

  return sectionMatch[1]
    .split('\n')
    .map((line) => line.replace(/^-\s*/, '').trim())
    .filter((line) => line !== '' && line !== '-' && !line.startsWith('#'))
}

function readIfExists(filePath: string): string {
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf-8') : ''
}

function normalizeFolderPath(folder: string | undefined): string {
  return normalize(folder).replace(/\\/g, '/').replace(/\/+$/, '')
}

function mergeRootAgent(agents: DiscoveredAgent[], rootAgent: DiscoveredAgent | null): DiscoveredAgent[] {
  if (!rootAgent) {
    return agents
  }

  const filtered = agents.filter((agent) => (
    agent.id !== rootAgent.id && normalizeFolderPath(agent.folder) !== ROOT_FOLDER
  ))

  return [rootAgent, ...filtered]
}

function findTechnicalAgentMatch(
  agent: DiscoveredAgent,
  technicalAgents: TechnicalAgentConfig[],
): TechnicalAgentConfig | undefined {
  const agentFolder = normalizeFolderPath(agent.folder)
  const agentSlug = toFriendlyAgentSlug(agent.id)
  const agentNameSlug = toFriendlyAgentSlug(agent.name)

  return technicalAgents.find((technicalAgent) => {
    const technicalFolder = normalizeFolderPath(technicalAgent.agentDir)
    const technicalName = technicalAgent.identity?.name || technicalAgent.name || technicalAgent.id
    const technicalSlug = toFriendlyAgentSlug(technicalName)
    const technicalIdSlug = toFriendlyAgentSlug(technicalAgent.id)

    if (agentFolder && technicalFolder.endsWith(agentFolder)) {
      return true
    }

    return technicalSlug === agentSlug
      || technicalSlug === agentNameSlug
      || technicalIdSlug === agentSlug
      || technicalIdSlug === agentNameSlug
  })
}

function parseGovernanceFlow(governanceContent: string): string[] {
  const match = governanceContent.match(/Matt \(creates\)\s*→\s*(.*)\s*→\s*Done/i)
  if (!match?.[1]) {
    return []
  }

  return match[1]
    .split('→')
    .map((entry) => toFriendlyAgentSlug(entry.split(' ')[0] || ''))
    .filter(Boolean)
}

function resolveBuildOrder(agent: DiscoveredAgent, governanceContent: string): number {
  const flow = parseGovernanceFlow(governanceContent)
  const identifiers = [
    toFriendlyAgentSlug(agent.id),
    toFriendlyAgentSlug(agent.name),
  ]

  const flowIndex = flow.findIndex((entry) => identifiers.some((identifier) => identifier.startsWith(entry)))
  if (flowIndex >= 0) {
    return (flowIndex + 1) * 10
  }

  const type = normalizeLower(agent.type)
  const buildOrderByType: Record<string, number> = {
    researcher: 10,
    ux: 20,
    product: 20,
    builder: 30,
    implementer: 30,
    prototyper: 30,
  }

  return buildOrderByType[type] ?? 20
}

function resolveAgentDirectory(workspaceRoot: string, folder: string | undefined): string {
  const normalizedFolder = normalizeFolderPath(folder)
  if (!normalizedFolder || normalizedFolder === ROOT_FOLDER) {
    return workspaceRoot
  }

  const directPath = path.join(workspaceRoot, normalizedFolder)
  if (fs.existsSync(directPath)) {
    return directPath
  }

  const basename = path.basename(normalizedFolder)
  const fallbackSlug = toFriendlyAgentSlug(basename)
  const fallbackPath = path.join(workspaceRoot, 'agents', fallbackSlug)
  if (fs.existsSync(fallbackPath)) {
    return fallbackPath
  }

  return directPath
}

export function toGatewayAgentId(agentId: string): string {
  return normalizeLower(agentId) === 'agent-max' ? ROOT_AGENT_ID : agentId
}

export function parseRegistryTable(content: string): DiscoveredAgent[] {
  const agents: DiscoveredAgent[] = []
  const lines = content.split('\n')
  let inTable = false

  for (const line of lines) {
    if (line.includes('| Name | Role | Folder |')) {
      inTable = true
      continue
    }

    if (!inTable || !line.includes('|')) {
      continue
    }

    const parts = line.split('|').map((part) => part.trim()).filter(Boolean)
    if (parts.length < 3 || parts.every((part) => /^-+$/.test(part))) {
      continue
    }

    const nameMatch = parts[0].match(/\*\*(.*?)\*\*/)
    const rawName = normalize(nameMatch?.[1] || parts[0])
    const name = cleanDisplayName(rawName)
    const baseId = toFriendlyAgentSlug(rawName || name)

    if (!baseId) {
      continue
    }

    agents.push({
      id: `agent-${baseId}`,
      name,
      role: normalize(parts[1]),
      folder: normalize(parts[2].replace(/`/g, '')),
      status: 'idle',
      mission: '',
      responsibilities: [],
    })
  }

  return agents
}

export function createRootAgentFromWorkspace(input: RootAgentWorkspaceInput): DiscoveredAgent | null {
  const identityContent = normalize(input.identityContent)
  const soulContent = normalize(input.soulContent)

  if (!identityContent && !soulContent) {
    return null
  }

  const name = extractMarkdownField(identityContent, 'Name')
    || extractMarkdownField(soulContent, 'Name')
    || 'Main'
  const role = extractMarkdownField(identityContent, 'Role')
    || extractMarkdownField(soulContent, 'Role')
    || ROOT_AGENT_ROLE_FALLBACK
  const mission = extractMission(soulContent) || extractMission(identityContent)
  const model = extractMarkdownField(soulContent, 'Model') || extractMarkdownField(identityContent, 'Model')

  return {
    id: ROOT_AGENT_ID,
    name,
    role,
    mission,
    status: 'idle',
    responsibilities: [],
    folder: ROOT_FOLDER,
    soulContent: soulContent || identityContent,
    model: model || undefined,
    layer: 'governance',
    order: 0,
  }
}

export function parseTechnicalAgentsConfig(raw: string): TechnicalAgentConfig[] {
  if (!normalize(raw)) {
    return []
  }

  try {
    const parsed = JSON.parse(raw) as { agents?: { list?: TechnicalAgentConfig[] } }
    return Array.isArray(parsed.agents?.list) ? parsed.agents.list : []
  } catch {
    return []
  }
}

export function remapAgentsWithTechnicalConfig(
  agents: DiscoveredAgent[],
  technicalAgents: TechnicalAgentConfig[],
): DiscoveredAgent[] {
  return agents.map((agent) => {
    if (agent.id === ROOT_AGENT_ID) {
      return agent
    }

    const match = findTechnicalAgentMatch(agent, technicalAgents)
    if (!match) {
      return agent
    }

    const technicalName = normalize(match.identity?.name || match.name)

    return {
      ...agent,
      id: match.id,
      name: technicalName ? cleanDisplayName(technicalName) : agent.name,
    }
  })
}

export function enrichDiscoveredAgentMetadata(
  agent: DiscoveredAgent,
  input: MetadataEnrichmentInput,
): DiscoveredAgent {
  const soulContent = normalize(input.soulContent)
  const agentsContent = normalize(input.agentsContent)
  const mission = extractMission(soulContent)
  const model = extractMarkdownField(soulContent, 'Model')
  const type = extractMarkdownField(agentsContent, 'Type').toLowerCase()
  const responsibilities = extractResponsibilities(agentsContent)

  return {
    ...agent,
    folder: normalize(input.resolvedFolder) || agent.folder,
    soulContent: soulContent || agent.soulContent || agentsContent || undefined,
    mission: mission || agent.mission || '',
    model: model || agent.model,
    type: type || agent.type,
    responsibilities: responsibilities.length > 0 ? responsibilities : (agent.responsibilities || []),
  }
}

export function inferAgentLayerHints(agent: DiscoveredAgent, governanceContent: string): AgentLayerHints {
  const role = normalizeLower(agent.role)
  const type = normalizeLower(agent.type)
  const id = normalizeLower(agent.id)
  const existingLayer = normalizeLower(agent.layer)

  if (existingLayer === 'governance') {
    return { layer: 'governance', order: agent.order ?? 0 }
  }

  if (id === ROOT_AGENT_ID || role.includes('orchestrat') || role.includes('governance')) {
    return { layer: 'governance', order: 0 }
  }

  if (existingLayer === 'automation' ||
      id.includes('monitor') ||
      id.includes('heartbeat') ||
      role.includes('automation') ||
      role.includes('cron') ||
      role.includes('monitor') ||
      role.includes('reliability') ||
      type === 'sre' ||
      type === 'security' ||
      type === 'automation') {
    return { layer: 'automation', order: 100 }
  }

  if (existingLayer === 'review' ||
      role.includes('review') ||
      role.includes('qa') ||
      role.includes('test') ||
      role.includes('security') ||
      type === 'tester' ||
      type === 'reviewer' ||
      type === 'qa' ||
      type === 'security') {
    return { layer: 'review', order: 40 }
  }

  return {
    layer: 'build',
    order: resolveBuildOrder(agent, governanceContent),
  }
}

export function discoverAgents(): DiscoveredAgent[] {
  const registryPath = path.join(WORKSPACE_ROOT, 'agents', 'TEAM-REGISTRY.md')
  const governancePath = path.join(WORKSPACE_ROOT, 'TEAM_GOVERNANCE.md')

  if (!fs.existsSync(registryPath)) {
    console.warn('TEAM-REGISTRY.md not found at', registryPath)
    return []
  }

  const registryContent = readIfExists(registryPath)
  const governanceContent = readIfExists(governancePath)
  const rootAgent = createRootAgentFromWorkspace({
    identityContent: readIfExists(path.join(WORKSPACE_ROOT, 'identity.md')),
    soulContent: readIfExists(path.join(WORKSPACE_ROOT, 'soul.md')),
  })

  const technicalAgents = parseTechnicalAgentsConfig(
    readIfExists(path.join(os.homedir(), '.openclaw', 'openclaw.json')),
  )

  const discovered = remapAgentsWithTechnicalConfig(
    mergeRootAgent(parseRegistryTable(registryContent), rootAgent),
    technicalAgents,
  )

  return discovered
    .map((agent) => {
      if (agent.folder === ROOT_FOLDER) {
        const layerHints = inferAgentLayerHints(agent, governanceContent)
        return { ...agent, ...layerHints }
      }

      const resolvedDirectory = resolveAgentDirectory(WORKSPACE_ROOT, agent.folder)
      const resolvedFolder = normalizeFolderPath(path.relative(WORKSPACE_ROOT, resolvedDirectory))
      const enriched = enrichDiscoveredAgentMetadata(agent, {
        resolvedFolder,
        soulContent: readIfExists(path.join(resolvedDirectory, 'SOUL.md')),
        agentsContent: readIfExists(path.join(resolvedDirectory, 'AGENTS.md')),
      })

      return {
        ...enriched,
        ...inferAgentLayerHints(enriched, governanceContent),
      }
    })
    .sort((left, right) => {
      const orderDifference = (left.order ?? 999) - (right.order ?? 999)
      if (orderDifference !== 0) {
        return orderDifference
      }

      return left.name.localeCompare(right.name)
    })
}
