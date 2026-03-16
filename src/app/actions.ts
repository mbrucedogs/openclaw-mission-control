'use server';

import { ingestWorkspace } from '@/lib/openclaw/ingestion';
import { revalidatePath } from 'next/cache';

export async function triggerIngestion() {
    try {
        await ingestWorkspace();
        revalidatePath('/');
        return { success: true };
    } catch (error) {
        console.error('Ingestion failed:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
}

import fs from 'fs';

export async function getFileContent(filePath: string) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        return content;
    } catch {
        return 'Could not load file content.';
    }
}
