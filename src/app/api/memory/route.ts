import { NextRequest, NextResponse } from 'next/server';
import { listWorkspaceFiles, searchWorkspaceFiles, getLocalFileContent } from '@/lib/domain/documents';
import { WORKSPACE_ROOTS } from '@/lib/config';

export async function GET(req: NextRequest) {
    const action = req.nextUrl.searchParams.get('action');
    const query = req.nextUrl.searchParams.get('query') || '';
    const filePath = req.nextUrl.searchParams.get('path') || '';
    const root = req.nextUrl.searchParams.get('root') || '';

    switch (action) {
        case 'list': {
            let files: any[] = [];
            if (root) {
                files = listWorkspaceFiles(root);
            } else {
                files = WORKSPACE_ROOTS.flatMap(r => listWorkspaceFiles(r));
            }

            if (query) {
                const q = query.toLowerCase();
                files = files.filter(f => f.title.toLowerCase().includes(q) || f.path.toLowerCase().includes(q));
            }
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
