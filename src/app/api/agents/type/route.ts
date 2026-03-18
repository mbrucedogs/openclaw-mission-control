import { NextResponse } from 'next/server';
import { updateAgentType } from '@/lib/domain/agents';
import { seedDefaultWorkflows } from '@/lib/domain/workflows';

export async function POST(request: Request) {
    try {
        const { id, type } = await request.json();
        if (!id || !type) {
            return NextResponse.json({ error: 'ID and type are required' }, { status: 400 });
        }
        
        updateAgentType(id, type);
        
        // Dynamically seed workflows based on the new agent configuration
        seedDefaultWorkflows();
        
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Failed to update agent type:', error);
        return NextResponse.json({ error: 'Failed to update agent type' }, { status: 500 });
    }
}
