import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const { stdout } = await execAsync('openclaw sessions --json');
        
        let sessions = [];
        try {
            const data = JSON.parse(stdout);
            sessions = data.sessions || [];
        } catch (e) {
            console.error('Failed to parse openclaw sessions output', e);
        }

        // Map OpenClaw session details to format expected by UI or returning raw if easy
        return NextResponse.json({ sessions });
    } catch (error) {
        console.error('Failed to fetch openclaw sessions:', error);
        return NextResponse.json({ sessions: [], error: 'Failed to fetch sessions' }, { status: 500 });
    }
}
