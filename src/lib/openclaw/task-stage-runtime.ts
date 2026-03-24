import { callOpenClawGateway } from './client';
import type { RunStep, RunStepRuntimeLink, Task } from '../types';
import { getLatestRunStepRuntimeLink, getRunStepById, startRunStep, retryRunStep, blockRunStep } from '../domain/task-runs';
import { getTaskById } from '../domain/tasks';

type GatewayInvoker = <T = unknown>(method: string, params?: unknown) => Promise<T>;

type TaskStageRuntimeDeps = {
  callGateway?: GatewayInvoker;
};

type TaskStageActionInput = {
  actor: string;
  reason?: string;
};

type GatewaySessionResponse = {
  key?: unknown;
  sessionId?: unknown;
  runId?: unknown;
};

type GatewayAbortResponse = {
  abortedRunId?: unknown;
};

function getGateway(deps: TaskStageRuntimeDeps): GatewayInvoker {
  return deps.callGateway || callOpenClawGateway;
}

function requireRunStep(stepId: string): RunStep {
  const step = getRunStepById(stepId);
  if (!step) {
    throw new Error(`Unknown step ${stepId}`);
  }
  if (!step.assignedAgentId) {
    throw new Error('Step cannot start without an assigned agent');
  }
  return step;
}

function buildTaskStageSessionKey(step: RunStep) {
  return `agent:${step.assignedAgentId}:task-stage:${step.taskId}:${step.runId}:${step.stepNumber}`;
}

function buildTaskStageMessage(step: RunStep, task: Task | null, reason?: string) {
  const lines = [
    `Task: ${task?.title || step.taskId}`,
    `Stage ${step.stepNumber}: ${step.title}`,
    `Goal: ${step.goal}`,
    `Inputs: ${step.inputs.join('; ')}`,
    `Required outputs: ${step.requiredOutputs.join('; ')}`,
    `Done condition: ${step.doneCondition}`,
    `Boundaries: ${step.boundaries.join('; ')}`,
  ];

  if (reason?.trim()) {
    lines.push(`Operator note: ${reason.trim()}`);
  }
  if (step.notesForMax?.trim()) {
    lines.push(`Notes from Max: ${step.notesForMax.trim()}`);
  }

  lines.push('Work only on this stage. When complete, report outputs produced, validation result, issues, and next-step recommendation.');
  return lines.join('\n');
}

function normalizeRuntimeLink(
  response: GatewaySessionResponse,
  fallback: RunStepRuntimeLink,
): RunStepRuntimeLink {
  return {
    sessionKey: typeof response.key === 'string' ? response.key : fallback.sessionKey,
    sessionId: typeof response.sessionId === 'string' ? response.sessionId : fallback.sessionId,
    runtimeRunId: typeof response.runId === 'string' ? response.runId : fallback.runtimeRunId,
  };
}

export async function startTaskStageRuntime(
  stepId: string,
  input: TaskStageActionInput,
  deps: TaskStageRuntimeDeps = {},
) {
  const gateway = getGateway(deps);
  const step = requireRunStep(stepId);
  const task = getTaskById(step.taskId, { includeCurrentRun: true });
  const runtime = getLatestRunStepRuntimeLink(stepId);
  const sessionKey = runtime?.sessionKey || buildTaskStageSessionKey(step);
  const result = await gateway<GatewaySessionResponse>('sessions.create', {
    key: sessionKey,
    agentId: step.assignedAgentId,
    label: `${task?.title || step.title} / Stage ${step.stepNumber}`,
    message: buildTaskStageMessage(step, task, input.reason),
  });

  return startRunStep(stepId, {
    actor: input.actor,
    heartbeatAt: new Date().toISOString(),
    runtime: normalizeRuntimeLink(result, { sessionKey, sessionId: runtime?.sessionId, runtimeRunId: runtime?.runtimeRunId }),
  });
}

export async function retryTaskStageRuntime(
  stepId: string,
  input: Required<Pick<TaskStageActionInput, 'actor' | 'reason'>>,
  deps: TaskStageRuntimeDeps = {},
) {
  const gateway = getGateway(deps);
  const step = requireRunStep(stepId);
  const task = getTaskById(step.taskId, { includeCurrentRun: true });
  const runtime = getLatestRunStepRuntimeLink(stepId);
  const sessionKey = runtime?.sessionKey || buildTaskStageSessionKey(step);

  retryRunStep(stepId, { actor: input.actor, reason: input.reason });

  const method = runtime?.sessionKey ? 'sessions.send' : 'sessions.create';
  const params = runtime?.sessionKey
    ? {
        key: sessionKey,
        message: buildTaskStageMessage(step, task, input.reason),
      }
    : {
        key: sessionKey,
        agentId: step.assignedAgentId,
        label: `${task?.title || step.title} / Stage ${step.stepNumber}`,
        message: buildTaskStageMessage(step, task, input.reason),
      };

  const result = await gateway<GatewaySessionResponse>(method, params);

  return startRunStep(stepId, {
    actor: input.actor,
    heartbeatAt: new Date().toISOString(),
    runtime: normalizeRuntimeLink(result, { sessionKey, sessionId: runtime?.sessionId, runtimeRunId: runtime?.runtimeRunId }),
  });
}

export async function blockTaskStageRuntime(
  stepId: string,
  input: Required<Pick<TaskStageActionInput, 'actor' | 'reason'>>,
  deps: TaskStageRuntimeDeps = {},
) {
  const gateway = getGateway(deps);
  const runtime = getLatestRunStepRuntimeLink(stepId);

  let payload: Record<string, unknown> | undefined;
  if (runtime?.sessionKey) {
    const result = await gateway<GatewayAbortResponse>('sessions.abort', {
      key: runtime.sessionKey,
      runId: runtime.runtimeRunId,
    });
    payload = {
      ...runtime,
      abortedRunId: typeof result.abortedRunId === 'string' ? result.abortedRunId : runtime.runtimeRunId,
    };
  }

  return blockRunStep(stepId, {
    actor: input.actor,
    reason: input.reason,
    payload,
  });
}
