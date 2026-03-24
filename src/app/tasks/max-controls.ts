import type { RunStepStatus } from '@/lib/types';

export function getStagePrimaryAction(status?: RunStepStatus) {
  if (status === 'ready') {
    return { label: 'Start Stage' as const };
  }

  if (status === 'blocked') {
    return { label: 'Restart Stage' as const };
  }

  return null;
}

export function getMaxControlsCopy(hasRun: boolean) {
  if (!hasRun) {
    return 'This task is saved in backlog. Start it when the plan is ready to execute.';
  }

  return 'Run the active stage, capture operator notes, and review the structured handoff.';
}
