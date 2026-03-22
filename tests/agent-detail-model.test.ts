import assert from 'node:assert/strict'
import test from 'node:test'

import type { Agent, Task } from '../src/lib/types'
import { buildAgentDetailModel } from '../src/app/team/[agentId]/agent-detail-model'

const agent: Agent = {
  id: 'rita',
  name: 'Rita',
  role: 'Research Specialist',
  type: 'researcher',
  mission: 'Map the current problem space.',
  layer: 'build',
  recentSessions: [{ key: 'agent:rita:main', updatedAt: Date.now(), age: 60_000 }],
  currentModel: 'gpt-5.4',
  percentUsed: 11,
}

test('buildAgentDetailModel combines live presence, tasks, sessions, and runtime events', () => {
  const task: Task = {
    id: 'task-1',
    title: 'Research payment flow',
    status: 'In Progress',
    priority: 'high',
    owner: 'Rita',
    initiatedBy: 'max',
    acceptanceCriteria: [],
    createdAt: '2026-03-22T12:00:00.000Z',
    updatedAt: '2026-03-22T12:10:00.000Z',
    isStuck: false,
    retryCount: 0,
    currentRun: {
      id: 'run-1',
      taskId: 'task-1',
      runNumber: 1,
      status: 'running',
      createdBy: 'max',
      triggerType: 'initial',
      currentStepId: 'step-1',
      createdAt: '2026-03-22T12:00:00.000Z',
      steps: [
        {
          id: 'step-1',
          taskId: 'task-1',
          runId: 'run-1',
          stepNumber: 1,
          title: 'Investigate current flow',
          role: 'researcher',
          assignedAgentId: 'rita',
          assignedAgentName: 'Rita',
          status: 'running',
          goal: 'Research',
          inputs: [],
          requiredOutputs: [],
          doneCondition: 'done',
          boundaries: [],
          dependencies: [],
          retryCount: 0,
          createdAt: '2026-03-22T12:00:00.000Z',
          updatedAt: '2026-03-22T12:10:00.000Z',
        },
      ],
    },
  }

  const model = buildAgentDetailModel({
    agent,
    tasks: [task],
    heartbeats: [
      {
        agentId: 'rita',
        agentName: 'Rita',
        currentTask: 'task-1',
        currentStep: 'step-1',
        currentRun: 'run-1',
        taskTitle: 'Research payment flow',
        stepTitle: 'Investigate current flow',
        lastActivity: 'Comparing current API flow',
        heartbeatCount: 4,
        isStuck: false,
        stuckReason: null,
        lastSeen: new Date().toISOString(),
        firstSeen: '2026-03-22T12:00:00.000Z',
        status: 'active',
      },
    ],
    runtimeEvents: [
      {
        id: 'evt-1',
        eventType: 'openclaw.agent.active',
        actor: 'rita',
        timestamp: '2026-03-22T12:11:00.000Z',
        metadata: { nextCount: 1 },
      },
    ],
  })

  assert.equal(model.agent.id, 'rita')
  assert.equal(model.status.label, 'Active')
  assert.equal(model.summary.assignedTasks, 1)
  assert.equal(model.summary.liveSignals, 1)
  assert.equal(model.summary.recentSessions, 1)
  assert.equal(model.summary.currentModel, 'gpt-5.4')
  assert.equal(model.assignments[0]?.stepTitle, 'Investigate current flow')
  assert.equal(model.runtimeTimeline[0]?.eventType, 'openclaw.agent.active')
})

test('buildAgentDetailModel does not mark stale sessions active without fresh heartbeats', () => {
  const model = buildAgentDetailModel({
    agent: {
      ...agent,
      recentSessions: [{ key: 'agent:rita:main', updatedAt: 1, age: 60 * 60 * 1000 }],
    },
    tasks: [],
    heartbeats: [],
    runtimeEvents: [],
  })

  assert.equal(model.status.label, 'Idle')
  assert.equal(model.summary.liveSignals, 0)
  assert.equal(model.summary.recentSessions, 1)
})
