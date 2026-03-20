import { spawn } from 'node:child_process'
import path from 'path'
import os from 'os'

const OPENCLAW_BIN = process.env.OPENCLAW_BIN || 'openclaw'
const GATEWAY_TIMEOUT = 8000

function parseGatewayJsonOutput(raw: string): unknown | null {
  const trimmed = String(raw || '').trim()
  if (!trimmed) return null
  const objectStart = trimmed.indexOf('{')
  const arrayStart = trimmed.indexOf('[')
  const hasObject = objectStart >= 0
  const hasArray = arrayStart >= 0
  let start = -1, end = -1
  if (hasObject && hasArray) {
    start = objectStart < arrayStart ? objectStart : arrayStart
    end = objectStart < arrayStart ? trimmed.lastIndexOf('}') : trimmed.lastIndexOf(']')
  } else if (hasObject) {
    start = objectStart; end = trimmed.lastIndexOf('}')
  } else if (hasArray) {
    start = arrayStart; end = trimmed.lastIndexOf(']')
  }
  if (start < 0 || end < start) return null
  try {
    return JSON.parse(trimmed.slice(start, end + 1))
  } catch {
    return null
  }
}

export interface GatewayOptions {
  timeoutMs?: number
}

export async function callGateway<T = unknown>(method: string, params: unknown = {}, opts: GatewayOptions = {}): Promise<T> {
  const timeoutMs = opts.timeoutMs ?? GATEWAY_TIMEOUT
  return new Promise((resolve, reject) => {
    const args = ['gateway', 'call', method, '--json', '--timeout', String(Math.max(1000, Math.floor(timeoutMs))), '--params', JSON.stringify(params)]
    const child = spawn(OPENCLAW_BIN, args, {
      cwd: os.homedir(),
      timeout: timeoutMs + 2000,
    })
    let stdout = '', stderr = ''
    const timer = setTimeout(() => { child.kill('SIGKILL'); reject(new Error(`Gateway call timed out: ${method}`)) }, timeoutMs + 2000)
    child.stdout.on('data', (d) => { stdout += d.toString() })
    child.stderr.on('data', (d) => { stderr += d.toString() })
    child.on('close', (code) => {
      clearTimeout(timer)
      if (code === 0) {
        const payload = parseGatewayJsonOutput(stdout)
        if (payload == null) { reject(new Error(`Invalid JSON from gateway method ${method}`)); return }
        resolve(payload as T)
      } else {
        reject(new Error(stderr || stdout || `Gateway call failed: ${method}`))
      }
    })
    child.on('error', (err) => { clearTimeout(timer); reject(err) })
  })
}

export async function getGatewayHealth() {
  try {
    return await callGateway<GatewayHealthResponse>('health', {}, { timeoutMs: 10000 })
  } catch {
    return null
  }
}

export async function getGatewayStatus() {
  try {
    return await callGateway<GatewayStatusResponse>('status', {}, { timeoutMs: 10000 })
  } catch {
    return null
  }
}

export interface GatewayHealthResponse {
  ok: boolean
  ts: number
  channels: Record<string, any>
  channelOrder: string[]
  heartbeatSeconds: number
  defaultAgentId: string
  agents: GatewayAgent[]
  sessions: { path: string; count: number; recent: SessionRef[] }
}

export interface GatewayStatusResponse {
  runtimeVersion: string
  heartbeat: { defaultAgentId: string; agents: { agentId: string; enabled: boolean; every: string; everyMs: number | null }[] }
  channelSummary: string[]
  queuedSystemEvents: unknown[]
  sessions: {
    paths: string[]
    count: number
    defaults: { model: string; contextTokens: number }
    recent: SessionDetail[]
    byAgent: AgentSessionGroup[]
  }
}

export interface GatewayAgent {
  agentId: string
  name?: string
  isDefault: boolean
  heartbeat: { enabled: boolean; every: string; everyMs: number | null; prompt: string; target: string; ackMaxChars: number }
  sessions: { path: string; count: number; recent: SessionRef[] }
}

export interface SessionRef {
  key: string
  updatedAt: number
  age: number
}

export interface SessionDetail {
  agentId: string
  key: string
  kind: string
  sessionId: string
  updatedAt: number
  age: number
  systemSent?: boolean
  abortedLastRun?: boolean
  inputTokens: number
  outputTokens: number
  totalTokens: number
  remainingTokens: number
  percentUsed: number
  model: string
  contextTokens: number
  flags: string[]
}

export interface AgentSessionGroup {
  agentId: string
  path: string
  count: number
  recent: SessionDetail[]
}
