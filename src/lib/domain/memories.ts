import { readdir, readFile } from 'fs/promises';
import { join, basename } from 'path';
import type { MemoryEntry } from '../types';

const MEMORY_DIR = '/Users/mattbruce/.openclaw/workspace/memory';

function fileIdToDate(id: string): string {
    // "2026-03-22" -> "2026-03-22"
    // "daily-2026-03-22" -> "2026-03-22"
    // "memory-long-term" -> "long-term"
    return id.replace(/^daily-/, '');
}

function inferCategory(id: string): 'daily' | 'long-term' {
    if (id === 'memory-long-term' || id === 'long-term') return 'long-term';
    return 'daily';
}

function fileToTimestamp(filename: string, id: string): string {
    // Use the date embedded in the filename, fall back to file mtime
    const dateMatch = id.match(/^(\d{4}-\d{2}-\d{2})$/);
    if (dateMatch) {
        return new Date(dateMatch[1] + 'T23:59:00Z').toISOString();
    }
    if (id === 'memory-long-term') {
        return new Date('2026-03-22T00:00:00Z').toISOString();
    }
    return new Date().toISOString();
}

export async function getMemories(query?: string): Promise<MemoryEntry[]> {
    let files: string[] = [];
    try {
        files = await readdir(MEMORY_DIR);
    } catch {
        return [];
    }

    const memories: MemoryEntry[] = [];

    for (const file of files) {
        if (!file.endsWith('.md')) continue;

        const id = file.replace(/\.md$/, '');
        const filePath = join(MEMORY_DIR, file);

        let content: string;
        try {
            content = await readFile(filePath, 'utf-8');
        } catch {
            continue;
        }

        // Filter by query if provided
        if (query && !content.toLowerCase().includes(query.toLowerCase()) && !id.toLowerCase().includes(query.toLowerCase())) {
            continue;
        }

        const category = inferCategory(id);

        memories.push({
            id,
            content,
            timestamp: fileToTimestamp(file, id),
            category,
        });
    }

    // Sort newest first
    memories.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return memories;
}
