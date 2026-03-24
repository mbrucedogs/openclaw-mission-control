import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

function makeTempDbPath() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mission-control-runtime-test-'));
  return path.join(dir, 'mission-control.db');
}

function makeTempWorkspace() {
  const workspaceDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mission-control-runtime-workspace-'));
  const agentsDir = path.join(workspaceDir, 'agents');
  fs.mkdirSync(agentsDir, { recursive: true });
  fs.mkdirSync(path.join(agentsDir, 'researcher'), { recursive: true });
  fs.mkdirSync(path.join(agentsDir, 'builder'), { recursive: true });
  fs.mkdirSync(path.join(agentsDir, 'tester'), { recursive: true });
  fs.mkdirSync(path.join(agentsDir, 'reviewer'), { recursive: true });
  fs.writeFileSync(
    path.join(agentsDir, 'TEAM-REGISTRY.md'),
    [
      '| Name | Role | Folder |',
      '| --- | --- | --- |',
      '| **Rita** | Research Specialist | `agents/researcher` |',
      '| **Ben** | Builder Specialist | `agents/builder` |',
      '| **Tess** | QA Tester | `agents/tester` |',
      '| **Rhea** | Reviewer | `agents/reviewer` |',
      '',
    ].join('\n'),
  );
  return workspaceDir;
}

process.env.OPENCLAW_WORKSPACE = makeTempWorkspace();

async function loadFreshModules() {
  const dbPath = makeTempDbPath();
  process.env.DATABASE_URL = dbPath;

  const agentsModule = await import(`../src/lib/domain/agents.ts?a=${Date.now()}`);
  const runsModule = await import(`../src/lib/domain/task-runs.ts?r=${Date.now()}`);
  const runtimeModule = await import(`../src/lib/openclaw/task-stage-runtime.ts?rt=${Date.now()}`);

  return { ...agentsModule, ...runsModule, ...runtimeModule };
}

function configureStepAgents(
  agentsApi: { getAgents: () => Array<{ id: string; name: string }>; updateAgentType: (id: string, type: string) => void },
  roles: string[],
) {
  const discovered = agentsApi.getAgents().filter((agent) => agent.id !== 'main');
  assert.ok(discovered.length >= roles.length, `Expected at least ${roles.length} discovered agents for the tests`);

  return Object.fromEntries(roles.map((role, index) => {
    const agent = discovered[index];
    agentsApi.updateAgentType(agent.id, role);
    return [role, { id: agent.id, name: agent.name }];
  })) as Record<string, { id: string; name: string }>;
}

test('startTaskStageRuntime dispatches the assigned step agent and records runtime linkage on the started event', async () => {
  const {
    createTaskWithRun,
    getRunEvents,
    getRunStepById,
    getAgents,
    updateAgentType,
    startTaskStageRuntime,
  } = await loadFreshModules();

  const assigned = configureStepAgents({ getAgents, updateAgentType }, ['builder']);
  const created = createTaskWithRun({
    title: 'Implement runtime dispatch',
    goal: 'Start the assigned agent through OpenClaw',
    initiatedBy: 'max',
    acceptanceCriteria: ['Assigned agent receives the stage packet'],
    steps: [
      {
        title: 'Implement the runtime bridge',
        assignedAgentId: assigned.builder.id,
        assignedAgentName: assigned.builder.name,
        goal: 'Bridge task stages to OpenClaw sessions',
        inputs: ['Task details', 'Current codebase'],
        requiredOutputs: ['Code changes'],
        doneCondition: 'Feature is implemented',
        boundaries: ['Do not validate your own work'],
      },
    ],
  });

  const run = created.currentRun!;
  const step = run.steps[0]!;
  const calls: Array<{ method: string; params: unknown }> = [];

  await startTaskStageRuntime(step.id, { actor: 'max' }, {
    callGateway: async (method, params) => {
      calls.push({ method, params });
      return {
        ok: true,
        key: 'agent:builder:task-stage:test',
        sessionId: 'session-123',
        runId: 'gateway-run-123',
        status: 'started',
      };
    },
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0]?.method, 'sessions.create');
  assert.match(JSON.stringify(calls[0]?.params), new RegExp(assigned.builder.id));

  const updatedStep = getRunStepById(step.id);
  assert.equal(updatedStep?.status, 'running');

  const startedEvent = getRunEvents(run.id).find((event) => event.stepId === step.id && event.eventType === 'started');
  assert.equal(startedEvent?.payload?.sessionKey, 'agent:builder:task-stage:test');
  assert.equal(startedEvent?.payload?.sessionId, 'session-123');
  assert.equal(startedEvent?.payload?.runtimeRunId, 'gateway-run-123');
});

test('retryTaskStageRuntime reuses the existing session and restarts the step with a new runtime run id', async () => {
  const {
    createTaskWithRun,
    getRunEvents,
    getRunStepById,
    getAgents,
    updateAgentType,
    startTaskStageRuntime,
    retryTaskStageRuntime,
    blockTaskStageRuntime,
  } = await loadFreshModules();

  const assigned = configureStepAgents({ getAgents, updateAgentType }, ['builder']);
  const created = createTaskWithRun({
    title: 'Retry runtime dispatch',
    goal: 'Reuse the existing session on retry',
    initiatedBy: 'max',
    acceptanceCriteria: ['Retry uses the same step session'],
    steps: [
      {
        title: 'Retry the builder step',
        assignedAgentId: assigned.builder.id,
        assignedAgentName: assigned.builder.name,
        goal: 'Send the same stage back to the builder',
        inputs: ['Current implementation state'],
        requiredOutputs: ['Updated code changes'],
        doneCondition: 'Retry is running again',
        boundaries: ['Do not bypass the assigned builder'],
      },
    ],
  });

  const step = created.currentRun!.steps[0]!;

  await startTaskStageRuntime(step.id, { actor: 'max' }, {
    callGateway: async () => ({
      ok: true,
      key: 'agent:builder:task-stage:test',
      sessionId: 'session-123',
      runId: 'gateway-run-123',
      status: 'started',
    }),
  });

  await blockTaskStageRuntime(step.id, { actor: 'max', reason: 'Pause before retry' }, {
    callGateway: async () => ({
      ok: true,
      status: 'aborted',
      abortedRunId: 'gateway-run-123',
    }),
  });

  const retryCalls: Array<{ method: string; params: unknown }> = [];
  await retryTaskStageRuntime(step.id, { actor: 'max', reason: 'Retry requested by Max' }, {
    callGateway: async (method, params) => {
      retryCalls.push({ method, params });
      return {
        ok: true,
        key: 'agent:builder:task-stage:test',
        sessionId: 'session-123',
        runId: 'gateway-run-456',
        status: 'started',
      };
    },
  });

  assert.equal(retryCalls.length, 1);
  assert.equal(retryCalls[0]?.method, 'sessions.send');
  assert.match(JSON.stringify(retryCalls[0]?.params), /agent:builder:task-stage:test/);

  const updatedStep = getRunStepById(step.id);
  assert.equal(updatedStep?.status, 'running');
  assert.equal(updatedStep?.retryCount, 1);

  const startedEvents = getRunEvents(created.currentRun!.id)
    .filter((event) => event.stepId === step.id && event.eventType === 'started');
  assert.equal(startedEvents[0]?.payload?.runtimeRunId, 'gateway-run-456');
});

test('blockTaskStageRuntime aborts the linked runtime session before marking the step blocked', async () => {
  const {
    createTaskWithRun,
    getRunEvents,
    getRunStepById,
    getAgents,
    updateAgentType,
    startTaskStageRuntime,
    blockTaskStageRuntime,
  } = await loadFreshModules();

  const assigned = configureStepAgents({ getAgents, updateAgentType }, ['builder']);
  const created = createTaskWithRun({
    title: 'Block runtime dispatch',
    goal: 'Abort the live runtime before blocking the step',
    initiatedBy: 'max',
    acceptanceCriteria: ['Blocking aborts the runtime session'],
    steps: [
      {
        title: 'Stop the builder step safely',
        assignedAgentId: assigned.builder.id,
        assignedAgentName: assigned.builder.name,
        goal: 'Abort the active session and mark the step blocked',
        inputs: ['Current runtime state'],
        requiredOutputs: ['Blocked step'],
        doneCondition: 'Step is blocked with runtime aborted',
        boundaries: ['Do not leave the remote run active'],
      },
    ],
  });

  const run = created.currentRun!;
  const step = run.steps[0]!;
  await startTaskStageRuntime(step.id, { actor: 'max' }, {
    callGateway: async () => ({
      ok: true,
      key: 'agent:builder:task-stage:test',
      sessionId: 'session-123',
      runId: 'gateway-run-123',
      status: 'started',
    }),
  });

  const calls: Array<{ method: string; params: unknown }> = [];
  await blockTaskStageRuntime(step.id, { actor: 'max', reason: 'Manual intervention required from Max' }, {
    callGateway: async (method, params) => {
      calls.push({ method, params });
      return {
        ok: true,
        status: 'aborted',
        abortedRunId: 'gateway-run-123',
      };
    },
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0]?.method, 'sessions.abort');
  assert.match(JSON.stringify(calls[0]?.params), /gateway-run-123/);

  const updatedStep = getRunStepById(step.id);
  assert.equal(updatedStep?.status, 'blocked');
  assert.equal(updatedStep?.blockReason, 'Manual intervention required from Max');

  const blockedEvent = getRunEvents(run.id).find((event) => event.stepId === step.id && event.eventType === 'blocked');
  assert.equal(blockedEvent?.payload?.abortedRunId, 'gateway-run-123');
  assert.equal(blockedEvent?.payload?.sessionKey, 'agent:builder:task-stage:test');
});
