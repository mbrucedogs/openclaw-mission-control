'use client'

import { useEffect, useState } from 'react'

import { cn } from '@/lib/utils'
import { buildGatewayPanelModel, type GatewayPanelResponse } from './gateway-panel-model'

function ago(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  if (seconds < 60) return `${seconds}s`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`
  return `${Math.floor(seconds / 86400)}d`
}

export function GatewayPanel() {
  const [data, setData] = useState<GatewayPanelResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchGateway() {
      try {
        const response = await fetch('/api/gateway', { cache: 'no-store' })
        if (response.ok) {
          setData(await response.json())
        }
      } catch {
        setData(null)
      } finally {
        setLoading(false)
      }
    }

    void fetchGateway()
    const interval = window.setInterval(() => {
      void fetchGateway()
    }, 30000)

    return () => window.clearInterval(interval)
  }, [])

  const model = buildGatewayPanelModel(data)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="h-4 w-4 rounded-full bg-blue-500 animate-ping" />
      </div>
    )
  }

  if (!model.connected) {
    return (
      <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-4">
        <div className="flex items-center gap-2 text-sm font-bold text-red-400">
          <div className="h-2 w-2 rounded-full bg-red-500" />
          Gateway offline
        </div>
        <p className="mt-2 text-xs text-slate-500">OpenClaw is unreachable, so runtime metrics are temporarily unavailable.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-bold text-white">Gateway snapshot</p>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Runtime bridge</p>
        </div>
        <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-200">
          Connected
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <SnapshotStat value={model.summary.agentCount} label="Agents" />
        <SnapshotStat value={model.summary.activeAgentCount} label="Active" />
        <SnapshotStat value={model.summary.sessionCount} label="Sessions" />
      </div>

      {model.recentSessions.length > 0 && (
        <section>
          <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-500">Recent sessions</p>
          <div className="space-y-2">
            {model.recentSessions.map((session) => (
              <div key={session.id} className="flex items-center justify-between rounded-2xl border border-[#1a1a1a] bg-black/50 px-3 py-3">
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-white">{session.label}</p>
                  <p className="mt-1 truncate text-[11px] text-slate-500">{session.model || 'Unknown model'}</p>
                </div>
                <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                  <span className={cn(
                    'rounded-full border px-2 py-1',
                    session.percentUsed > 80
                      ? 'border-red-500/30 bg-red-500/10 text-red-200'
                      : session.percentUsed > 50
                        ? 'border-amber-500/30 bg-amber-500/10 text-amber-100'
                        : 'border-blue-500/30 bg-blue-500/10 text-blue-100',
                  )}>
                    {session.percentUsed}%
                  </span>
                  <span>{ago(session.age)}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {model.channels.length > 0 && (
        <section>
          <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-500">Channels</p>
          <div className="flex flex-wrap gap-2">
            {model.channels.map((channel) => (
              <span
                key={channel.id}
                className={cn(
                  'rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em]',
                  channel.isRunning
                    ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-200'
                    : 'border-white/10 bg-black/50 text-slate-500',
                )}
              >
                {channel.label} {channel.isRunning ? '●' : '○'}
              </span>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function SnapshotStat({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-2xl border border-[#1a1a1a] bg-[#101010] p-3 text-center">
      <p className="text-lg font-black text-white">{value}</p>
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{label}</p>
    </div>
  )
}
