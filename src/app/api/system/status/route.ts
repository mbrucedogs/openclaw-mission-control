import { NextResponse } from 'next/server';
import { isSystemReady } from '@/lib/domain/agents';

export async function GET() {
    try {
        const ready = isSystemReady();
        return NextResponse.json({ ready });
    } catch (error) {
        console.error('Failed to get system status:', error);
        return NextResponse.json({ ready: false }, { status: 500 });
    }
}
