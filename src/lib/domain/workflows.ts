import { db } from '../db';
import { WorkflowTemplate, Pipeline, PipelineStep, TaskPipeline, PipelineMatchResult } from '../types/workflows';

// ============================================================================
// WORKFLOW TEMPLATES
// ============================================================================

export function getWorkflowTemplates(role?: string): WorkflowTemplate[] {
    let query = 'SELECT * FROM workflow_templates';
    const params: any[] = [];
    
    if (role) {
        query += ' WHERE agent_role = ?';
        params.push(role);
    }
    
    query += ' ORDER BY use_count DESC, updated_at DESC';
    
    return db.prepare(query).all(...params).map(row => ({
        id: (row as any).id,
        name: (row as any).name,
        description: (row as any).description,
        agentRole: (row as any).agent_role,
        agentId: (row as any).agent_id,
        estimatedMinutes: (row as any).estimated_minutes,
        model: (row as any).model,
        systemPrompt: (row as any).system_prompt,
        validationChecklist: (row as any).validation_checklist ? JSON.parse((row as any).validation_checklist) : [],
        tags: (row as any).tags ? JSON.parse((row as any).tags) : [],
        createdAt: (row as any).created_at,
        updatedAt: (row as any).updated_at,
        useCount: (row as any).use_count,
        lastUsedAt: (row as any).last_used_at,
    }));
}

export function getWorkflowTemplateById(id: string): WorkflowTemplate | null {
    const row = db.prepare('SELECT * FROM workflow_templates WHERE id = ?').get(id) as any;
    if (!row) return null;
    
    return {
        id: row.id,
        name: row.name,
        description: row.description,
        agentRole: row.agent_role,
        agentId: row.agent_id,
        estimatedMinutes: row.estimated_minutes,
        model: row.model,
        systemPrompt: row.system_prompt,
        validationChecklist: row.validation_checklist ? JSON.parse(row.validation_checklist) : [],
        tags: row.tags ? JSON.parse(row.tags) : [],
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        useCount: row.use_count,
        lastUsedAt: row.last_used_at,
    };
}

export function incrementWorkflowUse(id: string) {
    db.prepare('UPDATE workflow_templates SET use_count = use_count + 1, last_used_at = datetime("now") WHERE id = ?').run(id);
}

// ============================================================================
// PIPELINES
// ============================================================================

export function getPipelines(includeDynamic = false): Pipeline[] {
    let query = 'SELECT * FROM pipelines';
    if (!includeDynamic) {
        query += ' WHERE is_dynamic = 0';
    }
    query += ' ORDER BY use_count DESC, updated_at DESC';
    
    return db.prepare(query).all().map(row => ({
        id: (row as any).id,
        name: (row as any).name,
        description: (row as any).description,
        steps: (row as any).steps ? JSON.parse((row as any).steps) : [],
        isDynamic: !!(row as any).is_dynamic,
        createdFromTaskId: (row as any).created_from_task_id,
        createdAt: (row as any).created_at,
        updatedAt: (row as any).updated_at,
        useCount: (row as any).use_count,
        lastUsedAt: (row as any).last_used_at,
    }));
}

export function getPipelineById(id: string): Pipeline | null {
    const row = db.prepare('SELECT * FROM pipelines WHERE id = ?').get(id) as any;
    if (!row) return null;
    
    return {
        id: row.id,
        name: row.name,
        description: row.description,
        steps: row.steps ? JSON.parse(row.steps) : [],
        isDynamic: !!row.is_dynamic,
        createdFromTaskId: row.created_from_task_id,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        useCount: row.use_count,
        lastUsedAt: row.last_used_at,
    };
}

export function createPipeline(name: string, description: string, steps: PipelineStep[], isDynamic = false, createdFromTaskId?: string): Pipeline {
    const now = new Date().toISOString();
    const id = 'pl-' + Math.random().toString(36).substring(2, 10);
    
    db.prepare(`
        INSERT INTO pipelines (id, name, description, steps, is_dynamic, created_from_task_id, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, name, description, JSON.stringify(steps), isDynamic ? 1 : 0, createdFromTaskId || null, now, now);
    
    return {
        id,
        name,
        description,
        steps,
        isDynamic,
        createdFromTaskId,
        createdAt: now,
        updatedAt: now,
        useCount: 0,
    };
}

export function incrementPipelineUse(id: string) {
    db.prepare('UPDATE pipelines SET use_count = use_count + 1, last_used_at = datetime("now") WHERE id = ?').run(id);
}

// ============================================================================
// TASK PIPELINE MATCHING
// ============================================================================

export function getTaskPipeline(taskId: string): TaskPipeline | null {
    const row = db.prepare('SELECT * FROM task_pipelines WHERE task_id = ?').get(taskId) as any;
    if (!row) return null;
    
    return {
        taskId: row.task_id,
        pipelineId: row.pipeline_id,
        workflowIds: row.workflow_ids ? JSON.parse(row.workflow_ids) : undefined,
        currentStep: row.current_step,
        isDynamic: !!row.is_dynamic,
        matchedAt: row.matched_at,
    };
}

export function setTaskPipeline(taskId: string, matchResult: PipelineMatchResult) {
    const now = new Date().toISOString();
    
    db.prepare(`
        INSERT OR REPLACE INTO task_pipelines (task_id, pipeline_id, workflow_ids, current_step, is_dynamic, matched_at)
        VALUES (?, ?, ?, ?, ?, ?)
    `).run(
        taskId,
        matchResult.pipelineId || null,
        matchResult.workflowIds ? JSON.stringify(matchResult.workflowIds) : null,
        0,
        matchResult.isDynamic ? 1 : 0,
        now
    );
}

// ============================================================================
// PIPELINE MATCHING LOGIC (MAX's brain)
// ============================================================================

export function matchPipelineToTask(title: string, description?: string): PipelineMatchResult {
    const text = (title + ' ' + (description || '')).toLowerCase();
    
    // Try to match to existing pipelines first
    const pipelines = getPipelines(false); // exclude dynamic
    
    // Check for exact pipeline name matches
    for (const pipeline of pipelines) {
        if (text.includes(pipeline.name.toLowerCase())) {
            incrementPipelineUse(pipeline.id);
            return {
                matched: true,
                pipelineId: pipeline.id,
                pipelineName: pipeline.name,
                isDynamic: false,
                confidence: 0.9,
                reason: `Matched pipeline name: ${pipeline.name}`,
            };
        }
    }
    
    // Check for keyword patterns
    const patterns: Record<string, string> = {
        'quick fix': 'Quick Fix',
        'research only': 'Research Only',
        'documentation': 'Documentation',
        'automate': 'Automation',
        'standard build': 'Standard Build',
    };
    
    for (const [pattern, pipelineName] of Object.entries(patterns)) {
        if (text.includes(pattern)) {
            const pipeline = pipelines.find(p => p.name === pipelineName);
            if (pipeline) {
                incrementPipelineUse(pipeline.id);
                return {
                    matched: true,
                    pipelineId: pipeline.id,
                    pipelineName: pipeline.name,
                    isDynamic: false,
                    confidence: 0.85,
                    reason: `Matched pattern: ${pattern}`,
                };
            }
        }
    }
    
    // No match - assemble dynamically
    return assembleDynamicPipeline(text);
}

function assembleDynamicPipeline(text: string): PipelineMatchResult {
    const workflowIds: string[] = [];
    const reasons: string[] = [];
    
    // Determine which workflows are needed
    if (text.includes('research') || text.includes('investigate') || text.includes('analyze')) {
        workflowIds.push('wf-research');
        reasons.push('research detected');
    }
    
    if (text.includes('build') || text.includes('implement') || text.includes('create') || text.includes('code')) {
        workflowIds.push('wf-build');
        reasons.push('build detected');
    }
    
    if (text.includes('fix') || text.includes('bug') || text.includes('quick')) {
        // Quick fix - use quick-fix workflow instead of full build
        if (!workflowIds.includes('wf-build')) {
            workflowIds.push('wf-quick-fix');
            reasons.push('quick fix detected');
        }
    }
    
    if (text.includes('document') || text.includes('readme') || text.includes('docs')) {
        workflowIds.push('wf-document');
        reasons.push('documentation detected');
    }
    
    if (text.includes('test') || text.includes('qa') || text.includes('verify')) {
        workflowIds.push('wf-test');
        reasons.push('testing detected');
    }
    
    if (text.includes('automate') || text.includes('script') || text.includes('cron')) {
        workflowIds.push('wf-automate');
        reasons.push('automation detected');
    }
    
    // Always add review at the end (unless it's a pure research task going to aegis)
    if (!workflowIds.includes('wf-review')) {
        workflowIds.push('wf-review');
        reasons.push('review required');
    }
    
    // If no specific workflows matched, default to research → review
    if (workflowIds.length === 1 && workflowIds[0] === 'wf-review') {
        workflowIds.unshift('wf-research');
        reasons.unshift('default research');
    }
    
    return {
        matched: true,
        workflowIds,
        isDynamic: true,
        confidence: 0.7,
        reason: `Dynamically assembled: ${reasons.join(', ')}`,
    };
}

// ============================================================================
// WORKFLOW CRUD
// ============================================================================

export function createWorkflow(input: {
    name: string;
    description?: string;
    agentRole: string;
    agentId?: string;
    estimatedMinutes?: number;
    model?: string;
    systemPrompt?: string;
    validationChecklist?: string[];
    tags?: string[];
}): WorkflowTemplate {
    const now = new Date().toISOString();
    const id = 'wf-' + Math.random().toString(36).substring(2, 10);
    
    db.prepare(`
        INSERT INTO workflow_templates (id, name, description, agent_role, agent_id, estimated_minutes, model, system_prompt, validation_checklist, tags, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
        id,
        input.name,
        input.description || null,
        input.agentRole,
        input.agentId || null,
        input.estimatedMinutes || 30,
        input.model || 'gemini-2.5-flash',
        input.systemPrompt || null,
        input.validationChecklist ? JSON.stringify(input.validationChecklist) : '[]',
        input.tags ? JSON.stringify(input.tags) : '[]',
        now,
        now
    );
    
    return {
        id,
        name: input.name,
        description: input.description,
        agentRole: input.agentRole,
        agentId: input.agentId,
        estimatedMinutes: input.estimatedMinutes || 30,
        model: input.model || 'gemini-2.5-flash',
        systemPrompt: input.systemPrompt,
        validationChecklist: input.validationChecklist || [],
        tags: input.tags || [],
        createdAt: now,
        updatedAt: now,
        useCount: 0,
    };
}

export function updateWorkflow(id: string, updates: Partial<WorkflowTemplate>): WorkflowTemplate | null {
    const existing = getWorkflowTemplateById(id);
    if (!existing) return null;
    
    const now = new Date().toISOString();
    const fields: string[] = [];
    const params: any[] = [];
    
    if (updates.name !== undefined) { fields.push('name = ?'); params.push(updates.name); }
    if (updates.description !== undefined) { fields.push('description = ?'); params.push(updates.description); }
    if (updates.agentRole !== undefined) { fields.push('agent_role = ?'); params.push(updates.agentRole); }
    if (updates.agentId !== undefined) { fields.push('agent_id = ?'); params.push(updates.agentId); }
    if (updates.estimatedMinutes !== undefined) { fields.push('estimated_minutes = ?'); params.push(updates.estimatedMinutes); }
    if (updates.model !== undefined) { fields.push('model = ?'); params.push(updates.model); }
    if (updates.systemPrompt !== undefined) { fields.push('system_prompt = ?'); params.push(updates.systemPrompt); }
    if (updates.validationChecklist !== undefined) { fields.push('validation_checklist = ?'); params.push(JSON.stringify(updates.validationChecklist)); }
    if (updates.tags !== undefined) { fields.push('tags = ?'); params.push(JSON.stringify(updates.tags)); }
    
    fields.push('updated_at = ?');
    params.push(now);
    params.push(id);
    
    db.prepare(`UPDATE workflow_templates SET ${fields.join(', ')} WHERE id = ?`).run(...params);
    
    return getWorkflowTemplateById(id);
}

export function deleteWorkflow(id: string): boolean {
    const result = db.prepare('DELETE FROM workflow_templates WHERE id = ?').run(id);
    return result.changes > 0;
}

// ============================================================================
// PIPELINE CRUD
// ============================================================================

export function updatePipeline(id: string, updates: Partial<Pipeline>): Pipeline | null {
    const existing = getPipelineById(id);
    if (!existing) return null;
    
    const now = new Date().toISOString();
    const fields: string[] = [];
    const params: any[] = [];
    
    if (updates.name !== undefined) { fields.push('name = ?'); params.push(updates.name); }
    if (updates.description !== undefined) { fields.push('description = ?'); params.push(updates.description); }
    if (updates.steps !== undefined) { fields.push('steps = ?'); params.push(JSON.stringify(updates.steps)); }
    
    fields.push('updated_at = ?');
    params.push(now);
    params.push(id);
    
    db.prepare(`UPDATE pipelines SET ${fields.join(', ')} WHERE id = ?`).run(...params);
    
    return getPipelineById(id);
}

export function deletePipeline(id: string): boolean {
    const result = db.prepare('DELETE FROM pipelines WHERE id = ?').run(id);
    return result.changes > 0;
}

// ============================================================================
// SAVE DYNAMIC PIPELINE AS TEMPLATE
// ============================================================================

export function saveDynamicPipelineAsTemplate(taskId: string, name: string, description: string): Pipeline | null {
    const taskPipeline = getTaskPipeline(taskId);
    if (!taskPipeline || !taskPipeline.isDynamic || !taskPipeline.workflowIds) {
        return null;
    }
    
    const steps = taskPipeline.workflowIds.map(wfId => ({
        workflowId: wfId,
        onFailure: 'stop' as const,
    }));
    
    const pipeline = createPipeline(name, description, steps, false, taskId);
    
    // Update task to point to new pipeline
    db.prepare('UPDATE task_pipelines SET pipeline_id = ?, workflow_ids = NULL, is_dynamic = 0 WHERE task_id = ?')
        .run(pipeline.id, taskId);
    
    return pipeline;
}
