import { randomUUID } from 'crypto';
import { db } from '../db';
import type {
  ActivityDetails,
  AuthorType,
  CommentType,
  EvidenceType,
  IssueAssignee,
  Priority,
  Task,
  TaskActivity,
  TaskComment,
  TaskEvidence,
  TaskIssue,
  TaskIssueStatus,
  TaskStagePlan,
  RunStep,
  TaskStatus,
} from '../types';
import { getRunById } from './task-runs';

export interface TaskFilters {
  status?: TaskStatus | TaskStatus[];
  owner?: string;
  project?: string;
  queueForMax?: boolean;
}

export interface TaskIncludeOptions {
  includeComments?: boolean;
  includeActivity?: boolean;
  includeEvidence?: boolean;
  includeCurrentRun?: boolean;
  includePlan?: boolean;
  includeIssues?: boolean;
}

export interface CreateTaskRecordInput {
  title: string;
  goal?: string;
  description?: string;
  priority?: Priority;
  owner?: string;
  initiatedBy?: string;
  project?: string;
  acceptanceCriteria?: string[];
  status?: TaskStatus;
}

export interface UpdateTaskInput {
  title?: string;
  goal?: string;
  description?: string;
  priority?: Priority;
  owner?: string;
  project?: string;
  acceptanceCriteria?: string[];
  status?: TaskStatus;
  currentRunId?: string | null;
  completedAt?: string | null;
}

type TaskRow = {
  id: string;
  title: string;
  goal: string | null;
  description: string | null;
  status: TaskStatus;
  priority: Priority;
  owner: string;
  initiated_by: string;
  project: string | null;
  acceptance_criteria: string | null;
  current_run_id: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
};

type ActivityRow = {
  id: string;
  task_id: string;
  run_id: string | null;
  step_id: string | null;
  actor: string;
  actor_type: AuthorType;
  activity_type: string;
  details: string | null;
  created_at: string;
};

type CommentRow = {
  id: string;
  task_id: string;
  run_id: string | null;
  step_id: string | null;
  issue_id: string | null;
  author: string;
  author_type: AuthorType;
  content: string;
  comment_type: CommentType;
  parent_id: string | null;
  created_at: string;
  updated_at: string;
};

type EvidenceRow = {
  id: string;
  task_id: string;
  run_id: string | null;
  step_id: string | null;
  evidence_type: EvidenceType;
  url: string;
  description: string | null;
  added_by: string;
  added_at: string;
};

type StagePlanRow = {
  id: string;
  task_id: string;
  step_number: number;
  title: string;
  role: TaskStagePlan['role'];
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

type IssueRow = {
  id: string;
  task_id: string;
  run_id: string | null;
  step_id: string | null;
  title: string;
  summary: string;
  status: TaskIssueStatus;
  assigned_to: IssueAssignee;
  created_by: string;
  resolved_by: string | null;
  resolution: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
};

type EvidenceLookupRow = {
  task_id: string;
  run_id: string | null;
  step_id: string | null;
};

function mapTaskRow(row: TaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    goal: row.goal || undefined,
    description: row.description || undefined,
    status: row.status,
    priority: row.priority,
    owner: row.owner,
    initiatedBy: row.initiated_by,
    project: row.project || undefined,
    acceptanceCriteria: row.acceptance_criteria ? JSON.parse(row.acceptance_criteria) : [],
    currentRunId: row.current_run_id || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at || undefined,
    isStuck: row.status === 'Blocked',
    stuckReason: undefined,
    retryCount: 0,
  };
}

function mapStagePlanRow(row: StagePlanRow): TaskStagePlan {
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

function mapIssueRow(row: IssueRow): TaskIssue {
  return {
    id: row.id,
    taskId: row.task_id,
    runId: row.run_id || undefined,
    stepId: row.step_id || undefined,
    title: row.title,
    summary: row.summary,
    status: row.status,
    assignedTo: row.assigned_to,
    createdBy: row.created_by,
    resolvedBy: row.resolved_by || undefined,
    resolution: row.resolution || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    resolvedAt: row.resolved_at || undefined,
  };
}

function hydrateTask(row: TaskRow, include: TaskIncludeOptions = {}): Task {
  const task = mapTaskRow(row);

  if (include.includeComments) {
    task.comments = getTaskComments(task.id);
  }
  if (include.includeActivity) {
    task.activity = getTaskActivity(task.id);
  }
  if (include.includeEvidence) {
    task.evidence = getTaskEvidence(task.id);
  }
  if (include.includeCurrentRun && task.currentRunId) {
    const currentRun = getRunById(task.currentRunId, true, true);
    if (currentRun) {
      task.currentRun = currentRun;
      const currentStep = currentRun.steps.find((step: RunStep) => step.id === currentRun.currentStepId)
        || currentRun.steps.find((step: RunStep) => step.status === 'running' || step.status === 'ready' || step.status === 'blocked' || step.status === 'submitted');
      task.retryCount = currentRun.steps.reduce((count: number, step: RunStep) => count + step.retryCount, 0);
      task.stuckReason = currentStep?.blockReason;
      if (currentStep?.assignedAgentId || currentStep?.assignedAgentName) {
        task.owner = currentStep.assignedAgentName || currentStep.assignedAgentId || task.owner;
      }
    }
  }
  if (include.includePlan) {
    task.stagePlan = getTaskStagePlans(task.id);
  }
  if (include.includeIssues) {
    task.issues = getTaskIssues(task.id);
  }

  return task;
}

export function getTasks(filters?: TaskFilters, include: TaskIncludeOptions = {}): Task[] {
  let query = 'SELECT * FROM tasks';
  const clauses: string[] = [];
  const params: unknown[] = [];

  if (filters?.status) {
    if (Array.isArray(filters.status)) {
      clauses.push(`status IN (${filters.status.map(() => '?').join(', ')})`);
      params.push(...filters.status);
    } else {
      clauses.push('status = ?');
      params.push(filters.status);
    }
  }

  if (filters?.owner) {
    clauses.push('owner = ?');
    params.push(filters.owner);
  }

  if (filters?.project) {
    clauses.push('project = ?');
    params.push(filters.project);
  }

  if (filters?.queueForMax) {
    clauses.push("status IN ('In Progress', 'In Review', 'Blocked')");
  }

  if (clauses.length > 0) {
    query += ` WHERE ${clauses.join(' AND ')}`;
  }

  query += ' ORDER BY updated_at DESC';
  const rows = db.prepare(query).all(...params) as TaskRow[];
  return rows.map((row) => hydrateTask(row, include));
}

export function getTaskById(id: string, include: TaskIncludeOptions = {}): Task | null {
  const row = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as TaskRow | undefined;
  if (!row) {
    return null;
  }
  return hydrateTask(row, include);
}

export function createTaskRecord(input: CreateTaskRecordInput): Task {
  const now = new Date().toISOString();
  const task: Task = {
    id: `task-${randomUUID().split('-')[0]}`,
    title: input.title,
    goal: input.goal,
    description: input.description,
    status: input.status || 'Backlog',
    priority: input.priority || 'normal',
    owner: input.owner || 'max',
    initiatedBy: input.initiatedBy || 'max',
    project: input.project,
    acceptanceCriteria: input.acceptanceCriteria || [],
    createdAt: now,
    updatedAt: now,
    isStuck: false,
    retryCount: 0,
  };

  db.prepare(`
    INSERT INTO tasks (
      id, title, goal, description, status, priority, owner, initiated_by,
      project, acceptance_criteria, current_run_id, created_at, updated_at, completed_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    task.id,
    task.title,
    task.goal || null,
    task.description || null,
    task.status,
    task.priority,
    task.owner,
    task.initiatedBy,
    task.project || null,
    JSON.stringify(task.acceptanceCriteria),
    null,
    task.createdAt,
    task.updatedAt,
    null,
  );

  logTaskActivity(task.id, task.initiatedBy, 'user', 'created', {
    newStatus: task.status,
  });

  return task;
}

export function updateTask(id: string, input: UpdateTaskInput, actor = 'system'): Task | null {
  const existing = getTaskById(id);
  if (!existing) {
    return null;
  }

  const updates: string[] = [];
  const values: unknown[] = [];
  const now = new Date().toISOString();

  if (input.title !== undefined) {
    updates.push('title = ?');
    values.push(input.title);
  }
  if (input.goal !== undefined) {
    updates.push('goal = ?');
    values.push(input.goal);
  }
  if (input.description !== undefined) {
    updates.push('description = ?');
    values.push(input.description);
  }
  if (input.priority !== undefined) {
    updates.push('priority = ?');
    values.push(input.priority);
  }
  if (input.owner !== undefined) {
    updates.push('owner = ?');
    values.push(input.owner);
  }
  if (input.project !== undefined) {
    updates.push('project = ?');
    values.push(input.project);
  }
  if (input.acceptanceCriteria !== undefined) {
    updates.push('acceptance_criteria = ?');
    values.push(JSON.stringify(input.acceptanceCriteria));
  }
  if (input.status !== undefined) {
    updates.push('status = ?');
    values.push(input.status);
  }
  if (input.currentRunId !== undefined) {
    updates.push('current_run_id = ?');
    values.push(input.currentRunId);
  }
  if (input.completedAt !== undefined) {
    updates.push('completed_at = ?');
    values.push(input.completedAt);
  }

  updates.push('updated_at = ?');
  values.push(now);
  values.push(id);

  db.prepare(`UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`).run(...values);

  if (input.status && input.status !== existing.status) {
    logTaskActivity(id, actor, 'system', 'status_changed', {
      oldStatus: existing.status,
      newStatus: input.status,
    });
  } else {
    logTaskActivity(id, actor, 'system', 'updated', {});
  }

  return getTaskById(id);
}

export function deleteTask(id: string): boolean {
  const result = db.prepare('DELETE FROM tasks WHERE id = ?').run(id);
  return result.changes > 0;
}

export function touchTask(taskId: string, patch: Partial<UpdateTaskInput>, actor = 'system') {
  return updateTask(taskId, patch, actor);
}

export function logTaskActivity(
  taskId: string,
  actor: string,
  actorType: AuthorType,
  activityType: string,
  details?: ActivityDetails,
  runId?: string,
  stepId?: string,
): TaskActivity {
  const id = `act-${randomUUID().split('-')[0]}`;
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO task_activity (id, task_id, run_id, step_id, actor, actor_type, activity_type, details, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    taskId,
    runId || null,
    stepId || null,
    actor,
    actorType,
    activityType,
    details ? JSON.stringify(details) : null,
    now,
  );

  return {
    id,
    taskId,
    runId,
    stepId,
    actor,
    actorType,
    activityType,
    details,
    createdAt: now,
  };
}

export function getTaskActivity(taskId: string, limit = 100): TaskActivity[] {
  const rows = db.prepare(`
    SELECT * FROM task_activity
    WHERE task_id = ?
    ORDER BY created_at DESC
    LIMIT ?
  `).all(taskId, limit) as ActivityRow[];

  return rows.map((row) => ({
    id: row.id,
    taskId: row.task_id,
    runId: row.run_id || undefined,
    stepId: row.step_id || undefined,
    actor: row.actor,
    actorType: row.actor_type,
    activityType: row.activity_type,
    details: row.details ? JSON.parse(row.details) : undefined,
    createdAt: row.created_at,
  }));
}

export function getTaskStagePlans(taskId: string): TaskStagePlan[] {
  const rows = db.prepare(`
    SELECT * FROM task_stage_plans
    WHERE task_id = ?
    ORDER BY step_number ASC
  `).all(taskId) as StagePlanRow[];

  return rows.map(mapStagePlanRow);
}

function syncTaskStatusFromIssues(taskId: string, actor = 'system') {
  const openIssueCountRow = db.prepare(`
    SELECT COUNT(*) as count
    FROM task_issues
    WHERE task_id = ? AND status != 'resolved'
  `).get(taskId) as { count: number };

  if (openIssueCountRow.count > 0) {
    updateTask(taskId, { status: 'Blocked' }, actor);
    return;
  }

  const task = getTaskById(taskId, { includeCurrentRun: true });
  if (!task) {
    return;
  }

  if (!task.currentRunId) {
    updateTask(taskId, { status: 'Backlog', completedAt: null }, actor);
  }
}

export function getTaskIssues(taskId: string): TaskIssue[] {
  const rows = db.prepare(`
    SELECT * FROM task_issues
    WHERE task_id = ?
    ORDER BY created_at DESC
  `).all(taskId) as IssueRow[];

  return rows.map(mapIssueRow);
}

export function createTaskIssue(input: {
  taskId: string;
  title: string;
  summary: string;
  assignedTo: IssueAssignee;
  createdBy: string;
  runId?: string;
  stepId?: string;
  status?: Exclude<TaskIssueStatus, 'resolved'>;
}) {
  const id = `iss-${randomUUID().split('-')[0]}`;
  const now = new Date().toISOString();
  const status = input.status || (input.assignedTo === 'human' ? 'waiting_on_human' : 'waiting_on_orchestrator');

  db.prepare(`
    INSERT INTO task_issues (
      id, task_id, run_id, step_id, title, summary, status, assigned_to, created_by,
      resolved_by, resolution, created_at, updated_at, resolved_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    input.taskId,
    input.runId || null,
    input.stepId || null,
    input.title,
    input.summary,
    status,
    input.assignedTo,
    input.createdBy,
    null,
    null,
    now,
    now,
    null,
  );

  logTaskActivity(input.taskId, input.createdBy, 'system', 'issue_opened', {
    runId: input.runId,
    stepId: input.stepId,
    reason: input.title,
  }, input.runId, input.stepId);
  updateTask(input.taskId, { status: 'Blocked' }, input.createdBy);

  return mapIssueRow(db.prepare('SELECT * FROM task_issues WHERE id = ?').get(id) as IssueRow);
}

export function updateTaskIssue(issueId: string, input: {
  actor: string;
  status?: TaskIssueStatus;
  assignedTo?: IssueAssignee;
  summary?: string;
  title?: string;
  resolution?: string | null;
}) {
  const existing = db.prepare('SELECT * FROM task_issues WHERE id = ?').get(issueId) as IssueRow | undefined;
  if (!existing) {
    return null;
  }

  const updates: string[] = [];
  const values: unknown[] = [];
  const now = new Date().toISOString();

  if (input.status !== undefined) {
    updates.push('status = ?');
    values.push(input.status);
  }
  if (input.assignedTo !== undefined) {
    updates.push('assigned_to = ?');
    values.push(input.assignedTo);
  }
  if (input.summary !== undefined) {
    updates.push('summary = ?');
    values.push(input.summary);
  }
  if (input.title !== undefined) {
    updates.push('title = ?');
    values.push(input.title);
  }
  if (input.resolution !== undefined) {
    updates.push('resolution = ?');
    values.push(input.resolution);
  }
  if (input.status === 'resolved') {
    updates.push('resolved_by = ?');
    values.push(input.actor);
    updates.push('resolved_at = ?');
    values.push(now);
  }

  updates.push('updated_at = ?');
  values.push(now);
  values.push(issueId);

  db.prepare(`UPDATE task_issues SET ${updates.join(', ')} WHERE id = ?`).run(...values);

  logTaskActivity(existing.task_id, input.actor, 'system', input.status === 'resolved' ? 'issue_resolved' : 'issue_updated', {
    runId: existing.run_id || undefined,
    stepId: existing.step_id || undefined,
    reason: input.title || existing.title,
  }, existing.run_id || undefined, existing.step_id || undefined);

  syncTaskStatusFromIssues(existing.task_id, input.actor);

  return mapIssueRow(db.prepare('SELECT * FROM task_issues WHERE id = ?').get(issueId) as IssueRow);
}

export function addTaskComment(
  taskId: string,
  content: string,
  author: string,
  authorType: AuthorType = 'agent',
  commentType: CommentType = 'note',
  parentId?: string,
  runId?: string,
  stepId?: string,
  issueId?: string,
): TaskComment {
  const id = `cmt-${randomUUID().split('-')[0]}`;
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO task_comments (id, task_id, run_id, step_id, issue_id, author, author_type, content, comment_type, parent_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, taskId, runId || null, stepId || null, issueId || null, author, authorType, content, commentType, parentId || null, now, now);

  logTaskActivity(taskId, author, authorType, 'comment_added', { runId, stepId }, runId, stepId);

  return {
    id,
    taskId,
    runId,
    stepId,
    issueId,
    author,
    authorType,
    content,
    commentType,
    parentId,
    createdAt: now,
    updatedAt: now,
  };
}

export function getTaskComments(taskId: string, type?: CommentType, issueId?: string): TaskComment[] {
  let query = 'SELECT * FROM task_comments WHERE task_id = ?';
  const params: unknown[] = [taskId];

  if (type) {
    query += ' AND comment_type = ?';
    params.push(type);
  }
  if (issueId) {
    query += ' AND issue_id = ?';
    params.push(issueId);
  }

  query += ' ORDER BY created_at DESC';

  const rows = db.prepare(query).all(...params) as CommentRow[];
  return rows.map((row) => ({
    id: row.id,
    taskId: row.task_id,
    runId: row.run_id || undefined,
    stepId: row.step_id || undefined,
    issueId: row.issue_id || undefined,
    author: row.author,
    authorType: row.author_type,
    content: row.content,
    commentType: row.comment_type,
    parentId: row.parent_id || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

export function updateTaskComment(commentId: string, content: string): boolean {
  const now = new Date().toISOString();
  const result = db.prepare('UPDATE task_comments SET content = ?, updated_at = ? WHERE id = ?').run(content, now, commentId);
  return result.changes > 0;
}

export function deleteTaskComment(commentId: string): boolean {
  const result = db.prepare('DELETE FROM task_comments WHERE id = ?').run(commentId);
  return result.changes > 0;
}

export function addTaskEvidence(
  taskId: string,
  evidenceType: EvidenceType,
  url: string,
  addedBy: string,
  description?: string,
  runId?: string,
  stepId?: string,
): TaskEvidence {
  const id = `ev-${randomUUID().split('-')[0]}`;
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO task_evidence (id, task_id, run_id, step_id, evidence_type, url, description, added_by, added_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, taskId, runId || null, stepId || null, evidenceType, url, description || null, addedBy, now);

  logTaskActivity(taskId, addedBy, 'agent', 'evidence_added', { runId, stepId }, runId, stepId);

  return {
    id,
    taskId,
    runId,
    stepId,
    evidenceType,
    url,
    description,
    addedBy,
    addedAt: now,
  };
}

export function getTaskEvidence(taskId: string): TaskEvidence[] {
  const rows = db.prepare('SELECT * FROM task_evidence WHERE task_id = ? ORDER BY added_at DESC').all(taskId) as EvidenceRow[];
  return rows.map((row) => ({
    id: row.id,
    taskId: row.task_id,
    runId: row.run_id || undefined,
    stepId: row.step_id || undefined,
    evidenceType: row.evidence_type,
    url: row.url,
    description: row.description || undefined,
    addedBy: row.added_by,
    addedAt: row.added_at,
  }));
}

export function removeTaskEvidence(evidenceId: string, actor = 'system'): boolean {
  const row = db.prepare('SELECT task_id, run_id, step_id FROM task_evidence WHERE id = ?').get(evidenceId) as EvidenceLookupRow | undefined;
  const result = db.prepare('DELETE FROM task_evidence WHERE id = ?').run(evidenceId);
  if (result.changes > 0 && row) {
    const runId = row.run_id || undefined;
    const stepId = row.step_id || undefined;
    logTaskActivity(row.task_id, actor, 'system', 'evidence_removed', { runId, stepId }, runId, stepId);
  }
  return result.changes > 0;
}
