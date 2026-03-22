import { NextResponse } from 'next/server'

import { getGatewayStatus } from '@/lib/openclaw/gateway'
import { buildSessionsPayload } from '@/lib/openclaw/sessions'

export const dynamic = 'force-dynamic'

export async function GET() {
  const status = await getGatewayStatus()
  return NextResponse.json(buildSessionsPayload(status))
}
