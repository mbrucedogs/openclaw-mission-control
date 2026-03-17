import { NextResponse } from 'next/server';
import { getWorkflowTemplates, getWorkflowTemplateById, incrementWorkflowUse, createWorkflow, updateWorkflow, deleteWorkflow } from '@/lib/domain/workflows';

export const dynamic = 'force-dynamic';

// GET /api/workflows
export async function GET(request: Request) {
    try {
        const url = new URL(request.url);
        const role = url.searchParams.get('role');
        
        const workflows = getWorkflowTemplates(role || undefined);
        return NextResponse.json(workflows);
    } catch (error) {
        console.error('GET /api/workflows error:', error);
        return NextResponse.json({ error: 'Failed to fetch workflows' }, { status: 500 });
    }
}

// POST /api/workflows - Create new workflow
export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { name, description, agentRole, agentId, estimatedMinutes, model, systemPrompt, validationChecklist, tags } = body;
        
        if (!name || !agentRole) {
            return NextResponse.json({ error: 'Name and agentRole required' }, { status: 400 });
        }
        
        if (!agentId) {
            return NextResponse.json({ error: 'agentId is required for all workflows. Every workflow must have an assigned agent.' }, { status: 400 });
        }
        
        const workflow = createWorkflow({
            name,
            description,
            agentRole,
            agentId,
            estimatedMinutes: estimatedMinutes || 30,
            model: model || 'gemini-2.5-flash',
            systemPrompt,
            validationChecklist: validationChecklist || [],
            tags: tags || [],
        });
        
        return NextResponse.json(workflow, { status: 201 });
    } catch (error) {
        console.error('POST /api/workflows error:', error);
        return NextResponse.json({ error: 'Failed to create workflow' }, { status: 500 });
    }
}

// PUT /api/workflows - Update workflow
export async function PUT(req: Request) {
    try {
        const body = await req.json();
        const { id, ...updates } = body;
        
        if (!id) {
            return NextResponse.json({ error: 'Workflow ID required' }, { status: 400 });
        }
        
        const workflow = updateWorkflow(id, updates);
        
        if (!workflow) {
            return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
        }
        
        return NextResponse.json(workflow);
    } catch (error) {
        console.error('PUT /api/workflows error:', error);
        return NextResponse.json({ error: 'Failed to update workflow' }, { status: 500 });
    }
}

// DELETE /api/workflows - Delete workflow
export async function DELETE(req: Request) {
    try {
        const body = await req.json();
        const { id } = body;
        
        if (!id) {
            return NextResponse.json({ error: 'Workflow ID required' }, { status: 400 });
        }
        
        const success = deleteWorkflow(id);
        
        if (!success) {
            return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
        }
        
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('DELETE /api/workflows error:', error);
        return NextResponse.json({ error: 'Failed to delete workflow' }, { status: 500 });
    }
}
