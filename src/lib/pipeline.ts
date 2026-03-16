import { Task, TaskStatus, Priority, ValidationCriteria } from '@/lib/types';

// Agent capabilities
const AGENT_CAPABILITIES: Record<string, string[]> = {
    alice: ['research', 'documentation', 'analysis', 'investigation', 'youtube', 'transcript'],
    bob: ['build', 'implement', 'code', 'create', 'fix', 'refactor', 'develop', 'api', 'database', 'ui'],
    charlie: ['test', 'qa', 'verify', 'validate', 'check', 'audit'],
    aegis: ['approve', 'review', 'validate', 'final'],
    tron: ['monitor', 'schedule', 'heartbeat', 'cron', 'automate'],
};

// Task type to required agents mapping
const TASK_PIPELINES: Record<string, string[]> = {
    'research-only': ['alice', 'aegis'],           // Research → Review
    'documentation': ['alice', 'aegis'],           // Research/Write → Review
    'quick-fix': ['bob', 'aegis'],                // Build → Review (skip QA)
    'standard-build': ['bob', 'charlie', 'aegis'],  // Build → QA → Review
    'complex-feature': ['alice', 'bob', 'charlie', 'aegis'], // Full pipeline
    'automation': ['tron'],                        // Just Tron
    'qa-only': ['charlie', 'aegis'],               // Existing code needs QA
};

/**
 * Determine the pipeline for a task based on its content
 */
export function determinePipeline(title: string, description?: string): string[] {
    const text = (title + ' ' + (description || '')).toLowerCase();
    
    // Check for specific patterns
    if (text.includes('research') && !text.includes('build') && !text.includes('implement')) {
        return TASK_PIPELINES['research-only'];
    }
    
    if (text.includes('document') || text.includes('readme') || text.includes('write')) {
        return TASK_PIPELINES['documentation'];
    }
    
    if ((text.includes('fix') || text.includes('bug')) && text.includes('quick')) {
        return TASK_PIPELINES['quick-fix'];
    }
    
    if (text.includes('test') || text.includes('qa') || text.includes('verify')) {
        return TASK_PIPELINES['qa-only'];
    }
    
    if (text.includes('schedule') || text.includes('cron') || text.includes('monitor')) {
        return TASK_PIPELINES['automation'];
    }
    
    // Check complexity indicators
    const isComplex = text.includes('complex') || text.includes('large') || text.includes('architecture');
    const isSimple = text.includes('simple') || text.includes('small') || text.includes('quick');
    
    if (isComplex) {
        return TASK_PIPELINES['complex-feature'];
    }
    
    if (isSimple && (text.includes('build') || text.includes('create'))) {
        return TASK_PIPELINES['quick-fix']; // Simple build = quick pipeline
    }
    
    // Default: standard build pipeline
    return TASK_PIPELINES['standard-build'];
}

/**
 * Get the next agent in the pipeline
 */
export function getNextAgent(currentAgent: string, pipeline: string[]): string | null {
    const currentIndex = pipeline.indexOf(currentAgent);
    if (currentIndex === -1 || currentIndex >= pipeline.length - 1) {
        return null; // End of pipeline
    }
    return pipeline[currentIndex + 1];
}

/**
 * Get the previous agent (for fail/back scenarios)
 */
export function getPreviousAgent(currentAgent: string, pipeline: string[]): string | null {
    const currentIndex = pipeline.indexOf(currentAgent);
    if (currentIndex <= 0) {
        return null; // Start of pipeline
    }
    return pipeline[currentIndex - 1];
}

/**
 * Determine initial owner based on pipeline
 */
export function getInitialOwner(pipeline: string[]): string {
    return pipeline[0] || 'matt';
}

/**
 * Check if task is complete (reached end of pipeline)
 */
export function isPipelineComplete(currentAgent: string, pipeline: string[]): boolean {
    return pipeline.indexOf(currentAgent) === pipeline.length - 1;
}

/**
 * Get handoff status based on next agent
 */
export function getHandoffStatus(nextAgent: string): TaskStatus {
    if (nextAgent === 'charlie' || nextAgent === 'aegis') {
        return 'Review';
    }
    if (nextAgent === 'bob') {
        return 'In Progress';
    }
    if (nextAgent === 'alice') {
        return 'In Progress';
    }
    return 'In Progress';
}

/**
 * Generate validation criteria based on pipeline
 */
export function generateDynamicValidationCriteria(pipeline: string[], title: string, description?: string): ValidationCriteria {
    const checklist: string[] = [];
    const text = (title + ' ' + (description || '')).toLowerCase();
    
    // Add checks based on who's in the pipeline
    if (pipeline.includes('alice')) {
        checklist.push('Research completed');
        checklist.push('Findings documented');
    }
    
    if (pipeline.includes('bob')) {
        checklist.push('Implementation complete');
        checklist.push('Code tested locally');
        checklist.push('Documentation updated');
    }
    
    if (pipeline.includes('charlie')) {
        checklist.push('QA testing passed');
        checklist.push('Edge cases verified');
    }
    
    if (pipeline.includes('aegis')) {
        checklist.push('Final review approved');
        checklist.push('Requirements met');
    }
    
    // Task-specific checks
    if (text.includes('api')) {
        checklist.push('API endpoints tested');
    }
    if (text.includes('ui') || text.includes('component')) {
        checklist.push('UI responsive on all sizes');
    }
    if (text.includes('database') || text.includes('migration')) {
        checklist.push('Database migration tested');
    }
    if (text.includes('fix') || text.includes('bug')) {
        checklist.push('Bug verified fixed');
        checklist.push('No regressions introduced');
    }
    
    // Generate doneMeans
    let doneMeans = 'Task completed';
    if (pipeline.length === 1) {
        doneMeans = `${pipeline[0]} work completed and verified`;
    } else if (pipeline.includes('aegis')) {
        doneMeans = 'Task fully validated and approved';
    } else if (pipeline.includes('charlie')) {
        doneMeans = 'Task built and QA verified';
    } else if (pipeline.includes('bob')) {
        doneMeans = 'Task built and ready for review';
    } else if (pipeline.includes('alice')) {
        doneMeans = 'Research complete with documented findings';
    }
    
    return {
        doneMeans,
        checklist: [...new Set(checklist)], // Remove duplicates
    };
}

/**
 * Full task analysis - returns everything MAX needs to know
 */
export function analyzeTask(title: string, description?: string) {
    const pipeline = determinePipeline(title, description);
    const initialOwner = getInitialOwner(pipeline);
    const validationCriteria = generateDynamicValidationCriteria(pipeline, title, description);
    
    // Infer priority
    const text = (title + ' ' + (description || '')).toLowerCase();
    let priority: Priority = 'normal';
    if (text.includes('urgent') || text.includes('critical') || text.includes('blocking') || text.includes('broken')) {
        priority = 'urgent';
    } else if (text.includes('important') || text.includes('needed') || text.includes('should')) {
        priority = 'high';
    }
    
    return {
        pipeline,
        initialOwner,
        validationCriteria,
        priority,
        estimatedAgents: pipeline.length,
        canSkipQA: !pipeline.includes('charlie'),
        requiresResearch: pipeline.includes('alice'),
        requiresBuild: pipeline.includes('bob'),
    };
}
