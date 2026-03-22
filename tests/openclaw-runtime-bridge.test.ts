import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createGatewayRuntimeSnapshot,
  diffGatewayRuntimeSnapshots,
  type GatewayRuntimeSnapshot,
} from '../src/lib/openclaw/runtime-bridge';

function snapshot(overrides: Partial<GatewayRuntimeSnapshot> = {}): GatewayRuntimeSnapshot {
  return {
    connected: true,
    defaultAgentId: 'main',
    sessionCount: 1,
    agents: [
      { agentId: 'main', name: 'Main', isDefault: true, sessionCount: 1, recentSessionKey: 'session-a', recentUpdatedAt: 100 },
      { agentId: 'qa', name: 'QA', isDefault: false, sessionCount: 0, recentSessionKey: null, recentUpdatedAt: null },
    ],
    ...overrides,
  };
}

test('createGatewayRuntimeSnapshot combines health and status into comparable agent state', () => {
  const result = createGatewayRuntimeSnapshot({
    ok: true,
    defaultAgentId: 'main',
    agents: [
      {
        agentId: 'main',
        name: 'Main',
        isDefault: true,
        heartbeat: { enabled: true, every: '30s', everyMs: 30000, prompt: '', target: '', ackMaxChars: 40 },
        sessions: { path: '/tmp', count: 1, recent: [{ key: 'session-a', updatedAt: 100, age: 0 }] },
      },
    ],
    channels: {},
    channelOrder: [],
    heartbeatSeconds: 30,
    sessions: { path: '/tmp', count: 1, recent: [] },
    ts: 100,
  }, {
    runtimeVersion: '1',
    heartbeat: { defaultAgentId: 'main', agents: [{ agentId: 'main', enabled: true, every: '30s', everyMs: 30000 }] },
    channelSummary: [],
    queuedSystemEvents: [],
    sessions: {
      paths: ['/tmp'],
      count: 1,
      defaults: { model: 'gpt-5', contextTokens: 1000 },
      recent: [{
        agentId: 'main',
        key: 'session-a',
        kind: 'chat',
        sessionId: 's-1',
        updatedAt: 100,
        age: 0,
        inputTokens: 1,
        outputTokens: 1,
        totalTokens: 2,
        remainingTokens: 998,
        percentUsed: 0.2,
        model: 'gpt-5',
        contextTokens: 1000,
        flags: [],
      }],
      byAgent: [{ agentId: 'main', path: '/tmp', count: 1, recent: [] }],
    },
  });

  assert.equal(result?.connected, true);
  assert.equal(result?.sessionCount, 1);
  assert.equal(result?.agents[0]?.recentSessionKey, 'session-a');
});

test('diffGatewayRuntimeSnapshots emits activation, review, and disconnect-relevant deltas', () => {
  const previous = snapshot();
  const next = snapshot({
    sessionCount: 2,
    agents: [
      { agentId: 'main', name: 'Main', isDefault: true, sessionCount: 2, recentSessionKey: 'session-b', recentUpdatedAt: 200 },
      { agentId: 'qa', name: 'QA', isDefault: false, sessionCount: 1, recentSessionKey: 'session-q', recentUpdatedAt: 150 },
    ],
  });

  const deltas = diffGatewayRuntimeSnapshots(previous, next);

  assert.ok(deltas.find((delta) => delta.eventType === 'openclaw.sessions.changed'));
  assert.ok(deltas.find((delta) => delta.eventType === 'openclaw.agent.active' && delta.actor === 'qa'));
  assert.ok(deltas.find((delta) => delta.eventType === 'openclaw.agent.recent-session.changed' && delta.actor === 'main'));
});

test('diffGatewayRuntimeSnapshots emits disconnect and idle transitions', () => {
  const previous = snapshot();
  const next = snapshot({
    connected: false,
    sessionCount: 0,
    agents: [
      { agentId: 'main', name: 'Main', isDefault: true, sessionCount: 0, recentSessionKey: 'session-a', recentUpdatedAt: 100 },
      { agentId: 'qa', name: 'QA', isDefault: false, sessionCount: 0, recentSessionKey: null, recentUpdatedAt: null },
    ],
  });

  const deltas = diffGatewayRuntimeSnapshots(previous, next);

  assert.ok(deltas.find((delta) => delta.eventType === 'openclaw.gateway.disconnected'));
  assert.ok(deltas.find((delta) => delta.eventType === 'openclaw.agent.idle' && delta.actor === 'main'));
});
