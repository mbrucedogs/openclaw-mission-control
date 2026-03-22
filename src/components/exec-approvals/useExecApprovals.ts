'use client'

import { useEffect, useEffectEvent, useMemo, useState } from 'react'

import type { ClientExecApproval, ExecApprovalAction, ExecApprovalsFilter } from './types'

function normalizeRisk(value: string | undefined): ClientExecApproval['risk'] {
  return value === 'low' || value === 'high' ? value : 'medium'
}

function normalizeStatus(value: string | undefined): ClientExecApproval['status'] {
  return value === 'approved' || value === 'denied' || value === 'expired' ? value : 'pending'
}

export function normalizeExecApprovals(approvals: Array<Partial<ClientExecApproval>>): ClientExecApproval[] {
  return approvals
    .filter((approval): approval is Partial<ClientExecApproval> & { id: string; command: string; agentId: string; sessionKey: string } => (
      typeof approval.id === 'string'
      && typeof approval.command === 'string'
      && typeof approval.agentId === 'string'
      && typeof approval.sessionKey === 'string'
    ))
    .map((approval) => ({
      id: approval.id,
      command: approval.command,
      agentId: approval.agentId,
      sessionKey: approval.sessionKey,
      status: normalizeStatus(approval.status),
      risk: normalizeRisk(approval.risk),
      cwd: approval.cwd,
      requestedAt: typeof approval.requestedAt === 'number' ? approval.requestedAt : undefined,
      expiresAt: typeof approval.expiresAt === 'number' ? approval.expiresAt : undefined,
    }))
    .sort((left, right) => (left.requestedAt ?? Number.MAX_SAFE_INTEGER) - (right.requestedAt ?? Number.MAX_SAFE_INTEGER))
}

export function getActiveApproval(
  approvals: ClientExecApproval[],
  now = Date.now(),
): ClientExecApproval | null {
  return approvals.find((approval) => (
    approval.status === 'pending'
    && (approval.expiresAt === undefined || approval.expiresAt > now)
  )) ?? null
}

export function filterApprovals(
  approvals: ClientExecApproval[],
  filter: ExecApprovalsFilter,
): ClientExecApproval[] {
  if (filter === 'pending') {
    return approvals.filter((approval) => approval.status === 'pending')
  }

  if (filter === 'resolved') {
    return approvals.filter((approval) => approval.status !== 'pending')
  }

  return approvals
}

export function useExecApprovals() {
  const [approvals, setApprovals] = useState<ClientExecApproval[]>([])
  const [resolvedApprovals, setResolvedApprovals] = useState<ClientExecApproval[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  async function refresh() {
    try {
      const response = await fetch('/api/exec-approvals', { cache: 'no-store' })
      const payload = await response.json()

      if (!response.ok) {
        throw new Error(typeof payload?.error === 'string' ? payload.error : 'Failed to fetch exec approvals')
      }

      const nextPending = normalizeExecApprovals(Array.isArray(payload?.approvals) ? payload.approvals : [])
      setApprovals([
        ...nextPending,
        ...resolvedApprovals.filter((approval) => !nextPending.some((pending) => pending.id === approval.id)),
      ])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch exec approvals')
    } finally {
      setLoading(false)
    }
  }

  const refreshEvent = useEffectEvent(() => {
    void refresh()
  })

  useEffect(() => {
    refreshEvent()
    const interval = window.setInterval(() => {
      refreshEvent()
    }, 4000)

    return () => window.clearInterval(interval)
  }, [resolvedApprovals])

  const activeApproval = useMemo(() => getActiveApproval(approvals), [approvals])
  const pending = useMemo(() => filterApprovals(approvals, 'pending'), [approvals])

  async function resolveApproval(id: string, action: ExecApprovalAction) {
    setBusyId(id)
    try {
      const response = await fetch('/api/exec-approvals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action }),
      })
      const payload = await response.json()

      if (!response.ok) {
        throw new Error(typeof payload?.error === 'string' ? payload.error : 'Failed to resolve exec approval')
      }

      setResolvedApprovals((current) => {
        const approval = approvals.find((item) => item.id === id)
        if (!approval) {
          return current
        }

        const status: ClientExecApproval['status'] = action === 'deny' ? 'denied' : 'approved'
        const nextApproval = { ...approval, status }
        return [
          nextApproval,
          ...current.filter((item) => item.id !== id),
        ]
      })

      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resolve exec approval')
    } finally {
      setBusyId(null)
    }
  }

  return {
    approvals,
    pending,
    activeApproval,
    loading,
    error,
    busyId,
    refresh,
    resolveApproval,
  }
}
