import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

function makeTempDbPath() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mission-control-test-'));
  return path.join(dir, 'mission-control.db');
}

function makeTempWorkspace() {
  const workspaceDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mission-control-workspace-'));
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

  const dbModule = await import(`../src/lib/db/index.ts?db=${Date.now()}`);
  const agentsModule = await import(`../src/lib/domain/agents.ts?a=${Date.now()}`);
  const tasksModule = await import(`../src/lib/domain/tasks.ts?t=${Date.now()}`);
  const runsModule = await import(`../src/lib/domain/task-runs.ts?t=${Date.now()}`);

  return { dbPath, ...dbModule, ...agentsModule, ...tasksModule, ...runsModule };
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

test('createTaskWithRun creates a task, initial run, and ordered scoped steps in one call', async () => {
  const {
    createTaskWithRun,
    getTaskById,
    getTaskRuns,
    getRunSteps,
    getAgents,
    updateAgentType,
  } = await loadFreshModules();

  const assigned = configureStepAgents({ getAgents, updateAgentType }, ['researcher', 'builder']);

  const created = createTaskWithRun({
    title: 'Build blog website',
    goal: 'Ship a blog with publishing and RSS',
    description: 'Use a guided run instead of legacy pipelines.',
    priority: 'high',
    initiatedBy: 'matt',
    acceptanceCriteria: ['Users can publish posts', 'RSS feed is available'],
    steps: [
      {
        title: 'Plan the implementation',
        role: 'researcher',
        assignedAgentId: assigned.researcher.id,
        assignedAgentName: assigned.researcher.name,
        goal: 'Define implementation scope and architecture',
        inputs: ['Task goal and constraints'],
        requiredOutputs: ['plan.md'],
        doneCondition: 'Plan is complete and handed off',
        boundaries: ['Do not write production code'],
      },
      {
        title: 'Implement the site',
        role: 'builder',
        assignedAgentId: assigned.builder.id,
        assignedAgentName: assigned.builder.name,
        goal: 'Build the blog and RSS support',
        inputs: ['plan.md'],
        requiredOutputs: ['site code', 'rss implementation'],
        doneCondition: 'Feature is implemented and ready for QA',
        boundaries: ['Do not self-approve the work'],
      },
    ],
  });

  assert.equal(created.status, 'In Progress');
  assert.equal(created.currentRun?.runNumber, 1);
  assert.equal(created.currentRun?.steps.length, 2);

  const task = getTaskById(created.id, { includeCurrentRun: true });
  assert.ok(task);
  assert.equal(task?.acceptanceCriteria.length, 2);
  assert.equal(task?.currentRun?.steps[0].status, 'ready');

  const runs = getTaskRuns(created.id);
  assert.equal(runs.length, 1);

  const steps = getRunSteps(runs[0].id);
  assert.deepEqual(
    steps.map((step) => ({
      number: step.stepNumber,
      role: step.role,
      title: step.title,
      assignedAgentId: step.assignedAgentId,
    })),
    [
      { number: 1, role: 'researcher', title: 'Plan the implementation', assignedAgentId: assigned.researcher.id },
      { number: 2, role: 'builder', title: 'Implement the site', assignedAgentId: assigned.builder.id },
    ],
  );
});

test('createTaskWithPlan saves a backlog task with planned stages and no active run until started', async () => {
  const {
    createTaskWithPlan,
    startTaskRun,
    getTaskById,
    getTaskStagePlans,
    getTaskRuns,
    getAgents,
    updateAgentType,
  } = await loadFreshModules();

  const assigned = configureStepAgents({ getAgents, updateAgentType }, ['researcher', 'builder']);

  const created = createTaskWithPlan({
    title: 'Summarize a video later',
    goal: 'Save the task now and execute it later',
    initiatedBy: 'matt',
    acceptanceCriteria: ['Markdown summary file saved on disk'],
    steps: [
      {
        title: 'Download transcript',
        assignedAgentId: assigned.researcher.id,
        assignedAgentName: assigned.researcher.name,
        goal: 'Retrieve the transcript from the source video',
        inputs: ['YouTube URL'],
        requiredOutputs: ['Transcript text', 'Transcript file path'],
        doneCondition: 'Transcript is ready for the next stage',
        boundaries: ['Do not summarize the transcript'],
      },
      {
        title: 'Write summary',
        assignedAgentId: assigned.builder.id,
        assignedAgentName: assigned.builder.name,
        goal: 'Turn the transcript into markdown',
        inputs: ['Transcript text', 'Transcript file path'],
        requiredOutputs: ['Markdown summary file', 'Summary file path'],
        doneCondition: 'Summary is saved and ready for review',
        boundaries: ['Do not review the final output'],
      },
    ],
  });

  assert.equal(created.status, 'Backlog');
  assert.equal(created.currentRunId, undefined);
  assert.equal(created.stagePlan?.length, 2);
  assert.equal(getTaskRuns(created.id).length, 0);
  assert.equal(getTaskStagePlans(created.id).length, 2);

  const started = startTaskRun(created.id, { actor: 'max', reason: 'Begin execution' });
  assert.equal(started.status, 'In Progress');
  assert.equal(started.currentRun?.steps.length, 2);
  assert.equal(started.currentRun?.steps[0].status, 'ready');

  const task = getTaskById(created.id, { includeCurrentRun: true, includePlan: true });
  assert.equal(task?.currentRun?.runNumber, 1);
  assert.equal(task?.stagePlan?.[0].title, 'Download transcript');
});

test('createTaskWithRun rejects missing assignments and infers role from the selected agent', async () => {
  const {
    createTaskWithRun,
    getAgents,
    updateAgentType,
  } = await loadFreshModules();

  const assigned = configureStepAgents({ getAgents, updateAgentType }, ['researcher', 'builder']);

  assert.throws(() => {
    createTaskWithRun({
      title: 'Missing assignment',
      goal: 'Should fail when a step has no exact agent',
      initiatedBy: 'max',
      acceptanceCriteria: ['Creation should be rejected'],
      steps: [
        {
          title: 'Research',
          role: 'researcher',
          goal: 'Research the task',
          inputs: ['Task request'],
          requiredOutputs: ['research.md'],
          doneCondition: 'Research is complete',
          boundaries: ['Do not implement'],
        },
      ],
    });
  }, /assigned agent/i);

  const created = createTaskWithRun({
    title: 'Derived assignment',
    goal: 'The selected agent should determine the internal role',
    initiatedBy: 'max',
    acceptanceCriteria: ['Creation should succeed'],
    steps: [
      {
        title: 'Implement',
        assignedAgentId: assigned.builder.id,
        assignedAgentName: assigned.builder.name,
        goal: 'Implement the requested change',
        inputs: ['Task request'],
        requiredOutputs: ['code changes'],
        doneCondition: 'Implementation is complete',
        boundaries: ['Do not perform QA'],
      },
    ],
  });

  assert.equal(created.currentRun?.steps[0].role, 'builder');
});

test('submitStepCompletion rejects incomplete structured handoff packets', async () => {
  const {
    createTaskWithRun,
    getTaskRuns,
    getRunSteps,
    startRunStep,
    submitStepCompletion,
    getAgents,
    updateAgentType,
  } = await loadFreshModules();

  const assigned = configureStepAgents({ getAgents, updateAgentType }, ['researcher']);

  const created = createTaskWithRun({
    title: 'Research and build feature',
    goal: 'Complete the feature through a structured run',
    initiatedBy: 'max',
    acceptanceCriteria: ['All steps validated'],
    steps: [
      {
        title: 'Research',
        role: 'researcher',
        assignedAgentId: assigned.researcher.id,
        assignedAgentName: assigned.researcher.name,
        goal: 'Research implementation options',
        inputs: ['Feature request'],
        requiredOutputs: ['research.md'],
        doneCondition: 'Research is documented',
        boundaries: ['Do not implement the feature'],
      },
    ],
  });

  const run = getTaskRuns(created.id)[0];
  const step = getRunSteps(run.id)[0];
  startRunStep(step.id, { actor: 'max' });

  assert.throws(() => {
    submitStepCompletion(step.id, {
      actor: 'sam-scout',
      summary: '',
      outputsProduced: [],
      validationResult: '',
      issues: '',
      nextStepRecommendation: '',
    });
  });
});

test('updateRunStep edits a ready step packet and keeps assignment valid', async () => {
  const {
    createTaskWithRun,
    getTaskRuns,
    getRunSteps,
    updateRunStep,
    getAgents,
    updateAgentType,
  } = await loadFreshModules();

  const assigned = configureStepAgents({ getAgents, updateAgentType }, ['researcher', 'builder']);

  const created = createTaskWithRun({
    title: 'Summarize video',
    goal: 'Create a markdown summary from a transcript',
    initiatedBy: 'max',
    acceptanceCriteria: ['Markdown summary file saved on disk'],
    steps: [
      {
        title: 'Fetch transcript',
        role: 'researcher',
        assignedAgentId: assigned.researcher.id,
        assignedAgentName: assigned.researcher.name,
        goal: 'Retrieve the transcript from the source video',
        inputs: ['YouTube URL'],
        requiredOutputs: ['Transcript text', 'Transcript file path'],
        doneCondition: 'Transcript is ready for summarization',
        boundaries: ['Do not summarize the transcript'],
      },
      {
        title: 'Write summary',
        role: 'builder',
        assignedAgentId: assigned.builder.id,
        assignedAgentName: assigned.builder.name,
        goal: 'Turn the transcript into a markdown summary',
        inputs: ['Transcript text'],
        requiredOutputs: ['Markdown summary'],
        doneCondition: 'Summary is complete',
        boundaries: ['Do not review the final file'],
      },
    ],
  });

  const run = getTaskRuns(created.id)[0];
  const step = getRunSteps(run.id)[0];

  const updated = updateRunStep(step.id, {
    actor: 'max',
    packet: {
      title: 'Download transcript',
      role: 'researcher',
      assignedAgentId: assigned.researcher.id,
      assignedAgentName: assigned.researcher.name,
      goal: 'Download the transcript and capture the source title',
      inputs: ['YouTube URL', 'Task summary'],
      requiredOutputs: ['Transcript text', 'Transcript markdown file path', 'Video title'],
      doneCondition: 'Transcript and file path are available for the next step',
      boundaries: ['Do not summarize the transcript', 'Do not save the final summary file'],
      dependencies: [],
      notesForMax: 'Block if no transcript is available.',
    },
  });

  assert.equal(updated?.title, 'Download transcript');
  assert.equal(updated?.assignedAgentId, assigned.researcher.id);
  assert.deepEqual(updated?.inputs, ['YouTube URL', 'Task summary']);
  assert.deepEqual(updated?.requiredOutputs, ['Transcript text', 'Transcript markdown file path', 'Video title']);
  assert.equal(updated?.notesForMax, 'Block if no transcript is available.');
});

test('updateRunStep rejects edits to running and completed steps', async () => {
  const {
    createTaskWithRun,
    getTaskRuns,
    getRunSteps,
    startRunStep,
    updateRunStep,
    validateRunStep,
    submitStepCompletion,
    getAgents,
    updateAgentType,
  } = await loadFreshModules();

  const assigned = configureStepAgents({ getAgents, updateAgentType }, ['researcher']);

  const created = createTaskWithRun({
    title: 'Immutable active work',
    goal: 'Protect started and completed steps',
    initiatedBy: 'max',
    acceptanceCriteria: ['Only editable steps can change'],
    steps: [
      {
        title: 'Research task',
        role: 'researcher',
        assignedAgentId: assigned.researcher.id,
        assignedAgentName: assigned.researcher.name,
        goal: 'Research the task',
        inputs: ['Task request'],
        requiredOutputs: ['research.md'],
        doneCondition: 'Research is complete',
        boundaries: ['Do not implement'],
      },
    ],
  });

  const run = getTaskRuns(created.id)[0];
  const step = getRunSteps(run.id)[0];

  startRunStep(step.id, { actor: 'max' });

  assert.throws(() => {
    updateRunStep(step.id, {
      actor: 'max',
      packet: {
        title: 'Changed title',
        role: 'researcher',
        assignedAgentId: assigned.researcher.id,
        assignedAgentName: assigned.researcher.name,
        goal: 'Changed goal',
        inputs: ['Task request'],
        requiredOutputs: ['research.md'],
        doneCondition: 'Changed done condition',
        boundaries: ['Do not implement'],
      },
    });
  }, /only draft, ready, or blocked/i);

  submitStepCompletion(step.id, {
    actor: assigned.researcher.id,
    summary: 'Research complete',
    outputsProduced: ['research.md'],
    validationResult: 'Ready for validation',
    issues: 'None',
    nextStepRecommendation: 'Proceed to next step',
  });
  validateRunStep(step.id, { actor: 'max', decision: 'pass', notes: 'Looks good' });

  assert.throws(() => {
    updateRunStep(step.id, {
      actor: 'max',
      packet: {
        title: 'Changed after completion',
        role: 'researcher',
        assignedAgentId: assigned.researcher.id,
        assignedAgentName: assigned.researcher.name,
        goal: 'Changed goal',
        inputs: ['Task request'],
        requiredOutputs: ['research.md'],
        doneCondition: 'Changed done condition',
        boundaries: ['Do not implement'],
      },
    });
  }, /only draft, ready, or blocked/i);
});

test('scanForRecovery marks stale running steps blocked and returns escalation payloads', async () => {
  const {
    createTaskWithRun,
    getTaskRuns,
    getRunSteps,
    startRunStep,
    scanForRecovery,
    getRunStepById,
    getAgents,
    updateAgentType,
  } = await loadFreshModules();

  const assigned = configureStepAgents({ getAgents, updateAgentType }, ['builder']);

  const created = createTaskWithRun({
    title: 'Handle stale execution',
    goal: 'Recover when a step times out',
    initiatedBy: 'max',
    acceptanceCriteria: ['Stalled steps surface for Max'],
    steps: [
      {
        title: 'Implement',
        role: 'builder',
        assignedAgentId: assigned.builder.id,
        assignedAgentName: assigned.builder.name,
        goal: 'Build the requested change',
        inputs: ['Task details'],
        requiredOutputs: ['code changes'],
        doneCondition: 'Feature is implemented',
        boundaries: ['Do not complete QA'],
      },
    ],
  });

  const run = getTaskRuns(created.id)[0];
  const step = getRunSteps(run.id)[0];
  startRunStep(step.id, {
    actor: 'max',
    heartbeatAt: '2026-03-18T00:00:00.000Z',
  });

  const alerts = scanForRecovery({
    now: '2026-03-18T00:25:00.000Z',
    staleMinutes: 20,
  });

  assert.equal(alerts.length, 1);
  assert.equal(alerts[0].taskId, created.id);
  assert.equal(alerts[0].stepId, step.id);

  const blockedStep = getRunStepById(step.id);
  assert.equal(blockedStep?.status, 'blocked');
  assert.match(blockedStep?.blockReason || '', /heartbeat/i);
});

test('issue threads block the task, support replies, and clear back to backlog when resolved before any run starts', async () => {
  const {
    createTaskWithPlan,
    createTaskIssue,
    updateTaskIssue,
    addTaskComment,
    getTaskById,
    getTaskComments,
    getAgents,
    updateAgentType,
  } = await loadFreshModules();

  const assigned = configureStepAgents({ getAgents, updateAgentType }, ['researcher']);

  const created = createTaskWithPlan({
    title: 'Need human decision',
    goal: 'Save a task with a blocker conversation',
    initiatedBy: 'max',
    acceptanceCriteria: ['Decision captured on task'],
    steps: [
      {
        title: 'Research options',
        assignedAgentId: assigned.researcher.id,
        assignedAgentName: assigned.researcher.name,
        goal: 'Research the request',
        inputs: ['Task request'],
        requiredOutputs: ['Options document'],
        doneCondition: 'Options are ready',
        boundaries: ['Do not implement'],
      },
    ],
  });

  const issue = createTaskIssue({
    taskId: created.id,
    title: 'Need source URL',
    summary: 'Max cannot continue because the source URL was not provided.',
    assignedTo: 'human',
    createdBy: 'max',
  });

  let blockedTask = getTaskById(created.id, { includeIssues: true });
  assert.equal(blockedTask?.status, 'Blocked');
  assert.equal(blockedTask?.issues?.[0].assignedTo, 'human');

  const rootReply = addTaskComment(created.id, 'Please use this URL instead.', 'matt', 'user', 'note', undefined, undefined, undefined, issue.id);
  addTaskComment(created.id, 'Received. I will continue from there.', 'max', 'agent', 'note', rootReply.id, undefined, undefined, issue.id);

  const issueComments = getTaskComments(created.id, undefined, issue.id);
  assert.equal(issueComments.length, 2);

  updateTaskIssue(issue.id, {
    actor: 'max',
    status: 'resolved',
    resolution: 'URL provided in thread',
  });

  blockedTask = getTaskById(created.id, { includeIssues: true });
  assert.equal(blockedTask?.status, 'Backlog');
  assert.equal(blockedTask?.issues?.[0].status, 'resolved');
});
