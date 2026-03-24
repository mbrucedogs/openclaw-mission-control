import fs from 'node:fs';
import { randomUUID } from 'crypto';
import { db } from '../db';
import type {
  Agent,
  AuthorType,
  RunStep,
  RunStepEvent,
  RunStepRuntimeLink,
  RunStepRole,
  RunStepStatus,
  StepCompletionPacket,
  StepPacketInput,
  Task,
  TaskRun,
  TaskRunStatus,
  TaskStatus,
  TaskStagePlan,
  TaskTemplate,
} from '../types';
import { createTaskRecord, getTaskById, getTaskStagePlans, logTaskActivity, touchTask, addTaskEvidence } from './tasks';
import { getAgentById } from './agents';
import { inferStepRoleForAgent } from '../agent-matching';
import { normalizeMultilineItems } from '../multiline-fields';

function nowIso() {
  return new Date().toISOString();
}

type StepRow = {
  id: string;
  task_id: string;
  run_id: string;
  step_number: number;
  title: string;
  role: RunStepRole;
  assigned_agent_id: string | null;
  assigned_agent_name: string | null;
  status: RunStepStatus;
  goal: string;
  inputs: string | null;
  required_outputs: string | null;
  done_condition: string;
  boundaries: string | null;
  dependencies: string | null;
  notes_for_max: string | null;
  retry_count: number;
  started_at: string | null;
  completed_at: string | null;
  heartbeat_at: string | null;
  block_reason: string | null;
  completion_packet: string | null;
  validation_status: RunStep['validationStatus'] | null;
  validation_notes: string | null;
  validated_by: string | null;
  created_at: string;
  updated_at: string;
};

type RunRow = {
  id: string;
  task_id: string;
  run_number: number;
  status: TaskRunStatus;
  created_by: string;
  trigger_type: TaskRun['triggerType'];
  trigger_reason: string | null;
  template_id: string | null;
  current_step_id: string | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
};

type EventRow = {
  id: string;
  task_id: string;
  run_id: string;
  step_id: string;
  actor: string;
  actor_type: AuthorType;
  event_type: RunStepEvent['eventType'];
  message: string;
  payload: string | null;
  created_at: string;
};

type TemplateRow = {
  id: string;
  name: string;
  description: string | null;
  created_by: string;
  task_defaults: string | null;
  steps: string | null;
  created_at: string;
  updated_at: string;
};

type TemplateTaskDefaults = {
  goal?: string;
  acceptanceCriteria?: string[];
};

type StagePlanRow = {
  id: string;
  task_id: string;
  step_number: number;
  title: string;
  role: RunStepRole;
  assigned_agent_id: string | null;
  assigned_agent_name: string | null;
  goal: string;
  inputs: string | null;
  required_outputs: string | null;
  done_condition: string;
  boundaries: string | null;
  dependencies: string | null;
  notes_for_max: string | null;
  created_at: string;
  updated_at: string;
};

function parseStepRow(row: StepRow): RunStep {
  return {
    id: row.id,
    taskId: row.task_id,
    runId: row.run_id,
    stepNumber: row.step_number,
    title: row.title,
    role: row.role,
    assignedAgentId: row.assigned_agent_id || undefined,
    assignedAgentName: row.assigned_agent_name || undefined,
    status: row.status,
    goal: row.goal,
    inputs: row.inputs ? JSON.parse(row.inputs) : [],
    requiredOutputs: row.required_outputs ? JSON.parse(row.required_outputs) : [],
    doneCondition: row.done_condition,
    boundaries: row.boundaries ? JSON.parse(row.boundaries) : [],
    dependencies: row.dependencies ? JSON.parse(row.dependencies) : [],
    notesForMax: row.notes_for_max || undefined,
    retryCount: row.retry_count || 0,
    startedAt: row.started_at || undefined,
    completedAt: row.completed_at || undefined,
    heartbeatAt: row.heartbeat_at || undefined,
    blockReason: row.block_reason || undefined,
    completionPacket: row.completion_packet ? JSON.parse(row.completion_packet) : undefined,
    validationStatus: row.validation_status || undefined,
    validationNotes: row.validation_notes || undefined,
    validatedBy: row.validated_by || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function parseRunRow(row: RunRow): TaskRun {
  return {
    id: row.id,
    taskId: row.task_id,
    runNumber: row.run_number,
    status: row.status,
    createdBy: row.created_by,
    triggerType: row.trigger_type,
    triggerReason: row.trigger_reason || undefined,
    templateId: row.template_id || undefined,
    currentStepId: row.current_step_id || undefined,
    createdAt: row.created_at,
    startedAt: row.started_at || undefined,
    completedAt: row.completed_at || undefined,
    steps: [],
  };
}

function parseEventRow(row: EventRow): RunStepEvent {
  return {
    id: row.id,
    taskId: row.task_id,
    runId: row.run_id,
    stepId: row.step_id,
    actor: row.actor,
    actorType: row.actor_type,
    eventType: row.event_type,
    message: row.message,
    payload: row.payload ? JSON.parse(row.payload) : undefined,
    createdAt: row.created_at,
  };
}

function parseStagePlanRow(row: StagePlanRow): TaskStagePlan {
  return {
    id: row.id,
    taskId: row.task_id,
    stepNumber: row.step_number,
    title: row.title,
    role: row.role,
    assignedAgentId: row.assigned_agent_id || undefined,
    assignedAgentName: row.assigned_agent_name || undefined,
    goal: row.goal,
    inputs: row.inputs ? JSON.parse(row.inputs) : [],
    requiredOutputs: row.required_outputs ? JSON.parse(row.required_outputs) : [],
    doneCondition: row.done_condition,
    boundaries: row.boundaries ? JSON.parse(row.boundaries) : [],
    dependencies: row.dependencies ? JSON.parse(row.dependencies) : [],
    notesForMax: row.notes_for_max || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function parseTemplateRow(row: TemplateRow): TaskTemplate {
  return {
    id: row.id,
    name: row.name,
    description: row.description || undefined,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    taskDefaults: row.task_defaults ? JSON.parse(row.task_defaults) : undefined,
    steps: row.steps ? JSON.parse(row.steps) : [],
  };
}

function updateRunStatus(runId: string, status: TaskRunStatus, patch?: { currentStepId?: string | null; startedAt?: string | null; completedAt?: string | null }) {
  const fields = ['status = ?', ''];
  const values: unknown[] = [status];
  if (patch?.currentStepId !== undefined) {
    fields.push('current_step_id = ?');
    values.push(patch.currentStepId);
  }
  if (patch?.startedAt !== undefined) {
    fields.push('started_at = ?');
    values.push(patch.startedAt);
  }
  if (patch?.completedAt !== undefined) {
    fields.push('completed_at = ?');
    values.push(patch.completedAt);
  }
  fields.push('created_at = created_at');
  values.push(runId);
  db.prepare(`UPDATE task_runs SET ${fields.filter(Boolean).join(', ')} WHERE id = ?`).run(...values);
}

function syncTaskFromRun(taskId: string, runId: string, actor = 'system') {
  const run = getRunById(runId, true, false);
  if (!run) {
    return null;
  }

  const currentStep = run.steps.find((step) => step.id === run.currentStepId)
    || run.steps.find((step) => ['ready', 'running', 'submitted', 'blocked'].includes(step.status));

  let status: TaskStatus = 'Backlog';
  let owner = 'max';
  let completedAt: string | null = null;

  if (run.status === 'blocked' || currentStep?.status === 'blocked') {
    status = 'Blocked';
  } else if (run.status === 'completed') {
    status = 'Done';
    completedAt = run.completedAt || nowIso();
  } else if (currentStep) {
    if (currentStep.status === 'submitted' || currentStep.role === 'tester' || currentStep.role === 'reviewer') {
      status = 'In Review';
    } else {
      status = 'In Progress';
    }
    owner = currentStep.assignedAgentName || currentStep.assignedAgentId || 'max';
  }

  touchTask(taskId, {
    status,
    owner,
    currentRunId: run.id,
    completedAt,
  }, actor);

  return getTaskById(taskId, { includeCurrentRun: true });
}

export function recordRunStepEvent(
  stepId: string,
  input: {
    actor: string;
    actorType?: AuthorType;
    eventType: RunStepEvent['eventType'];
    message: string;
    payload?: Record<string, unknown>;
    heartbeatAt?: string;
  },
) {
  const step = getRunStepById(stepId);
  if (!step) {
    throw new Error(`Unknown step ${stepId}`);
  }

  const id = `evt-${randomUUID().split('-')[0]}`;
  const createdAt = input.heartbeatAt || nowIso();

  db.prepare(`
    INSERT INTO run_step_events (id, task_id, run_id, step_id, actor, actor_type, event_type, message, payload, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    step.taskId,
    step.runId,
    step.id,
    input.actor,
    input.actorType || 'system',
    input.eventType,
    input.message,
    input.payload ? JSON.stringify(input.payload) : null,
    createdAt,
  );

  if (input.heartbeatAt || input.eventType === 'heartbeat' || input.eventType === 'progress_note' || input.eventType === 'started') {
    db.prepare('UPDATE run_steps SET heartbeat_at = ?, updated_at = ? WHERE id = ?').run(createdAt, nowIso(), step.id);
  }

  logTaskActivity(
    step.taskId,
    input.actor,
    input.actorType || 'system',
    `run_step_${input.eventType}`,
    { runId: step.runId, stepId: step.id, eventType: input.eventType },
    step.runId,
    step.id,
  );
}

export function getRunEvents(runId: string) {
  const rows = db.prepare('SELECT * FROM run_step_events WHERE run_id = ? ORDER BY created_at DESC').all(runId) as EventRow[];
  return rows.map(parseEventRow);
}

export function getRunSteps(runId: string): RunStep[] {
  const rows = db.prepare('SELECT * FROM run_steps WHERE run_id = ? ORDER BY step_number ASC').all(runId) as StepRow[];
  return rows.map(parseStepRow);
}

export function getRunStepById(stepId: string): RunStep | null {
  const row = db.prepare('SELECT * FROM run_steps WHERE id = ?').get(stepId) as StepRow | undefined;
  return row ? parseStepRow(row) : null;
}

function parseRuntimeLink(payload: Record<string, unknown> | undefined): RunStepRuntimeLink | null {
  if (!payload || typeof payload !== 'object') return null;

  const sessionKey = typeof payload.sessionKey === 'string' ? payload.sessionKey : undefined;
  const sessionId = typeof payload.sessionId === 'string' ? payload.sessionId : undefined;
  const runtimeRunId = typeof payload.runtimeRunId === 'string' ? payload.runtimeRunId : undefined;

  if (!sessionKey && !sessionId && !runtimeRunId) {
    return null;
  }

  return { sessionKey, sessionId, runtimeRunId };
}

export function getLatestRunStepRuntimeLink(stepId: string): RunStepRuntimeLink | null {
  const rows = db.prepare(`
    SELECT payload
    FROM run_step_events
    WHERE step_id = ? AND payload IS NOT NULL
    ORDER BY created_at DESC
  `).all(stepId) as Array<{ payload: string | null }>;

  for (const row of rows) {
    if (!row.payload) continue;

    try {
      const parsed = JSON.parse(row.payload) as Record<string, unknown>;
      const runtime = parseRuntimeLink(parsed);
      if (runtime) return runtime;
    } catch {
      continue;
    }
  }

  return null;
}

export function getTaskStagePlanById(stageId: string): TaskStagePlan | null {
  const row = db.prepare('SELECT * FROM task_stage_plans WHERE id = ?').get(stageId) as StagePlanRow | undefined;
  return row ? parseStagePlanRow(row) : null;
}

export function getTaskRuns(taskId: string): TaskRun[] {
  const rows = db.prepare('SELECT * FROM task_runs WHERE task_id = ? ORDER BY run_number DESC').all(taskId) as RunRow[];
  return rows.map((row) => {
    const run = parseRunRow(row);
    run.steps = getRunSteps(run.id);
    return run;
  });
}

export function getRunById(runId: string, includeSteps = true, includeEvents = false): TaskRun | null {
  const row = db.prepare('SELECT * FROM task_runs WHERE id = ?').get(runId) as RunRow | undefined;
  if (!row) {
    return null;
  }

  const run = parseRunRow(row);
  if (includeSteps) {
    run.steps = getRunSteps(run.id);
  }
  if (includeEvents) {
    run.events = getRunEvents(run.id);
  }
  return run;
}

export function getCurrentRunForTask(taskId: string, includeEvents = false): TaskRun | null {
  const task = getTaskById(taskId);
  if (!task?.currentRunId) {
    return null;
  }
  return getRunById(task.currentRunId, true, includeEvents);
}

function validateStepPacket(step: StepPacketInput) {
  if (!step.title.trim()) throw new Error('Step title is required');
  if (!step.assignedAgentId?.trim()) throw new Error('Step assigned agent is required');
  if (!step.goal.trim()) throw new Error('Step goal is required');
  if (!step.doneCondition.trim()) throw new Error('Step done condition is required');
  if (!step.inputs.length) throw new Error('Step inputs are required');
  if (!step.requiredOutputs.length) throw new Error('Step outputs are required');
  if (!step.boundaries.length) throw new Error('Step boundaries are required');
}

function sanitizeStepPacket(step: StepPacketInput): StepPacketInput {
  return {
    ...step,
    title: step.title.trim(),
    assignedAgentId: step.assignedAgentId?.trim(),
    assignedAgentName: step.assignedAgentName?.trim(),
    goal: step.goal.trim(),
    inputs: normalizeMultilineItems(step.inputs),
    requiredOutputs: normalizeMultilineItems(step.requiredOutputs),
    doneCondition: step.doneCondition.trim(),
    boundaries: normalizeMultilineItems(step.boundaries),
    dependencies: (step.dependencies || []).filter((value) => Number.isInteger(value) && value > 0),
    notesForMax: step.notesForOrchestrator?.trim() || step.notesForMax?.trim() || undefined,
  };
}

function resolveAssignedAgent(step: StepPacketInput): { agent: Agent; role: RunStepRole } {
  if (!step.assignedAgentId) {
    throw new Error(`Step "${step.title}" is missing an assigned agent`);
  }

  const agent = getAgentById(step.assignedAgentId);
  if (!agent) {
    throw new Error(`Assigned agent ${step.assignedAgentId} was not found`);
  }

  const role = inferStepRoleForAgent(agent);
  if (!role) {
    throw new Error(`Assigned agent ${step.assignedAgentId} does not have a supported orchestration type`);
  }

  return { agent, role };
}

function persistTaskStagePlans(taskId: string, steps: Array<StepPacketInput & { role: RunStepRole }>) {
  const createdAt = nowIso();
  const insertStagePlan = db.prepare(`
    INSERT INTO task_stage_plans (
      id, task_id, step_number, title, role, assigned_agent_id, assigned_agent_name,
      goal, inputs, required_outputs, done_condition, boundaries, dependencies,
      notes_for_max, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  steps.forEach((packet, index) => {
    insertStagePlan.run(
      `stage-${randomUUID().split('-')[0]}`,
      taskId,
      index + 1,
      packet.title,
      packet.role,
      packet.assignedAgentId || null,
      packet.assignedAgentName || null,
      packet.goal,
      JSON.stringify(packet.inputs),
      JSON.stringify(packet.requiredOutputs),
      packet.doneCondition,
      JSON.stringify(packet.boundaries),
      JSON.stringify(packet.dependencies || []),
      packet.notesForMax || null,
      createdAt,
      createdAt,
    );
  });
}

function validateAndResolveSteps(steps: StepPacketInput[]) {
  if (!steps.length) {
    throw new Error('At least one stage is required');
  }

  return steps.map((step) => {
    const sanitized = sanitizeStepPacket(step);
    validateStepPacket(sanitized);
    const { agent, role } = resolveAssignedAgent(sanitized);
    return {
      ...sanitized,
      role,
      assignedAgentId: agent.id,
      assignedAgentName: sanitized.assignedAgentName || agent.name,
    };
  });
}

function sanitizeTemplateTaskDefaults(taskDefaults?: TemplateTaskDefaults) {
  if (!taskDefaults) {
    return undefined;
  }

  const goal = taskDefaults.goal?.trim();
  const acceptanceCriteria = normalizeMultilineItems(taskDefaults.acceptanceCriteria || []);

  if (!goal && acceptanceCriteria.length === 0) {
    return undefined;
  }

  return {
    goal: goal || undefined,
    acceptanceCriteria,
  };
}

function persistTemplate(input: {
  id: string;
  name: string;
  description?: string;
  actor: string;
  taskDefaults?: TemplateTaskDefaults;
  steps: StepPacketInput[];
  createdAt?: string;
  updatedAt: string;
}) {
  const resolvedSteps = validateAndResolveSteps(input.steps);
  const taskDefaults = sanitizeTemplateTaskDefaults(input.taskDefaults);

  db.prepare(`
    INSERT INTO task_templates (id, name, description, created_by, task_defaults, steps, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      description = excluded.description,
      task_defaults = excluded.task_defaults,
      steps = excluded.steps,
      updated_at = excluded.updated_at
  `).run(
    input.id,
    input.name.trim(),
    input.description?.trim() || null,
    input.actor,
    taskDefaults ? JSON.stringify(taskDefaults) : null,
    JSON.stringify(resolvedSteps.map((step) => ({
      title: step.title,
      role: step.role,
      assignedAgentId: step.assignedAgentId,
      assignedAgentName: step.assignedAgentName,
      goal: step.goal,
      inputs: step.inputs,
      requiredOutputs: step.requiredOutputs,
      doneCondition: step.doneCondition,
      boundaries: step.boundaries,
      dependencies: step.dependencies,
      notesForMax: step.notesForMax,
    } satisfies StepPacketInput))),
    input.createdAt || input.updatedAt,
    input.updatedAt,
  );
}

export function createTaskTemplate(input: {
  actor: string;
  name: string;
  description?: string;
  taskDefaults?: TemplateTaskDefaults;
  steps: StepPacketInput[];
}) {
  if (!input.name.trim()) {
    throw new Error('Template name is required');
  }

  const templateId = `tpl-${randomUUID().split('-')[0]}`;
  const now = nowIso();
  persistTemplate({
    id: templateId,
    name: input.name,
    description: input.description,
    actor: input.actor,
    taskDefaults: input.taskDefaults,
    steps: input.steps,
    createdAt: now,
    updatedAt: now,
  });

  return getTaskTemplateById(templateId)!;
}

export function updateTaskTemplate(id: string, input: {
  actor: string;
  name: string;
  description?: string;
  taskDefaults?: TemplateTaskDefaults;
  steps: StepPacketInput[];
}) {
  const existing = getTaskTemplateById(id);
  if (!existing) {
    throw new Error(`Unknown template ${id}`);
  }
  if (!input.name.trim()) {
    throw new Error('Template name is required');
  }

  persistTemplate({
    id,
    name: input.name,
    description: input.description,
    actor: existing.createdBy || input.actor,
    taskDefaults: input.taskDefaults,
    steps: input.steps,
    createdAt: existing.createdAt,
    updatedAt: nowIso(),
  });

  return getTaskTemplateById(id)!;
}

export function duplicateTaskTemplate(id: string, input: { actor: string; name?: string; description?: string }) {
  const existing = getTaskTemplateById(id);
  if (!existing) {
    throw new Error(`Unknown template ${id}`);
  }

  return createTaskTemplate({
    actor: input.actor,
    name: input.name?.trim() || `${existing.name} Copy`,
    description: input.description ?? existing.description,
    taskDefaults: existing.taskDefaults,
    steps: existing.steps,
  });
}

export function deleteTaskTemplate(id: string) {
  const existing = getTaskTemplateById(id);
  if (!existing) {
    throw new Error(`Unknown template ${id}`);
  }
  db.prepare('DELETE FROM task_templates WHERE id = ?').run(id);
}

export function updateRunStep(stepId: string, input: { actor: string; packet: StepPacketInput }) {
  const step = getRunStepById(stepId);
  if (!step) {
    throw new Error(`Unknown step ${stepId}`);
  }
  if (!['draft', 'ready', 'blocked'].includes(step.status)) {
    throw new Error('Only draft, ready, or blocked steps can be edited');
  }

  const packet = sanitizeStepPacket(input.packet);
  validateStepPacket(packet);
  const { agent, role } = resolveAssignedAgent(packet);
  const updatedAt = nowIso();

  db.prepare(`
    UPDATE run_steps
    SET title = ?,
        role = ?,
        assigned_agent_id = ?,
        assigned_agent_name = ?,
        goal = ?,
        inputs = ?,
        required_outputs = ?,
        done_condition = ?,
        boundaries = ?,
        dependencies = ?,
        notes_for_max = ?,
        updated_at = ?
    WHERE id = ?
  `).run(
    packet.title,
    role,
    agent.id,
    packet.assignedAgentName || agent.name,
    packet.goal,
    JSON.stringify(packet.inputs),
    JSON.stringify(packet.requiredOutputs),
    packet.doneCondition,
    JSON.stringify(packet.boundaries),
    JSON.stringify(packet.dependencies || []),
    packet.notesForMax || null,
    updatedAt,
    stepId,
  );

  recordRunStepEvent(stepId, {
    actor: input.actor,
    actorType: 'system',
    eventType: 'updated',
    message: `Step ${step.stepNumber} packet updated`,
    payload: {
      title: packet.title,
      role,
      assignedAgentId: agent.id,
      assignedAgentName: packet.assignedAgentName || agent.name,
    },
  });

  return syncTaskFromRun(step.taskId, step.runId, input.actor)?.currentRun?.steps.find((candidate) => candidate.id === stepId) || getRunStepById(stepId);
}

export function updateTaskStagePlan(stageId: string, input: { actor: string; packet: StepPacketInput }) {
  const stage = getTaskStagePlanById(stageId);
  if (!stage) {
    throw new Error(`Unknown stage ${stageId}`);
  }

  const task = getTaskById(stage.taskId);
  if (!task) {
    throw new Error(`Unknown task ${stage.taskId}`);
  }
  if (task.currentRunId) {
    throw new Error('Planned stages can only be edited before the task has been started');
  }

  const packet = sanitizeStepPacket(input.packet);
  validateStepPacket(packet);
  const { agent, role } = resolveAssignedAgent(packet);
  const updatedAt = nowIso();

  db.prepare(`
    UPDATE task_stage_plans
    SET title = ?,
        role = ?,
        assigned_agent_id = ?,
        assigned_agent_name = ?,
        goal = ?,
        inputs = ?,
        required_outputs = ?,
        done_condition = ?,
        boundaries = ?,
        dependencies = ?,
        notes_for_max = ?,
        updated_at = ?
    WHERE id = ?
  `).run(
    packet.title,
    role,
    agent.id,
    packet.assignedAgentName || agent.name,
    packet.goal,
    JSON.stringify(packet.inputs),
    JSON.stringify(packet.requiredOutputs),
    packet.doneCondition,
    JSON.stringify(packet.boundaries),
    JSON.stringify(packet.dependencies || []),
    packet.notesForMax || null,
    updatedAt,
    stageId,
  );

  logTaskActivity(stage.taskId, input.actor, 'system', 'stage_plan_updated', {
    stepId: stageId,
    reason: packet.title,
  });

  touchTask(stage.taskId, {}, input.actor);
  return getTaskStagePlanById(stageId);
}

export function createTaskWithPlan(input: {
  title: string;
  goal?: string;
  description?: string;
  priority?: Task['priority'];
  project?: string;
  initiatedBy?: string;
  owner?: string;
  acceptanceCriteria: string[];
  templateId?: string;
  steps: StepPacketInput[];
}): Task {
  if (!input.title.trim()) {
    throw new Error('Task title is required');
  }
  const steps = validateAndResolveSteps(input.steps);

  const task = createTaskRecord({
    title: input.title,
    goal: input.goal,
    description: input.description,
    priority: input.priority,
    owner: input.owner || 'max',
    initiatedBy: input.initiatedBy || 'max',
    project: input.project,
    acceptanceCriteria: input.acceptanceCriteria,
    status: 'Backlog',
  });

  persistTaskStagePlans(task.id, steps);
  logTaskActivity(task.id, input.initiatedBy || 'max', 'user', 'stage_plan_saved', {
    reason: `Saved ${steps.length} planned stage${steps.length === 1 ? '' : 's'}`,
    templateId: input.templateId,
  });

  return getTaskById(task.id, { includePlan: true }) as Task;
}

export function createTaskWithRun(input: {
  title: string;
  goal?: string;
  description?: string;
  priority?: Task['priority'];
  project?: string;
  initiatedBy?: string;
  owner?: string;
  acceptanceCriteria: string[];
  templateId?: string;
  steps: StepPacketInput[];
}): Task {
  const task = createTaskWithPlan(input);
  return startTaskRun(task.id, {
    actor: input.initiatedBy || input.owner || 'max',
    reason: 'Initial run created at task creation time',
    templateId: input.templateId,
  });
}

export function startTaskRun(taskId: string, input: { actor: string; reason?: string; templateId?: string }) {
  const task = getTaskById(taskId, { includePlan: true, includeCurrentRun: true });
  if (!task) {
    throw new Error(`Unknown task ${taskId}`);
  }
  if (task.currentRunId) {
    throw new Error('Task already has an active run. Use retry or rerun instead.');
  }

  const stagePlan = task.stagePlan || getTaskStagePlans(taskId);
  if (!stagePlan.length) {
    throw new Error('Task has no planned stages to run');
  }

  const runId = `run-${randomUUID().split('-')[0]}`;
  const createdAt = nowIso();
  const runNumberRow = db.prepare('SELECT COALESCE(MAX(run_number), 0) as maxRun FROM task_runs WHERE task_id = ?').get(taskId) as { maxRun: number };
  const runNumber = (runNumberRow?.maxRun || 0) + 1;

  db.prepare(`
    INSERT INTO task_runs (
      id, task_id, run_number, status, created_by, trigger_type, trigger_reason,
      template_id, current_step_id, created_at, started_at, completed_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    runId,
    taskId,
    runNumber,
    'ready',
    input.actor,
    runNumber === 1 ? 'initial' : 'rerun',
    input.reason || null,
    input.templateId || null,
    null,
    createdAt,
    null,
    null,
  );

  const insertStep = db.prepare(`
    INSERT INTO run_steps (
      id, task_id, run_id, step_number, title, role, assigned_agent_id, assigned_agent_name,
      status, goal, inputs, required_outputs, done_condition, boundaries, dependencies,
      notes_for_max, retry_count, started_at, completed_at, heartbeat_at, block_reason,
      completion_packet, validation_status, validation_notes, validated_by, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const createdSteps: RunStep[] = [];
  stagePlan.forEach((packet, index) => {
    const stepId = `step-${randomUUID().split('-')[0]}`;
    const status: RunStepStatus = index === 0 ? 'ready' : 'draft';
    insertStep.run(
      stepId,
      taskId,
      runId,
      index + 1,
      packet.title,
      packet.role,
      packet.assignedAgentId || null,
      packet.assignedAgentName || null,
      status,
      packet.goal,
      JSON.stringify(packet.inputs),
      JSON.stringify(packet.requiredOutputs),
      packet.doneCondition,
      JSON.stringify(packet.boundaries),
      JSON.stringify(packet.dependencies || []),
      packet.notesForMax || null,
      0,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      createdAt,
      createdAt,
    );

    const step = getRunStepById(stepId);
    if (step) {
      createdSteps.push(step);
      recordRunStepEvent(step.id, {
        actor: input.actor,
        actorType: 'user',
        eventType: 'created',
        message: `Stage ${index + 1} instantiated for ${packet.role}`,
      });
    }
  });

  db.prepare('UPDATE task_runs SET current_step_id = ? WHERE id = ?').run(createdSteps[0].id, runId);
  touchTask(taskId, { currentRunId: runId }, input.actor);
  logTaskActivity(taskId, input.actor, 'system', 'run_started', {
    runId,
    reason: input.reason || 'Execution started',
  }, runId);
  syncTaskFromRun(taskId, runId, input.actor);

  return getTaskById(taskId, { includeCurrentRun: true, includePlan: true }) as Task;
}

export function startRunStep(stepId: string, input: { actor: string; assignedAgentId?: string; assignedAgentName?: string; heartbeatAt?: string; runtime?: RunStepRuntimeLink }) {
  const step = getRunStepById(stepId);
  if (!step) {
    throw new Error(`Unknown step ${stepId}`);
  }
  if (!step.assignedAgentId && !input.assignedAgentId) {
    throw new Error('Step cannot start without an assigned agent');
  }

  const startedAt = input.heartbeatAt || nowIso();
  db.prepare(`
    UPDATE run_steps
    SET status = 'running',
        assigned_agent_id = COALESCE(?, assigned_agent_id),
        assigned_agent_name = COALESCE(?, assigned_agent_name),
        started_at = COALESCE(started_at, ?),
        heartbeat_at = ?,
        updated_at = ?
    WHERE id = ?
  `).run(input.assignedAgentId || null, input.assignedAgentName || null, startedAt, startedAt, nowIso(), stepId);

  updateRunStatus(step.runId, 'running', { currentStepId: stepId, startedAt });
  recordRunStepEvent(stepId, {
    actor: input.actor,
    actorType: 'system',
    eventType: 'started',
    message: `${step.title} started`,
    payload: input.runtime ? { ...input.runtime } : undefined,
    heartbeatAt: startedAt,
  });

  return syncTaskFromRun(step.taskId, step.runId, input.actor);
}

function validateCompletionPacket(packet: StepCompletionPacket) {
  if (!packet.summary.trim()) throw new Error('Completion summary is required');
  if (!packet.outputsProduced.length) throw new Error('Completion outputs are required');
  if (!packet.validationResult.trim()) throw new Error('Validation result is required');
  if (!packet.issues.trim()) throw new Error('Issues/risks are required');
  if (!packet.nextStepRecommendation.trim()) throw new Error('Next-step recommendation is required');
}

export function submitStepCompletion(stepId: string, input: StepCompletionPacket & { actor: string }) {
  validateCompletionPacket(input);

  const step = getRunStepById(stepId);
  if (!step) throw new Error(`Unknown step ${stepId}`);
  if (!['running', 'blocked'].includes(step.status)) {
    throw new Error('Only running or blocked steps can submit completion');
  }

  // Validate that outputs actually exist on disk
  for (const output of input.outputsProduced) {
    if (typeof output === 'string' && output.startsWith('/')) {
      if (!fs.existsSync(output)) {
        throw new Error(`Output file does not exist: ${output}. Agent must produce the required artifact before submitting completion.`);
      }
    }
  }

  db.prepare(`
    UPDATE run_steps
    SET status = 'submitted',
        completion_packet = ?,
        validation_status = 'pending',
        updated_at = ?
    WHERE id = ?
  `).run(JSON.stringify({
    summary: input.summary,
    outputsProduced: input.outputsProduced,
    validationResult: input.validationResult,
    issues: input.issues,
    nextStepRecommendation: input.nextStepRecommendation,
  }), nowIso(), stepId);

  recordRunStepEvent(stepId, {
    actor: input.actor,
    actorType: 'agent',
    eventType: 'completion_submitted',
    message: `${step.title} submitted for validation`,
    payload: {
      outputsProduced: input.outputsProduced,
    },
  });

  // Auto-create evidence from outputsProduced
  if (input.outputsProduced && input.outputsProduced.length > 0) {
    for (const output of input.outputsProduced) {
      if (typeof output === 'string' && output.startsWith('/')) {
        addTaskEvidence(
          step.taskId,
          'file',
          output,
          input.actor,
          `Auto-captured from completion packet`,
          step.runId,
          stepId
        );
      }
    }
  }

  return getRunStepById(stepId);
}

export function validateRunStep(stepId: string, input: { actor: string; decision: 'pass' | 'reject'; notes?: string }) {
  const step = getRunStepById(stepId);
  if (!step) throw new Error(`Unknown step ${stepId}`);
  if (step.status !== 'submitted') {
    throw new Error('Only submitted steps can be validated');
  }

  const now = nowIso();

  if (input.decision === 'pass') {
    db.prepare(`
      UPDATE run_steps
      SET status = 'complete',
          validation_status = 'passed',
          validation_notes = ?,
          validated_by = ?,
          completed_at = ?,
          updated_at = ?
      WHERE id = ?
    `).run(input.notes || null, input.actor, now, now, stepId);

    recordRunStepEvent(stepId, {
      actor: input.actor,
      actorType: 'agent',
      eventType: 'validation_passed',
      message: `${step.title} validated`,
      payload: { notes: input.notes || null },
    });

    const nextStep = db.prepare(`
      SELECT * FROM run_steps
      WHERE run_id = ? AND step_number > ?
      ORDER BY step_number ASC
      LIMIT 1
    `).get(step.runId, step.stepNumber) as StepRow | undefined;

    if (nextStep) {
      db.prepare(`
        UPDATE run_steps
        SET status = CASE WHEN status = 'draft' THEN 'ready' ELSE status END,
            updated_at = ?
        WHERE id = ?
      `).run(now, nextStep.id);
      updateRunStatus(step.runId, 'ready', { currentStepId: nextStep.id });
    } else {
      updateRunStatus(step.runId, 'completed', { currentStepId: null, completedAt: now });
    }
  } else {
    db.prepare(`
      UPDATE run_steps
      SET status = 'blocked',
          block_reason = ?,
          validation_status = 'rejected',
          validation_notes = ?,
          validated_by = ?,
          updated_at = ?
      WHERE id = ?
    `).run(input.notes || 'Validation rejected', input.notes || null, input.actor, now, stepId);

    updateRunStatus(step.runId, 'blocked', { currentStepId: stepId });
    recordRunStepEvent(stepId, {
      actor: input.actor,
      actorType: 'agent',
      eventType: 'validation_rejected',
      message: `${step.title} failed validation`,
      payload: { notes: input.notes || null },
    });
  }

  return syncTaskFromRun(step.taskId, step.runId, input.actor);
}

export function blockRunStep(stepId: string, input: { actor: string; reason: string; payload?: Record<string, unknown> }) {
  const step = getRunStepById(stepId);
  if (!step) throw new Error(`Unknown step ${stepId}`);

  db.prepare(`
    UPDATE run_steps
    SET status = 'blocked',
        block_reason = ?,
        updated_at = ?
    WHERE id = ?
  `).run(input.reason, nowIso(), stepId);

  updateRunStatus(step.runId, 'blocked', { currentStepId: stepId });
  recordRunStepEvent(stepId, {
    actor: input.actor,
    actorType: 'system',
    eventType: 'blocked',
    message: input.reason,
    payload: input.payload,
  });

  return syncTaskFromRun(step.taskId, step.runId, input.actor);
}

export function retryRunStep(stepId: string, input: { actor: string; reason: string }) {
  const step = getRunStepById(stepId);
  if (!step) throw new Error(`Unknown step ${stepId}`);

  db.prepare(`
    UPDATE run_steps
    SET status = 'ready',
        retry_count = retry_count + 1,
        block_reason = NULL,
        completion_packet = NULL,
        validation_status = NULL,
        validation_notes = NULL,
        validated_by = NULL,
        heartbeat_at = NULL,
        completed_at = NULL,
        updated_at = ?
    WHERE id = ?
  `).run(nowIso(), stepId);

  updateRunStatus(step.runId, 'ready', { currentStepId: stepId });
  recordRunStepEvent(stepId, {
    actor: input.actor,
    actorType: 'system',
    eventType: 'retry_requested',
    message: input.reason,
  });

  return syncTaskFromRun(step.taskId, step.runId, input.actor);
}

export function rerunTaskFromStep(taskId: string, fromStepNumber: number, input: { actor: string; reason: string }) {
  const runs = getTaskRuns(taskId);
  const latestRun = runs[0];
  if (!latestRun) throw new Error(`Task ${taskId} has no runs`);

  const sourceSteps = latestRun.steps;
  const selected = sourceSteps.find((step) => step.stepNumber === fromStepNumber);
  if (!selected) throw new Error(`No step ${fromStepNumber} found`);

  const newRunId = `run-${randomUUID().split('-')[0]}`;
  const createdAt = nowIso();
  const newRunNumber = latestRun.runNumber + 1;

  db.prepare(`
    INSERT INTO task_runs (
      id, task_id, run_number, status, created_by, trigger_type, trigger_reason,
      template_id, current_step_id, created_at, started_at, completed_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(newRunId, taskId, newRunNumber, 'ready', input.actor, 'rerun', input.reason, latestRun.templateId || null, null, createdAt, null, null);

  const insertStep = db.prepare(`
    INSERT INTO run_steps (
      id, task_id, run_id, step_number, title, role, assigned_agent_id, assigned_agent_name,
      status, goal, inputs, required_outputs, done_condition, boundaries, dependencies,
      notes_for_max, retry_count, started_at, completed_at, heartbeat_at, block_reason,
      completion_packet, validation_status, validation_notes, validated_by, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  let currentStepId: string | null = null;

  for (const step of sourceSteps) {
    const newStepId = `step-${randomUUID().split('-')[0]}`;
    const carryForward = step.stepNumber < fromStepNumber;
    const status: RunStepStatus = carryForward ? 'complete' : (step.stepNumber === fromStepNumber ? 'ready' : 'draft');
    if (step.stepNumber === fromStepNumber) {
      currentStepId = newStepId;
    }
    insertStep.run(
      newStepId,
      taskId,
      newRunId,
      step.stepNumber,
      step.title,
      step.role,
      step.assignedAgentId || null,
      step.assignedAgentName || null,
      status,
      step.goal,
      JSON.stringify(step.inputs),
      JSON.stringify(step.requiredOutputs),
      step.doneCondition,
      JSON.stringify(step.boundaries),
      JSON.stringify(step.dependencies),
      step.notesForMax || null,
      0,
      null,
      carryForward ? createdAt : null,
      null,
      carryForward ? 'Carried forward from prior run' : null,
      carryForward ? JSON.stringify({
        summary: 'Carried forward from prior validated run',
        outputsProduced: step.completionPacket?.outputsProduced || step.requiredOutputs,
        validationResult: 'Reused prior validated work',
        issues: 'None',
        nextStepRecommendation: 'Continue to next step',
      }) : null,
      carryForward ? 'passed' : null,
      carryForward ? 'Carried forward from prior run' : null,
      carryForward ? input.actor : null,
      createdAt,
      createdAt,
    );
  }

  db.prepare('UPDATE task_runs SET current_step_id = ? WHERE id = ?').run(currentStepId, newRunId);
  if (currentStepId) {
    recordRunStepEvent(currentStepId, {
      actor: input.actor,
      actorType: 'system',
      eventType: 'rerun_created',
      message: input.reason,
    });
  }

  touchTask(taskId, { currentRunId: newRunId }, input.actor);
  return syncTaskFromRun(taskId, newRunId, input.actor);
}

export function getTaskTemplates(): TaskTemplate[] {
  const rows = db.prepare('SELECT * FROM task_templates ORDER BY updated_at DESC').all() as TemplateRow[];
  return rows.map(parseTemplateRow);
}

export function getTaskTemplateById(id: string): TaskTemplate | null {
  const row = db.prepare('SELECT * FROM task_templates WHERE id = ?').get(id) as TemplateRow | undefined;
  if (!row) return null;
  return parseTemplateRow(row);
}

export function saveRunAsTemplate(runId: string, input: { actor: string; name: string; description?: string }) {
  const run = getRunById(runId, true, false);
  if (!run) throw new Error(`Unknown run ${runId}`);
  const task = getTaskById(run.taskId);
  if (!task) throw new Error(`Unknown task ${run.taskId}`);

  const template = createTaskTemplate({
    actor: input.actor,
    name: input.name,
    description: input.description,
    taskDefaults: {
      goal: task.goal || '',
      acceptanceCriteria: task.acceptanceCriteria,
    },
    steps: run.steps.map((step) => ({
      title: step.title,
      role: step.role,
      assignedAgentId: step.assignedAgentId,
      assignedAgentName: step.assignedAgentName,
      goal: step.goal,
      inputs: step.inputs,
      requiredOutputs: step.requiredOutputs,
      doneCondition: step.doneCondition,
      boundaries: step.boundaries,
      dependencies: step.dependencies,
      notesForMax: step.notesForMax,
    } satisfies StepPacketInput)),
  });

  logTaskActivity(task.id, input.actor, 'user', 'template_saved', { templateId: template.id }, run.id);
  return template;
}

export function scanForRecovery(input: { now?: string; staleMinutes?: number } = {}) {
  const now = input.now || nowIso();
  const staleMinutes = input.staleMinutes ?? 20;
  const rows = db.prepare(`
    SELECT * FROM run_steps
    WHERE status = 'running'
  `).all() as StepRow[];

  const alerts: Array<{ taskId: string; runId: string; stepId: string; reason: string; taskTitle: string; assignedAgentId?: string; assignedAgentName?: string }> = [];

  for (const row of rows) {
    const step = parseStepRow(row);
    const heartbeat = step.heartbeatAt || step.startedAt;
    if (!heartbeat) continue;

    const ageMinutes = (new Date(now).getTime() - new Date(heartbeat).getTime()) / 60000;
    if (ageMinutes < staleMinutes) continue;

    db.prepare(`
      UPDATE run_steps
      SET status = 'blocked',
          block_reason = ?,
          updated_at = ?
      WHERE id = ?
    `).run(`Heartbeat timed out after ${Math.floor(ageMinutes)} minutes`, now, step.id);

    updateRunStatus(step.runId, 'blocked', { currentStepId: step.id });
    recordRunStepEvent(step.id, {
      actor: 'recovery-monitor',
      actorType: 'system',
      eventType: 'escalated',
      message: `Step stalled due to missing heartbeat for ${Math.floor(ageMinutes)} minutes`,
    });

    const synced = syncTaskFromRun(step.taskId, step.runId, 'recovery-monitor');
    alerts.push({
      taskId: step.taskId,
      runId: step.runId,
      stepId: step.id,
      reason: `Step ${step.stepNumber} stalled due to missing heartbeat`,
      taskTitle: synced?.title || step.taskId,
      assignedAgentId: step.assignedAgentId,
      assignedAgentName: step.assignedAgentName,
    });
  }

  return alerts;
}
