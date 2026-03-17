import { db } from '../db';
import { WorkflowTemplate, Pipeline, PipelineStep, TaskPipeline, PipelineMatchResult, AgentRole } from '../types/workflows';

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
        timeoutSeconds: (row as any).timeout_seconds,
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
        timeoutSeconds: row.timeout_seconds,
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
            // Steps from DB have snake_case keys
            const steps = pipeline.steps as any[];
            return {
                matched: true,
                pipelineId: pipeline.id,
                pipelineName: pipeline.name,
                workflowIds: steps.map(s => s.workflow_id || s.workflowId),
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
                // Steps from DB have snake_case keys
                const steps = pipeline.steps as any[];
                return {
                    matched: true,
                    pipelineId: pipeline.id,
                    pipelineName: pipeline.name,
                    workflowIds: steps.map(s => s.workflow_id || s.workflowId),
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
    
    // Check if this is primarily a research task (expanded keywords)
    const isResearchTask = text.includes('research') || text.includes('investigate') || 
                          text.includes('analyze') || text.includes('study') ||
                          text.includes('extract') || text.includes('summarize') ||
                          text.includes('explore') || text.includes('discover') ||
                          text.includes('find out') || text.includes('look into') ||
                          text.includes('survey') || text.includes('compare') ||
                          text.includes('evaluate');
    
    // Check if this is primarily a documentation task (expanded keywords)
    const isDocTask = text.includes('document') || text.includes('readme') || 
                     text.includes('docs') || text.includes('write') ||
                     text.includes('create summary') || text.includes('document findings') ||
                     text.includes('explain') || text.includes('describe') ||
                     text.includes('guide') || text.includes('manual') ||
                     text.includes('tutorial') || text.includes('wiki');
    
    // Check if this is a design task (UI/UX)
    const isDesignTask = text.includes('design') || text.includes('ui') || 
                        text.includes('ux') || text.includes('wireframe') ||
                        text.includes('mockup') || text.includes('prototype');
    
    // Determine which workflows are needed
    if (isResearchTask) {
        workflowIds.push('wf-research');
        reasons.push('research detected');
    }
    
    // Design workflow (separate from research/build)
    if (isDesignTask && !isResearchTask) {
        workflowIds.push('wf-design');
        reasons.push('design detected');
    }
    
    // Only add build if explicitly building/coding (not just researching implementation)
    // Must have explicit build keywords AND not be research-only
    const hasExplicitBuild = text.includes('build ') || text.includes('create code') || 
                            text.includes('write code') || text.includes('develop feature') ||
                            text.includes('implement feature') || text.includes('build component') ||
                            text.includes('develop') || text.includes('code ') ||
                            text.includes('program') || text.includes('engineer') ||
                            text.includes('construct') || text.includes('architect');
    
    if (hasExplicitBuild && !isResearchTask) {
        workflowIds.push('wf-build');
        reasons.push('build detected');
    }
    
    // Refactor workflow
    const isRefactor = text.includes('refactor') || text.includes('restructure') ||
                      text.includes('reorganize') || text.includes('clean up code');
    if (isRefactor && !isResearchTask) {
        workflowIds.push('wf-refactor');
        reasons.push('refactor detected');
    }
    
    // Quick fix - only if explicitly fixing something (expanded keywords)
    const isQuickFix = (text.includes('fix') || text.includes('bug') || 
                       text.includes('patch') || text.includes('resolve') ||
                       text.includes('repair') || text.includes('debug') ||
                       text.includes('correct') || text.includes('address')) && 
                       text.includes('quick');
    if (isQuickFix && !workflowIds.includes('wf-build') && !workflowIds.includes('wf-refactor')) {
        workflowIds.push('wf-quick-fix');
        reasons.push('quick fix detected');
    }
    
    // Documentation - add if creating docs (separate from research)
    if (isDocTask && workflowIds.includes('wf-research')) {
        // Research tasks that need documentation get document workflow
        workflowIds.push('wf-document');
        reasons.push('documentation required');
    } else if (isDocTask && !isResearchTask) {
        // Pure documentation tasks
        workflowIds.push('wf-document');
        reasons.push('documentation detected');
    }
    
    // Test - expanded keywords
    const isTest = (text.includes('test') || text.includes('qa') || 
                   text.includes('check') || text.includes('ensure') ||
                   text.includes('confirm')) && 
                   (text.includes('run tests') || text.includes('verify') || 
                    text.includes('validate') || text.includes('check'));
    if (isTest) {
        workflowIds.push('wf-test');
        reasons.push('testing detected');
    }
    
    // Performance optimization
    const isPerf = text.includes('optimize') || text.includes('improve performance') ||
                   text.includes('speed up') || text.includes('performance') ||
                   text.includes('efficiency');
    if (isPerf && !isResearchTask) {
        workflowIds.push('wf-perf');
        reasons.push('performance optimization detected');
    }
    
    // Security audit/review
    const isSecurity = text.includes('secure') || text.includes('security audit') ||
                       text.includes('vulnerability') || text.includes('pen test') ||
                       text.includes('security review');
    if (isSecurity) {
        workflowIds.push('wf-security');
        reasons.push('security detected');
    }
    
    // Migration
    const isMigrate = text.includes('migrate') || text.includes('migration') ||
                      text.includes('port') || text.includes('upgrade');
    if (isMigrate && !isResearchTask) {
        workflowIds.push('wf-migrate');
        reasons.push('migration detected');
    }
    
    // Deployment/Release
    const isDeploy = text.includes('deploy') || text.includes('release') ||
                     text.includes('publish') || text.includes('ship') ||
                     text.includes('launch');
    if (isDeploy && !isResearchTask) {
        workflowIds.push('wf-deploy');
        reasons.push('deployment detected');
    }
    
    // Configuration/Setup
    const isConfig = text.includes('configure') || text.includes('setup') ||
                      text.includes('provision') || text.includes('install');
    if (isConfig && !isResearchTask) {
        workflowIds.push('wf-config');
        reasons.push('configuration detected');
    }
    
    // Automation - expanded
    // CRITICAL: Don't add automation to research tasks
    const isAutomate = !isResearchTask && (
        text.includes('automate') || text.includes('cron') || text.includes('bot') ||
        text.includes('pipeline') || text.includes('workflow automation') ||
        (text.includes('script') && text.includes('automation'))
    );
    if (isAutomate) {
        workflowIds.push('wf-automate');
        reasons.push('automation detected');
    }
    
    // Always add review at the end
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
    timeoutSeconds?: number;
    model?: string;
    systemPrompt?: string;
    validationChecklist?: string[];
    tags?: string[];
}): WorkflowTemplate {
    const now = new Date().toISOString();
    const id = 'wf-' + Math.random().toString(36).substring(2, 10);
    
    db.prepare(`
        INSERT INTO workflow_templates (id, name, description, agent_role, agent_id, timeout_seconds, model, system_prompt, validation_checklist, tags, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
        id,
        input.name,
        input.description || null,
        input.agentRole,
        input.agentId || null,
        input.timeoutSeconds || 30,
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
        agentRole: input.agentRole as AgentRole,
        agentId: input.agentId,
        timeoutSeconds: input.timeoutSeconds || 30,
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
    if (updates.timeoutSeconds !== undefined) { fields.push('timeout_seconds = ?'); params.push(updates.timeoutSeconds); }
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


// ============================================================================
// TASK WORKFLOW STEP CRUD
// Full audit trail for each step in a pipeline
// ============================================================================

import { TaskWorkflowStep } from '../types/workflows';

export function createTaskWorkflowStep(input: {
    taskId: string;
    stepNumber: number;
    workflowId: string;
    workflowName: string;
    agentId: string;
    agentName?: string;
    nextStepId?: string;
}): TaskWorkflowStep {
    const now = new Date().toISOString();
    const id = 'step-' + Math.random().toString(36).substring(2, 10);
    
    db.prepare(`
        INSERT INTO task_workflow_steps (
            id, task_id, step_number, workflow_id, workflow_name, agent_id, agent_name,
            status, evidence_ids, deliverables, next_step_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
        id,
        input.taskId,
        input.stepNumber,
        input.workflowId,
        input.workflowName,
        input.agentId,
        input.agentName || null,
        'pending',
        '[]',
        '[]',
        input.nextStepId || null,
        now,
        now
    );
    
    return getTaskWorkflowStepById(id)!;
}

export function getTaskWorkflowStepById(id: string): TaskWorkflowStep | null {
    const row = db.prepare('SELECT * FROM task_workflow_steps WHERE id = ?').get(id) as any;
    if (!row) return null;
    
    return hydrateTaskWorkflowStep(row);
}

export function getTaskWorkflowSteps(taskId: string): TaskWorkflowStep[] {
    const rows = db.prepare('SELECT * FROM task_workflow_steps WHERE task_id = ? ORDER BY step_number').all(taskId) as any[];
    return rows.map(hydrateTaskWorkflowStep);
}

export function getCurrentTaskWorkflowStep(taskId: string): TaskWorkflowStep | null {
    const row = db.prepare(`
        SELECT * FROM task_workflow_steps 
        WHERE task_id = ? AND status IN ('pending', 'in-progress', 'blocked')
        ORDER BY step_number 
        LIMIT 1
    `).get(taskId) as any;
    
    if (!row) return null;
    return hydrateTaskWorkflowStep(row);
}

export function startTaskWorkflowStep(id: string): TaskWorkflowStep | null {
    const now = new Date().toISOString();
    
    db.prepare(`
        UPDATE task_workflow_steps 
        SET status = 'in-progress', started_at = ?, updated_at = ?
        WHERE id = ?
    `).run(now, now, id);
    
    return getTaskWorkflowStepById(id);
}

export function completeTaskWorkflowStep(
    id: string, 
    input: {
        evidenceIds?: string[];
        deliverables?: string[];
        completionNotes?: string;
        passFail?: 'pass' | 'fail';
        validatedBy?: string;
        validationNotes?: string;
        handoffNotes?: string;
    }
): TaskWorkflowStep | null {
    const step = getTaskWorkflowStepById(id);
    if (!step) return null;
    
    const now = new Date().toISOString();
    const startedAt = step.startedAt ? new Date(step.startedAt) : new Date(now);
    const completedAt = new Date(now);
    const durationMinutes = Math.round((completedAt.getTime() - startedAt.getTime()) / 60000);
    
    db.prepare(`
        UPDATE task_workflow_steps 
        SET status = 'complete',
            completed_at = ?,
            duration_minutes = ?,
            evidence_ids = ?,
            deliverables = ?,
            completion_notes = ?,
            pass_fail = ?,
            validated_by = ?,
            validation_notes = ?,
            handoff_notes = ?,
            updated_at = ?
        WHERE id = ?
    `).run(
        now,
        durationMinutes,
        JSON.stringify(input.evidenceIds || []),
        JSON.stringify(input.deliverables || []),
        input.completionNotes || null,
        input.passFail || null,
        input.validatedBy || null,
        input.validationNotes || null,
        input.handoffNotes || null,
        now,
        id
    );
    
    return getTaskWorkflowStepById(id);
}

export function failTaskWorkflowStep(
    id: string,
    input: {
        blockers?: string;
        questions?: string;
    }
): TaskWorkflowStep | null {
    const now = new Date().toISOString();
    
    db.prepare(`
        UPDATE task_workflow_steps 
        SET status = 'failed',
            blockers = ?,
            questions = ?,
            updated_at = ?
        WHERE id = ?
    `).run(
        input.blockers || null,
        input.questions || null,
        now,
        id
    );
    
    return getTaskWorkflowStepById(id);
}

export function blockTaskWorkflowStep(
    id: string,
    blockers: string
): TaskWorkflowStep | null {
    const now = new Date().toISOString();
    
    db.prepare(`
        UPDATE task_workflow_steps 
        SET status = 'blocked',
            blockers = ?,
            updated_at = ?
        WHERE id = ?
    `).run(blockers, now, id);
    
    return getTaskWorkflowStepById(id);
}

function hydrateTaskWorkflowStep(row: any): TaskWorkflowStep {
    return {
        id: row.id,
        taskId: row.task_id,
        stepNumber: row.step_number,
        workflowId: row.workflow_id,
        workflowName: row.workflow_name,
        agentId: row.agent_id,
        agentName: row.agent_name,
        status: row.status,
        startedAt: row.started_at,
        completedAt: row.completed_at,
        durationMinutes: row.duration_minutes,
        evidenceIds: row.evidence_ids ? JSON.parse(row.evidence_ids) : [],
        deliverables: row.deliverables ? JSON.parse(row.deliverables) : [],
        completionNotes: row.completion_notes,
        blockers: row.blockers,
        questions: row.questions,
        validatedBy: row.validated_by,
        validationNotes: row.validation_notes,
        passFail: row.pass_fail,
        nextStepId: row.next_step_id,
        handoffNotes: row.handoff_notes,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}
