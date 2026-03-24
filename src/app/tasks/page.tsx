'use client';

import type { ReactNode } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  CheckCircle2,
  ChevronsRight,
  Clock3,
  GitBranch,
  Loader2,
  MessageSquare,
  Paperclip,
  Play,
  Plus,
  RefreshCcw,
  Save,
  ShieldAlert,
  Sparkles,
  Wand2,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { inferStepRoleForAgent } from '@/lib/agent-matching';
import { hasMeaningfulMultilineContent, normalizeMultilineItems, parseMultilineDraft } from '@/lib/multiline-fields';
import { isTaskIntakeValid, toAcceptanceCriteria } from '@/lib/task-authoring';
import { getMaxControlsCopy, getStagePrimaryAction } from './max-controls';
import type {
  Agent,
  Priority,
  Project,
  RunStep,
  RunStepEvent,
  StepPacketInput,
  Task,
  TaskActivityFeedItem,
  TaskComment,
  TaskEvidence,
  TaskIssue,
  TaskStagePlan,
  TaskTemplate,
  TaskStatus,
} from '@/lib/types';

const COLUMNS: TaskStatus[] = ['Backlog', 'In Progress', 'In Review', 'Blocked', 'Done'];

const COLUMN_COPY: Record<TaskStatus, { label: string; tone: string; dot: string }> = {
  Backlog: { label: 'Backlog', tone: 'border-slate-800 bg-slate-950/60', dot: 'bg-slate-500' },
  'In Progress': { label: 'In Progress', tone: 'border-blue-900/70 bg-blue-950/30', dot: 'bg-blue-500' },
  'In Review': { label: 'In Review', tone: 'border-emerald-900/70 bg-emerald-950/30', dot: 'bg-emerald-500' },
  Blocked: { label: 'Blocked', tone: 'border-red-900/70 bg-red-950/30', dot: 'bg-red-500' },
  Done: { label: 'Done', tone: 'border-zinc-800 bg-zinc-950/70', dot: 'bg-zinc-400' },
};

const PRIORITY_STYLES: Record<Priority, string> = {
  urgent: 'border-red-500/30 bg-red-500/10 text-red-300',
  high: 'border-orange-500/30 bg-orange-500/10 text-orange-300',
  normal: 'border-slate-700 bg-slate-900 text-slate-300',
  low: 'border-sky-500/30 bg-sky-500/10 text-sky-300',
};

const STAGE_BY_ROLE: Record<NonNullable<StepPacketInput['role']>, string> = {
  researcher: 'Planning',
  builder: 'Build',
  tester: 'QA',
  reviewer: 'Review',
};

type WizardStep = 1 | 2 | 3 | 4;

type WizardDraft = {
  title: string;
  summary: string;
  priority: Priority;
  project: string;
  initiatedBy: string;
  finalDeliverable: string;
  templateId: string;
  steps: Array<StepPacketInput & { id: string }>;
};

type EditableStepDraft = StepPacketInput & { id: string };

type TemplateEditorDraft = {
  id?: string;
  isNew: boolean;
  name: string;
  description: string;
  summaryDefault: string;
  finalDeliverableDefault: string;
  steps: EditableStepDraft[];
};

type TaskDetailData = {
  task: Task | null;
  events: RunStepEvent[];
};

const emptyStep = (index: number): StepPacketInput & { id: string } => ({
  id: `draft-${index}-${Math.random().toString(36).slice(2, 8)}`,
  title: '',
  role: undefined,
  assignedAgentId: '',
  assignedAgentName: '',
  goal: '',
  inputs: [''],
  requiredOutputs: [''],
  doneCondition: '',
  boundaries: [''],
  dependencies: [],
  notesForMax: '',
});

const emptyTemplateDraft = (): TemplateEditorDraft => ({
  isNew: true,
  name: '',
  description: '',
  summaryDefault: '',
  finalDeliverableDefault: '',
  steps: [emptyStep(1)],
});

function toEditableSteps(steps: StepPacketInput[]) {
  return steps.map((step, index) => ({
    ...step,
    id: `template-${index}-${Math.random().toString(36).slice(2, 8)}`,
  }));
}

function templateToDraft(template: TaskTemplate): TemplateEditorDraft {
  return {
    id: template.id,
    isNew: false,
    name: template.name,
    description: template.description || '',
    summaryDefault: template.taskDefaults?.goal || '',
    finalDeliverableDefault: template.taskDefaults?.acceptanceCriteria?.[0] || '',
    steps: toEditableSteps(template.steps),
  };
}

function splitLines(value: string) {
  return parseMultilineDraft(value);
}

function canEditStep(status: string) {
  return ['draft', 'ready', 'blocked'].includes(status);
}

function isRunStep(step: RunStep | TaskStagePlan): step is RunStep {
  return 'runId' in step;
}

function formatDate(value?: string) {
  if (!value) return 'Not started';
  return new Date(value).toLocaleString();
}

function timeAgo(value?: string) {
  if (!value) return 'never';
  const delta = Date.now() - new Date(value).getTime();
  const minutes = Math.floor(delta / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function currentStep(task: Task) {
  return task.currentRun?.steps.find((step) => step.id === task.currentRun?.currentStepId)
    || task.currentRun?.steps.find((step) => ['ready', 'running', 'submitted', 'blocked'].includes(step.status))
    || null;
}

function plannedStage(task: Task) {
  return task.stagePlan?.[0] || null;
}

function statusPill(status: string) {
  const tone =
    status === 'running' ? 'bg-blue-500/10 text-blue-300 border-blue-500/30' :
    status === 'ready' ? 'bg-slate-500/10 text-slate-300 border-slate-500/30' :
    status === 'submitted' ? 'bg-amber-500/10 text-amber-300 border-amber-500/30' :
    status === 'blocked' ? 'bg-red-500/10 text-red-300 border-red-500/30' :
    status === 'complete' ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' :
    'bg-zinc-500/10 text-zinc-300 border-zinc-500/30';

  return (
    <span className={cn('rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-[0.18em]', tone)}>
      {status}
    </span>
  );
}

function stageLabelForTask(task: Task) {
  const step = currentStep(task);
  if (!step) {
    const nextPlanned = plannedStage(task);
    if (nextPlanned) {
      return `${STAGE_BY_ROLE[nextPlanned.role]} (Planned)`;
    }
    return task.status === 'Done' ? 'Complete' : 'Not Started';
  }
  return STAGE_BY_ROLE[step.role];
}

function agentOptionLabel(agent: Agent) {
  const roleLabel = agent.role?.trim() || agent.type?.trim() || 'Unassigned role';
  return `${agent.name} (${roleLabel})`;
}

function activityMessage(activity: TaskActivityFeedItem) {
  switch (activity.activityType) {
    case 'created':
      return 'Task created';
    case 'updated':
      return 'Task updated';
    case 'status_changed':
      return activity.details?.newStatus ? `Status changed to ${activity.details.newStatus}` : 'Status changed';
    case 'stage_plan_saved':
      return 'Execution flow saved';
    case 'stage_plan_updated':
      return activity.stepTitle ? `Stage updated: ${activity.stepTitle}` : 'Stage updated';
    case 'run_started':
      return 'Task started';
    case 'run_step_started':
      return activity.stepTitle ? `Started ${activity.stepTitle}` : 'Stage started';
    case 'run_step_progress_note':
      return activity.stepTitle ? `Progress on ${activity.stepTitle}` : 'Progress update';
    case 'run_step_completion_submitted':
      return activity.stepTitle ? `Completion submitted for ${activity.stepTitle}` : 'Completion submitted';
    case 'run_step_validation_passed':
      return activity.stepTitle ? `Validated ${activity.stepTitle}` : 'Validation passed';
    case 'run_step_validation_rejected':
      return activity.stepTitle ? `Rejected ${activity.stepTitle}` : 'Validation rejected';
    case 'run_step_blocked':
      return activity.stepTitle ? `Blocked ${activity.stepTitle}` : 'Stage blocked';
    case 'run_step_retry_requested':
      return activity.stepTitle ? `Retry requested for ${activity.stepTitle}` : 'Retry requested';
    case 'issue_opened':
      return activity.details?.reason ? `Issue opened: ${activity.details.reason}` : 'Issue opened';
    case 'issue_updated':
      return activity.details?.reason ? `Issue updated: ${activity.details.reason}` : 'Issue updated';
    case 'issue_resolved':
      return activity.details?.reason ? `Issue resolved: ${activity.details.reason}` : 'Issue resolved';
    case 'comment_added':
      return activity.details?.stepId ? 'Stage conversation updated' : 'Comment added';
    case 'evidence_added':
      return 'Evidence added';
    case 'evidence_removed':
      return 'Evidence removed';
    case 'template_saved':
      return 'Run saved as template';
    default:
      return activity.activityType.replaceAll('_', ' ');
  }
}

function StepDesigner({
  step,
  index,
  agents,
  onChange,
  onRemove,
  canRemove = true,
}: {
  step: EditableStepDraft;
  index: number;
  agents: Agent[];
  onChange: (next: EditableStepDraft) => void;
  onRemove: () => void;
  canRemove?: boolean;
}) {
  const assignableAgents = agents.filter((agent) => agent.id !== 'main' && inferStepRoleForAgent(agent));
  const selectedAgent = assignableAgents.find((agent) => agent.id === step.assignedAgentId);
  const derivedRole = selectedAgent ? inferStepRoleForAgent(selectedAgent) : (step.role || null);
  const derivedStage = derivedRole ? STAGE_BY_ROLE[derivedRole] : 'Unassigned';

  return (
    <div className="rounded-2xl border border-[#222] bg-[#09090b] p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Stage {index + 1}</p>
          <p className="text-sm font-bold text-white">Execution Packet</p>
        </div>
        {canRemove ? (
          <button onClick={onRemove} className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-red-500/10 hover:text-red-300">
            <X className="h-4 w-4" />
          </button>
        ) : (
          <div />
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <label className="space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Stage Title</span>
          <input
            value={step.title}
            onChange={(event) => onChange({ ...step, title: event.target.value })}
            className="w-full rounded-xl border border-[#252525] bg-black px-3 py-2 text-sm text-white outline-none focus:border-blue-500/50"
          />
        </label>
        <label className="space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Assigned Agent</span>
          <select
            value={step.assignedAgentId || ''}
            onChange={(event) => {
              const agent = assignableAgents.find((candidate) => candidate.id === event.target.value);
              const role = agent ? inferStepRoleForAgent(agent) : null;
              onChange({
                ...step,
                role: role || undefined,
                assignedAgentId: agent?.id || '',
                assignedAgentName: agent?.name || '',
              });
            }}
            className="w-full rounded-xl border border-[#252525] bg-black px-3 py-2 text-sm text-white outline-none focus:border-blue-500/50"
          >
            <option value="">Select agent</option>
            {assignableAgents.map((agent) => (
              <option key={agent.id} value={agent.id}>
                {agentOptionLabel(agent)}
              </option>
            ))}
          </select>
          {assignableAgents.length === 0 && (
            <p className="text-xs text-red-300">No orchestration agents are configured yet. Set each agent type in Team first.</p>
          )}
        </label>
        <div className="space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Current Stage</span>
          <div className="rounded-xl border border-[#252525] bg-black px-3 py-2 text-sm text-white">
            {derivedStage}
          </div>
          <p className="text-xs text-slate-500">This is derived automatically from the selected agent.</p>
        </div>
      </div>

      <div className="mt-4 grid gap-4">
        <label className="space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Goal</span>
          <textarea
            value={step.goal}
            onChange={(event) => onChange({ ...step, goal: event.target.value })}
            rows={2}
            className="w-full rounded-xl border border-[#252525] bg-black px-3 py-2 text-sm text-white outline-none focus:border-blue-500/50"
          />
        </label>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Inputs</span>
            <textarea
              value={step.inputs.join('\n')}
              onChange={(event) => onChange({ ...step, inputs: splitLines(event.target.value) })}
              rows={4}
              className="w-full rounded-xl border border-[#252525] bg-black px-3 py-2 text-sm text-white outline-none focus:border-blue-500/50"
            />
          </label>
          <label className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Required Outputs</span>
            <textarea
              value={step.requiredOutputs.join('\n')}
              onChange={(event) => onChange({ ...step, requiredOutputs: splitLines(event.target.value) })}
              rows={4}
              className="w-full rounded-xl border border-[#252525] bg-black px-3 py-2 text-sm text-white outline-none focus:border-blue-500/50"
            />
          </label>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Done Condition</span>
            <textarea
              value={step.doneCondition}
              onChange={(event) => onChange({ ...step, doneCondition: event.target.value })}
              rows={3}
              className="w-full rounded-xl border border-[#252525] bg-black px-3 py-2 text-sm text-white outline-none focus:border-blue-500/50"
            />
          </label>
          <label className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Do Not Do</span>
            <textarea
              value={step.boundaries.join('\n')}
              onChange={(event) => onChange({ ...step, boundaries: splitLines(event.target.value) })}
              rows={3}
              className="w-full rounded-xl border border-[#252525] bg-black px-3 py-2 text-sm text-white outline-none focus:border-blue-500/50"
            />
          </label>
        </div>
        <label className="space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Notes For Orchestrator</span>
          <textarea
            value={step.notesForMax || ''}
            onChange={(event) => onChange({ ...step, notesForMax: event.target.value })}
            rows={2}
            className="w-full rounded-xl border border-[#252525] bg-black px-3 py-2 text-sm text-white outline-none focus:border-blue-500/50"
          />
        </label>
      </div>
    </div>
  );
}

function IssueCommentThread({
  issueId,
  comments,
  onReply,
}: {
  issueId: string;
  comments: TaskComment[];
  onReply: (issueId: string, parentId?: string) => ReactNode;
}) {
  const renderComment = (comment: TaskComment, depth = 0): ReactNode => {
    const children = comments.filter((candidate) => candidate.parentId === comment.id);
    return (
      <div key={comment.id} className={cn(depth > 0 && 'ml-4 border-l border-[#202020] pl-4')}>
        <div className="rounded-2xl border border-[#202020] bg-black/70 p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-white">{comment.author}</p>
            <span className="text-[10px] text-slate-500">{timeAgo(comment.createdAt)}</span>
          </div>
          <p className="mt-2 text-sm text-slate-300">{comment.content}</p>
          <div className="mt-3">{onReply(issueId, comment.id)}</div>
        </div>
        {children.length > 0 && (
          <div className="mt-3 space-y-3">
            {children.map((child) => renderComment(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const roots = comments.filter((comment) => !comment.parentId);
  if (roots.length === 0) {
    return null;
  }

  return <div className="space-y-3">{roots.map((comment) => renderComment(comment))}</div>;
}

function TaskWizard({
  projects,
  templates,
  agents,
  onClose,
  onCreated,
  setRefreshPaused,
}: {
  projects: Project[];
  templates: TaskTemplate[];
  agents: Agent[];
  onClose: () => void;
  onCreated: (task: Task) => void;
  setRefreshPaused: (paused: boolean) => void;
}) {
  const [wizardStep, setWizardStep] = useState<WizardStep>(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<WizardDraft>({
    title: '',
    summary: '',
    priority: 'normal',
    project: '',
    initiatedBy: 'max',
    finalDeliverable: '',
    templateId: '',
    steps: [emptyStep(1)],
  });
  const appliedTemplateIdRef = useRef<string | null>(null);

  const selectedTemplate = templates.find((template) => template.id === draft.templateId);

  useEffect(() => {
    setRefreshPaused(true);
    return () => setRefreshPaused(false);
  }, [setRefreshPaused]);

  useEffect(() => {
    if (!draft.templateId) {
      appliedTemplateIdRef.current = null;
      return;
    }
    if (!selectedTemplate) {
      return;
    }
    if (appliedTemplateIdRef.current === selectedTemplate.id) {
      return;
    }
    appliedTemplateIdRef.current = selectedTemplate.id;
    setDraft((current) => ({
      ...current,
      summary: current.summary || selectedTemplate.taskDefaults?.goal || '',
      finalDeliverable: current.finalDeliverable || selectedTemplate.taskDefaults?.acceptanceCriteria?.[0] || '',
      steps: selectedTemplate.steps.map((step, index) => ({
        ...step,
        id: `template-${index}-${Math.random().toString(36).slice(2, 8)}`,
      })),
    }));
  }, [draft.templateId, selectedTemplate]);

  const stepsValid = draft.steps.every((step) =>
    step.title.trim()
    && step.assignedAgentId?.trim()
    && step.goal.trim()
    && step.doneCondition.trim()
    && hasMeaningfulMultilineContent(step.inputs)
    && hasMeaningfulMultilineContent(step.requiredOutputs)
    && hasMeaningfulMultilineContent(step.boundaries)
  );

  const canAdvance =
    (wizardStep === 1 && isTaskIntakeValid({ title: draft.title, summary: draft.summary }))
    || wizardStep === 2
    || (wizardStep === 3 && stepsValid)
    || wizardStep === 4;

  async function submit() {
    setSaving(true);
    setError(null);
    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: draft.title,
          goal: draft.summary,
          priority: draft.priority,
          project: draft.project || null,
          initiatedBy: draft.initiatedBy,
          acceptanceCriteria: toAcceptanceCriteria(draft.finalDeliverable),
          templateId: draft.templateId || undefined,
          steps: draft.steps.map((draftStep) => {
            const { id, ...step } = draftStep;
            void id;
            return {
              ...step,
              inputs: normalizeMultilineItems(step.inputs),
              requiredOutputs: normalizeMultilineItems(step.requiredOutputs),
              boundaries: normalizeMultilineItems(step.boundaries),
            };
          }),
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || 'Failed to create task');
      }
      onCreated(payload);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create task');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-stretch justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="h-[100dvh] w-full max-w-6xl overflow-y-auto rounded-none border border-[#222] bg-[#050505] shadow-2xl sm:max-h-[92vh] sm:h-auto sm:rounded-[2rem]">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#181818] bg-[#050505]/95 px-4 py-4 backdrop-blur-sm sm:px-6 sm:py-5">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400">Wizard-First Task Authoring</p>
            <h2 className="text-xl font-black text-white">Create Task + Saved Execution Plan</h2>
          </div>
          <button onClick={onClose} className="rounded-xl p-2 text-slate-500 transition-colors hover:bg-white/5 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="border-b border-[#181818] px-4 py-4 sm:px-6">
          <div className="grid gap-3 md:grid-cols-4">
            {[
              { step: 1, title: 'Task Intake' },
              { step: 2, title: 'Starting Point' },
              { step: 3, title: 'Execution Flow' },
              { step: 4, title: 'Review' },
            ].map((item) => (
              <button
                key={item.step}
                onClick={() => setWizardStep(item.step as WizardStep)}
                className={cn(
                  'rounded-2xl border px-4 py-3 text-left transition-colors',
                  wizardStep === item.step ? 'border-blue-500/40 bg-blue-500/10' : 'border-[#222] bg-[#09090b]',
                )}
              >
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Phase {item.step}</p>
                <p className="mt-1 text-sm font-bold text-white">{item.title}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="px-4 py-5 sm:px-6 sm:py-6">
          {wizardStep === 1 && (
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-1 md:col-span-2">
                <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Task Title</span>
                <input
                  value={draft.title}
                  onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
                  className="w-full rounded-xl border border-[#252525] bg-black px-3 py-2 text-sm text-white outline-none focus:border-blue-500/50"
                />
              </label>
              <label className="space-y-1 md:col-span-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Summary</span>
                  <span className="text-[10px] text-slate-500">Keep this high-level. Details belong in the steps.</span>
                </div>
                <textarea
                  value={draft.summary}
                  onChange={(event) => setDraft((current) => ({ ...current, summary: event.target.value }))}
                  rows={3}
                  className="w-full rounded-xl border border-[#252525] bg-black px-3 py-2 text-sm text-white outline-none focus:border-blue-500/50"
                />
              </label>
              <label className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Priority</span>
                <select
                  value={draft.priority}
                  onChange={(event) => setDraft((current) => ({ ...current, priority: event.target.value as Priority }))}
                  className="w-full rounded-xl border border-[#252525] bg-black px-3 py-2 text-sm text-white outline-none focus:border-blue-500/50"
                >
                  <option value="urgent">Urgent</option>
                  <option value="high">High</option>
                  <option value="normal">Normal</option>
                  <option value="low">Low</option>
                </select>
              </label>
              <label className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Project</span>
                <select
                  value={draft.project}
                  onChange={(event) => setDraft((current) => ({ ...current, project: event.target.value }))}
                  className="w-full rounded-xl border border-[#252525] bg-black px-3 py-2 text-sm text-white outline-none focus:border-blue-500/50"
                >
                  <option value="">General</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>{project.name}</option>
                  ))}
                </select>
              </label>
              <label className="space-y-1 md:col-span-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Final Deliverable</span>
                  <span className="text-[10px] text-slate-500">Optional. Use this for the end artifact only.</span>
                </div>
                <textarea
                  value={draft.finalDeliverable}
                  onChange={(event) => setDraft((current) => ({ ...current, finalDeliverable: event.target.value }))}
                  rows={2}
                  className="w-full rounded-xl border border-[#252525] bg-black px-3 py-2 text-sm text-white outline-none focus:border-blue-500/50"
                />
              </label>
              <div className="rounded-[1.5rem] border border-[#202020] bg-[#09090b] p-4 md:col-span-2">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-400">Example</p>
                <p className="mt-2 text-sm font-bold text-white">YouTube transcript to Markdown summary</p>
                <div className="mt-3 space-y-2 text-sm text-slate-400">
                  <p><span className="font-semibold text-slate-200">Title:</span> Summarize a YouTube video to Markdown</p>
                  <p><span className="font-semibold text-slate-200">Summary:</span> Create a Markdown summary from a YouTube video transcript.</p>
                  <p><span className="font-semibold text-slate-200">Final Deliverable:</span> Markdown summary file saved on the local filesystem.</p>
                </div>
                <p className="mt-3 text-xs text-slate-500">Put the YouTube URL and transcript-specific instructions in the relevant step, not here.</p>
              </div>
            </div>
          )}

          {wizardStep === 2 && (
            <div className="space-y-5">
              <div className="rounded-[1.5rem] border border-[#1f1f1f] bg-[#09090b] p-5">
                <div className="flex items-center gap-3">
                  <Wand2 className="h-5 w-5 text-blue-400" />
                  <div>
                    <p className="text-sm font-bold text-white">Choose a starting point</p>
                    <p className="text-xs text-slate-500">Use blank mode or preload a saved template, then continue editing the steps.</p>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <button
                  onClick={() => setDraft((current) => ({ ...current, templateId: '', steps: current.steps.length ? current.steps : [emptyStep(1)] }))}
                  className={cn(
                    'rounded-[1.5rem] border p-5 text-left transition-colors',
                    !draft.templateId ? 'border-blue-500/40 bg-blue-500/10' : 'border-[#222] bg-[#09090b]',
                  )}
                >
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Option A</p>
                  <p className="mt-1 text-sm font-bold text-white">Blank Task Plan</p>
                  <p className="mt-2 text-xs text-slate-500">Start from scratch and define the execution flow manually.</p>
                </button>

                <div className="rounded-[1.5rem] border border-[#222] bg-[#09090b] p-5">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Option B</p>
                  <p className="mt-1 text-sm font-bold text-white">Saved Template</p>
                  <select
                    value={draft.templateId}
                    onChange={(event) => setDraft((current) => ({ ...current, templateId: event.target.value }))}
                    className="mt-3 w-full rounded-xl border border-[#252525] bg-black px-3 py-2 text-sm text-white outline-none focus:border-blue-500/50"
                  >
                    <option value="">Select template</option>
                    {templates.map((template) => (
                      <option key={template.id} value={template.id}>{template.name}</option>
                    ))}
                  </select>
                  {selectedTemplate && (
                    <p className="mt-3 text-xs text-slate-500">
                      {selectedTemplate.steps.length} step{selectedTemplate.steps.length === 1 ? '' : 's'} will preload into the wizard.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {wizardStep === 3 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-white">Define the exact work packet each agent receives.</p>
                  <p className="text-xs text-slate-500">Put source URLs, files, and detailed instructions here. Each step must declare inputs, outputs, done condition, and explicit scope boundaries.</p>
                </div>
                <button
                  onClick={() => setDraft((current) => ({ ...current, steps: [...current.steps, emptyStep(current.steps.length + 1)] }))}
                  className="rounded-xl border border-blue-500/30 bg-blue-500/10 px-3 py-2 text-xs font-bold uppercase tracking-[0.18em] text-blue-300 transition-colors hover:bg-blue-500/20"
                >
                  Add Stage
                </button>
              </div>

              <div className="space-y-4">
                {draft.steps.map((step, index) => (
                  <StepDesigner
                    key={step.id}
                    step={step}
                    index={index}
                    agents={agents}
                    onChange={(next) => {
                      setDraft((current) => ({
                        ...current,
                        steps: current.steps.map((candidate) => candidate.id === step.id ? next : candidate),
                      }));
                    }}
                    onRemove={() => {
                      setDraft((current) => ({
                        ...current,
                        steps: current.steps.length === 1 ? [emptyStep(1)] : current.steps.filter((candidate) => candidate.id !== step.id),
                      }));
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {wizardStep === 4 && (
            <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="rounded-[1.75rem] border border-[#222] bg-[#09090b] p-6">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Task Summary</p>
                <h3 className="mt-2 text-2xl font-black text-white">{draft.title}</h3>
                <p className="mt-2 text-sm text-slate-400">{draft.summary}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className={cn('rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em]', PRIORITY_STYLES[draft.priority])}>
                    {draft.priority}
                  </span>
                  {draft.project && (
                    <span className="rounded-full border border-[#333] bg-black px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-300">
                      {projects.find((project) => project.id === draft.project)?.name || draft.project}
                    </span>
                  )}
                </div>
                <div className="mt-6">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Final Deliverable</p>
                  <p className="mt-3 text-sm text-slate-300">{draft.finalDeliverable || 'Not specified'}</p>
                </div>
              </div>

              <div className="rounded-[1.75rem] border border-[#222] bg-[#09090b] p-6">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Planned Execution Flow</p>
                <div className="mt-4 space-y-3">
                  {draft.steps.map((step, index) => (
                    <div key={step.id} className="rounded-xl border border-[#202020] bg-black/80 p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Stage {index + 1}</p>
                          <p className="text-sm font-bold text-white">{step.title || 'Untitled step'}</p>
                        </div>
                        <span className="rounded-full border border-[#333] bg-[#111] px-2 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-300">
                          {step.role ? STAGE_BY_ROLE[step.role] : 'Unassigned stage'}
                        </span>
                      </div>
                      <p className="mt-2 text-xs text-slate-500">{step.goal || 'Missing goal'}</p>
                      <p className="mt-2 text-[11px] text-slate-400">{step.assignedAgentName || 'Unassigned agent'}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="mt-6 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}
        </div>

        <div className="sticky bottom-0 flex items-center justify-between border-t border-[#181818] bg-[#050505]/95 px-4 py-4 backdrop-blur-sm sm:px-6">
          <button
            onClick={() => setWizardStep((current) => Math.max(1, current - 1) as WizardStep)}
            className="rounded-xl border border-[#222] bg-[#09090b] px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-300"
          >
            Back
          </button>

          <div className="flex items-center gap-3">
            {wizardStep < 4 ? (
              <button
                onClick={() => canAdvance && setWizardStep((current) => Math.min(4, current + 1) as WizardStep)}
                disabled={!canAdvance}
                className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                Continue
              </button>
            ) : (
              <button
                onClick={submit}
                disabled={saving || !stepsValid}
                className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                {saving ? 'Creating...' : 'Create Task'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function TemplateManager({
  templates,
  agents,
  onClose,
  onChanged,
  setRefreshPaused,
}: {
  templates: TaskTemplate[];
  agents: Agent[];
  onClose: () => void;
  onChanged: (templateId?: string) => Promise<void>;
  setRefreshPaused: (paused: boolean) => void;
}) {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(templates[0]?.id || null);
  const [draft, setDraft] = useState<TemplateEditorDraft>(
    templates[0] ? templateToDraft(templates[0]) : emptyTemplateDraft(),
  );
  const [mobileView, setMobileView] = useState<'library' | 'editor'>(templates[0] ? 'library' : 'editor');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedTemplate = templates.find((template) => template.id === selectedTemplateId) || null;

  useEffect(() => {
    setRefreshPaused(true);
    return () => setRefreshPaused(false);
  }, [setRefreshPaused]);

  useEffect(() => {
    if (!selectedTemplateId) {
      setDraft(emptyTemplateDraft());
      return;
    }
    if (!selectedTemplate) {
      return;
    }
    setDraft(templateToDraft(selectedTemplate));
  }, [selectedTemplate, selectedTemplateId]);

  const stepsValid = draft.steps.every((step) =>
    step.title.trim()
    && step.assignedAgentId?.trim()
    && step.goal.trim()
    && step.doneCondition.trim()
    && hasMeaningfulMultilineContent(step.inputs)
    && hasMeaningfulMultilineContent(step.requiredOutputs)
    && hasMeaningfulMultilineContent(step.boundaries)
  );

  const canSave = draft.name.trim() && stepsValid;

  function templatePayload(name = draft.name) {
    return {
      name,
      description: draft.description.trim() || undefined,
      taskDefaults: {
        goal: draft.summaryDefault.trim() || undefined,
        acceptanceCriteria: toAcceptanceCriteria(draft.finalDeliverableDefault),
      },
      steps: draft.steps.map((step) => {
        const { id, ...packet } = step;
        void id;
        return {
          ...packet,
          inputs: normalizeMultilineItems(step.inputs),
          requiredOutputs: normalizeMultilineItems(step.requiredOutputs),
          boundaries: normalizeMultilineItems(step.boundaries),
        };
      }),
    };
  }

  async function runAction(key: string, action: () => Promise<void>) {
    setActionLoading(key);
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Template action failed');
    } finally {
      setActionLoading(null);
    }
  }

  async function saveTemplate() {
    const response = await fetch(draft.isNew ? '/api/task-templates' : `/api/task-templates/${draft.id}`, {
      method: draft.isNew ? 'POST' : 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(templatePayload()),
    });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || 'Failed to save template');
    }
    setSelectedTemplateId(payload.id);
    setDraft(templateToDraft(payload));
    await onChanged(payload.id);
  }

  async function duplicateTemplate() {
    const duplicateName = draft.name.trim() ? `${draft.name.trim()} Copy` : 'Template Copy';
    const response = await fetch('/api/task-templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(templatePayload(duplicateName)),
    });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || 'Failed to duplicate template');
    }
    setSelectedTemplateId(payload.id);
    setDraft(templateToDraft(payload));
    await onChanged(payload.id);
  }

  async function deleteTemplate() {
    if (!draft.id) {
      setDraft(emptyTemplateDraft());
      setSelectedTemplateId(null);
      return;
    }
    if (!window.confirm(`Delete template "${draft.name}"?`)) {
      return;
    }
    const response = await fetch(`/api/task-templates/${draft.id}`, {
      method: 'DELETE',
    });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || 'Failed to delete template');
    }
    const nextSelection = templates.find((template) => template.id !== draft.id)?.id || null;
    setSelectedTemplateId(nextSelection);
    if (!nextSelection) {
      setDraft(emptyTemplateDraft());
    }
    await onChanged(nextSelection || undefined);
  }

  const templateLibrary = (
    <div className="space-y-4">
      <button
        onClick={() => {
          setSelectedTemplateId(null);
          setDraft(emptyTemplateDraft());
          setMobileView('editor');
        }}
        className="w-full rounded-2xl border border-blue-500/30 bg-blue-500/10 px-4 py-3 text-left text-xs font-black uppercase tracking-[0.18em] text-blue-200"
      >
        <Plus className="mr-2 inline h-4 w-4" />
        New Blank Template
      </button>

      <div className="space-y-3">
        {templates.map((template) => (
          <button
            key={template.id}
            onClick={() => {
              setSelectedTemplateId(template.id);
              setMobileView('editor');
            }}
            className={cn(
              'w-full rounded-2xl border p-4 text-left transition-colors',
              selectedTemplateId === template.id ? 'border-amber-500/40 bg-amber-500/10' : 'border-[#222] bg-[#09090b]',
            )}
          >
            <p className="text-sm font-bold text-white">{template.name}</p>
            <p className="mt-2 line-clamp-2 text-xs text-slate-500">{template.description || 'No description'}</p>
            <div className="mt-3 flex items-center justify-between text-[10px] uppercase tracking-[0.18em] text-slate-500">
              <span>{template.steps.length} stage{template.steps.length === 1 ? '' : 's'}</span>
              <span>{timeAgo(template.updatedAt)}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );

  const templateEditor = (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Template Name</span>
          <input
            value={draft.name}
            onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
            className="w-full rounded-xl border border-[#252525] bg-black px-3 py-2 text-sm text-white outline-none focus:border-amber-500/50"
          />
        </label>
        <label className="space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Description</span>
          <input
            value={draft.description}
            onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))}
            className="w-full rounded-xl border border-[#252525] bg-black px-3 py-2 text-sm text-white outline-none focus:border-amber-500/50"
          />
        </label>
        <label className="space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Default Summary</span>
          <textarea
            value={draft.summaryDefault}
            onChange={(event) => setDraft((current) => ({ ...current, summaryDefault: event.target.value }))}
            rows={3}
            className="w-full rounded-xl border border-[#252525] bg-black px-3 py-2 text-sm text-white outline-none focus:border-amber-500/50"
          />
        </label>
        <label className="space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Default Final Deliverable</span>
          <textarea
            value={draft.finalDeliverableDefault}
            onChange={(event) => setDraft((current) => ({ ...current, finalDeliverableDefault: event.target.value }))}
            rows={3}
            className="w-full rounded-xl border border-[#252525] bg-black px-3 py-2 text-sm text-white outline-none focus:border-amber-500/50"
          />
        </label>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-bold text-white">Template Execution Flow</p>
          <p className="text-xs text-slate-500">Templates use the same stage packet rules as tasks. Duplicate, tweak, and save without rewriting the full structure.</p>
        </div>
        <button
          onClick={() => setDraft((current) => ({ ...current, steps: [...current.steps, emptyStep(current.steps.length + 1)] }))}
          className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs font-bold uppercase tracking-[0.18em] text-amber-300"
        >
          Add Stage
        </button>
      </div>

      <div className="space-y-4">
        {draft.steps.map((step, index) => (
          <StepDesigner
            key={step.id}
            step={step}
            index={index}
            agents={agents}
            onChange={(next) => setDraft((current) => ({
              ...current,
              steps: current.steps.map((candidate) => candidate.id === step.id ? next : candidate),
            }))}
            onRemove={() => setDraft((current) => ({
              ...current,
              steps: current.steps.length === 1 ? [emptyStep(1)] : current.steps.filter((candidate) => candidate.id !== step.id),
            }))}
          />
        ))}
      </div>

      {error && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[1.5rem] border border-[#222] bg-[#09090b] p-4">
        <div className="text-xs text-slate-500">
          {draft.isNew ? 'New template' : `Editing ${draft.id}`}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => runAction('duplicate-template', duplicateTemplate)}
            disabled={!canSave || actionLoading !== null}
            className="rounded-xl border border-[#2a2a2a] bg-black px-3 py-2 text-xs font-black uppercase tracking-[0.18em] text-slate-300 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Duplicate
          </button>
          <button
            onClick={() => runAction('delete-template', deleteTemplate)}
            disabled={actionLoading !== null}
            className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-black uppercase tracking-[0.18em] text-red-300 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {draft.isNew ? 'Clear' : 'Delete'}
          </button>
          <button
            onClick={() => runAction('save-template', saveTemplate)}
            disabled={!canSave || actionLoading !== null}
            className="rounded-xl bg-amber-500 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-black disabled:cursor-not-allowed disabled:opacity-40"
          >
            {actionLoading === 'save-template' ? 'Saving...' : draft.isNew ? 'Create Template' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[90] flex items-stretch justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="h-[100dvh] w-full max-w-7xl overflow-y-auto rounded-none border border-[#222] bg-[#050505] shadow-2xl sm:max-h-[92vh] sm:h-auto sm:rounded-[2rem]">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#181818] bg-[#050505]/95 px-4 py-4 backdrop-blur-sm sm:px-6 sm:py-5">
          <div className="flex min-w-0 items-center gap-3">
            <button
              onClick={() => setMobileView('library')}
              className={cn(
                'rounded-xl border border-[#2a2a2a] bg-black px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-300 lg:hidden',
                mobileView === 'library' && 'invisible pointer-events-none'
              )}
            >
              Back
            </button>
            <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-400">Saved Templates</p>
            <h2 className="text-xl font-black text-white">Manage Template Library</h2>
            </div>
          </div>
          <button onClick={onClose} className="rounded-xl p-2 text-slate-500 transition-colors hover:bg-white/5 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-4 py-5 sm:px-6 sm:py-6">
          <div className={cn('lg:hidden', mobileView === 'library' ? 'block' : 'hidden')}>
            {templateLibrary}
          </div>
          <div className={cn('lg:hidden', mobileView === 'editor' ? 'block' : 'hidden')}>
            {templateEditor}
          </div>

          <div className="hidden gap-6 lg:grid lg:grid-cols-[320px_minmax(0,1fr)]">
            {templateLibrary}
            {templateEditor}
          </div>
        </div>
      </div>
    </div>
  );
}

function TaskDetail({
  data,
  agents,
  onClose,
  onDeleted,
  onRefresh,
  setRefreshPaused,
}: {
  data: TaskDetailData;
  agents: Agent[];
  onClose: () => void;
  onDeleted: () => Promise<void>;
  onRefresh: () => Promise<void>;
  setRefreshPaused: (paused: boolean) => void;
}) {
  const task = data.task;
  const [comment, setComment] = useState('');
  const [progressNote, setProgressNote] = useState('');
  const [completion, setCompletion] = useState({
    summary: '',
    outputsProduced: '',
    validationResult: '',
    issues: '',
    nextStepRecommendation: '',
  });
  const [templateName, setTemplateName] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState(false);
  const [taskDraft, setTaskDraft] = useState({
    title: '',
    summary: '',
    priority: 'normal' as Priority,
    project: '',
    finalDeliverable: '',
  });
  const [editingStepId, setEditingStepId] = useState<string | null>(null);
  const [editingStepDraft, setEditingStepDraft] = useState<EditableStepDraft | null>(null);
  const [issueDraft, setIssueDraft] = useState({
    title: '',
    summary: '',
    assignedTo: 'human' as 'human' | 'orchestrator',
  });
  const [issueReplyDrafts, setIssueReplyDrafts] = useState<Record<string, string>>({});
  const [replyTargetByIssue, setReplyTargetByIssue] = useState<Record<string, string | null>>({});
  const lastTaskIdRef = useRef<string | null>(null);
  const finalDeliverable = task?.acceptanceCriteria[0] || '';
  const hasIssueDraft = Boolean(issueDraft.title.trim() || issueDraft.summary.trim());
  const hasReplyDraft = Object.values(issueReplyDrafts).some((value) => value.trim().length > 0);
  const hasReplyTarget = Object.values(replyTargetByIssue).some(Boolean);
  const hasLocalDrafts =
    editingTask
    || Boolean(editingStepId)
    || hasIssueDraft
    || hasReplyDraft
    || hasReplyTarget;

  useEffect(() => {
    setRefreshPaused(hasLocalDrafts);
    return () => setRefreshPaused(false);
  }, [hasLocalDrafts, setRefreshPaused]);

  useEffect(() => {
    if (!task) {
      return;
    }
    const taskChanged = lastTaskIdRef.current !== task.id;
    lastTaskIdRef.current = task.id;

    if (!taskChanged && hasLocalDrafts) {
      return;
    }

    setActionError(null);
    setEditingTask(false);
    setEditingStepId(null);
    setEditingStepDraft(null);
    setIssueDraft({ title: '', summary: '', assignedTo: 'human' });
    setIssueReplyDrafts({});
    setReplyTargetByIssue({});
    setTaskDraft({
      title: task.title,
      summary: task.goal || '',
      priority: task.priority,
      project: task.project || '',
      finalDeliverable,
    });
  }, [task, finalDeliverable, hasLocalDrafts]);

  if (!task) {
    return null;
  }

  const taskId = task.id;
  const taskTitle = task.title;
  const run = task.currentRun;
  const step = currentStep(task);
  const stagePrimaryAction = getStagePrimaryAction(step?.status);
  const stageList = (run?.steps || task.stagePlan || []) as Array<RunStep | TaskStagePlan>;

  async function runAction(label: string, action: () => Promise<void>, options?: { refresh?: boolean }) {
    setActionLoading(label);
    setActionError(null);
    try {
      await action();
      if (options?.refresh !== false) {
        await onRefresh();
      }
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Task action failed');
    } finally {
      setActionLoading(null);
    }
  }

  async function parseApiResponse(response: Response, fallback: string) {
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(payload?.error || fallback);
    }
    return payload;
  }

  async function postComment() {
    if (!comment.trim()) return;
    const response = await fetch(`/api/tasks/${taskId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: comment,
        author: 'matt',
        authorType: 'user',
        runId: run?.id,
        stepId: step?.id,
      }),
    });
    await parseApiResponse(response, 'Failed to post comment');
    setComment('');
  }

  async function createIssue() {
    if (!issueDraft.title.trim() || !issueDraft.summary.trim()) {
      return;
    }

    const response = await fetch(`/api/tasks/${taskId}/issues`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: issueDraft.title,
        summary: issueDraft.summary,
        assignedTo: issueDraft.assignedTo,
        createdBy: 'max',
        runId: run?.id,
        stepId: step?.id,
      }),
    });
    await parseApiResponse(response, 'Failed to create issue');
    setIssueDraft({ title: '', summary: '', assignedTo: 'human' });
  }

  async function postIssueReply(issueId: string, parentId?: string) {
    const content = issueReplyDrafts[issueId]?.trim();
    if (!content) {
      return;
    }

    const response = await fetch(`/api/tasks/${taskId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content,
        author: 'matt',
        authorType: 'user',
        commentType: 'note',
        runId: run?.id,
        stepId: step?.id,
        issueId,
        parentId,
      }),
    });
    await parseApiResponse(response, 'Failed to post issue reply');
    setIssueReplyDrafts((current) => ({ ...current, [issueId]: '' }));
    setReplyTargetByIssue((current) => ({ ...current, [issueId]: null }));
  }

  async function updateIssue(issueId: string, patch: { status?: TaskIssue['status']; assignedTo?: TaskIssue['assignedTo']; resolution?: string | null }) {
    const response = await fetch(`/api/tasks/${taskId}/issues/${issueId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        actor: 'max',
        ...patch,
      }),
    });
    await parseApiResponse(response, 'Failed to update issue');
  }

  async function startTask() {
    const response = await fetch(`/api/tasks/${taskId}/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        actor: 'max',
        reason: 'Execution started from task detail',
      }),
    });
    await parseApiResponse(response, 'Failed to start task');
  }

  async function saveTemplate() {
    if (!run || !templateName.trim()) return;
    await fetch('/api/task-templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        runId: run.id,
        name: templateName,
        actor: 'max',
      }),
    });
    setTemplateName('');
  }

  async function saveTaskEdits() {
    const response = await fetch(`/api/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        actor: 'max',
        title: taskDraft.title,
        goal: taskDraft.summary,
        priority: taskDraft.priority,
        project: taskDraft.project || null,
        acceptanceCriteria: toAcceptanceCriteria(taskDraft.finalDeliverable),
      }),
    });
    await parseApiResponse(response, 'Failed to save task');
    setEditingTask(false);
  }

  async function saveStepEdits() {
    if (!editingStepId || !editingStepDraft) {
      return;
    }

    const response = await fetch(`/api/tasks/${taskId}/steps/${editingStepId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        actor: 'max',
        title: editingStepDraft.title,
        role: editingStepDraft.role,
        assignedAgentId: editingStepDraft.assignedAgentId,
        assignedAgentName: editingStepDraft.assignedAgentName,
        goal: editingStepDraft.goal,
        inputs: normalizeMultilineItems(editingStepDraft.inputs),
        requiredOutputs: normalizeMultilineItems(editingStepDraft.requiredOutputs),
        doneCondition: editingStepDraft.doneCondition,
        boundaries: normalizeMultilineItems(editingStepDraft.boundaries),
        dependencies: editingStepDraft.dependencies,
        notesForMax: editingStepDraft.notesForMax,
      }),
    });
    await parseApiResponse(response, 'Failed to save step');
    setEditingStepId(null);
    setEditingStepDraft(null);
  }

  async function deleteTaskRecord() {
    const confirmed = window.confirm(`Delete "${taskTitle}" and all of its runs, steps, notes, events, and evidence?`);
    if (!confirmed) {
      return;
    }

    const response = await fetch(`/api/tasks/${taskId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
    });
    await parseApiResponse(response, 'Failed to delete task');
    await onDeleted();
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-stretch justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="h-[100dvh] w-full max-w-[min(1700px,96vw)] overflow-y-auto rounded-none border border-[#222] bg-[#050505] p-4 shadow-2xl sm:h-[calc(100vh-2rem)] sm:rounded-[2rem] sm:p-6">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">{task.status}</p>
            <h2 className="mt-2 text-3xl font-black text-white">{task.title}</h2>
            <p className="mt-2 text-sm text-slate-400">{task.goal}</p>
            {(step || plannedStage(task)) && (
              <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.18em] text-blue-300">
                Current Stage: {STAGE_BY_ROLE[(step || plannedStage(task))!.role]}{!step ? ' (Planned)' : ''}
              </p>
            )}
          </div>
          <button onClick={onClose} className="rounded-xl p-2 text-slate-500 transition-colors hover:bg-white/5 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        {actionError && (
          <div className="mb-6 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {actionError}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-6">
            <section className="rounded-[1.75rem] border border-[#222] bg-[#09090b] p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={cn('rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em]', PRIORITY_STYLES[task.priority])}>
                    {task.priority}
                  </span>
                  {task.project && (
                    <span className="rounded-full border border-[#333] bg-black px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-300">
                      {task.project}
                    </span>
                  )}
                  {step && statusPill(step.status)}
                </div>
                <button
                  onClick={() => {
                    setEditingTask((current) => !current);
                    setActionError(null);
                    setTaskDraft({
                      title: task.title,
                      summary: task.goal || '',
                      priority: task.priority,
                      project: task.project || '',
                      finalDeliverable,
                    });
                  }}
                  className="rounded-xl border border-[#333] bg-black px-3 py-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-300"
                >
                  {editingTask ? 'Close Editor' : 'Edit Task'}
                </button>
                <button
                  onClick={() => runAction('delete-task', deleteTaskRecord, { refresh: false })}
                  className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-bold uppercase tracking-[0.18em] text-red-300"
                >
                  {actionLoading === 'delete-task' ? 'Deleting...' : 'Delete Task'}
                </button>
              </div>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <div>
                  {editingTask ? (
                    <div className="grid gap-4">
                      <label className="space-y-1">
                        <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Title</span>
                        <input
                          value={taskDraft.title}
                          onChange={(event) => setTaskDraft((current) => ({ ...current, title: event.target.value }))}
                          className="w-full rounded-xl border border-[#252525] bg-black px-3 py-2 text-sm text-white outline-none focus:border-blue-500/50"
                        />
                      </label>
                      <label className="space-y-1">
                        <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Summary</span>
                        <textarea
                          value={taskDraft.summary}
                          onChange={(event) => setTaskDraft((current) => ({ ...current, summary: event.target.value }))}
                          rows={3}
                          className="w-full rounded-xl border border-[#252525] bg-black px-3 py-2 text-sm text-white outline-none focus:border-blue-500/50"
                        />
                      </label>
                      <div className="grid gap-4 md:grid-cols-2">
                        <label className="space-y-1">
                          <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Priority</span>
                          <select
                            value={taskDraft.priority}
                            onChange={(event) => setTaskDraft((current) => ({ ...current, priority: event.target.value as Priority }))}
                            className="w-full rounded-xl border border-[#252525] bg-black px-3 py-2 text-sm text-white outline-none focus:border-blue-500/50"
                          >
                            {(['urgent', 'high', 'normal', 'low'] as Priority[]).map((value) => (
                              <option key={value} value={value}>{value}</option>
                            ))}
                          </select>
                        </label>
                        <label className="space-y-1">
                          <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Project</span>
                          <input
                            value={taskDraft.project}
                            onChange={(event) => setTaskDraft((current) => ({ ...current, project: event.target.value }))}
                            className="w-full rounded-xl border border-[#252525] bg-black px-3 py-2 text-sm text-white outline-none focus:border-blue-500/50"
                          />
                        </label>
                      </div>
                      <label className="space-y-1">
                        <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Final Deliverable</span>
                        <input
                          value={taskDraft.finalDeliverable}
                          onChange={(event) => setTaskDraft((current) => ({ ...current, finalDeliverable: event.target.value }))}
                          className="w-full rounded-xl border border-[#252525] bg-black px-3 py-2 text-sm text-white outline-none focus:border-blue-500/50"
                        />
                      </label>
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => runAction('save-task', saveTaskEdits)}
                          className="rounded-xl bg-white px-3 py-2 text-xs font-black uppercase tracking-[0.18em] text-black disabled:opacity-40"
                          disabled={!isTaskIntakeValid({ title: taskDraft.title, summary: taskDraft.summary })}
                        >
                          {actionLoading === 'save-task' ? 'Saving...' : 'Save Task'}
                        </button>
                        <button
                          onClick={() => {
                            setEditingTask(false);
                            setActionError(null);
                          }}
                          className="rounded-xl border border-[#333] bg-black px-3 py-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-300"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">{task.acceptanceCriteria.length > 1 ? 'Final Deliverables' : 'Final Deliverable'}</p>
                      {task.acceptanceCriteria.length > 0 ? (
                        <ul className="mt-2 space-y-2">
                          {task.acceptanceCriteria.map((criterion) => (
                            <li key={criterion} className="flex items-start gap-2 text-sm text-slate-300">
                              <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-400" />
                              <span>{criterion}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-2 text-sm text-slate-500">No final deliverable recorded yet.</p>
                      )}
                    </>
                  )}
                </div>
                <div className="rounded-2xl border border-[#202020] bg-black/70 p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">{run ? 'Current Run' : 'Execution Status'}</p>
                  {run ? (
                    <>
                      <p className="mt-2 text-sm font-bold text-white">Run #{run.runNumber}</p>
                      <p className="mt-1 text-xs text-slate-500">Created {formatDate(run.createdAt)}</p>
                      <p className="mt-1 text-xs text-slate-500">Current stage heartbeat {timeAgo(step?.heartbeatAt)}</p>
                      <p className="mt-1 text-xs text-slate-500">Assigned agent {step?.assignedAgentName || step?.assignedAgentId || 'unassigned'}</p>
                    </>
                  ) : (
                    <>
                      <p className="mt-2 text-sm font-bold text-white">Not started yet</p>
                      <p className="mt-1 text-xs text-slate-500">{task.stagePlan?.length || 0} planned stage{(task.stagePlan?.length || 0) === 1 ? '' : 's'} saved on this task.</p>
                      <p className="mt-1 text-xs text-slate-500">Execution will begin only when Max explicitly starts the task.</p>
                    </>
                  )}
                  {step?.blockReason && (
                    <div className="mt-3 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-300">
                      {step.blockReason}
                    </div>
                  )}
                </div>
              </div>
            </section>

            <section className="rounded-[1.75rem] border border-[#222] bg-[#09090b] p-5">
              <div className="mb-4 flex items-center gap-3">
                <GitBranch className="h-5 w-5 text-blue-400" />
                <div>
                  <p className="text-sm font-bold text-white">Execution Flow</p>
                  <p className="text-xs text-slate-500">
                    {run
                      ? 'Each stage remains isolated until Max validates the structured handoff.'
                      : 'This is the saved execution plan. It can be edited until the task is started.'}
                  </p>
                </div>
              </div>
              <div className="space-y-3">
                {stageList.map((candidate) => (
                  <div key={candidate.id} className={cn(
                    'rounded-2xl border p-4',
                    isRunStep(candidate) && candidate.id === step?.id ? 'border-blue-500/30 bg-blue-500/10' : 'border-[#202020] bg-black/70',
                  )}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Stage {candidate.stepNumber}</p>
                        <p className="text-sm font-bold text-white">{candidate.title}</p>
                        <p className="mt-1 text-xs text-slate-500">{candidate.goal}</p>
                        <p className="mt-2 text-[11px] text-slate-400">{candidate.assignedAgentName || candidate.assignedAgentId || 'Unassigned'}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {(!isRunStep(candidate) || canEditStep(candidate.status)) && (
                          <button
                            onClick={() => {
                              setEditingStepId(candidate.id);
                              setEditingStepDraft({
                                id: candidate.id,
                                title: candidate.title,
                                role: candidate.role,
                                assignedAgentId: candidate.assignedAgentId || '',
                                assignedAgentName: candidate.assignedAgentName || '',
                                goal: candidate.goal,
                                inputs: [...candidate.inputs],
                                requiredOutputs: [...candidate.requiredOutputs],
                                doneCondition: candidate.doneCondition,
                                boundaries: [...candidate.boundaries],
                                dependencies: [...candidate.dependencies],
                                notesForMax: candidate.notesForMax || '',
                              });
                              setActionError(null);
                            }}
                            className="rounded-xl border border-[#333] bg-black px-3 py-2 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-300"
                          >
                            Edit Stage
                          </button>
                        )}
                        {isRunStep(candidate)
                          ? statusPill(candidate.status)
                          : <span className="rounded-full border border-[#333] bg-[#111] px-2 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-300">planned</span>}
                      </div>
                    </div>
                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Required Outputs</p>
                        <ul className="mt-2 space-y-1 text-xs text-slate-300">
                          {candidate.requiredOutputs.map((output) => (
                            <li key={output}>- {output}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Do Not Do</p>
                        <ul className="mt-2 space-y-1 text-xs text-slate-300">
                          {candidate.boundaries.map((boundary) => (
                            <li key={boundary}>- {boundary}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                    {editingStepId === candidate.id && editingStepDraft && (
                      <div className="mt-4 space-y-4 rounded-2xl border border-blue-500/20 bg-blue-500/5 p-4">
                        <StepDesigner
                          step={editingStepDraft}
                          index={candidate.stepNumber - 1}
                          agents={agents}
                          onChange={setEditingStepDraft}
                          onRemove={() => undefined}
                          canRemove={false}
                        />
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => runAction('save-step', saveStepEdits)}
                            className="rounded-xl bg-white px-3 py-2 text-xs font-black uppercase tracking-[0.18em] text-black"
                          >
                            {actionLoading === 'save-step' ? 'Saving...' : 'Save Step'}
                          </button>
                          <button
                            onClick={() => {
                              setEditingStepId(null);
                              setEditingStepDraft(null);
                              setActionError(null);
                            }}
                            className="rounded-xl border border-[#333] bg-black px-3 py-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-300"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-[1.75rem] border border-[#222] bg-[#09090b] p-5">
              <div className="mb-4 flex items-center gap-3">
                <Sparkles className="h-5 w-5 text-amber-400" />
                <div>
                  <p className="text-sm font-bold text-white">Execution Controls</p>
                  <p className="text-xs text-slate-500">
                    {getMaxControlsCopy(Boolean(run))}
                  </p>
                </div>
              </div>

              {!run ? (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-[#202020] bg-black/70 p-4">
                    <p className="text-sm text-slate-300">No run has been created yet. Starting the task will instantiate the saved execution flow into the first run and move the task into active work.</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => runAction('start-task', startTask)}
                      className="rounded-xl border border-blue-500/30 bg-blue-500/10 px-3 py-2 text-xs font-bold uppercase tracking-[0.18em] text-blue-300"
                    >
                      <Play className="mr-2 inline h-3.5 w-3.5" />
                      {actionLoading === 'start-task' ? 'Starting...' : 'Start Task'}
                    </button>
                  </div>
                </div>
              ) : step && (
                <div className="space-y-4">
                  {stagePrimaryAction ? (
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => runAction('start', async () => {
                          const response = await fetch(`/api/tasks/${taskId}/steps/${step.id}`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ action: 'start', actor: 'max' }),
                          });
                          await parseApiResponse(response, 'Failed to start stage');
                        })}
                        className="rounded-xl border border-blue-500/30 bg-blue-500/10 px-3 py-2 text-xs font-bold uppercase tracking-[0.18em] text-blue-300"
                      >
                        <Play className="mr-2 inline h-3.5 w-3.5" />
                        {actionLoading === 'start' ? 'Starting...' : stagePrimaryAction.label}
                      </button>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-[#202020] bg-black/70 p-4">
                      <p className="text-sm text-slate-300">
                        {step.status === 'running'
                          ? 'The active stage is already running.'
                          : step.status === 'submitted'
                            ? 'The active stage has been submitted and is waiting for validation.'
                            : step.status === 'complete'
                              ? 'The active stage is complete.'
                              : 'The active stage does not need an operator action right now.'}
                      </p>
                    </div>
                  )}

                  <div className="rounded-2xl border border-[#202020] bg-black/70 p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Progress Note</p>
                    <div className="mt-3 flex gap-2">
                      <input
                        value={progressNote}
                        onChange={(event) => setProgressNote(event.target.value)}
                        className="flex-1 rounded-xl border border-[#252525] bg-black px-3 py-2 text-sm text-white outline-none focus:border-blue-500/50"
                      />
                      <button
                        onClick={() => runAction('progress', async () => {
                          if (!progressNote.trim()) return;
                          const response = await fetch(`/api/tasks/${taskId}/steps/${step.id}/events`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              actor: 'max',
                              actorType: 'system',
                              eventType: 'progress_note',
                              message: progressNote,
                              heartbeatAt: new Date().toISOString(),
                            }),
                          });
                          await parseApiResponse(response, 'Failed to add progress note');
                          setProgressNote('');
                        })}
                        className="rounded-xl bg-white px-3 py-2 text-xs font-black uppercase tracking-[0.18em] text-black"
                      >
                        Add
                      </button>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-[#202020] bg-black/70 p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Structured Completion Packet</p>
                    <div className="mt-3 grid gap-3">
                      {[
                        { key: 'summary', label: 'Summary' },
                        { key: 'outputsProduced', label: 'Outputs Produced (one per line)' },
                        { key: 'validationResult', label: 'Validation Result' },
                        { key: 'issues', label: 'Issues / Risks' },
                        { key: 'nextStepRecommendation', label: 'Next Step Recommendation' },
                      ].map((field) => (
                        <label key={field.key} className="space-y-1">
                          <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">{field.label}</span>
                          <textarea
                            value={completion[field.key as keyof typeof completion]}
                            onChange={(event) => setCompletion((current) => ({ ...current, [field.key]: event.target.value }))}
                            rows={field.key === 'summary' ? 2 : 3}
                            className="w-full rounded-xl border border-[#252525] bg-black px-3 py-2 text-sm text-white outline-none focus:border-blue-500/50"
                          />
                        </label>
                      ))}
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => runAction('submit-completion', async () => {
                            await fetch(`/api/tasks/${taskId}/steps/${step.id}/completion`, {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                actor: 'agent-worker',
                                summary: completion.summary,
                                outputsProduced: splitLines(completion.outputsProduced),
                                validationResult: completion.validationResult,
                                issues: completion.issues,
                                nextStepRecommendation: completion.nextStepRecommendation,
                              }),
                            });
                          })}
                          className="rounded-xl bg-blue-600 px-3 py-2 text-xs font-black uppercase tracking-[0.18em] text-white"
                        >
                          Submit Completion
                        </button>
                        <button
                          onClick={() => runAction('validate-pass', async () => {
                            await fetch(`/api/tasks/${taskId}/steps/${step.id}`, {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ action: 'validate', actor: 'max', decision: 'pass', notes: 'Validation passed' }),
                            });
                          })}
                          className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs font-black uppercase tracking-[0.18em] text-emerald-300"
                        >
                          Validate Pass
                        </button>
                        <button
                          onClick={() => runAction('validate-reject', async () => {
                            await fetch(`/api/tasks/${taskId}/steps/${step.id}`, {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ action: 'validate', actor: 'max', decision: 'reject', notes: 'Validation rejected by Max' }),
                            });
                          })}
                          className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-black uppercase tracking-[0.18em] text-red-300"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </section>
          </div>

          <div className="space-y-6">
            <section className="rounded-[1.75rem] border border-[#222] bg-[#09090b] p-5">
              <p className="text-sm font-bold text-white">Structured Event Timeline</p>
              <div className="mt-4 space-y-3">
                {data.events.length === 0 ? (
                  <p className="text-sm text-slate-500">No step events yet.</p>
                ) : (
                  data.events.map((event) => (
                    <div key={event.id} className="rounded-2xl border border-[#202020] bg-black/70 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-300">{event.eventType.replace(/_/g, ' ')}</p>
                        <span className="text-[10px] text-slate-500">{timeAgo(event.createdAt)}</span>
                      </div>
                      <p className="mt-2 text-sm text-white">{event.message}</p>
                      <p className="mt-2 text-[11px] text-slate-500">{event.actor}</p>
                    </div>
                  ))
                )}
              </div>
            </section>

            <section className="rounded-[1.75rem] border border-[#222] bg-[#09090b] p-5">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-amber-400" />
                <p className="text-sm font-bold text-white">Issue Threads</p>
              </div>
              <p className="mt-2 text-xs text-slate-500">When Max cannot resolve a blocker alone, open an issue here so the task carries its own context and conversation.</p>

              <div className="mt-4 grid gap-3">
                <input
                  value={issueDraft.title}
                  onChange={(event) => setIssueDraft((current) => ({ ...current, title: event.target.value }))}
                  placeholder="Issue title"
                  className="w-full rounded-xl border border-[#252525] bg-black px-3 py-2 text-sm text-white outline-none focus:border-blue-500/50"
                />
                <textarea
                  value={issueDraft.summary}
                  onChange={(event) => setIssueDraft((current) => ({ ...current, summary: event.target.value }))}
                  rows={3}
                  placeholder="Explain what failed, what was tried, and what decision or input is needed."
                  className="w-full rounded-xl border border-[#252525] bg-black px-3 py-2 text-sm text-white outline-none focus:border-blue-500/50"
                />
                <div className="flex flex-wrap gap-2">
                  <select
                    value={issueDraft.assignedTo}
                    onChange={(event) => setIssueDraft((current) => ({ ...current, assignedTo: event.target.value as 'human' | 'orchestrator' }))}
                    className="rounded-xl border border-[#252525] bg-black px-3 py-2 text-sm text-white outline-none focus:border-blue-500/50"
                  >
                    <option value="human">Needs Human</option>
                    <option value="orchestrator">Needs Orchestrator</option>
                  </select>
                  <button
                    onClick={() => runAction('create-issue', createIssue)}
                    className="rounded-xl bg-amber-500 px-3 py-2 text-xs font-black uppercase tracking-[0.18em] text-black"
                  >
                    {actionLoading === 'create-issue' ? 'Opening...' : 'Open Issue'}
                  </button>
                </div>
              </div>

              <div className="mt-5 space-y-4">
                {(task.issues || []).length === 0 ? (
                  <p className="text-sm text-slate-500">No issue threads yet.</p>
                ) : (
                  (task.issues || []).map((issue) => {
                    const issueComments = (task.comments || []).filter((entry) => entry.issueId === issue.id);
                    const replyDraft = issueReplyDrafts[issue.id] || '';
                    const replyParentId = replyTargetByIssue[issue.id] || undefined;

                    return (
                      <div key={issue.id} className="rounded-2xl border border-[#202020] bg-black/70 p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-300">{issue.status.replace(/_/g, ' ')}</p>
                            <p className="mt-1 text-sm font-bold text-white">{issue.title}</p>
                            <p className="mt-2 text-sm text-slate-300">{issue.summary}</p>
                            <p className="mt-2 text-[11px] text-slate-500">
                              Assigned to {issue.assignedTo === 'human' ? 'Human' : 'Primary Orchestrator'}
                              {issue.stepId ? ` • Linked to current stage` : ''}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {issue.status !== 'resolved' && (
                              <>
                                <button
                                  onClick={() => runAction(`issue-human-${issue.id}`, () => updateIssue(issue.id, { assignedTo: 'human', status: 'waiting_on_human' }))}
                                  className="rounded-xl border border-[#333] bg-black px-3 py-2 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-300"
                                >
                                  Needs Human
                                </button>
                                <button
                                  onClick={() => runAction(`issue-orchestrator-${issue.id}`, () => updateIssue(issue.id, { assignedTo: 'orchestrator', status: 'waiting_on_orchestrator' }))}
                                  className="rounded-xl border border-[#333] bg-black px-3 py-2 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-300"
                                >
                                  Needs Orchestrator
                                </button>
                                <button
                                  onClick={() => runAction(`issue-resolve-${issue.id}`, () => updateIssue(issue.id, { status: 'resolved', resolution: 'Resolved from task detail' }))}
                                  className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-300"
                                >
                                  Resolve
                                </button>
                              </>
                            )}
                          </div>
                        </div>

                        {issueComments.length > 0 && (
                          <div className="mt-4">
                            <IssueCommentThread
                              issueId={issue.id}
                              comments={issueComments}
                              onReply={(issueId, parentId) => (
                                <button
                                  onClick={() => setReplyTargetByIssue((current) => ({ ...current, [issueId]: parentId || null }))}
                                  className="text-[10px] font-bold uppercase tracking-[0.18em] text-blue-300"
                                >
                                  Reply
                                </button>
                              )}
                            />
                          </div>
                        )}

                        <div className="mt-4 rounded-2xl border border-[#202020] bg-[#09090b] p-3">
                          {replyParentId && (
                            <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Replying to comment {replyParentId}</p>
                          )}
                          <textarea
                            value={replyDraft}
                            onChange={(event) => setIssueReplyDrafts((current) => ({ ...current, [issue.id]: event.target.value }))}
                            rows={3}
                            placeholder="Reply in the issue thread..."
                            className="w-full rounded-xl border border-[#252525] bg-black px-3 py-2 text-sm text-white outline-none focus:border-blue-500/50"
                          />
                          <div className="mt-3 flex flex-wrap gap-2">
                            <button
                              onClick={() => runAction(`reply-${issue.id}`, () => postIssueReply(issue.id, replyParentId))}
                              className="rounded-xl bg-white px-3 py-2 text-xs font-black uppercase tracking-[0.18em] text-black"
                            >
                              Reply
                            </button>
                            {replyParentId && (
                              <button
                                onClick={() => setReplyTargetByIssue((current) => ({ ...current, [issue.id]: null }))}
                                className="rounded-xl border border-[#333] bg-black px-3 py-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-300"
                              >
                                Cancel Reply Target
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </section>

            <section className="rounded-[1.75rem] border border-[#222] bg-[#09090b] p-5">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-blue-400" />
                <p className="text-sm font-bold text-white">Notes</p>
              </div>
              <div className="mt-4 space-y-3">
                {(task.comments || []).filter((entry) => !entry.issueId).map((entry: TaskComment) => (
                  <div key={entry.id} className="rounded-2xl border border-[#202020] bg-black/70 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs font-bold uppercase tracking-[0.18em] text-white">{entry.author}</p>
                      <span className="text-[10px] text-slate-500">{timeAgo(entry.createdAt)}</span>
                    </div>
                    <p className="mt-2 text-sm text-slate-300">{entry.content}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex gap-2">
                <textarea
                  value={comment}
                  onChange={(event) => setComment(event.target.value)}
                  rows={3}
                  className="flex-1 rounded-xl border border-[#252525] bg-black px-3 py-2 text-sm text-white outline-none focus:border-blue-500/50"
                />
                <button
                  onClick={() => runAction('comment', postComment)}
                  className="self-start rounded-xl bg-white px-3 py-2 text-xs font-black uppercase tracking-[0.18em] text-black"
                >
                  Post
                </button>
              </div>
            </section>

            <section className="rounded-[1.75rem] border border-[#222] bg-[#09090b] p-5">
              <div className="flex items-center gap-2">
                <Paperclip className="h-4 w-4 text-emerald-400" />
                <p className="text-sm font-bold text-white">Evidence</p>
              </div>
              <div className="mt-4 space-y-3">
                {(task.evidence || []).length === 0 ? (
                  <p className="text-sm text-slate-500">No evidence attached.</p>
                ) : (
                  (task.evidence || []).map((entry: TaskEvidence) => (
                    <a key={entry.id} href={entry.url} target="_blank" rel="noreferrer" className="block rounded-2xl border border-[#202020] bg-black/70 p-4 transition-colors hover:border-slate-600">
                      <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-300">{entry.evidenceType}</p>
                      <p className="mt-2 text-sm text-white">{entry.description || entry.url}</p>
                      <p className="mt-2 break-all text-[11px] text-slate-500">{entry.url}</p>
                    </a>
                  ))
                )}
              </div>
            </section>

            {run && (
              <section className="rounded-[1.75rem] border border-[#222] bg-[#09090b] p-5">
                <div className="flex items-center gap-2">
                  <Save className="h-4 w-4 text-amber-400" />
                  <p className="text-sm font-bold text-white">Save This Run As Template</p>
                </div>
                <div className="mt-4 flex gap-2">
                  <input
                    value={templateName}
                    onChange={(event) => setTemplateName(event.target.value)}
                    className="flex-1 rounded-xl border border-[#252525] bg-black px-3 py-2 text-sm text-white outline-none focus:border-blue-500/50"
                  />
                  <button
                    onClick={() => runAction('template', saveTemplate)}
                    className="rounded-xl bg-amber-500 px-3 py-2 text-xs font-black uppercase tracking-[0.18em] text-black"
                  >
                    Save
                  </button>
                </div>
              </section>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [activityFeed, setActivityFeed] = useState<TaskActivityFeedItem[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [detail, setDetail] = useState<TaskDetailData>({ task: null, events: [] });
  const [loading, setLoading] = useState(true);
  const [showWizard, setShowWizard] = useState(false);
  const [showTemplateManager, setShowTemplateManager] = useState(false);
  const [showActivityPanel, setShowActivityPanel] = useState(false);
  const [activityLoading, setActivityLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [refreshPaused, setRefreshPaused] = useState(false);

  async function loadAll() {
    setLoading(true);
    try {
      const [taskResponse, projectResponse, templateResponse, agentResponse] = await Promise.all([
        fetch('/api/tasks?include=currentRun,plan,issues'),
        fetch('/api/projects'),
        fetch('/api/task-templates'),
        fetch('/api/agents'),
      ]);

      setTasks(await taskResponse.json());
      setProjects(await projectResponse.json());
      setTemplates(await templateResponse.json());
      setAgents(await agentResponse.json());
    } finally {
      setLoading(false);
    }
  }

  async function loadTaskDetail(taskId: string) {
    const [taskResponse, eventResponse] = await Promise.all([
      fetch(`/api/tasks/${taskId}?include=currentRun,comments,activity,evidence,plan,issues`),
      fetch(`/api/tasks/${taskId}/events`),
    ]);

    setDetail({
      task: await taskResponse.json(),
      events: await eventResponse.json(),
    });
    setSelectedTaskId(taskId);
  }

  async function loadActivity() {
    setActivityLoading(true);
    try {
      const response = await fetch('/api/tasks/activity?limit=40');
      setActivityFeed(await response.json());
    } finally {
      setActivityLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
    const timer = window.setInterval(() => {
      if (refreshPaused) {
        return;
      }
      loadAll();
      if (selectedTaskId) {
        loadTaskDetail(selectedTaskId);
      }
    }, 15000);
    return () => window.clearInterval(timer);
  }, [refreshPaused, selectedTaskId]);

  useEffect(() => {
    const stored = window.localStorage.getItem('tasks.activity-panel.open');
    if (stored === 'true') {
      setShowActivityPanel(true);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem('tasks.activity-panel.open', showActivityPanel ? 'true' : 'false');
    if (!showActivityPanel) {
      return;
    }

    void loadActivity();
    const timer = window.setInterval(() => {
      void loadActivity();
    }, 5000);

    return () => window.clearInterval(timer);
  }, [showActivityPanel]);

  const filteredTasks = useMemo(() => {
    if (!search.trim()) return tasks;
    const query = search.toLowerCase();
    return tasks.filter((task) => (
      task.title.toLowerCase().includes(query)
      || (task.goal || '').toLowerCase().includes(query)
      || (task.project || '').toLowerCase().includes(query)
    ));
  }, [search, tasks]);

  function renderTaskCard(task: Task) {
    const step = currentStep(task);

    return (
      <button
        key={task.id}
        onClick={() => loadTaskDetail(task.id)}
        className="w-full rounded-2xl border border-[#242424] bg-black/80 p-4 text-left transition-colors hover:border-slate-600"
      >
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm font-bold text-white">{task.title}</p>
          {task.isStuck ? <ShieldAlert className="h-4 w-4 text-red-400" /> : <ChevronsRight className="h-4 w-4 text-slate-600" />}
        </div>
        <p className="mt-2 line-clamp-2 text-xs text-slate-500">{task.goal || task.description}</p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className={cn('rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-[0.18em]', PRIORITY_STYLES[task.priority])}>
            {task.priority}
          </span>
          <span className="rounded-full border border-blue-500/20 bg-blue-500/10 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-blue-200">
            {stageLabelForTask(task)}
          </span>
          {step && (
            <span className="rounded-full border border-[#333] bg-[#111] px-2 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-300">
              {step.assignedAgentName || step.assignedAgentId || 'unassigned'}
            </span>
          )}
        </div>
        <div className="mt-4 flex items-center justify-between text-[10px] uppercase tracking-[0.18em] text-slate-500">
          <span>{task.owner}</span>
          <span>{timeAgo(task.updatedAt)}</span>
        </div>
      </button>
    );
  }

  function renderBoardColumn(column: TaskStatus, mode: 'stacked' | 'desktop') {
    const tasksInColumn = filteredTasks.filter((task) => task.status === column);

    return (
      <section key={`${mode}-${column}`} className={cn('rounded-[1.75rem] border p-4', COLUMN_COPY[column].tone)}>
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={cn('h-2.5 w-2.5 rounded-full', COLUMN_COPY[column].dot)} />
            <p className="text-xs font-black uppercase tracking-[0.18em] text-white">{COLUMN_COPY[column].label}</p>
          </div>
          <span className="rounded-full border border-[#2a2a2a] bg-black/60 px-2 py-1 text-[10px] font-black text-slate-400">
            {tasksInColumn.length}
          </span>
        </div>

        {tasksInColumn.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#2a2a2a] px-4 py-6 text-center text-xs text-slate-600">
            No tasks
          </div>
        ) : (
          <div className={mode === 'stacked' ? 'grid gap-3 sm:grid-cols-2' : 'space-y-3'}>
            {tasksInColumn.map((task) => renderTaskCard(task))}
          </div>
        )}
      </section>
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-8 lg:p-12">
      <div className="rounded-[2rem] border border-[#1b1b1b] bg-[#0b0b0d] p-5 shadow-2xl sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-blue-400">Task {'->'} Plan {'->'} Run</p>
            <h1 className="mt-2 text-4xl font-black tracking-tight text-white">Mission Tasks</h1>
            <p className="mt-3 max-w-2xl text-sm text-slate-400">
              Human and Max both author work through the same structured wizard. Tasks save first in backlog, runs start explicitly later, and blockers stay attached to the task through issue threads.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => loadAll()}
              className="rounded-xl border border-[#242424] bg-black px-4 py-3 text-xs font-bold uppercase tracking-[0.18em] text-slate-300"
            >
              <RefreshCcw className="mr-2 inline h-4 w-4" />
              Refresh
            </button>
            <button
              onClick={() => setShowActivityPanel((current) => !current)}
              className="rounded-xl border border-[#242424] bg-black px-4 py-3 text-xs font-bold uppercase tracking-[0.18em] text-slate-300"
            >
              <Clock3 className="mr-2 inline h-4 w-4" />
              {showActivityPanel ? 'Hide Activity' : 'Show Activity'}
            </button>
            <button
              onClick={() => setShowTemplateManager(true)}
              className="rounded-xl border border-[#242424] bg-black px-4 py-3 text-xs font-bold uppercase tracking-[0.18em] text-slate-300"
            >
              <Sparkles className="mr-2 inline h-4 w-4" />
              Manage Templates
            </button>
            <button
              onClick={() => setShowWizard(true)}
              className="rounded-xl bg-blue-600 px-4 py-3 text-xs font-black uppercase tracking-[0.18em] text-white shadow-[0_0_30px_rgba(37,99,235,0.25)]"
            >
              <Plus className="mr-2 inline h-4 w-4" />
              New Task
            </button>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            <div className="rounded-2xl border border-[#222] bg-black/70 px-4 py-3">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Tasks</p>
              <p className="mt-2 text-2xl font-black text-white">{tasks.length}</p>
            </div>
            <div className="rounded-2xl border border-[#222] bg-black/70 px-4 py-3">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Blocked</p>
              <p className="mt-2 text-2xl font-black text-red-300">{tasks.filter((task) => task.status === 'Blocked').length}</p>
            </div>
            <div className="rounded-2xl border border-[#222] bg-black/70 px-4 py-3">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Templates</p>
              <p className="mt-2 text-2xl font-black text-white">{templates.length}</p>
            </div>
            <div className="rounded-2xl border border-[#222] bg-black/70 px-4 py-3">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Live Runs</p>
              <p className="mt-2 text-2xl font-black text-white">{tasks.filter((task) => Boolean(task.currentRunId)).length}</p>
            </div>
          </div>

          <div className="w-full max-w-md">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search tasks, goals, or projects..."
              className="w-full rounded-2xl border border-[#252525] bg-black px-4 py-3 text-sm text-white outline-none focus:border-blue-500/50"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center rounded-[2rem] border border-[#1b1b1b] bg-[#0b0b0d] p-20">
          <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
        </div>
      ) : (
        <div className={cn('grid gap-4', showActivityPanel ? 'xl:grid-cols-[minmax(0,1fr)_360px]' : 'grid-cols-1')}>
          <div className="space-y-4 xl:hidden">
            {COLUMNS.map((column) => renderBoardColumn(column, 'stacked'))}
          </div>

          <div className="hidden gap-4 xl:grid xl:grid-cols-5">
            {COLUMNS.map((column) => renderBoardColumn(column, 'desktop'))}
          </div>

          {showActivityPanel && (
            <aside className="rounded-[1.75rem] border border-[#1f1f1f] bg-[#0b0b0d] p-5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Clock3 className="h-4 w-4 text-blue-400" />
                  <div>
                    <p className="text-sm font-bold text-white">Live Activity</p>
                    <p className="text-xs text-slate-500">Latest task updates across the board.</p>
                  </div>
                </div>
                {activityLoading && <Loader2 className="h-4 w-4 animate-spin text-slate-500" />}
              </div>

              <div className="mt-4 space-y-3">
                {activityFeed.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-[#2a2a2a] px-4 py-6 text-center text-xs text-slate-600">
                    No recent task activity
                  </div>
                ) : (
                  activityFeed.map((activity) => (
                    <button
                      key={activity.id}
                      onClick={() => loadTaskDetail(activity.taskId)}
                      className="w-full rounded-2xl border border-[#202020] bg-black/70 p-4 text-left transition-colors hover:border-slate-600"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm font-bold text-white">{activity.taskTitle}</p>
                        <span className="text-[10px] uppercase tracking-[0.18em] text-slate-500">{timeAgo(activity.createdAt)}</span>
                      </div>
                      <p className="mt-2 text-sm text-slate-300">{activityMessage(activity)}</p>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <span className="rounded-full border border-[#333] bg-[#111] px-2 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-300">
                          {activity.taskStatus}
                        </span>
                        {activity.stepTitle && (
                          <span className="rounded-full border border-blue-500/20 bg-blue-500/10 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-blue-200">
                            {activity.stepTitle}
                          </span>
                        )}
                        <span className="rounded-full border border-[#2a2a2a] bg-black px-2 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
                          {activity.actor}
                        </span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </aside>
          )}
        </div>
      )}

      {showWizard && (
        <TaskWizard
          projects={projects}
          templates={templates}
          agents={agents}
          setRefreshPaused={setRefreshPaused}
          onClose={() => setShowWizard(false)}
          onCreated={(task) => {
            void loadAll();
            void loadTaskDetail(task.id);
          }}
        />
      )}

      {showTemplateManager && (
        <TemplateManager
          templates={templates}
          agents={agents}
          setRefreshPaused={setRefreshPaused}
          onClose={() => setShowTemplateManager(false)}
          onChanged={async (templateId) => {
            await loadAll();
            if (templateId) {
              setShowTemplateManager(true);
            }
          }}
        />
      )}

      {selectedTaskId && detail.task && (
        <TaskDetail
          data={detail}
          agents={agents}
          setRefreshPaused={setRefreshPaused}
          onClose={() => {
            setSelectedTaskId(null);
            setDetail({ task: null, events: [] });
          }}
          onDeleted={async () => {
            setSelectedTaskId(null);
            setDetail({ task: null, events: [] });
            await loadAll();
          }}
          onRefresh={async () => {
            await loadAll();
            await loadTaskDetail(selectedTaskId);
          }}
        />
      )}
    </div>
  );
}
