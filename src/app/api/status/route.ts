import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
    try {
        // Basic health check and system status
        const agentCount = db.prepare('SELECT COUNT(*) as count FROM agents').get() as { count: number };
        const taskCount = db.prepare('SELECT COUNT(*) as count FROM tasks').get() as { count: number };

        return NextResponse.json({
            status: 'online',
            version: '2.0.0-mission-control',
            gateway: 'connected',
            environment: 'local',
            stats: {
                agents: agentCount.count,
                tasks: taskCount.count
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        return NextResponse.json({
            status: 'degraded',
            error: 'Database connection issue'
        }, { status: 500 });
    }
}
