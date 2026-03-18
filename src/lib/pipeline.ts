import { Task, TaskStatus, Priority, ValidationCriteria } from '@/lib/types';

import { getAgents } from './domain/agents';

// Agent capabilities - now dynamic via discovery, these are for keyword matching
const ROLE_KEYWORDS: Record<string, string[]> = {
    researcher: ['research', 'documentation', 'analysis', 'investigation', 'youtube', 'transcript'],
    builder: ['build', 'implement', 'code', 'create', 'fix', 'refactor', 'develop', 'api', 'database', 'ui'],
    tester: ['test', 'qa', 'verify', 'validate', 'check', 'audit'],
    reviewer: ['approve', 'review', 'validate', 'final'],
    automation: ['monitor', 'schedule', 'heartbeat', 'cron', 'automate'],
};

/**
 * Find the best agent ID for a given role/type
 */
function findAgentByRole(role: string): string {
    const agents = getAgents();
    // 1. Try to match by explicit type
    const typeMatch = agents.find(a => a.type === role.toLowerCase());
    if (typeMatch) return typeMatch.id;

    // 2. Fallback to role string matching
    const roleMatch = agents.find(a => a.role.toLowerCase().includes(role.toLowerCase()));
    return roleMatch ? roleMatch.id : role; // Fallback to role name as ID if none found
}

/**
 * Determine the pipeline for a task based on its content
 */
export function determinePipeline(title: string, description?: string): string[] {
    const text = (title + ' ' + (description || '')).toLowerCase();
    const pipeline: string[] = [];

    // Helper to add agent by role
    const addRole = (role: string) => {
        const id = findAgentByRole(role);
        if (!pipeline.includes(id)) pipeline.push(id);
    };

    // Logic to determine roles needed
    const needsResearch = text.includes('research') || text.includes('investigate');
    const needsBuild = text.includes('build') || text.includes('implement') || text.includes('fix') || text.includes('create');
    const needsTest = text.includes('test') || text.includes('qa') || text.includes('verify');
    const needsAutomation = text.includes('schedule') || text.includes('cron') || text.includes('monitor');

    if (needsResearch) addRole('researcher');
    if (needsBuild) addRole('builder');
    if (needsTest) addRole('tester');
    if (needsAutomation) addRole('automation');

    // Always end with a review if it's a build or research task
    if (pipeline.length > 0 && !needsAutomation) {
        addRole('reviewer');
    }

    // Default if nothing matched
    if (pipeline.length === 0) {
        addRole('builder');
        addRole('reviewer');
    }

    return pipeline;
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
 * Check if a pipeline contains an agent with a specific role/type
 */
function hasRoleInPipeline(pipeline: string[], roleKeyword: string): boolean {
    const agents = getAgents();
    return pipeline.some(id => {
        const agent = agents.find(a => a.id === id);
        if (!agent) return false;
        
        // 1. Check explicit type
        if (agent.type === roleKeyword.toLowerCase()) return true;
        
        // 2. Fallback to role string
        return agent.role.toLowerCase().includes(roleKeyword.toLowerCase());
    });
}

/**
 * Get handoff status based on next agent's role
 */
export function getHandoffStatus(nextAgentId: string): TaskStatus {
    const agents = getAgents();
    const agent = agents.find(a => a.id === nextAgentId);
    const role = agent?.role.toLowerCase() || '';
    
    if (role.includes('tester') || role.includes('reviewer') || role.includes('qa')) {
        return 'Review';
    }
    return 'In Progress';
}

/**
 * Generate validation criteria based on pipeline roles
 */
export function generateDynamicValidationCriteria(pipeline: string[], title: string, description?: string): ValidationCriteria {
    const checklist: string[] = [];
    const text = (title + ' ' + (description || '')).toLowerCase();
    
    // Add checks based on roles in the pipeline
    if (hasRoleInPipeline(pipeline, 'researcher')) {
        checklist.push('Research completed');
        checklist.push('Findings documented');
    }
    
    if (hasRoleInPipeline(pipeline, 'builder')) {
        checklist.push('Implementation complete');
        checklist.push('Code tested locally');
        checklist.push('Documentation updated');
    }
    
    if (hasRoleInPipeline(pipeline, 'tester')) {
        checklist.push('QA testing passed');
        checklist.push('Edge cases verified');
    }
    
    if (hasRoleInPipeline(pipeline, 'reviewer')) {
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
        doneMeans = `Task completed and verified`;
    } else if (hasRoleInPipeline(pipeline, 'reviewer')) {
        doneMeans = 'Task fully validated and approved';
    } else if (hasRoleInPipeline(pipeline, 'tester')) {
        doneMeans = 'Task built and QA verified';
    } else if (hasRoleInPipeline(pipeline, 'builder')) {
        doneMeans = 'Task built and ready for review';
    } else if (hasRoleInPipeline(pipeline, 'researcher')) {
        doneMeans = 'Research complete with documented findings';
    }
    
    return {
        doneMeans,
        checklist: [...new Set(checklist)], // Remove duplicates
    };
}

/**
 * Full task analysis - returns everything orchestrator needs to know
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
        canSkipQA: !hasRoleInPipeline(pipeline, 'tester'),
        requiresResearch: hasRoleInPipeline(pipeline, 'researcher'),
        requiresBuild: hasRoleInPipeline(pipeline, 'builder'),
    };
}
