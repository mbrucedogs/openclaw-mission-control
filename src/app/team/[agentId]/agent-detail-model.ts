import { hasFreshPresence } from '@/lib/agent-presence'
import type { Agent, Task } from '@/lib/types'

export type AgentDetailHeartbeat = {
  agentId: string
  agentName: string
  currentTask: string
  currentStep: string
  currentRun: string
  taskTitle: string | null
  stepTitle: string | null
  lastActivity: string | null
  heartbeatCount: number
  isStuck: boolean
  stuckReason: string | null
  lastSeen: string
  firstSeen: string
  status: string
}

export type AgentDetailRuntimeEvent = {
  id: string
  eventType: string
  actor: string
  timestamp: string
  metadata: Record<string, unknown>
}

export function buildAgentDetailModel(input: {
  agent: Agent
  tasks: Task[]
  heartbeats: AgentDetailHeartbeat[]
  runtimeEvents: AgentDetailRuntimeEvent[]
}) {
  const live = input.heartbeats.length > 0 || hasFreshPresence(input.agent.recentSessions)
  const blocked = input.heartbeats.some((heartbeat) => heartbeat.isStuck)
  const assignedTasks = input.tasks.map((task) => {
    const currentStep = task.currentRun?.steps?.find((step) => (
      step.assignedAgentId === input.agent.id
      || step.assignedAgentName === input.agent.name
    ))

    const plannedStep = !currentStep
      ? task.stagePlan?.find((step) => (
          step.assignedAgentId === input.agent.id
          || step.assignedAgentName === input.agent.name
        ))
      : undefined

    return {
      id: task.id,
      title: task.title,
      status: task.status,
      summary: task.goal || task.description || 'No task summary available.',
      stepTitle: currentStep?.title || plannedStep?.title || null,
      stepStatus: currentStep?.status || (plannedStep ? 'planned' : null),
    }
  })

  return {
    agent: input.agent,
    status: {
      label: blocked ? 'Blocked' : live ? 'Active' : assignedTasks.length > 0 ? 'Assigned' : 'Idle',
      tone: blocked ? 'blocked' : live ? 'active' : assignedTasks.length > 0 ? 'assigned' : 'idle',
    },
    summary: {
      assignedTasks: assignedTasks.length,
      liveSignals: input.heartbeats.length,
      recentSessions: input.agent.recentSessions?.length ?? 0,
      currentModel: input.agent.currentModel || 'Unavailable',
    },
    assignments: assignedTasks,
    liveHeartbeats: input.heartbeats,
    recentSessions: input.agent.recentSessions ?? [],
    runtimeTimeline: input.runtimeEvents,
  }
}
