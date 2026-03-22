import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

type UserRow = {
    username: string;
    role: string;
    createdAt: string;
};

type UserBody = {
    username?: string;
    password?: string;
    role?: string;
};

function isSqliteConstraintError(error: unknown): error is { code: string } {
    return Boolean(
        error
        && typeof error === 'object'
        && 'code' in error
        && typeof (error as { code?: unknown }).code === 'string',
    );
}

export async function GET() {
    try {
        const users = db.prepare('SELECT username, role, createdAt FROM users').all() as UserRow[];
        return NextResponse.json(users);
    } catch (error) {
        console.error('Failed to fetch users:', error);
        return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const { username, password, role } = await request.json() as UserBody;

        if (!username || !password) {
            return NextResponse.json({ error: 'Username and password required' }, { status: 400 });
        }

        db.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)').run(
            username,
            password,
            role || 'user'
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        if (isSqliteConstraintError(error) && error.code === 'SQLITE_CONSTRAINT_PRIMARYKEY') {
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
