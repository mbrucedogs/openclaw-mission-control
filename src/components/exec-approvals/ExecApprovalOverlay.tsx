'use client'

import { AlertTriangle, ShieldAlert, ShieldCheck, TerminalSquare, XCircle } from 'lucide-react'

import { useExecApprovals } from './useExecApprovals'

function riskTone(risk: string) {
  if (risk === 'high') return 'border-red-500/30 bg-red-500/10 text-red-200'
  if (risk === 'low') return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
  return 'border-amber-500/30 bg-amber-500/10 text-amber-100'
}

export function ExecApprovalOverlay() {
  const { activeApproval, busyId, error, loading, resolveApproval } = useExecApprovals()

  if (loading || !activeApproval) {
    return null
  }

  const busy = busyId === activeApproval.id

  return (
    <div className="pointer-events-none fixed inset-0 z-[90] flex items-center justify-center bg-black/70 px-4 py-8 backdrop-blur-sm">
      <div className="pointer-events-auto w-full max-w-3xl rounded-[2rem] border border-[#2a2a2a] bg-[#0c0c0e] p-6 shadow-2xl md:p-8">
        <div className="flex flex-col gap-4 border-b border-white/10 pb-5 md:flex-row md:items-start md:justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/10">
                <ShieldAlert className="h-5 w-5 text-red-300" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">Exec Approval Required</p>
                <h2 className="text-xl font-black text-white">Command execution is waiting for a decision</h2>
              </div>
            </div>
            <p className="max-w-2xl text-sm leading-relaxed text-slate-400">
              OpenClaw is holding a command until you explicitly approve or deny it. The request stays blocked until one of the actions below resolves it.
            </p>
          </div>
          <span className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${riskTone(activeApproval.risk)}`}>
            {activeApproval.risk} risk
          </span>
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-3xl border border-[#202020] bg-black/60 p-4">
            <div className="flex items-center gap-2 text-slate-300">
              <TerminalSquare className="h-4 w-4 text-blue-300" />
              <p className="text-sm font-bold text-white">Command</p>
            </div>
            <pre className="mt-4 overflow-x-auto rounded-2xl border border-[#202020] bg-[#050506] p-4 text-sm leading-relaxed text-slate-300">
              <code>{activeApproval.command}</code>
            </pre>
            {activeApproval.cwd && (
              <p className="mt-3 text-xs text-slate-500">
                Working directory: <span className="font-mono text-slate-300">{activeApproval.cwd}</span>
              </p>
            )}
          </div>

          <div className="space-y-4 rounded-3xl border border-[#202020] bg-black/50 p-4">
            <div className="space-y-3">
              <ApprovalMeta label="Agent" value={activeApproval.agentId} />
              <ApprovalMeta label="Session" value={activeApproval.sessionKey} />
              <ApprovalMeta
                label="Requested"
                value={activeApproval.requestedAt ? new Date(activeApproval.requestedAt).toLocaleString() : 'Unknown'}
              />
            </div>

            {error && (
              <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {error}
              </div>
            )}

            <div className="space-y-3 pt-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => void resolveApproval(activeApproval.id, 'approve')}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm font-black uppercase tracking-[0.16em] text-emerald-100 transition-colors hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <ShieldCheck className="h-4 w-4" />
                Allow Once
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void resolveApproval(activeApproval.id, 'always_allow')}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-blue-500/20 bg-blue-500/10 px-4 py-3 text-sm font-black uppercase tracking-[0.16em] text-blue-100 transition-colors hover:bg-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <AlertTriangle className="h-4 w-4" />
                Always Allow
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void resolveApproval(activeApproval.id, 'deny')}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-black uppercase tracking-[0.16em] text-red-100 transition-colors hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <XCircle className="h-4 w-4" />
                Deny
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function ApprovalMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#09090b] px-4 py-3">
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-2 break-all text-sm font-medium text-white">{value}</p>
    </div>
  )
}
