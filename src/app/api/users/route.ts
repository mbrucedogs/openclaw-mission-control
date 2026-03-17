import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
    try {
        const users = db.prepare('SELECT username, role, createdAt FROM users').all();
        return NextResponse.json(users);
    } catch (error) {
        console.error('Failed to fetch users:', error);
        return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const { username, password, role } = await request.json();

        if (!username || !password) {
            return NextResponse.json({ error: 'Username and password required' }, { status: 400 });
        }

        db.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)').run(
            username,
            password,
            role || 'user'
        );

        return NextResponse.json({ success: true });
    } catch (error: any) {
        if (error.code === 'SQLITE_CONSTRAINT_PRIMARYKEY') {
            return NextResponse.json({ error: 'User already exists' }, { status: 400 });
        }
        console.error('Failed to create user:', error);
        return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const { username } = await request.json();

        if (!username) {
            return NextResponse.json({ error: 'Username required' }, { status: 400 });
        }

        // Prevent deleting the system admin bootstrap account if it's the only one? 
        // Or just allow it since AUTH_USER always works.
        
        db.prepare('DELETE FROM users WHERE username = ?').run(username);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Failed to delete user:', error);
        return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
    }
}
