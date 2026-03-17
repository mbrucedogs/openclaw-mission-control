import { db } from '../db';
import { DocumentEntry, RepoDocument, DocumentFolder, LinkedTask } from '../types';
import fs from 'fs';
import path from 'path';
import { WORKSPACE_ROOTS, EXCLUDED_FOLDERS, ALLOWED_EXTENSIONS, expandHome } from '../config';


// ─── Viewer Mode (filesystem-backed, via local_documents table) ───────────────

export function getLocalDocuments(query?: string): DocumentEntry[] {
    if (query) {
        const search = `%${query}%`;
        return db.prepare('SELECT * FROM local_documents WHERE title LIKE ? OR path LIKE ? ORDER BY updatedAt DESC')
            .all(search, search) as DocumentEntry[];
    }
    return db.prepare('SELECT * FROM local_documents ORDER BY updatedAt DESC').all() as DocumentEntry[];
}

/** Legacy alias */
export function getDocuments(query?: string): DocumentEntry[] {
    return getLocalDocuments(query);
}

export function getLocalFileContent(filePath: string): string {
    const expandedPath = expandHome(filePath);
    try {
        return fs.readFileSync(expandedPath, 'utf-8');
    } catch {
        return 'Could not load file content.';
    }
}

/** List workspace files recursively with metadata */
export function listWorkspaceFiles(rootDir: string, relativeDir: string = ''): DocumentEntry[] {
    const expandedRoot = expandHome(rootDir);
    const fullDirPath = relativeDir ? path.join(expandedRoot, relativeDir) : expandedRoot;
    if (!fs.existsSync(fullDirPath)) return [];

    let results: DocumentEntry[] = [];
    const items = fs.readdirSync(fullDirPath);

    for (const item of items) {
        if (item.startsWith('.') || EXCLUDED_FOLDERS.includes(item)) continue;

        const fullPath = path.join(fullDirPath, item);
        const itemRelativePath = relativeDir ? path.join(relativeDir, item) : item;
        
        try {
            const stats = fs.statSync(fullPath);
            if (stats.isDirectory()) {
                results = results.concat(listWorkspaceFiles(rootDir, itemRelativePath));
            } else if (ALLOWED_EXTENSIONS.some(ext => item.endsWith(ext))) {
                results.push({
                    id: itemRelativePath.replace(/[\/\\]/g, '-'),
                    title: item.replace(/\.[^/.]+$/, '').replace(/-/g, ' '),
                    path: fullPath,
                    category: rootDir.split('/').pop() || 'unknown',
                    updatedAt: stats.mtime.toISOString(),
                });
            }
        } catch {
            // skip unreadable
        }
    }

    return results;
}

/** Search workspace files by content */
export function searchWorkspaceFiles(rootDir: string, query: string): DocumentEntry[] {
    const expandedRoot = expandHome(rootDir);
    const all = listWorkspaceFiles(expandedRoot);
    const q = query.toLowerCase();
    return all.filter(f => {
        if (f.title.toLowerCase().includes(q)) return true;
        try {
            const content = fs.readFileSync(f.path, 'utf-8').toLowerCase();
            return content.includes(q);
        } catch { return false; }
    });
}

// ─── Repo Mode (database-backed CRUD) ─────────────────────────────────────────

export function getRepoDocuments(opts?: { search?: string; folder_id?: number }): RepoDocument[] {
    let sql = 'SELECT * FROM documents WHERE 1=1';
    const params: any[] = [];

    if (opts?.search) {
        sql += ' AND (title LIKE ? OR summary LIKE ? OR content LIKE ?)';
        const s = `%${opts.search}%`;
        params.push(s, s, s);
    }
    if (opts?.folder_id !== undefined) {
        sql += ' AND folder_id = ?';
        params.push(opts.folder_id);
    }
    sql += ' ORDER BY updated_at DESC';

    return (db.prepare(sql).all(...params) as any[]).map(parseRepoDoc);
}

export function getRepoDocumentById(id: number): (RepoDocument & { linkedTasks: LinkedTask[] }) | null {
    const row = db.prepare('SELECT * FROM documents WHERE id = ?').get(id) as any;
    if (!row) return null;
    const doc = parseRepoDoc(row);
    const linkedTasks = db.prepare(`
        SELECT dt.id, dt.task_id, dt.link_type, t.title, t.status
        FROM document_tasks dt
        LEFT JOIN tasks t ON t.id = dt.task_id
        WHERE dt.document_id = ?
    `).all(id) as LinkedTask[];

    return { ...doc, linkedTasks };
}

export function createRepoDocument(d: Omit<RepoDocument, 'id' | 'updated_at'>): RepoDocument {
    const tags = JSON.stringify(d.tags || []);
    const result = db.prepare(`
        INSERT INTO documents (title, summary, content, source_url, document_type, folder_id, tags)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(d.title, d.summary || null, d.content || null, d.source_url || null, d.document_type, d.folder_id || null, tags);
    return getRepoDocumentById(result.lastInsertRowid as number)!;
}

export function updateRepoDocument(id: number, d: Partial<RepoDocument>): RepoDocument | null {
    const existing = db.prepare('SELECT * FROM documents WHERE id = ?').get(id) as any;
    if (!existing) return null;

    const updated = {
        title: d.title ?? existing.title,
        summary: d.summary ?? existing.summary,
        content: d.content ?? existing.content,
        source_url: d.source_url ?? existing.source_url,
        document_type: d.document_type ?? existing.document_type,
        folder_id: d.folder_id ?? existing.folder_id,
        tags: d.tags ? JSON.stringify(d.tags) : existing.tags,
    };

    db.prepare(`
        UPDATE documents SET title=?, summary=?, content=?, source_url=?, document_type=?, folder_id=?, tags=?, updated_at=datetime('now')
        WHERE id=?
    `).run(updated.title, updated.summary, updated.content, updated.source_url, updated.document_type, updated.folder_id, updated.tags, id);

    return getRepoDocumentById(id);
}

export function deleteRepoDocument(id: number): boolean {
    const result = db.prepare('DELETE FROM documents WHERE id = ?').run(id);
    return result.changes > 0;
}

// ─── Folders ──────────────────────────────────────────────────────────────────

export function getDocumentFolders(): DocumentFolder[] {
    return db.prepare('SELECT * FROM document_folders ORDER BY name').all() as DocumentFolder[];
}

export function createDocumentFolder(name: string): DocumentFolder {
    const result = db.prepare('INSERT INTO document_folders (name) VALUES (?)').run(name);
    return db.prepare('SELECT * FROM document_folders WHERE id = ?').get(result.lastInsertRowid) as DocumentFolder;
}

// ─── Task Linking ─────────────────────────────────────────────────────────────

export function linkTask(documentId: number, taskId: string, linkType: string = 'related'): void {
    db.prepare('INSERT INTO document_tasks (document_id, task_id, link_type) VALUES (?, ?, ?)').run(documentId, taskId, linkType);
}

export function unlinkTask(documentId: number, taskId: string): boolean {
    const result = db.prepare('DELETE FROM document_tasks WHERE document_id = ? AND task_id = ?').run(documentId, taskId);
    return result.changes > 0;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseRepoDoc(row: any): RepoDocument {
    return {
        ...row,
        tags: row.tags ? JSON.parse(row.tags) : [],
    };
}
