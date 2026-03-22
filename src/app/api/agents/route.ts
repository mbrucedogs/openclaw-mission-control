import { NextResponse } from 'next/server';
import { getAgentsWithGateway } from '@/lib/domain/agents';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const agents = await getAgentsWithGateway();
        return NextResponse.json(agents);
    } catch {
        return NextResponse.json({ error: 'Failed to fetch agents' }, { status: 500 });
    }
}
