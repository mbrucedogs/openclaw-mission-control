import { NextResponse } from 'next/server';
import { getTasks, getTaskById, createTask, updateTask, deleteTask, TaskFilters } from '@/lib/domain/tasks';
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

        const task = createTask({
            title: body.title,
            description: body.description,
            status: body.status as TaskStatus,
            priority: body.priority as Priority,
            owner: body.owner,
            requestedBy: body.requestedBy,
            reviewer: body.reviewer,
            project: body.project,
            executionMode: body.executionMode,
            validationCriteria: body.validationCriteria,
        });

        return NextResponse.json(task, { status: 201 });
    } catch (error) {
        console.error('POST /api/tasks error:', error);
        return NextResponse.json({ error: 'Failed to create task' }, { status: 500 });
    }
}

// PATCH /api/tasks (bulk update - not implemented)
export async function PATCH(req: Request) {
    return NextResponse.json({ error: 'Bulk updates not supported. Use /api/tasks/[id]' }, { status: 405 });
}
