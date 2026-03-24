import { NextResponse } from 'next/server';
import { getTasks } from '@/lib/domain/tasks';
import { createTaskWithPlan, getTaskTemplateById } from '@/lib/domain/task-runs';
import type { StepPacketInput, TaskStatus } from '@/lib/types';

export const dynamic = 'force-dynamic';

function parseInclude(url: URL) {
  const includeParam = url.searchParams.get('include');
  const include = new Set((includeParam || '').split(',').map((value) => value.trim()).filter(Boolean));
  return {
    includeComments: include.has('comments'),
    includeActivity: include.has('activity'),
    includeEvidence: include.has('evidence'),
    includeCurrentRun: include.has('currentRun'),
    includePlan: include.has('plan'),
    includeIssues: include.has('issues'),
  };
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const statusParam = url.searchParams.get('status');
    const owner = url.searchParams.get('owner');
    const project = url.searchParams.get('project');
    const queue = url.searchParams.get('queue');

    const tasks = getTasks({
      status: statusParam ? statusParam.split(',').map((value) => value.trim()) as TaskStatus[] : undefined,
      owner: owner || undefined,
      project: project || undefined,
      queueForMax: queue === 'max',
    }, parseInclude(url));

    return NextResponse.json(tasks);
  } catch (error) {
    console.error('GET /api/tasks error:', error);
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    let steps: StepPacketInput[] = body.steps || body.stagePlan || [];
    let templateDefaults: { goal?: string; acceptanceCriteria?: string[] } | undefined;

    if (body.templateId) {
      const template = getTaskTemplateById(body.templateId);
      if (!template) {
        return NextResponse.json({ error: 'Template not found' }, { status: 404 });
      }
      templateDefaults = template.taskDefaults;
      if (!steps.length) {
        steps = template.steps;
      }
    }

    const task = createTaskWithPlan({
      title: body.title,
      goal: body.goal || templateDefaults?.goal,
      description: body.description,
      priority: body.priority,
      project: body.project,
      initiatedBy: body.initiatedBy || body.owner || 'max',
      owner: body.owner || 'max',
      acceptanceCriteria: body.acceptanceCriteria || templateDefaults?.acceptanceCriteria || [],
      templateId: body.templateId,
      steps,
    });

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    console.error('POST /api/tasks error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to create task' }, { status: 400 });
  }
}
