import { Activity, Clock3, Database, History } from 'lucide-react'

import { getEventCount, getEvents, getLatestCursor } from '@/lib/db/runtime'

import { buildRuntimeHistoryModel } from './runtime-history-model'

export const dynamic = 'force-dynamic'

export default function RuntimePage() {
  const model = buildRuntimeHistoryModel({
    totalCount: getEventCount(),
    latestCursor: getLatestCursor(),
    events: getEvents(0, 50),
  })

  return (
    <div className="max-w-[1400px] space-y-8 p-4 sm:p-10 lg:p-12">
      <section className="relative overflow-hidden rounded-[2rem] border border-[#1a1a1a] bg-[#101010] p-6 shadow-2xl sm:p-10">
        <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.24em] text-slate-500">
              <History className="h-4 w-4 text-cyan-300" />
              Runtime History
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-black text-white sm:text-4xl">OpenClaw runtime timeline</h1>
              <p className="max-w-3xl text-sm leading-relaxed text-slate-400 sm:text-base">
                Review recent runtime events recorded by Mission Control, including cursors, actors, and the latest payload fields captured from OpenClaw activity.
              </p>
            </div>
          </div>
          <div className="rounded-3xl border border-cyan-500/20 bg-cyan-500/10 px-5 py-4 text-xs font-black uppercase tracking-[0.18em] text-cyan-100">
            50 most recent rows
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {model.summary.map((stat, index) => {
          const Icon = index === 0 ? Database : index === 1 ? Activity : Clock3
          return (
            <div key={stat.label} className="rounded-3xl border border-[#1a1a1a] bg-[#101010] p-5 shadow-xl">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl border border-white/10 bg-black/40 p-3">
                  <Icon className="h-4 w-4 text-cyan-200" />
                </div>
                <div>
                  <p className="text-2xl font-black text-white">{stat.value}</p>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">{stat.label}</p>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <section className="rounded-[2rem] border border-[#1a1a1a] bg-[#0c0c0e] p-5 shadow-xl sm:p-6">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">Recent Events</p>
            <h2 className="mt-2 text-xl font-black text-white">Newest-first runtime feed</h2>
          </div>
          <span className="rounded-full border border-white/10 bg-black/40 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
            Stored in sqlite
          </span>
        </div>

        <div className="space-y-4">
          {model.events.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-white/10 bg-black/40 px-6 py-16 text-center">
              <p className="text-sm font-bold text-white">No runtime events recorded yet.</p>
              <p className="mt-2 text-sm text-slate-500">Events will appear here after agents, approvals, or runtime bridges emit updates.</p>
            </div>
          ) : model.events.map((event) => (
            <article key={event.id} className="rounded-3xl border border-[#1a1a1a] bg-black/40 p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-cyan-100">
                      {event.eventType}
                    </span>
                    <span className="rounded-full border border-white/10 bg-black px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                      {event.actor}
                    </span>
                    <span className="rounded-full border border-white/10 bg-black px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                      Cursor {event.cursor}
                    </span>
                  </div>
                  <p className="text-sm text-slate-400">{new Date(event.createdAt).toLocaleString()}</p>
                </div>

                <div className="grid w-full gap-3 md:grid-cols-2 lg:w-[40rem]">
                  {event.payloadRows.map((row) => (
                    <div key={`${event.id}-${row.label}`} className="rounded-2xl border border-white/10 bg-[#050506] px-4 py-3">
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">{row.label}</p>
                      <p className="mt-2 break-all text-sm text-slate-300">{row.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}
