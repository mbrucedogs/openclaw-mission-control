import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Activity, ArrowLeft, Clock3, Cpu, FolderKanban, Sparkles, TerminalSquare } from 'lucide-react'

import { getAgentsWithGateway } from '@/lib/domain/agents'
import { getTasks, type TaskIncludeOptions } from '@/lib/domain/tasks'
import { db } from '@/lib/db'
import { toGatewayAgentId } from '@/lib/openclaw/discovery'
import { buildAgentDetailModel, type AgentDetailHeartbeat, type AgentDetailRuntimeEvent } from './agent-detail-model'
import { listFreshStepHeartbeats } from '@/lib/activity-heartbeats'

const TASK_INCLUDE: TaskIncludeOptions = {
  includeCurrentRun: true,
  includePlan: true,
  includeIssues: true,
}

function matchesAgent(agentId: string, agentName: string, candidateId?: string, candidateName?: string) {
  return candidateId === agentId || candidateName === agentName
}

export default async function AgentDetailPage({ params }: { params: Promise<{ agentId: string }> }) {
  const { agentId } = await params
  const agents = await getAgentsWithGateway()
  const agent = agents.find((candidate) => candidate.id === agentId)

  if (!agent) {
    notFound()
  }

  const tasks = getTasks(undefined, TASK_INCLUDE).filter((task) => {
    const currentStep = task.currentRun?.steps?.find((step) => matchesAgent(agent.id, agent.name, step.assignedAgentId, step.assignedAgentName))
    const plannedStep = task.stagePlan?.find((step) => matchesAgent(agent.id, agent.name, step.assignedAgentId, step.assignedAgentName))
    return Boolean(currentStep || plannedStep)
  })

  const heartbeats = listFreshStepHeartbeats()
    .filter((row) => row.agent_id === agent.id || row.agent_name === agent.name)
    .map((row) => ({
      agentId: row.agent_id,
      agentName: row.agent_name,
      currentTask: row.task_id,
      currentStep: row.step_id,
      currentRun: row.run_id,
      taskTitle: row.task_title || null,
      stepTitle: row.step_title || null,
      lastActivity: row.last_activity,
      heartbeatCount: row.heartbeat_count,
      isStuck: Boolean(row.is_stuck),
      stuckReason: row.stuck_reason || null,
      lastSeen: row.last_seen,
      firstSeen: row.first_seen,
      status: row.is_stuck ? 'stuck' : 'active',
    } satisfies AgentDetailHeartbeat))

  const gatewayAgentId = toGatewayAgentId(agent.id)
  const runtimeEvents = db.prepare(`
    SELECT id, event_type, actor, payload, created_at
    FROM runtime_events
    WHERE actor IN (?, ?)
    ORDER BY cursor DESC
    LIMIT 20
  `).all(agent.id, gatewayAgentId) as Array<{
    id: string
    event_type: string
    actor: string
    payload: string
    created_at: string
  }>

  const model = buildAgentDetailModel({
    agent,
    tasks,
    heartbeats,
    runtimeEvents: runtimeEvents.map((event) => ({
      id: event.id,
      eventType: event.event_type,
      actor: event.actor,
      timestamp: event.created_at,
      metadata: (() => {
        try {
          return JSON.parse(event.payload) as Record<string, unknown>
        } catch {
          return {}
        }
      })(),
    })) as AgentDetailRuntimeEvent[],
  })

  return (
    <div className="max-w-[1400px] space-y-8 p-4 sm:p-10 lg:p-12">
      <section className="rounded-[2rem] border border-[#1a1a1a] bg-[#101010] p-6 shadow-2xl sm:p-10">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-4">
            <Link href="/team" className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500 transition hover:text-white">
              <ArrowLeft className="h-4 w-4" />
              Back to Team
            </Link>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">Agent Detail</p>
              <h1 className="mt-2 text-4xl font-black tracking-tight text-white">{model.agent.name}</h1>
              <p className="mt-2 text-sm font-black uppercase tracking-[0.18em] text-slate-500">{model.agent.role}</p>
            </div>
            <p className="max-w-3xl text-sm leading-relaxed text-slate-400">
              {model.agent.mission || 'No mission statement recorded for this agent.'}
            </p>
          </div>

          <span className={`rounded-full border px-4 py-2 text-[11px] font-black uppercase tracking-[0.2em] ${
            model.status.tone === 'active'
              ? 'border-blue-500/20 bg-blue-500/10 text-blue-100'
              : model.status.tone === 'blocked'
                ? 'border-red-500/20 bg-red-500/10 text-red-100'
                : model.status.tone === 'assigned'
                  ? 'border-amber-500/20 bg-amber-500/10 text-amber-100'
                  : 'border-white/10 bg-white/[0.04] text-slate-300'
          }`}>
            {model.status.label}
          </span>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-4">
        <Metric icon={FolderKanban} label="Assigned Tasks" value={model.summary.assignedTasks} />
        <Metric icon={Activity} label="Live Signals" value={model.summary.liveSignals} />
        <Metric icon={Clock3} label="Recent Sessions" value={model.summary.recentSessions} />
        <Metric icon={Cpu} label="Model" value={model.summary.currentModel} />
      </div>

      <div className="grid gap-8 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-[2rem] border border-[#1a1a1a] bg-[#0c0c0e] p-5">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-cyan-300" />
            <p className="text-sm font-bold text-white">Assigned Work</p>
          </div>
          <div className="mt-4 space-y-3">
            {model.assignments.length === 0 ? (
              <EmptyState text="No tasks currently assigned to this agent." />
            ) : model.assignments.map((assignment) => (
              <div key={assignment.id} className="rounded-2xl border border-[#202020] bg-black/60 p-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-bold text-white">{assignment.title}</p>
                  <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-300">
                    {assignment.status}
                  </span>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-slate-500">{assignment.summary}</p>
                {assignment.stepTitle && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-100">
                      {assignment.stepTitle}
                    </span>
                    {assignment.stepStatus && (
                      <span className="rounded-full border border-white/10 bg-black px-2 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
                        {assignment.stepStatus}
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-[2rem] border border-[#1a1a1a] bg-[#0c0c0e] p-5">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-emerald-300" />
            <p className="text-sm font-bold text-white">Live Presence</p>
          </div>
          <div className="mt-4 space-y-3">
            {model.liveHeartbeats.length === 0 ? (
              <EmptyState text="No fresh heartbeats are currently recorded for this agent." />
            ) : model.liveHeartbeats.map((heartbeat) => (
              <div key={`${heartbeat.currentRun}:${heartbeat.currentStep}`} className="rounded-2xl border border-[#202020] bg-black/60 p-4">
                <p className="text-sm font-bold text-white">{heartbeat.taskTitle || heartbeat.currentTask}</p>
                <p className="mt-2 text-xs text-slate-500">{heartbeat.stepTitle || heartbeat.currentStep}</p>
                <p className="mt-3 text-xs text-slate-300">{heartbeat.lastActivity || 'No activity message recorded.'}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="grid gap-8 xl:grid-cols-[0.9fr_1.1fr]">
        <section className="rounded-[2rem] border border-[#1a1a1a] bg-[#0c0c0e] p-5">
          <div className="flex items-center gap-2">
            <Clock3 className="h-4 w-4 text-amber-300" />
            <p className="text-sm font-bold text-white">Recent Sessions</p>
          </div>
          <div className="mt-4 space-y-3">
            {model.recentSessions.length === 0 ? (
              <EmptyState text="No recent sessions recorded." />
            ) : model.recentSessions.map((session) => (
              <div key={session.key} className="rounded-2xl border border-[#202020] bg-black/60 p-4">
                <p className="text-sm font-bold text-white">{session.key}</p>
                <p className="mt-2 text-xs text-slate-500">Updated {Math.round(session.age / 60000)} minutes ago</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-[2rem] border border-[#1a1a1a] bg-[#0c0c0e] p-5">
          <div className="flex items-center gap-2">
            <TerminalSquare className="h-4 w-4 text-violet-300" />
            <p className="text-sm font-bold text-white">Runtime Timeline</p>
          </div>
          <div className="mt-4 space-y-3">
            {model.runtimeTimeline.length === 0 ? (
              <EmptyState text="No runtime events recorded for this agent yet." />
            ) : model.runtimeTimeline.map((event) => (
              <div key={event.id} className="rounded-2xl border border-[#202020] bg-black/60 p-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-bold text-white">{event.eventType}</p>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                    {new Date(event.timestamp).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}

function Metric({ icon: Icon, label, value }: { icon: typeof Activity; label: string; value: string | number }) {
  return (
    <div className="rounded-3xl border border-[#1a1a1a] bg-[#0c0c0e] p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">{label}</p>
          <p className="mt-3 text-2xl font-black text-white">{value}</p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-black/60 text-slate-300">
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </div>
  )
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-white/10 px-4 py-6 text-center text-xs text-slate-600">
      {text}
    </div>
  )
}
