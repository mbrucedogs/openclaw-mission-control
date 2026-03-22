import type { ExecApprovalRequest, ExecApprovalRisk, ExecApprovalStatus } from '@/lib/openclaw/approvals'

export type ExecApprovalAction = 'approve' | 'always_allow' | 'deny'
export type ExecApprovalsFilter = 'all' | 'pending' | 'resolved'

export interface ClientExecApproval extends ExecApprovalRequest {
  risk: ExecApprovalRisk
  status: ExecApprovalStatus
  expiresAt?: number
}

export interface ExecApprovalsDiagnosticsModel {
  tone: 'degraded' | 'failed'
  title: string
  detail: string
  transportLabel: string
  linkLabel: string
}
