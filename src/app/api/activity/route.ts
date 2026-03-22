import { NextResponse } from 'next/server';
import { readFileSync, existsSync, appendFileSync, mkdirSync } from 'fs';
import { join } from 'path';

export const dynamic = 'force-dynamic';

const ACTIVITY_LOG_PATH = join(process.env.HOME || '', '.openclaw', 'workspace', 'activity-log.jsonl');
const LIVENESS_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
const AGENT_WINDOW_MS = 60 * 60 * 1000; // 1 hour

type ActivityLogEntry = {
    agent_id?: string;
    actor?: string;
    message?: string;
    msg?: string;
    timestamp: string;
    [key: string]: unknown;
};

function isActivityLogEntry(value: unknown): value is ActivityLogEntry {
    if (!value || typeof value !== 'object') return false;
    const timestamp = (value as { timestamp?: unknown }).timestamp;
    return typeof timestamp === 'string';
}

function parseActivityLogEntry(line: string): ActivityLogEntry | null {
    try {
        const parsed = JSON.parse(line) as unknown;
        return isActivityLogEntry(parsed) ? parsed : null;
    } catch {
        return null;
    }
}

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
                const entry = parseActivityLogEntry(line);
                if (!entry) return null;

                const age = now - new Date(entry.timestamp).getTime();
                if (age <= LIVENESS_WINDOW_MS) return entry;
                return null;
            })
            .filter(Boolean);

        // Get unique agents active in last hour
        const agentMap: Record<string, ActivityLogEntry> = {};
        
        for (const line of lines) {
            const entry = parseActivityLogEntry(line);
            const agentId = entry?.agent_id;
            if (!entry || !agentId) {
                continue;
            }

            const age = now - new Date(entry.timestamp).getTime();
            if (age <= AGENT_WINDOW_MS) {
                const existing = agentMap[agentId];
                if (!existing || new Date(entry.timestamp) > new Date(existing.timestamp)) {
                    agentMap[agentId] = entry;
                }
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

export async function POST(request: Request) {
    try {
        const body = await request.json() as Record<string, unknown>;
        
        // Ensure the directory exists
        const logDir = join(process.env.HOME || '', '.openclaw', 'workspace');
        if (!existsSync(logDir)) {
            mkdirSync(logDir, { recursive: true });
        }

        const entry = {
            agent_id: typeof body.agent_id === 'string'
                ? body.agent_id
                : typeof body.actor === 'string'
                    ? body.actor
                    : 'unknown',
            message: typeof body.message === 'string'
                ? body.message
                : typeof body.msg === 'string'
                    ? body.msg
                    : '',
            timestamp: new Date().toISOString(),
            ...body,
        };

        appendFileSync(ACTIVITY_LOG_PATH, JSON.stringify(entry) + '\n');

        return NextResponse.json({ success: true, entry }, { status: 201 });
    } catch (error) {
        console.error('Failed to write activity log:', error);
        return NextResponse.json({ error: 'Failed to log activity' }, { status: 500 });
    }
}
