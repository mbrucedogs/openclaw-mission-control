import { db } from './src/lib/db/index';
import { getWorkflowTemplates, getPipelines } from './src/lib/domain/workflows';

console.log('CWD:', process.cwd());
console.log('DB Path check:', db.name);

const workflows = getWorkflowTemplates();
const pipelines = getPipelines();

console.log('Workflows count:', workflows.length);
console.log('Pipelines count:', pipelines.length);

if (workflows.length > 0) {
    console.log('Sample workflow:', workflows[0]);
}
if (pipelines.length > 0) {
    console.log('Sample pipeline:', pipelines[0]);
}
