import assert from 'node:assert/strict';
import test from 'node:test';

import type { Agent } from '../src/lib/types';
import { buildTeamRegistryModel } from '../src/app/team/team-registry-model';

const agents: Agent[] = [
  { id: 'main', name: 'Max', role: 'Primary Orchestrator', layer: 'governance', type: 'orchestrator' },
  { id: 'r1', name: 'Rita', role: 'Research Specialist', type: 'researcher', status: 'active' },
  { id: 'q1', name: 'Quinn', role: 'QA Tester', type: 'tester' },
  { id: 'a1', name: 'Auto', role: 'Automation Monitor', layer: 'automation' },
];

test('buildTeamRegistryModel summarizes registry counts and stable grouping', () => {
  const model = buildTeamRegistryModel({
    agents,
    selectedAgentId: 'q1',
  });

  assert.equal(model.summary.totalAgents, 4);
  assert.equal(model.summary.configuredAgents, 3);
  assert.equal(model.summary.unassignedAgents, 1);
  assert.equal(model.summary.activeAgents, 1);
  assert.equal(model.summary.automationAgents, 1);
  assert.equal(model.selected?.agent.id, 'q1');

  const governance = model.groups.find((group) => group.id === 'governance');
  const build = model.groups.find((group) => group.id === 'build');
  const automation = model.groups.find((group) => group.id === 'automation');

  assert.equal(governance?.agents[0]?.agent.id, 'main');
  assert.equal(build?.agents[0]?.agent.id, 'r1');
  assert.equal(automation?.agents[0]?.needsSetup, true);
});
