import { NextResponse } from 'next/server'

import {
  listExecApprovals,
  resolveExecApproval,
  type ExecApprovalDecision,
  type ExecApprovalRequest,
} from '@/lib/openclaw/approvals'

type ExecApprovalRouteDeps = {
  listExecApprovals: () => Promise<ExecApprovalRequest[]>
  resolveExecApproval: (input: { id: string; decision: ExecApprovalDecision }) => Promise<unknown>
}

function toDecision(action: string): ExecApprovalDecision {
  if (action === 'approve') return 'allow-once'
  if (action === 'always_allow') return 'allow-always'
  if (action === 'deny') return 'deny'
  throw new Error('Invalid action')
}

export function buildExecApprovalsRoute(
  deps: ExecApprovalRouteDeps = { listExecApprovals, resolveExecApproval },
) {
  return {
    async GET() {
      try {
        const approvals = await deps.listExecApprovals()
        return NextResponse.json({ approvals })
      } catch {
        return NextResponse.json({
          approvals: [],
          error: 'Failed to fetch exec approvals',
        }, { status: 502 })
      }
    },

    async POST(request: Request) {
      try {
        const body = await request.json() as { id?: string; action?: string }
        const id = String(body.id || '').trim()
        const action = String(body.action || '').trim()

        if (!id) {
          return NextResponse.json({ error: 'Approval id is required' }, { status: 400 })
        }

        let decision: ExecApprovalDecision
        try {
          decision = toDecision(action)
        } catch (error) {
          return NextResponse.json({
            error: error instanceof Error ? error.message : 'Invalid action',
          }, { status: 400 })
        }

        await deps.resolveExecApproval({ id, decision })
        return NextResponse.json({ ok: true })
      } catch {
        return NextResponse.json({ error: 'Failed to resolve exec approval' }, { status: 502 })
      }
    },
  }
}

const route = buildExecApprovalsRoute()

export const GET = route.GET
export const POST = route.POST
