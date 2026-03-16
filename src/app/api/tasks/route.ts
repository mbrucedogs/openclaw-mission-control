import { NextResponse } from 'next/server';
import { getTasks, getTaskById, createTask, updateTask, deleteTask, TaskFilters } from '@/lib/domain/tasks';
import { matchPipelineToTask, setTaskPipeline } from '@/lib/domain/workflows';
import { TaskStatus, Priority } from '@/lib/types';
import { randomUUID } from 'crypto';

export const dynamic = 'force-dynamic';

// GET /api/tasks
export async function GET(request: Request) {
    try {
        const url = new URL(request.url);
        
        // Parse filters
        const filters: TaskFilters = {};
        const status = url.searchParams.get('status') as TaskStatus | null;
        const owner = url.searchParams.get('owner');
        const project = url.searchParams.get('project');
        const isStuck = url.searchParams.get('isStuck');
        
        if (status) filters.status = status;
        if (owner) filters.owner = owner;
        if (project) filters.project = project;
        if (isStuck !== null) filters.isStuck = isStuck === 'true';
        
        // Parse includes
        const includeParam = url.searchParams.get('include');
        const include = includeParam ? includeParam.split(',') as ('comments' | 'activity' | 'evidence')[] : undefined;
        
        const tasks = getTasks(Object.keys(filters).length > 0 ? filters : undefined, include);
        return NextResponse.json(tasks);
    } catch (error) {
        console.error('GET /api/tasks error:', error);
        return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 });
    }
}

// POST /api/tasks
export async function POST(req: Request) {
    try {
        const body = await req.json();
        
        if (!body.title) {
            return NextResponse.json({ error: 'Title is required' }, { status: 400 });
        }

        // MAX: Match task to pipeline
        const pipelineMatch = matchPipelineToTask(body.title, body.description);
        
        // Determine owner from pipeline
        let owner = body.owner;
        if (!owner && pipelineMatch.workflowIds) {
            // Get first workflow to determine owner
            const { getWorkflowTemplateById } = await import('@/lib/domain/workflows');
            const firstWorkflow = await getWorkflowTemplateById(pipelineMatch.workflowIds[0]);
            owner = firstWorkflow?.agentId || 'matt';
        } else if (!owner && pipelineMatch.pipelineId) {
            // Get pipeline and first step
            const { getPipelineById } = await import('@/lib/domain/workflows');
            const pipeline = await getPipelineById(pipelineMatch.pipelineId);
            if (pipeline?.steps[0]) {
                const { getWorkflowTemplateById } = await import('@/lib/domain/workflows');
                const firstWorkflow = await getWorkflowTemplateById(pipeline.steps[0].workflowId);
                owner = firstWorkflow?.agentId || 'matt';
            }
        }
        owner = owner || 'matt';
        
        const priority = (body.priority as Priority) || 'normal';
        
        const task = createTask({
            title: body.title,
            description: body.description,
            status: (body.status as TaskStatus) || 'In Progress',
            priority,
            owner,
            requestedBy: body.requestedBy || 'matt',
            reviewer: body.reviewer,
            project: body.project,
            executionMode: body.executionMode || 'local',
            validationCriteria: body.validationCriteria,
        });

        // Store pipeline match for this task
        setTaskPipeline(task.id, pipelineMatch);

        return NextResponse.json({
            ...task,
            _meta: {
                pipelineMatch: pipelineMatch.matched ? {
                    pipelineId: pipelineMatch.pipelineId,
                    pipelineName: pipelineMatch.pipelineName,
                    workflowIds: pipelineMatch.workflowIds,
                    isDynamic: pipelineMatch.isDynamic,
                    confidence: pipelineMatch.confidence,
                    reason: pipelineMatch.reason,
                } : null,
            }
        }, { status: 201 });
    } catch (error) {
        console.error('POST /api/tasks error:', error);
        return NextResponse.json({ error: 'Failed to create task' }, { status: 500 });
    }
}

// PATCH /api/tasks (bulk update - not implemented)
export async function PATCH(req: Request) {
    return NextResponse.json({ error: 'Bulk updates not supported. Use /api/tasks/[id]' }, { status: 405 });
}
