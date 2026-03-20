import { NextResponse } from 'next/server';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

export const dynamic = 'force-dynamic';

const ACTIVITY_LOG_PATH = join(process.env.HOME || '', '.openclaw', 'workspace', 'activity-log.jsonl');
const LIVENESS_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

export async function GET() {
    try {
        if (!existsSync(ACTIVITY_LOG_PATH)) {
            return NextResponse.json({ activities: [], agents: [] });
        }

        const content = readFileSync(ACTIVITY_LOG_PATH, 'utf-8');
        const lines = content.trim().split('\n').filter(Boolean);
        
        const now = Date.now();
        
        // Get activities from last 60 seconds
        const activities = lines
            .map(line => {
                try {
                    const entry = JSON.parse(line);
                    const age = now - new Date(entry.timestamp).getTime();
                    if (age <= LIVENESS_WINDOW_MS) return entry;
                } catch {
                    // skip invalid lines
                }
                return null;
            })
            .filter(Boolean);

        // Get unique agents active in last hour
        const agentMap: Record<string, any> = {};
        const hourAgo = 60 * 60 * 1000; // 1 hour
        
        for (const line of lines) {
            try {
                const entry = JSON.parse(line);
                const age = now - new Date(entry.timestamp).getTime();
                if (age <= hourAgo) {
                    if (!agentMap[entry.agent_id] || new Date(entry.timestamp) > new Date(agentMap[entry.agent_id].timestamp)) {
                        agentMap[entry.agent_id] = entry;
                    }
                }
            } catch {
                // skip
            }
        }

        return NextResponse.json({ 
            activities, 
            agents: Object.values(agentMap)
        });
    } catch (error) {
        console.error('Failed to read activity log:', error);
        return NextResponse.json({ activities: [], agents: [], error: 'Failed to read activity log' }, { status: 500 });
    }
}
