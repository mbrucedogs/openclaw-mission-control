import { NextRequest, NextResponse } from 'next/server';
import { getDocumentFolders, createDocumentFolder } from '@/lib/domain/documents';

export async function GET() {
    const folders = getDocumentFolders();
    return NextResponse.json(folders);
}

export async function POST(req: NextRequest) {
    const { name } = await req.json();
    if (!name?.trim()) return NextResponse.json({ error: 'Name required' }, { status: 400 });
    try {
        const folder = createDocumentFolder(name.trim());
        return NextResponse.json(folder, { status: 201 });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to create document folder';
        return NextResponse.json({ error: message }, { status: 400 });
    }
}
