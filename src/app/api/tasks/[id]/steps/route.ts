import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { 
    createTaskWorkflowStep, 
    getTaskWorkflowSteps, 
    getCurrentTaskWorkflowStep,
    startTaskWorkflowStep,
    completeTaskWorkflowStep,
    failTaskWorkflowStep,
    blockTaskWorkflowStep
} from '@/lib/domain/workflows';

export const dynamic = 'force-dynamic';

// GET /api/tasks/{id}/steps - Get all steps for a task with workflow descriptions and agent names
export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        
        // Join with workflow_templates and agents to get full info
        const rows = db.prepare(`
            SELECT 
                s.*,
                w.description as workflow_description,
                w.system_prompt as workflow_prompt,
                w.validation_checklist,
                a.name as agent_full_name,
                a.role as agent_role
            FROM task_workflow_steps s
            LEFT JOIN workflow_templates w ON s.workflow_id = w.id
            LEFT JOIN agents a ON s.agent_id = a.id
            WHERE s.task_id = ?
            ORDER BY s.step_number
        `).all(id) as any[];
        
        // Parse JSON fields and map to response
        const steps = rows.map(row => ({
            id: row.id,
            taskId: row.task_id,
            stepNumber: row.step_number,
            workflowId: row.workflow_id,
            workflowName: row.workflow_name,
            workflowDescription: row.workflow_description,
            description: row.description, // Task-specific override
            workflowPrompt: row.workflow_prompt,
            validationChecklist: row.validation_checklist ? JSON.parse(row.validation_checklist) : [],
            requiredDeliverables: row.required_deliverables ? JSON.parse(row.required_deliverables) : [], // Task-specific override
            agentId: row.agent_id,
            agentName: row.agent_full_name || row.agent_name,
            agentRole: row.agent_role,
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
        }));
        
        return NextResponse.json(steps);
    } catch (error) {
        console.error('GET /api/tasks/{id}/steps error:', error);
        return NextResponse.json({ error: 'Failed to fetch steps' }, { status: 500 });
    }
}

// POST /api/tasks/{id}/steps - Create a new step
export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { workflowId, workflowName, agentId, agentName, stepNumber, nextStepId, description, requiredDeliverables } = body;
        
        if (!workflowId || !agentId || !stepNumber) {
            return NextResponse.json({ error: 'workflowId, agentId, and stepNumber required' }, { status: 400 });
        }
        
        const step = createTaskWorkflowStep({
            taskId: id,
            stepNumber,
            workflowId,
            workflowName: workflowName || workflowId,
            agentId,
            agentName,
            description,
            requiredDeliverables,
            nextStepId
        });
        
        return NextResponse.json(step, { status: 201 });
    } catch (error) {
        console.error('POST /api/tasks/{id}/steps error:', error);
        return NextResponse.json({ error: 'Failed to create step' }, { status: 500 });
    }
}