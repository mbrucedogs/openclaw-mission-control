import { Task, TaskStatus, Priority, ValidationCriteria } from '@/lib/types';
import { randomUUID } from 'crypto';

// Agent capabilities based on role
const AGENT_CAPABILITIES: Record<string, string[]> = {
    alice: ['research', 'documentation', 'analysis', 'youtube', 'transcript', 'web', 'search'],
    bob: ['build', 'implement', 'code', 'create', 'fix', 'refactor', 'develop', 'api', 'database'],
    charlie: ['test', 'qa', 'review', 'verify', 'validate', 'check', 'audit'],
    aegis: ['approve', 'review', 'validate', 'qa', 'final'],
    tron: ['monitor', 'schedule', 'heartbeat', 'cron', 'automate'],
    max: ['orchestrate', 'delegate', 'coordinate', 'assign'],
};

// Keywords that indicate urgency
const URGENCY_KEYWORDS = ['urgent', 'asap', 'critical', 'blocking', 'important', 'fix', 'bug', 'error', 'broken'];
const HIGH_PRIORITY_KEYWORDS = ['today', 'needed', 'required', 'should', 'high'];

/**
 * Auto-infer task metadata from title and description
 * MAX's job: fill gaps before assigning to agents
 */
export function inferTaskMetadata(title: string, description?: string) {
    const text = (title + ' ' + (description || '')).toLowerCase();
    
    // Infer owner based on task type
    let suggestedOwner = 'matt'; // default
    for (const [agent, capabilities] of Object.entries(AGENT_CAPABILITIES)) {
        if (capabilities.some(cap => text.includes(cap))) {
            suggestedOwner = agent;
            break;
        }
    }
    
    // Infer priority
    let suggestedPriority: Priority = 'normal';
    if (URGENCY_KEYWORDS.some(kw => text.includes(kw))) {
        suggestedPriority = 'urgent';
    } else if (HIGH_PRIORITY_KEYWORDS.some(kw => text.includes(kw))) {
        suggestedPriority = 'high';
    } else if (text.includes('low') || text.includes('later') || text.includes('whenever')) {
        suggestedPriority = 'low';
    }
    
    // Infer initial status based on owner
    let suggestedStatus: TaskStatus = 'Backlog';
    if (suggestedOwner === 'tron') {
        suggestedStatus = 'Recurring';
    } else if (suggestedOwner !== 'matt') {
        suggestedStatus = 'Research';
    }
    
    // Generate validation criteria
    const validationCriteria = generateValidationCriteria(title, description);
    
    return {
        owner: suggestedOwner,
        priority: suggestedPriority,
        status: suggestedStatus,
        validationCriteria,
    };
}

/**
 * Generate validation criteria based on task content
 */
function generateValidationCriteria(title: string, description?: string): ValidationCriteria {
    const checklist: string[] = [];
    let doneMeans = 'Task completed successfully';
    
    const text = (title + ' ' + (description || '')).toLowerCase();
    
    // Research tasks
    if (text.includes('research') || text.includes('analyze') || text.includes('investigate')) {
        checklist.push('Research completed');
        checklist.push('Findings documented');
        checklist.push('Evidence/sources cited');
        doneMeans = 'Research findings documented with evidence';
    }
    
    // Build/Implementation tasks
    if (text.includes('build') || text.includes('create') || text.includes('implement') || text.includes('add')) {
        checklist.push('Code/feature implemented');
        checklist.push('Changes tested locally');
        checklist.push('Documentation updated if needed');
        doneMeans = 'Feature built and tested, ready for QA';
    }
    
    // Fix tasks
    if (text.includes('fix') || text.includes('bug') || text.includes('error') || text.includes('broken')) {
        checklist.push('Root cause identified');
        checklist.push('Fix implemented');
        checklist.push('Fix verified working');
        doneMeans = 'Bug fixed and verified working';
    }
    
    // API/Backend tasks
    if (text.includes('api') || text.includes('endpoint') || text.includes('route')) {
        checklist.push('API endpoint created');
        checklist.push('Endpoint tested');
        checklist.push('Error handling implemented');
        doneMeans = 'API endpoint working with proper error handling';
    }
    
    // Database tasks
    if (text.includes('database') || text.includes('table') || text.includes('schema') || text.includes('migration')) {
        checklist.push('Schema changes defined');
        checklist.push('Migration created');
        checklist.push('Migration tested');
        doneMeans = 'Database changes migrated and working';
    }
    
    // Documentation tasks
    if (text.includes('document') || text.includes('readme') || text.includes('docs')) {
        checklist.push('Documentation written');
        checklist.push('Examples provided if needed');
        checklist.push('Reviewed for clarity');
        doneMeans = 'Documentation complete and clear';
    }
    
    // Download/Transcript tasks
    if (text.includes('download') || text.includes('transcript') || text.includes('youtube')) {
        checklist.push('Content downloaded/extracted');
        checklist.push('File saved to correct location');
        checklist.push('File verified accessible');
        doneMeans = 'Content downloaded and saved correctly';
    }
    
    // Review tasks
    if (text.includes('review') || text.includes('audit') || text.includes('qa')) {
        checklist.push('Code/feature reviewed');
        checklist.push('Issues documented (if any)');
        checklist.push('Pass/fail determined');
        doneMeans = 'Review complete with clear pass/fail verdict';
    }
    
    // UI/Frontend tasks
    if (text.includes('ui') || text.includes('page') || text.includes('component') || text.includes('modal')) {
        checklist.push('UI implemented');
        checklist.push('Responsive design checked');
        checklist.push('Interaction tested');
        doneMeans = 'UI working with proper styling and interactions';
    }
    
    // Default checklist if none matched
    if (checklist.length === 0) {
        checklist.push('Task requirements understood');
        checklist.push('Work completed');
        checklist.push('Results verified');
    }
    
    return {
        doneMeans,
        checklist,
    };
}

/**
 * Create a complete task with MAX's inference
 * Use this instead of raw createTask when you want MAX to fill gaps
 */
export function createTaskWithInference(input: {
    title: string;
    description?: string;
    requestedBy?: string;
    project?: string;
    executionMode?: 'local' | 'cloud';
}): {
    title: string;
    description?: string;
    owner: string;
    priority: Priority;
    status: TaskStatus;
    requestedBy: string;
    project?: string;
    executionMode: 'local' | 'cloud';
    validationCriteria: ValidationCriteria;
} {
    const inferred = inferTaskMetadata(input.title, input.description);
    
    return {
        title: input.title,
        description: input.description,
        owner: inferred.owner,
        priority: inferred.priority,
        status: inferred.status,
        requestedBy: input.requestedBy || 'matt',
        project: input.project,
        executionMode: input.executionMode || 'local',
        validationCriteria: inferred.validationCriteria,
    };
}
