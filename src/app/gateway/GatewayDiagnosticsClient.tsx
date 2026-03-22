'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Activity, RefreshCw, ShieldAlert, TerminalSquare } from 'lucide-react'

import { cn } from '@/lib/utils'
import { buildGatewayDiagnosticsModel, type GatewayDiagnosticsResponse } from './gateway-diagnostics-model'

export function GatewayDiagnosticsClient() {
  const [data, setData] = useState<GatewayDiagnosticsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  async function load() {
    try {
      const response = await fetch('/api/gateway/diagnostics', { cache: 'no-store' })
      if (response.ok) {
        setData(await response.json())
      }
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  if (loading || !data) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-5 w-5 rounded-full bg-blue-500 animate-ping" />
      </div>
    )
  }

  const model = buildGatewayDiagnosticsModel(data)

  return (
    <div className="max-w-[1400px] space-y-8 p-4 sm:p-10 lg:p-12">
      <div className="relative overflow-hidden rounded-[2rem] border border-[#1a1a1a] bg-[#101010] p-8 shadow-2xl sm:rounded-[3rem] sm:p-10">
        <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-blue-500/5 blur-3xl" />
        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">
              <TerminalSquare className="h-4 w-4 text-blue-400" />
              Gateway Diagnostics
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <span className={cn(
                'rounded-full border px-4 py-2 text-[11px] font-black uppercase tracking-[0.2em]',
                model.banner.tone === 'connected'
                  ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-200'
                  : model.banner.tone === 'degraded'
                    ? 'border-amber-500/20 bg-amber-500/10 text-amber-100'
                    : 'border-red-500/20 bg-red-500/10 text-red-200',
              )}>
                {model.banner.title}
              </span>
              <span className="rounded-full border border-white/10 bg-black/50 px-4 py-2 text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">
                {model.banner.transportLabel}
              </span>
            </div>
            <h1 className="text-4xl font-black tracking-tight text-white sm:text-5xl">OpenClaw Runtime Probe</h1>
            <p className="max-w-3xl text-base text-slate-400 sm:text-lg">{model.banner.detail}</p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => {
                setRefreshing(true)
                void load()
              }}
              className="inline-flex items-center gap-2 rounded-2xl border border-blue-500/20 bg-blue-500/10 px-5 py-3 text-xs font-black uppercase tracking-[0.2em] text-blue-100 transition hover:bg-blue-500/20"
            >
              <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} />
              Refresh Probe
            </button>
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-black/40 px-5 py-3 text-xs font-black uppercase tracking-[0.2em] text-slate-300 transition hover:border-slate-600 hover:text-white"
            >
              <Activity className="h-4 w-4" />
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {model.stats.map((stat) => (
          <div key={stat.label} className="rounded-3xl border border-[#1a1a1a] bg-[#101010] p-5 shadow-xl">
            <p className="text-3xl font-black text-white">{stat.value}</p>
            <p className="mt-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-8 lg:grid-cols-[1.3fr_0.9fr]">
        <section className="rounded-3xl border border-[#1a1a1a] bg-[#101010] p-6 shadow-xl">
          <div className="mb-5 flex items-center gap-3">
            <ShieldAlert className="h-5 w-5 text-slate-400" />
            <h2 className="text-sm font-black uppercase tracking-[0.2em] text-white">Compatibility Checks</h2>
          </div>
          <div className="space-y-3">
            {model.checks.map((check) => (
              <div key={check.id} className="rounded-2xl border border-[#1a1a1a] bg-black/40 px-4 py-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-white">{check.label}</p>
                  <span className={cn(
                    'rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em]',
                    check.tone === 'pass'
                      ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-200'
                      : check.tone === 'warn'
                        ? 'border-amber-500/20 bg-amber-500/10 text-amber-100'
                        : 'border-red-500/20 bg-red-500/10 text-red-200',
                  )}>
                    {check.status}
                  </span>
                </div>
                <p className="mt-2 text-sm text-slate-400">{check.detail}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-[#1a1a1a] bg-[#101010] p-6 shadow-xl">
          <h2 className="mb-5 text-sm font-black uppercase tracking-[0.2em] text-white">Configuration Snapshot</h2>
          <div className="space-y-3">
            {model.configRows.map((row) => (
              <div key={row.label} className="rounded-2xl border border-[#1a1a1a] bg-black/40 px-4 py-3">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">{row.label}</p>
                <p className="mt-1 break-all text-sm text-white">{row.value}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
