import { callGateway, type GatewayCall } from './gateway'

export type ExecApprovalRisk = 'low' | 'medium' | 'high'
export type ExecApprovalStatus = 'pending' | 'approved' | 'denied' | 'expired'
export type ExecApprovalDecision = 'allow-once' | 'allow-always' | 'deny'

export interface ExecApprovalRequest {
  id: string
  status: ExecApprovalStatus
  risk: ExecApprovalRisk
  agentId: string
  sessionKey: string
  command: string
  cwd?: string
  requestedAt?: number
}

type GatewayApprovalCandidate = {
  id?: unknown
  risk?: unknown
  status?: unknown
  createdAt?: unknown
  requestedAt?: unknown
  request?: {
    agentId?: unknown
    sessionKey?: unknown
    command?: unknown
    cwd?: unknown
    createdAt?: unknown
    requestedAt?: unknown
  }
  agentId?: unknown
  sessionKey?: unknown
  command?: unknown
  cwd?: unknown
}

export interface ExecApprovalDeps {
  callGateway: GatewayCall
}

function normalizeRisk(value: unknown): ExecApprovalRisk {
  return value === 'low' || value === 'high' ? value : 'medium'
}

function normalizeStatus(value: unknown): ExecApprovalStatus {
  return value === 'approved' || value === 'denied' || value === 'expired' ? value : 'pending'
}

function normalizeRequestedAt(...values: unknown[]): number | undefined {
  for (const value of values) {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value
    }
  }

  return undefined
}

function normalizeApproval(candidate: GatewayApprovalCandidate): ExecApprovalRequest | null {
  const request = candidate.request ?? {}
  const id = typeof candidate.id === 'string' ? candidate.id : ''
  const command = typeof request.command === 'string'
    ? request.command
    : typeof candidate.command === 'string'
      ? candidate.command
      : ''

  if (!id || !command) {
    return null
  }

  return {
    id,
    status: normalizeStatus(candidate.status),
    risk: normalizeRisk(candidate.risk),
    agentId: typeof request.agentId === 'string'
      ? request.agentId
      : typeof candidate.agentId === 'string'
        ? candidate.agentId
        : 'unknown',
    sessionKey: typeof request.sessionKey === 'string'
      ? request.sessionKey
      : typeof candidate.sessionKey === 'string'
        ? candidate.sessionKey
        : '',
    command,
    cwd: typeof request.cwd === 'string'
      ? request.cwd
      : typeof candidate.cwd === 'string'
        ? candidate.cwd
        : undefined,
    requestedAt: normalizeRequestedAt(
      request.createdAt,
      request.requestedAt,
      candidate.createdAt,
      candidate.requestedAt,
    ),
  }
}

function getApprovalList(payload: unknown): GatewayApprovalCandidate[] {
  if (!payload || typeof payload !== 'object') {
    return []
  }

  const record = payload as Record<string, unknown>

  if (Array.isArray(record.pending)) return record.pending as GatewayApprovalCandidate[]
  if (Array.isArray(record.approvals)) return record.approvals as GatewayApprovalCandidate[]
  if (Array.isArray(record.requests)) return record.requests as GatewayApprovalCandidate[]

  return []
}

export async function listExecApprovals(
  deps: ExecApprovalDeps = { callGateway },
): Promise<ExecApprovalRequest[]> {
  const payload = await deps.callGateway('exec.approvals.get', {})
  return getApprovalList(payload)
    .map((candidate) => normalizeApproval(candidate))
    .filter((approval): approval is ExecApprovalRequest => Boolean(approval))
}

export async function resolveExecApproval(
  input: { id: string; decision: ExecApprovalDecision },
  deps: ExecApprovalDeps = { callGateway },
) {
  return deps.callGateway('exec.approval.resolve', {
    id: input.id,
    decision: input.decision,
  })
}
