import { db } from './src/lib/db';
import { ensureSeeded } from './src/lib/openclaw/ingestion';
import { ingestWorkspace } from './src/lib/openclaw/ingestion';

console.log('Clearing schedule_jobs...');
db.exec('DELETE FROM schedule_jobs');

console.log('Running ingestion...');
ingestWorkspace().then(() => {
    console.log('Done!');
}).catch(e => {
    console.error(e);
});
