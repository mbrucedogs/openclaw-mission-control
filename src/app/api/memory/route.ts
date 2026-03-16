import { NextRequest, NextResponse } from 'next/server';
import { listWorkspaceFiles, searchWorkspaceFiles, getLocalFileContent } from '@/lib/domain/documents';

const WORKSPACE_ROOTS = [
    '/Volumes/Data/openclaw/workspace/memory',
    '/Volumes/Data/openclaw/workspace/tmp',
    '/Volumes/Data/openclaw/workspace/docs',
    '/Volumes/Data/openclaw/workspace/projects/Web/alex-mission-control/docs/plans',
];

export async function GET(req: NextRequest) {
    const action = req.nextUrl.searchParams.get('action');
    const query = req.nextUrl.searchParams.get('query') || '';
    const filePath = req.nextUrl.searchParams.get('path') || '';
    const root = req.nextUrl.searchParams.get('root') || '';

    switch (action) {
        case 'list': {
            const targetRoot = root || WORKSPACE_ROOTS[0];
            const files = listWorkspaceFiles(targetRoot);
            return NextResponse.json({ files, roots: WORKSPACE_ROOTS });
        }

        case 'search': {
            if (!query) return NextResponse.json({ error: 'query required' }, { status: 400 });
            const results = WORKSPACE_ROOTS.flatMap(r => searchWorkspaceFiles(r, query));
            return NextResponse.json({ files: results, roots: WORKSPACE_ROOTS });
        }

        case 'content': {
            if (!filePath) return NextResponse.json({ error: 'path required' }, { status: 400 });
            // Security: block path traversal outside workspace
            if (!WORKSPACE_ROOTS.some(r => filePath.startsWith(r))) {
                return NextResponse.json({ error: 'Access denied' }, { status: 403 });
            }
            const content = getLocalFileContent(filePath);
            return NextResponse.json({ content, path: filePath });
        }

        default:
            return NextResponse.json({ error: 'action must be list, search, or content' }, { status: 400 });
    }
}
