import { db } from './src/lib/db';
import { instantiateTaskPipeline, getPipelines } from './src/lib/domain/workflows';

async function test() {
  console.log('Testing pipeline instantiation...');
  const pipelines = getPipelines();
  console.log('Available pipelines:', pipelines.map(p => p.id));
  
  const taskId = 'task-a2e40ba0';
  const pipelineId = 'pl-standard';
  
  console.log(`Instantiating ${pipelineId} for ${taskId}...`);
  try {
    instantiateTaskPipeline(taskId, pipelineId);
    console.log('Done.');
    
    // @ts-ignore
    const steps = db.prepare('SELECT * FROM task_workflow_steps WHERE task_id = ?').all(taskId);
    console.log(`Found ${steps.length} steps.`);
    
    // @ts-ignore
    const tp = db.prepare('SELECT * FROM task_pipelines WHERE task_id = ?').get(taskId);
    console.log('Task Pipeline record:', tp);
  } catch (err) {
    console.error('FAILED:', err);
  }
}

test();
