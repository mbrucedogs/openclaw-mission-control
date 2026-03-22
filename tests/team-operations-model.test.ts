import test from 'node:test';
import assert from 'node:assert/strict';

import { classifyAgentGroup } from '../src/lib/agent-groups';
import {
  buildTeamOperationsModel,
  deriveAgentWorkState,
  type TeamOperationsAgent,
} from '../src/app/office/team-operations-model';

const agents: TeamOperationsAgent[] = [
  { id: 'main', name: 'Max', role: 'Primary Orchestrator', layer: 'governance' },
  { id: 'rita', name: 'Rita', role: 'Research Specialist' },
  { id: 'ben', name: 'Ben', role: 'Builder Specialist' },
  { id: 'tess', name: 'Tess', role: 'QA Tester' },
  { id: 'tron', name: 'Tron', role: 'Automation Monitor', layer: 'automation' },
];

test('classifyAgentGroup maps agents into stable operations lanes', () => {
  assert.equal(classifyAgentGroup(agents[0]), 'governance');
  assert.equal(classifyAgentGroup(agents[1]), 'build');
  assert.equal(classifyAgentGroup(agents[2]), 'build');
  assert.equal(classifyAgentGroup(agents[3]), 'review');
  assert.equal(classifyAgentGroup(agents[4]), 'automation');
});

test('deriveAgentWorkState prioritizes live work, then blocked, then assigned', () => {
  assert.equal(
    deriveAgentWorkState(agents[1], [], [{ agentId: 'rita', updatedAt: new Date().toISOString() }]),
    'active',
  );
  assert.equal(deriveAgentWorkState(agents[2], [{ id: '1', title: 'Build', status: 'Blocked' }], []), 'blocked');
  assert.equal(deriveAgentWorkState(agents[2], [{ id: '1', title: 'Build', status: 'In Progress' }], []), 'assigned');
  assert.equal(deriveAgentWorkState(agents[2], [], []), 'idle');
});

test('deriveAgentWorkState ignores stale live-session signals', () => {
  assert.equal(
    deriveAgentWorkState(
      agents[1],
      [],
      [{ agentId: 'rita', updatedAt: new Date(Date.now() - (60 * 60 * 1000)).toISOString() }],
    ),
    'idle',
  );
});

test('buildTeamOperationsModel creates non-overlapping zone seats and summary counts', () => {
  const model = buildTeamOperationsModel({
    agents,
    tasksByAgent: {
      rita: [{ id: 't1', title: 'Research payment flow', status: 'In Progress' }],
      ben: [{ id: 't2', title: 'Build payment flow', status: 'Blocked' }],
    },
    liveSessions: [
      { agentId: 'rita', key: 'session-1', updatedAt: new Date().toISOString() },
      { agentId: 'main', key: 'session-2', updatedAt: new Date().toISOString() },
    ],
    workItems: [
      { id: 't1', title: 'Research payment flow', state: 'active', agentId: 'rita' },
      { id: 't2', title: 'Build payment flow', state: 'blocked', agentId: 'ben', needsAttention: true },
      { id: 't3', title: 'QA signoff', state: 'review', agentId: 'tess', needsAttention: true },
    ],
    selectedAgentId: 'ben',
  });

  assert.equal(model.summary.totalAgents, 5);
  assert.equal(model.summary.activeAgents, 2);
  assert.equal(model.summary.blockedAgents, 1);
  assert.equal(model.summary.activeWorkItems, 1);
  assert.equal(model.summary.reviewLoad, 1);
  assert.equal(model.summary.blockedWorkItems, 1);
  assert.equal(model.summary.handoffPressure, 2);
  assert.equal(model.selected?.agent.id, 'ben');

  const allSeatIds = model.sceneZones.flatMap((zone) => zone.seats.map((seat) => seat.slotId));
  assert.equal(new Set(allSeatIds).size, allSeatIds.length);

  const governanceZone = model.sceneZones.find((zone) => zone.id === 'governance');
  const reviewZone = model.sceneZones.find((zone) => zone.id === 'review');
  assert.ok(governanceZone);
  assert.ok(reviewZone);
  assert.equal(governanceZone?.seats[0]?.card.agent.id, 'main');
  assert.equal(reviewZone?.seats[0]?.card.agent.id, 'tess');

  const reviewStream = model.workstreams.find((stream) => stream.id === 'review');
  assert.equal(reviewStream?.items[0]?.group, 'review');
});
