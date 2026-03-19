import type { Priority } from './types';

export type TaskIntakeDraft = {
  title: string;
  summary: string;
  priority: Priority;
  project: string;
  initiatedBy: string;
  finalDeliverable: string;
};

export function isTaskIntakeValid(draft: Pick<TaskIntakeDraft, 'title' | 'summary'>) {
  return Boolean(draft.title.trim() && draft.summary.trim());
}

export function toAcceptanceCriteria(finalDeliverable: string) {
  const normalized = finalDeliverable.trim();
  return normalized ? [normalized] : [];
}
