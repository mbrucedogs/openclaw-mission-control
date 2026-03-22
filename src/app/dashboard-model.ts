type DashboardAgent = {
  id: string
  type?: string
}

type DashboardTask = {
  id: string
  isStuck?: boolean
}

type DashboardProject = {
  id: string
}

export type DashboardModel = {
  ready: boolean
  totalTasks: number
  activeDomains: number
  stuckTasks: number
  rosterCount: number
  setupNeededCount: number
  runtimeValue: string
  runtimeSubLabel: string
  statusLabel: string
}

export function buildDashboardModel(input: {
  agents: DashboardAgent[]
  tasks: DashboardTask[]
  projects: DashboardProject[]
  gatewayConnected: boolean
}): DashboardModel {
  const rosterCount = input.agents.length
  const setupNeededCount = input.agents.filter((agent) => !agent.type).length
  const ready = rosterCount > 0 && setupNeededCount === 0

  return {
    ready,
    totalTasks: input.tasks.length,
    activeDomains: input.projects.length,
    stuckTasks: input.tasks.filter((task) => task.isStuck).length,
    rosterCount,
    setupNeededCount,
    runtimeValue: input.gatewayConnected ? 'Connected' : 'Degraded',
    runtimeSubLabel: input.gatewayConnected ? 'Gateway live' : 'Gateway offline',
    statusLabel: ready ? 'Ready' : 'Setup Needed',
  }
}
