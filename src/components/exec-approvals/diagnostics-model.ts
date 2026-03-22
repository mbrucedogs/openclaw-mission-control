import type { GatewayDiagnosticsResponse } from '@/app/gateway/gateway-diagnostics-model'

import type { ExecApprovalsDiagnosticsModel } from './types'

export function buildExecApprovalsDiagnosticsModel(
  data: GatewayDiagnosticsResponse,
): ExecApprovalsDiagnosticsModel {
  const tone = data.summary.state === 'failed' ? 'failed' : 'degraded'

  return {
    tone,
    title: tone === 'degraded' ? 'Approvals degraded' : 'Approvals unavailable',
    detail: data.summary.operatorMessage,
    transportLabel: data.summary.transportMode === 'sdk'
      ? 'SDK'
      : data.summary.transportMode === 'cli-fallback'
        ? 'CLI fallback'
        : 'Unavailable',
    linkLabel: 'Open gateway diagnostics',
  }
}
