import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;

    if (
        pathname === '/login'
        || pathname === '/api/auth/login'
        || pathname.startsWith('/_next')
        || pathname.includes('.')
    ) {
        return NextResponse.next();
    }

    const authToken = request.cookies.get('auth-token');
    const apiKeyHeader = request.headers.get('x-api-key');
    const systemApiKey = process.env.API_KEY;

    const isSessionAuth = Boolean(authToken);
    const isApiKeyAuth = Boolean(systemApiKey && apiKeyHeader === systemApiKey);

    if (isSessionAuth || isApiKeyAuth) {
        return NextResponse.next();
    }

    if (pathname.startsWith('/api')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
