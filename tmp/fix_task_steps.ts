import { instantiateTaskPipeline } from './src/lib/domain/workflows';
import { db } from './src/lib/db';

async function fix() {
  console.log('Fixing task-af902fd7 to use pipeline pl-nqnqvo50...');
  
  try {
    // The import of workflows.ts will trigger db/index.ts auto-init logic
    // which should now create the task_workflow_steps table.
    
    instantiateTaskPipeline('task-af902fd7', 'pl-nqnqvo50');
    console.log('Task fixed successfully.');
    
    const steps = db.prepare('SELECT count(*) as count FROM task_workflow_steps WHERE task_id = ?').get('task-af902fd7') as any;
    console.log(`Verified: ${steps.count} steps created.`);
  } catch (error) {
    console.error('Error fixing task:', error);
  }
}

fix();
