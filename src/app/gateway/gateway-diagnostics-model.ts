type DiagnosticsCheck = {
  id: string
  label: string
  status: 'pass' | 'warn' | 'fail'
  detail: string
}

export type GatewayDiagnosticsResponse = {
  checkedAt: string
  config: {
    gatewayUrl: string
    workspaceRoot: string
    timeoutMs: number
    hasTokenConfigured: boolean
  }
  summary: {
    transportMode: 'sdk' | 'cli-fallback' | 'failed'
    state: 'connected' | 'degraded' | 'failed'
    reasonCode: string
    operatorMessage: string
    runtimeVersion: string | null
    openClawVersion: string | null
    defaultAgentId: string | null
    heartbeatSeconds: number | null
    channelCount: number
    agentCount: number
    sessionCount: number
  }
  checks: DiagnosticsCheck[]
}

export function buildGatewayDiagnosticsModel(data: GatewayDiagnosticsResponse) {
  return {
    banner: {
      tone: data.summary.state,
      title: data.summary.state === 'connected'
        ? 'Gateway connected'
        : data.summary.state === 'degraded'
          ? 'Gateway degraded'
          : 'Gateway failed',
      detail: data.summary.operatorMessage,
      transportLabel: data.summary.transportMode === 'sdk'
        ? 'SDK'
        : data.summary.transportMode === 'cli-fallback'
          ? 'CLI fallback'
          : 'Unavailable',
    },
    stats: [
      { label: 'Agents', value: String(data.summary.agentCount) },
      { label: 'Sessions', value: String(data.summary.sessionCount) },
      { label: 'Channels', value: String(data.summary.channelCount) },
      { label: 'Runtime', value: data.summary.runtimeVersion || 'Unavailable' },
    ],
    configRows: [
      { label: 'Gateway URL', value: data.config.gatewayUrl },
      { label: 'Workspace', value: data.config.workspaceRoot },
      { label: 'Timeout', value: `${data.config.timeoutMs} ms` },
      { label: 'Token', value: data.config.hasTokenConfigured ? 'Configured' : 'Not configured' },
      { label: 'OpenClaw CLI', value: data.summary.openClawVersion || 'Unavailable' },
      { label: 'Default agent', value: data.summary.defaultAgentId || 'Unavailable' },
      { label: 'Checked', value: data.checkedAt },
    ],
    checks: data.checks.map((check) => ({
      ...check,
      tone: check.status,
    })),
  }
}
