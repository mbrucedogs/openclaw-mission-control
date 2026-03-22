import { NextResponse } from 'next/server'

import { getGatewayCapabilities, type GatewayCapabilitySnapshot } from '@/lib/openclaw/capabilities'

export const dynamic = 'force-dynamic'

export function buildGatewayDiagnosticsPayload(snapshot: GatewayCapabilitySnapshot) {
  return {
    checkedAt: snapshot.checkedAt,
    config: {
      gatewayUrl: snapshot.gatewayUrl,
      workspaceRoot: snapshot.workspaceRoot,
      timeoutMs: snapshot.timeoutMs,
      hasTokenConfigured: snapshot.hasTokenConfigured,
    },
    summary: snapshot.summary,
    checks: snapshot.checks,
  }
}

export async function GET() {
  const snapshot = await getGatewayCapabilities()
  return NextResponse.json(buildGatewayDiagnosticsPayload(snapshot))
}
