import type { GatewayStatusResponse, SessionDetail } from './gateway'

export interface OpenClawSessionRouteEntry {
  agentId: string
  key: string
  kind: string
  sessionId: string
  updatedAt: number
  ageMs?: number
  systemSent?: boolean
  abortedLastRun?: boolean
  inputTokens?: number
  outputTokens?: number
  totalTokens: number | null
  model: string
  contextTokens?: number
}

function normalizeString(value: string | undefined, fallback: string): string {
  const trimmed = String(value ?? '').trim()
  return trimmed || fallback
}

function normalizeNumber(value: number | undefined, fallback: number): number {
  return Number.isFinite(value) ? Number(value) : fallback
}

export function mapGatewaySessionToRouteEntry(
  session: SessionDetail,
  defaults: GatewayStatusResponse['sessions']['defaults'],
): OpenClawSessionRouteEntry {
  const sessionId = normalizeString(session.sessionId, 'unknown-session')
  const agentId = normalizeString(session.agentId, sessionId)
  const routeEntry: OpenClawSessionRouteEntry = {
    agentId,
    key: normalizeString(session.key, sessionId),
    kind: normalizeString(session.kind, 'session'),
    sessionId,
    updatedAt: normalizeNumber(session.updatedAt, 0),
    ageMs: normalizeNumber(session.age, 0),
    inputTokens: session.inputTokens,
    outputTokens: session.outputTokens,
    totalTokens: Number.isFinite(session.totalTokens) ? session.totalTokens : null,
    model: normalizeString(session.model, defaults.model),
    contextTokens: normalizeNumber(session.contextTokens, defaults.contextTokens),
  }

  if (typeof session.systemSent === 'boolean') {
    routeEntry.systemSent = session.systemSent
  }

  if (typeof session.abortedLastRun === 'boolean') {
    routeEntry.abortedLastRun = session.abortedLastRun
  }

  return routeEntry
}

export function buildSessionsPayload(status: GatewayStatusResponse | null) {
  if (!status) {
    return { sessions: [] }
  }

  return {
    sessions: status.sessions.recent.map((session) => (
      mapGatewaySessionToRouteEntry(session, status.sessions.defaults)
    )),
  }
}
