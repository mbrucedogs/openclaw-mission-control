import assert from 'node:assert/strict'
import test from 'node:test'

import { buildDashboardModel } from '../src/app/dashboard-model'

test('buildDashboardModel reports setup-needed state when the roster is not ready', () => {
  const model = buildDashboardModel({
    agents: [
      { id: 'main', name: 'Max', role: 'Primary Orchestrator', type: 'orchestrator' },
      { id: 'alice', name: 'Alice', role: 'Research Specialist' },
    ],
    tasks: [{ id: 't1', isStuck: false }, { id: 't2', isStuck: true }],
    projects: [{ id: 'p1' }],
    gatewayConnected: false,
  })

  assert.equal(model.ready, false)
  assert.equal(model.rosterCount, 2)
  assert.equal(model.setupNeededCount, 1)
  assert.equal(model.runtimeValue, 'Degraded')
  assert.equal(model.runtimeSubLabel, 'Gateway offline')
  assert.equal(model.statusLabel, 'Setup Needed')
})

test('buildDashboardModel reports live roster and connected runtime when all agents are configured', () => {
  const model = buildDashboardModel({
    agents: [
      { id: 'main', name: 'Max', role: 'Primary Orchestrator', type: 'orchestrator' },
      { id: 'alice', name: 'Alice', role: 'Research Specialist', type: 'researcher' },
      { id: 'bob', name: 'Bob', role: 'Builder', type: 'builder' },
    ],
    tasks: [{ id: 't1', isStuck: false }],
    projects: [{ id: 'p1' }, { id: 'p2' }],
    gatewayConnected: true,
  })

  assert.equal(model.ready, true)
  assert.equal(model.rosterCount, 3)
  assert.equal(model.setupNeededCount, 0)
  assert.equal(model.totalTasks, 1)
  assert.equal(model.activeDomains, 2)
  assert.equal(model.stuckTasks, 0)
  assert.equal(model.runtimeValue, 'Connected')
  assert.equal(model.runtimeSubLabel, 'Gateway live')
  assert.equal(model.statusLabel, 'Ready')
})
