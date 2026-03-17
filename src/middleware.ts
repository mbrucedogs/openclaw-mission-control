import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // 1. Public Routes & Assets
    if (
        pathname === '/login' || 
        pathname === '/api/auth/login' || 
        pathname.startsWith('/_next') || 
        pathname.includes('.')
    ) {
        return NextResponse.next();
    }

    // 2. Authentication Checks
    const authToken = request.cookies.get('auth-token');
    const apiKeyHeader = request.headers.get('x-api-key');
    const systemApiKey = process.env.API_KEY;

    // Allow if valid cookie or valid API key
    const isSessionAuth = !!authToken;
    const isApiKeyAuth = systemApiKey && apiKeyHeader === systemApiKey;

    if (isSessionAuth || isApiKeyAuth) {
        return NextResponse.next();
    }

    // 3. Fallback: Redirect UI to login, Return 401 for API
    if (pathname.startsWith('/api')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
