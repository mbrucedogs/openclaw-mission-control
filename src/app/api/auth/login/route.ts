import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        const { username, password } = await request.json();

        if (!username || !password) {
            return NextResponse.json({ error: 'Username and password required' }, { status: 400 });
        }

        // 1. Check against environment variables (Bootstrap Admin)
        const envUser = process.env.AUTH_USER;
        const envPass = process.env.AUTH_PASS;

        const isEnvAuth = envUser && envPass && username === envUser && password === envPass;

        // 2. Check against database
        const dbUser = !isEnvAuth 
            ? db.prepare('SELECT * FROM users WHERE username = ? AND password = ?').get(username, password) as any
            : null;

        if (isEnvAuth || dbUser) {
            const response = NextResponse.json({ success: true });
            // Set cookie for authentication
            response.cookies.set('auth-token', 'authorized', {
                path: '/',
                maxAge: 86400, // 24 hours
                httpOnly: false, // Set to false to match current middleware logic if needed, but true is better for security
                sameSite: 'lax',
            });
            return response;
        }

        return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    } catch (error) {
        console.error('Login error:', error);
        return NextResponse.json({ error: 'An error occurred during login' }, { status: 500 });
    }
}
