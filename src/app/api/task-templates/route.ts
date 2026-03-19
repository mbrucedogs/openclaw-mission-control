import { NextResponse } from 'next/server';
import { createTaskTemplate, duplicateTaskTemplate, getTaskTemplates, saveRunAsTemplate } from '@/lib/domain/task-runs';
import type { StepPacketInput } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    return NextResponse.json(getTaskTemplates());
  } catch (error) {
    console.error('GET /api/task-templates error:', error);
    return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (body.runId) {
      if (!body.name) {
        return NextResponse.json({ error: 'runId and name are required' }, { status: 400 });
      }
      const template = saveRunAsTemplate(body.runId, {
        actor: body.actor || 'orchestrator',
        name: body.name,
        description: body.description,
      });
      return NextResponse.json(template, { status: 201 });
    }

    if (body.sourceTemplateId) {
      const template = duplicateTaskTemplate(body.sourceTemplateId, {
        actor: body.actor || 'orchestrator',
        name: body.name,
        description: body.description,
      });
      return NextResponse.json(template, { status: 201 });
    }

    if (!body.name || !Array.isArray(body.steps)) {
      return NextResponse.json({ error: 'name and steps are required' }, { status: 400 });
    }

    const template = createTaskTemplate({
      actor: body.actor || 'orchestrator',
      name: body.name,
      description: body.description,
      taskDefaults: body.taskDefaults ? {
        goal: body.taskDefaults.goal,
        acceptanceCriteria: body.taskDefaults.acceptanceCriteria,
      } : undefined,
      steps: body.steps as StepPacketInput[],
    });
    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    console.error('POST /api/task-templates error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to save template' }, { status: 400 });
  }
}
