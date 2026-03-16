import { db } from '../db';
import { MemoryEntry } from '../types';

export function getMemories(query?: string): MemoryEntry[] {
    if (query) {
        const search = `%${query}%`;
        return db.prepare('SELECT * FROM memories WHERE content LIKE ? ORDER BY timestamp DESC')
            .all(search) as MemoryEntry[];
    }
    return db.prepare('SELECT * FROM memories ORDER BY timestamp DESC').all() as MemoryEntry[];
}
