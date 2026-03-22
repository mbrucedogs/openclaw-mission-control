'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ShieldAlert, ShieldCheck, TerminalSquare, XCircle } from 'lucide-react'

import { cn } from '@/lib/utils'

import type { ExecApprovalsFilter } from './types'
import { filterApprovals, useExecApprovals } from './useExecApprovals'

function riskTone(risk: string) {
  if (risk === 'high') return 'border-red-500/20 bg-red-500/10 text-red-200'
  if (risk === 'low') return 'border-emerald-500/20 bg-emerald-500/10 text-emerald-200'
  return 'border-amber-500/20 bg-amber-500/10 text-amber-100'
}

export function ExecApprovalsPage() {
  const { approvals, pending, loading, error, diagnostics, busyId, resolveApproval } = useExecApprovals()
  const [filter, setFilter] = useState<ExecApprovalsFilter>('all')

  const filteredApprovals = useMemo(() => filterApprovals(approvals, filter), [approvals, filter])

  return (
    <div className="max-w-[1400px] space-y-8 p-4 sm:p-10 lg:p-12">
      <section className="rounded-[2rem] border border-[#1a1a1a] bg-[#101010] p-6 shadow-2xl sm:p-10">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-500/20 bg-amber-500/10">
                <ShieldAlert className="h-5 w-5 text-amber-200" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">Approval Queue</p>
                <h1 className="text-3xl font-black text-white sm:text-4xl">Exec approvals</h1>
              </div>
            </div>
            <p className="max-w-2xl text-sm leading-relaxed text-slate-400">
              Review command execution requests coming from OpenClaw and decide whether each should run once, be permanently allowed, or be denied.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-amber-100">
              {pending.length} pending
            </span>
            {(['all', 'pending', 'resolved'] as ExecApprovalsFilter[]).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setFilter(value)}
                className={`rounded-full border px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] transition-colors ${
                  filter === value
                    ? 'border-white/20 bg-white/[0.08] text-white'
                    : 'border-white/10 bg-black/40 text-slate-500 hover:text-slate-200'
                }`}
              >
                {value}
              </button>
            ))}
          </div>
        </div>
      </section>

      {error && diagnostics ? (
        <div className={cn(
          'rounded-3xl border px-5 py-5',
          diagnostics.tone === 'degraded'
            ? 'border-amber-500/20 bg-amber-500/10 text-amber-100'
            : 'border-red-500/20 bg-red-500/10 text-red-200',
        )}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-black text-white">{diagnostics.title}</span>
                <span className="rounded-full border border-white/10 bg-black/30 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-current">
                  {diagnostics.transportLabel}
                </span>
              </div>
              <p className="text-sm">{diagnostics.detail}</p>
              <p className="text-xs text-current/80">{error}</p>
            </div>
            <Link
              href="/gateway"
              className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-[11px] font-black uppercase tracking-[0.16em] text-white transition hover:border-white/20"
            >
              {diagnostics.linkLabel}
            </Link>
          </div>
        </div>
      ) : error ? (
        <div className="rounded-3xl border border-red-500/20 bg-red-500/10 px-5 py-4 text-sm text-red-200">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="flex min-h-[240px] items-center justify-center rounded-[2rem] border border-[#1a1a1a] bg-[#0c0c0e]">
          <div className="h-5 w-5 rounded-full bg-amber-400 animate-ping" />
        </div>
      ) : filteredApprovals.length === 0 ? (
        <div className="rounded-[2rem] border border-dashed border-white/10 bg-[#0c0c0e] px-6 py-16 text-center">
          <p className="text-sm font-bold text-white">No approvals in this view.</p>
          <p className="mt-2 text-sm text-slate-500">Pending requests will appear here automatically when OpenClaw asks for a decision.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredApprovals.map((approval) => {
            const busy = busyId === approval.id
            return (
              <article key={approval.id} className="rounded-[2rem] border border-[#1a1a1a] bg-[#0c0c0e] p-5 shadow-xl">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1 space-y-4">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${riskTone(approval.risk)}`}>
                        {approval.risk} risk
                      </span>
                      <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-300">
                        {approval.status}
                      </span>
                      <span className="rounded-full border border-white/10 bg-black px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                        {approval.agentId}
                      </span>
                    </div>

                    <div className="rounded-3xl border border-[#202020] bg-black/60 p-4">
                      <div className="flex items-center gap-2">
                        <TerminalSquare className="h-4 w-4 text-blue-300" />
                        <p className="text-sm font-bold text-white">Command</p>
                      </div>
                      <pre className="mt-3 overflow-x-auto rounded-2xl border border-[#202020] bg-[#050506] p-4 text-sm text-slate-300">
                        <code>{approval.command}</code>
                      </pre>
                    </div>

                    <div className="grid gap-3 md:grid-cols-3">
                      <QueueMeta label="Session" value={approval.sessionKey} />
                      <QueueMeta label="Directory" value={approval.cwd || 'Unknown'} />
                      <QueueMeta
                        label="Requested"
                        value={approval.requestedAt ? new Date(approval.requestedAt).toLocaleString() : 'Unknown'}
                      />
                    </div>
                  </div>

                  <div className="flex w-full flex-col gap-3 lg:w-56">
                    <button
                      type="button"
                      disabled={busy || approval.status !== 'pending'}
                      onClick={() => void resolveApproval(approval.id, 'approve')}
                      className="flex items-center justify-center gap-2 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm font-black uppercase tracking-[0.16em] text-emerald-100 transition-colors hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <ShieldCheck className="h-4 w-4" />
                      Allow once
                    </button>
                    <button
                      type="button"
                      disabled={busy || approval.status !== 'pending'}
                      onClick={() => void resolveApproval(approval.id, 'always_allow')}
                      className="flex items-center justify-center gap-2 rounded-2xl border border-blue-500/20 bg-blue-500/10 px-4 py-3 text-sm font-black uppercase tracking-[0.16em] text-blue-100 transition-colors hover:bg-blue-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <ShieldAlert className="h-4 w-4" />
                      Always allow
                    </button>
                    <button
                      type="button"
                      disabled={busy || approval.status !== 'pending'}
                      onClick={() => void resolveApproval(approval.id, 'deny')}
                      className="flex items-center justify-center gap-2 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-black uppercase tracking-[0.16em] text-red-100 transition-colors hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <XCircle className="h-4 w-4" />
                      Deny
                    </button>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}

function QueueMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/50 px-4 py-3">
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-2 break-all text-sm text-slate-300">{value}</p>
    </div>
  )
}
