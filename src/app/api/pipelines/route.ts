import { NextResponse } from 'next/server';
import { getWorkflowTemplates, getWorkflowTemplateById, incrementWorkflowUse, getPipelines, getPipelineById, incrementPipelineUse, saveDynamicPipelineAsTemplate } from '@/lib/domain/workflows';

export const dynamic = 'force-dynamic';

// GET /api/pipelines
export async function GET(request: Request) {
    try {
        const url = new URL(request.url);
        const includeDynamic = url.searchParams.get('includeDynamic') === 'true';
        
        const pipelines = getPipelines(includeDynamic);
        return NextResponse.json(pipelines);
    } catch (error) {
        console.error('GET /api/pipelines error:', error);
        return NextResponse.json({ error: 'Failed to fetch pipelines' }, { status: 500 });
    }
}

// POST /api/pipelines - Create new pipeline
export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { name, description, steps } = body;
        
        if (!name || !steps || !Array.isArray(steps)) {
            return NextResponse.json({ error: 'Name and steps array required' }, { status: 400 });
        }
        
        // Validate that all steps reference existing workflows with agents
        for (const step of steps) {
            if (!step.workflow_id) {
                return NextResponse.json({ error: 'Each step must have a workflow_id' }, { status: 400 });
            }
            
            const workflow = await getWorkflowTemplateById(step.workflow_id);
            if (!workflow) {
                return NextResponse.json({ error: `Workflow ${step.workflow_id} does not exist` }, { status: 400 });
            }
            
            if (!workflow.agentId) {
                return NextResponse.json({ error: `Workflow ${step.workflow_id} has no agent assigned. All workflows must have an agent.` }, { status: 400 });
            }
        }
        
        const { createPipeline } = await import('@/lib/domain/workflows');
        const pipeline = createPipeline(name, description, steps, false);
        
        return NextResponse.json(pipeline, { status: 201 });
    } catch (error) {
        console.error('POST /api/pipelines error:', error);
        return NextResponse.json({ error: 'Failed to create pipeline' }, { status: 500 });
    }
}

// PUT /api/pipelines - Update pipeline
export async function PUT(req: Request) {
    try {
        const body = await req.json();
        const { id, name, description, steps } = body;
        
        if (!id) {
            return NextResponse.json({ error: 'Pipeline ID required' }, { status: 400 });
        }
        
        const { updatePipeline } = await import('@/lib/domain/workflows');
        const pipeline = updatePipeline(id, { name, description, steps });
        
        if (!pipeline) {
            return NextResponse.json({ error: 'Pipeline not found' }, { status: 404 });
        }
        
        return NextResponse.json(pipeline);
    } catch (error) {
        console.error('PUT /api/pipelines error:', error);
        return NextResponse.json({ error: 'Failed to update pipeline' }, { status: 500 });
    }
}

// DELETE /api/pipelines - Delete pipeline
export async function DELETE(req: Request) {
    try {
        const body = await req.json();
        const { id } = body;
        
        if (!id) {
            return NextResponse.json({ error: 'Pipeline ID required' }, { status: 400 });
        }
        
        const { deletePipeline } = await import('@/lib/domain/workflows');
        const success = deletePipeline(id);
        
        if (!success) {
            return NextResponse.json({ error: 'Pipeline not found' }, { status: 404 });
        }
        
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('DELETE /api/pipelines error:', error);
        return NextResponse.json({ error: 'Failed to delete pipeline' }, { status: 500 });
    }
}
