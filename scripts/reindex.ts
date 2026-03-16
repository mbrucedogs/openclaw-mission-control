import { ingestWorkspace } from '../src/lib/openclaw/ingestion';

async function main() {
    console.log('🔄 Starting workspace re-indexing...');
    try {
        await ingestWorkspace();
        console.log('✅ Re-indexing complete! Refresh your browser to see changes.');
    } catch (error) {
        console.error('❌ Re-indexing failed:', error);
        process.exit(1);
    }
}

main();
