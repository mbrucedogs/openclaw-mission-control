import { execFile } from 'node:child_process'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { promisify } from 'node:util'

import { BASE_WORKSPACE, getOpenClawGatewayRuntimeConfig } from '../config'
import { getGatewaySnapshot, type GatewaySnapshot } from './gateway'

const execFileAsync = promisify(execFile)

export type GatewayCapabilityCheckStatus = 'pass' | 'warn' | 'fail'

export type GatewayCapabilityCheck = {
  id: 'transport' | 'gateway' | 'auth' | 'scope' | 'runtime' | 'cli'
  label: string
  status: GatewayCapabilityCheckStatus
  detail: string
}

export type GatewayCapabilitySummary = {
  transportMode: GatewaySnapshot['diagnostics']['transportMode']
  state: GatewaySnapshot['diagnostics']['state']
  reasonCode: GatewaySnapshot['diagnostics']['reasonCode']
  operatorMessage: string
  runtimeVersion: string | null
  openClawVersion: string | null
  defaultAgentId: string | null
  heartbeatSeconds: number | null
  channelCount: number
  agentCount: number
  sessionCount: number
}

export type GatewayCapabilitySnapshot = {
  checkedAt: string
  missionControlVersion: string
  gatewayUrl: string
  workspaceRoot: string
  timeoutMs: number
  hasTokenConfigured: boolean
  summary: GatewayCapabilitySummary
  checks: GatewayCapabilityCheck[]
}

type BuildGatewayCapabilitiesInput = {
  snapshot: GatewaySnapshot
  checkedAt: string
  missionControlVersion: string
  gatewayUrl: string
  workspaceRoot: string
  timeoutMs: number
  hasTokenConfigured: boolean
  openClawVersion: string | null
}

type GatewayCapabilitiesDeps = {
  env?: NodeJS.ProcessEnv
  getGatewaySnapshot?: typeof getGatewaySnapshot
  getMissionControlVersion?: () => string
  getOpenClawVersion?: () => Promise<string | null>
}

export function buildGatewayCapabilities(input: BuildGatewayCapabilitiesInput): GatewayCapabilitySnapshot {
  const { snapshot } = input
  const summary: GatewayCapabilitySummary = {
    transportMode: snapshot.diagnostics.transportMode,
    state: snapshot.diagnostics.state,
    reasonCode: snapshot.diagnostics.reasonCode,
    operatorMessage: snapshot.diagnostics.operatorMessage,
    runtimeVersion: snapshot.status?.runtimeVersion ?? null,
    openClawVersion: input.openClawVersion,
    defaultAgentId: snapshot.health?.defaultAgentId ?? snapshot.status?.heartbeat.defaultAgentId ?? null,
    heartbeatSeconds: snapshot.health?.heartbeatSeconds ?? null,
    channelCount: snapshot.health?.channelOrder.length ?? 0,
    agentCount: snapshot.health?.agents.length ?? 0,
    sessionCount: snapshot.status?.sessions.count ?? snapshot.health?.sessions.count ?? 0,
  }

  const checks: GatewayCapabilityCheck[] = [
    buildTransportCheck(snapshot),
    buildGatewayCheck(snapshot),
    buildAuthCheck(snapshot, input.hasTokenConfigured),
    buildScopeCheck(snapshot),
    buildRuntimeCheck(snapshot, summary.sessionCount, summary.agentCount),
    buildCliCheck(input.openClawVersion, snapshot.diagnostics.transportMode),
  ]

  return {
    checkedAt: input.checkedAt,
    missionControlVersion: input.missionControlVersion,
    gatewayUrl: input.gatewayUrl,
    workspaceRoot: input.workspaceRoot,
    timeoutMs: input.timeoutMs,
    hasTokenConfigured: input.hasTokenConfigured,
    summary,
    checks,
  }
}

export async function getGatewayCapabilities(deps: GatewayCapabilitiesDeps = {}): Promise<GatewayCapabilitySnapshot> {
  const env = deps.env ?? process.env
  const config = getOpenClawGatewayRuntimeConfig(env)
  const snapshot = await (deps.getGatewaySnapshot ?? getGatewaySnapshot)()
  const missionControlVersion = deps.getMissionControlVersion?.() ?? getMissionControlVersion()
  const openClawVersion = await (deps.getOpenClawVersion?.() ?? getOpenClawVersion())

  return buildGatewayCapabilities({
    snapshot,
    checkedAt: new Date().toISOString(),
    missionControlVersion,
    gatewayUrl: config.url,
    workspaceRoot: env.OPENCLAW_WORKSPACE || BASE_WORKSPACE,
    timeoutMs: config.timeoutMs,
    hasTokenConfigured: Boolean(config.token),
    openClawVersion,
  })
}

function buildTransportCheck(snapshot: GatewaySnapshot): GatewayCapabilityCheck {
  if (snapshot.diagnostics.transportMode === 'sdk') {
    return { id: 'transport', label: 'Transport', status: 'pass', detail: 'SDK transport active.' }
  }
  if (snapshot.diagnostics.transportMode === 'cli-fallback') {
    return { id: 'transport', label: 'Transport', status: 'warn', detail: 'CLI fallback transport active.' }
  }
  return { id: 'transport', label: 'Transport', status: 'fail', detail: 'Mission Control could not initialize an OpenClaw transport.' }
}

function buildGatewayCheck(snapshot: GatewaySnapshot): GatewayCapabilityCheck {
  if (snapshot.diagnostics.state === 'connected') {
    return { id: 'gateway', label: 'Gateway', status: 'pass', detail: 'Gateway responded to health and status.' }
  }
  if (snapshot.diagnostics.state === 'degraded') {
    return { id: 'gateway', label: 'Gateway', status: 'warn', detail: 'Gateway responded, but runtime access is incomplete.' }
  }
  return { id: 'gateway', label: 'Gateway', status: 'fail', detail: snapshot.diagnostics.operatorMessage }
}

function buildAuthCheck(snapshot: GatewaySnapshot, hasTokenConfigured: boolean): GatewayCapabilityCheck {
  if (snapshot.diagnostics.reasonCode === 'auth_failed') {
    return { id: 'auth', label: 'Auth', status: 'fail', detail: snapshot.diagnostics.operatorMessage }
  }
  if (!hasTokenConfigured) {
    return { id: 'auth', label: 'Auth', status: 'warn', detail: 'No gateway token configured.' }
  }
  return { id: 'auth', label: 'Auth', status: 'pass', detail: 'Gateway token configured.' }
}

function buildScopeCheck(snapshot: GatewaySnapshot): GatewayCapabilityCheck {
  if (snapshot.diagnostics.reasonCode === 'insufficient_scope') {
    return { id: 'scope', label: 'Scope', status: 'warn', detail: snapshot.diagnostics.operatorMessage }
  }
  return { id: 'scope', label: 'Scope', status: 'pass', detail: 'Required runtime scope appears available.' }
}

function buildRuntimeCheck(snapshot: GatewaySnapshot, sessionCount: number, agentCount: number): GatewayCapabilityCheck {
  if (snapshot.diagnostics.state === 'connected') {
    return {
      id: 'runtime',
      label: 'Runtime',
      status: 'pass',
      detail: `Runtime data available for ${agentCount} agent${agentCount === 1 ? '' : 's'} and ${sessionCount} session${sessionCount === 1 ? '' : 's'}.`,
    }
  }
  if (snapshot.diagnostics.state === 'degraded') {
    return { id: 'runtime', label: 'Runtime', status: 'warn', detail: 'Partial runtime data is available.' }
  }
  return { id: 'runtime', label: 'Runtime', status: 'fail', detail: 'Runtime data unavailable.' }
}

function buildCliCheck(openClawVersion: string | null, transportMode: GatewaySnapshot['diagnostics']['transportMode']): GatewayCapabilityCheck {
  if (openClawVersion) {
    return { id: 'cli', label: 'OpenClaw CLI', status: 'pass', detail: `OpenClaw CLI detected (${openClawVersion}).` }
  }
  if (transportMode === 'cli-fallback') {
    return { id: 'cli', label: 'OpenClaw CLI', status: 'warn', detail: 'CLI fallback is active, but the CLI version could not be read.' }
  }
  return { id: 'cli', label: 'OpenClaw CLI', status: 'warn', detail: 'OpenClaw CLI version unavailable.' }
}

function getMissionControlVersion() {
  try {
    const packageJsonPath = path.join(process.cwd(), 'package.json')
    const parsed = JSON.parse(readFileSync(packageJsonPath, 'utf-8')) as { version?: string }
    return parsed.version || 'unknown'
  } catch {
    return 'unknown'
  }
}

async function getOpenClawVersion(): Promise<string | null> {
  try {
    const { stdout } = await execFileAsync('openclaw', ['--version'], {
      env: process.env,
      maxBuffer: 1024 * 1024,
    })

    const version = stdout.trim().split('\n').find(Boolean)?.trim()
    return version || null
  } catch {
    return null
  }
}
