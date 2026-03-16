import { NextRequest, NextResponse } from 'next/server';
import { getRepoDocuments, createRepoDocument } from '@/lib/domain/documents';

export async function GET(req: NextRequest) {
    const search = req.nextUrl.searchParams.get('search') || undefined;
    const folderId = req.nextUrl.searchParams.get('folder_id');
    const docs = getRepoDocuments({
        search,
        folder_id: folderId ? Number(folderId) : undefined,
    });
    return NextResponse.json(docs);
}

export async function POST(req: NextRequest) {
    const body = await req.json();
    if (!body.title?.trim()) return NextResponse.json({ error: 'Title required' }, { status: 400 });
    const doc = createRepoDocument({
        title: body.title.trim(),
        summary: body.summary || undefined,
        content: body.content || undefined,
        source_url: body.source_url || undefined,
        document_type: body.document_type || 'note',
        folder_id: body.folder_id || undefined,
        tags: body.tags || [],
    });
    return NextResponse.json(doc, { status: 201 });
}
