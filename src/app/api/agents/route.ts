import { NextResponse } from 'next/server';
import { getAgents } from '@/lib/domain/agents';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const agents = getAgents();
        return NextResponse.json(agents);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch agents' }, { status: 500 });
    }
}
