const { db } = require('./src/lib/db');
const { instantiateTaskPipeline, getPipelines } = require('./src/lib/domain/workflows');

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
    
    const steps = db.prepare('SELECT * FROM task_workflow_steps WHERE task_id = ?').all(taskId);
    console.log(`Found ${steps.length} steps.`);
  } catch (err) {
    console.error('FAILED:', err);
  }
}

test();
