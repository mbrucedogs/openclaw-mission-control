import { NextResponse } from 'next/server';
import { deleteTaskTemplate, getTaskTemplateById, updateTaskTemplate } from '@/lib/domain/task-runs';
import type { StepPacketInput } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const template = getTaskTemplateById(id);
    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }
    return NextResponse.json(template);
  } catch (error) {
    console.error('GET /api/task-templates/[id] error:', error);
    return NextResponse.json({ error: 'Failed to fetch template' }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    if (!body.name || !Array.isArray(body.steps)) {
      return NextResponse.json({ error: 'name and steps are required' }, { status: 400 });
    }

    const template = updateTaskTemplate(id, {
      actor: body.actor || 'orchestrator',
      name: body.name,
      description: body.description,
      taskDefaults: body.taskDefaults ? {
        goal: body.taskDefaults.goal,
        acceptanceCriteria: body.taskDefaults.acceptanceCriteria,
      } : undefined,
      steps: body.steps as StepPacketInput[],
    });

    return NextResponse.json(template);
  } catch (error) {
    console.error('PATCH /api/task-templates/[id] error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to update template' }, { status: 400 });
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    deleteTaskTemplate(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('DELETE /api/task-templates/[id] error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to delete template' }, { status: 400 });
  }
}
