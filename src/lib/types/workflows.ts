// ============================================================================
// WORKFLOW AND PIPELINE TYPES
// ============================================================================

export type AgentRole = 'researcher' | 'builder' | 'tester' | 'reviewer' | 'approver' | 'automation';

export interface WorkflowTemplate {
    id: string;
    name: string;
    description?: string;
    agentRole: AgentRole;
    agentId?: string; // specific agent like 'alice', 'bob'
    estimatedMinutes: number;
    model: string;
    systemPrompt?: string;
    validationChecklist: string[];
    tags: string[];
    createdAt: string;
    updatedAt: string;
    useCount: number;
    lastUsedAt?: string;
}

export interface PipelineStep {
    workflowId: string;
    workflowName?: string; // enriched from join
    onFailure: 'stop' | 'continue' | 'skip';
}

export interface Pipeline {
    id: string;
    name: string;
    description?: string;
    steps: PipelineStep[];
    isDynamic: boolean;
    createdFromTaskId?: string;
    createdAt: string;
    updatedAt: string;
    useCount: number;
    lastUsedAt?: string;
}

export interface PipelineRun {
    id: string;
    pipelineId?: string;
    taskId: string;
    currentStep: number;
    status: 'running' | 'completed' | 'failed' | 'paused';
    startedAt: string;
    completedAt?: string;
    errorMessage?: string;
}

export interface TaskPipeline {
    taskId: string;
    pipelineId?: string;
    workflowIds?: string[]; // for dynamic pipelines
    currentStep: number;
    isDynamic: boolean;
    matchedAt: string;
}

// ============================================================================
// PIPELINE MATCHING RESULT
// ============================================================================

export interface PipelineMatchResult {
    matched: boolean;
    pipelineId?: string;
    pipelineName?: string;
    workflowIds?: string[]; // for dynamic assembly
    isDynamic: boolean;
    confidence: number; // 0-1, how confident MAX is in this match
    reason: string; // why this pipeline was chosen
}

// ============================================================================
// DYNAMIC PIPELINE ASSEMBLY
// ============================================================================

export interface DynamicPipelineConfig {
    requiresResearch: boolean;
    requiresBuild: boolean;
    requiresTest: boolean;
    requiresReview: boolean;
    estimatedComplexity: 'simple' | 'medium' | 'complex';
    suggestedWorkflows: string[];
}
