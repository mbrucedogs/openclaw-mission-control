import { exec } from 'child_process';
import { promisify } from 'util';

// Manual development poller.
// Preferred production-style monitor path is `./tron-monitor.sh` on a 10-minute schedule.
// Keep this script as a lightweight helper for local debugging only.

const execAsync = promisify(exec);

const BASE_URL = 'http://127.0.0.1:4000';
const API_KEY = process.env.API_KEY || '';
const POLL_INTERVAL_MS = 15000;

const seen = new Map<string, string>();

type RunStep = {
  id: string;
  stepNumber: number;
  title: string;
  role: string;
  status: string;
  blockReason?: string;
};

type Task = {
  id: string;
  title: string;
  goal?: string;
  status: string;
  updatedAt: string;
  currentRun?: {
    id: string;
    runNumber: number;
    currentStepId?: string;
    steps: RunStep[];
  };
};

async function fetchJson<T>(url: string) {
  const response = await fetch(url, {
    headers: {
      'X-API-Key': API_KEY,
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return response.json() as Promise<T>;
}

function getCurrentStep(task: Task) {
  return task.currentRun?.steps.find((step) => step.id === task.currentRun?.currentStepId)
    || task.currentRun?.steps.find((step) => ['ready', 'running', 'submitted', 'blocked'].includes(step.status))
    || null;
}

async function wakeOrchestrator(task: Task) {
  const step = getCurrentStep(task);
  const message = [
    `ORCHESTRATOR TASK: Task "${task.title}" (${task.id}) requires action.`,
    `Board status: ${task.status}.`,
    task.goal ? `Goal: ${task.goal}.` : null,
    task.currentRun ? `Run: #${task.currentRun.runNumber} (${task.currentRun.id}).` : null,
    step ? `Current step: ${step.stepNumber} "${step.title}" (${step.role}) status=${step.status}.` : 'No current step found.',
    step?.blockReason ? `Block reason: ${step.blockReason}.` : null,
    'Use the task/run/step API and validate the structured completion packet before advancing.',
  ].filter(Boolean).join(' ');

  console.log(`[orchestrator] waking primary orchestrator for ${task.id}`);
  await execAsync(`openclaw agent --agent main --message ${JSON.stringify(message)}`);
}

async function poll() {
  try {
    const tasks = await fetchJson<Task[]>(`${BASE_URL}/api/tasks?queue=max&include=currentRun`);
    for (const task of tasks) {
      const currentFingerprint = `${task.updatedAt}:${task.status}:${task.currentRun?.currentStepId || 'none'}`;
      if (seen.get(task.id) === currentFingerprint) {
        continue;
      }
      seen.set(task.id, currentFingerprint);
      await wakeOrchestrator(task);
    }
  } catch (error) {
    console.error('[orchestrator] poll failed', error);
  }
}

console.warn('[orchestrator] manual poller started. Preferred scheduled monitor path is ./tron-monitor.sh');
poll();
setInterval(poll, POLL_INTERVAL_MS);
