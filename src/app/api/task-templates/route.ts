import { NextResponse } from 'next/server';
import { getTaskTemplates, saveRunAsTemplate } from '@/lib/domain/task-runs';

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
    if (!body.runId || !body.name) {
      return NextResponse.json({ error: 'runId and name are required' }, { status: 400 });
    }
    const template = saveRunAsTemplate(body.runId, {
      actor: body.actor || 'max',
      name: body.name,
      description: body.description,
    });
    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    console.error('POST /api/task-templates error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to save template' }, { status: 400 });
  }
}
