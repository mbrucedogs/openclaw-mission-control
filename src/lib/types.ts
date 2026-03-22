export type Priority = 'urgent' | 'high' | 'normal' | 'low';

export type TaskStatus =
  | 'Backlog'
  | 'In Progress'
  | 'In Review'
  | 'Blocked'
  | 'Done';

export type RunStepRole = 'researcher' | 'builder' | 'tester' | 'reviewer';
export type RunStepStatus = 'draft' | 'ready' | 'running' | 'submitted' | 'blocked' | 'complete' | 'failed';
export type TaskRunStatus = 'draft' | 'ready' | 'running' | 'blocked' | 'completed' | 'failed';
export type TaskIssueStatus = 'open' | 'waiting_on_orchestrator' | 'waiting_on_human' | 'resolved';
export type IssueAssignee = 'orchestrator' | 'human';

export type CommentType = 'note' | 'blocker' | 'handoff' | 'qa_finding' | 'system';
export type AuthorType = 'agent' | 'user' | 'system';
export type EvidenceType = 'file' | 'url' | 'document' | 'code' | 'test' | 'screenshot' | 'log' | 'link';

export interface StepPacketInput {
  title: string;
  role?: RunStepRole;
  assignedAgentId?: string;
  assignedAgentName?: string;
  goal: string;
  inputs: string[];
  requiredOutputs: string[];
  doneCondition: string;
  boundaries: string[];
  dependencies?: number[];
  notesForMax?: string;
  notesForOrchestrator?: string;
}

export interface StepCompletionPacket {
  summary: string;
  outputsProduced: string[];
  validationResult: string;
  issues: string;
  nextStepRecommendation: string;
}

export interface TaskComment {
  id: string;
  taskId: string;
  runId?: string;
  stepId?: string;
  issueId?: string;
  author: string;
  authorType: AuthorType;
  content: string;
  commentType: CommentType;
  parentId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ActivityDetails {
  oldStatus?: TaskStatus;
  newStatus?: TaskStatus;
  runId?: string;
  stepId?: string;
  reason?: string;
  decision?: string;
  templateId?: string;
  eventType?: string;
}

export interface TaskActivity {
  id: string;
  taskId: string;
  runId?: string;
  stepId?: string;
  actor: string;
  actorType: AuthorType;
  activityType: string;
  details?: ActivityDetails;
  createdAt: string;
}

export interface TaskActivityFeedItem extends TaskActivity {
  taskTitle: string;
  taskStatus: TaskStatus;
  taskPriority: Priority;
  stepTitle?: string;
}

export interface TaskEvidence {
  id: string;
  taskId: string;
  runId?: string;
  stepId?: string;
  evidenceType: EvidenceType;
  url: string;
  description?: string;
  addedBy: string;
  addedAt: string;
}

export interface RunStepEvent {
  id: string;
  taskId: string;
  runId: string;
  stepId: string;
  actor: string;
  actorType: AuthorType;
  eventType:
    | 'created'
    | 'updated'
    | 'started'
    | 'heartbeat'
    | 'progress_note'
    | 'completion_submitted'
    | 'validation_passed'
    | 'validation_rejected'
    | 'blocked'
    | 'retry_requested'
    | 'restarted'
    | 'rerun_created'
    | 'escalated';
  message: string;
  payload?: Record<string, unknown>;
  createdAt: string;
}

export interface RunStep {
  id: string;
  taskId: string;
  runId: string;
  stepNumber: number;
  title: string;
  role: RunStepRole;
  assignedAgentId?: string;
  assignedAgentName?: string;
  status: RunStepStatus;
  goal: string;
  inputs: string[];
  requiredOutputs: string[];
  doneCondition: string;
  boundaries: string[];
  dependencies: number[];
  notesForMax?: string;
  retryCount: number;
  startedAt?: string;
  completedAt?: string;
  heartbeatAt?: string;
  blockReason?: string;
  completionPacket?: StepCompletionPacket;
  validationStatus?: 'pending' | 'passed' | 'rejected';
  validationNotes?: string;
  validatedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TaskStagePlan {
  id: string;
  taskId: string;
  stepNumber: number;
  title: string;
  role: RunStepRole;
  assignedAgentId?: string;
  assignedAgentName?: string;
  goal: string;
  inputs: string[];
  requiredOutputs: string[];
  doneCondition: string;
  boundaries: string[];
  dependencies: number[];
  notesForMax?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TaskRun {
  id: string;
  taskId: string;
  runNumber: number;
  status: TaskRunStatus;
  createdBy: string;
  triggerType: 'initial' | 'retry' | 'rerun';
  triggerReason?: string;
  templateId?: string;
  currentStepId?: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  steps: RunStep[];
  events?: RunStepEvent[];
}

export interface TaskTemplate {
  id: string;
  name: string;
  description?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  taskDefaults?: {
    goal?: string;
    acceptanceCriteria?: string[];
  };
  steps: StepPacketInput[];
}

export interface TaskIssue {
  id: string;
  taskId: string;
  runId?: string;
  stepId?: string;
  title: string;
  summary: string;
  status: TaskIssueStatus;
  assignedTo: IssueAssignee;
  createdBy: string;
  resolvedBy?: string;
  resolution?: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
}

export interface Task {
  id: string;
  title: string;
  goal?: string;
  description?: string;
  status: TaskStatus;
  priority: Priority;
  owner: string;
  initiatedBy: string;
  project?: string;
  acceptanceCriteria: string[];
  currentRunId?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  currentRun?: TaskRun;
  stagePlan?: TaskStagePlan[];
  issues?: TaskIssue[];
  comments?: TaskComment[];
  activity?: TaskActivity[];
  evidence?: TaskEvidence[];
  isStuck: boolean;
  stuckReason?: string;
  retryCount: number;
}

export interface Agent {
  id: string;
  name: string;
  role: string;
  type?: string;
  mission?: string;
  status?: string;
  layer?: AgentLayerHint;
  order?: number;
  responsibilities?: string[];
  folder?: string;
  soulContent?: string;
  // Live gateway fields
  gatewaySessionCount?: number;
  isActive?: boolean;
  heartbeatEnabled?: boolean;
  heartbeatEvery?: string;
  recentSessions?: Array<{ key: string; updatedAt: number; age: number }>;
  currentModel?: string;
  percentUsed?: number;
}

export type AgentLayerHint = 'governance' | 'build' | 'review' | 'automation';

export interface Project {
  taskIds?: string[];
  id: string;
  name: string;
  description?: string;
  status: string;
  progress: number;
}

export interface ScheduleJob {
  id: string;
  name: string;
  cron?: string;
  nextRunAt?: string;
  lastRunAt?: string;
  status?: string;
}

export interface DocumentEntry {
  id: string;
  title: string;
  path: string;
  category: string;
  updatedAt: string;
}

export interface RepoDocument {
  id: number;
  title: string;
  summary?: string;
  content?: string;
  source_url?: string;
  document_type: string;
  folder_id?: number;
  tags: string[];
  updated_at: string;
}

export interface DocumentFolder {
  id: number;
  name: string;
}

export interface LinkedTask {
  id: number;
  task_id: string;
  link_type: string;
  title: string;
  status: string;
}

export interface MemoryEntry {
  id: string;
  content: string;
  timestamp: string;
  category: 'daily' | 'long-term';
}
