import test from 'node:test';
import assert from 'node:assert/strict';

import { db } from '../src/lib/db/index';
import {
  createTaskTemplate,
  deleteTaskTemplate,
  duplicateTaskTemplate,
  getTaskTemplateById,
  updateTaskTemplate,
} from '../src/lib/domain/task-runs';
import { getAgents } from '../src/lib/domain/agents';
import { inferStepRoleForAgent } from '../src/lib/agent-matching';
import type { Agent, StepPacketInput } from '../src/lib/types';

function getAssignableAgent() {
  return getAgents().find((agent) => agent.id !== 'main' && inferStepRoleForAgent(agent));
}

function createStep(agent: Agent, suffix: string): StepPacketInput {
  return {
    title: `Stage ${suffix}`,
    assignedAgentId: agent.id,
    assignedAgentName: agent.name,
    goal: `Goal ${suffix}`,
    inputs: [`Input ${suffix}`],
    requiredOutputs: [`Output ${suffix}`],
    doneCondition: `Done ${suffix}`,
    boundaries: [`Boundary ${suffix}`],
    dependencies: [],
    notesForOrchestrator: `Note ${suffix}`,
  };
}

test('task template CRUD works through the domain layer', (t) => {
  const agent = getAssignableAgent();
  if (!agent) {
    t.skip('No assignable agents are configured in this workspace');
    return;
  }

  const createdIds: string[] = [];
  const cleanup = () => {
    for (const id of createdIds) {
      db.prepare('DELETE FROM task_templates WHERE id = ?').run(id);
    }
  };

  t.after(cleanup);

  const created = createTaskTemplate({
    actor: 'test-suite',
    name: `Template CRUD ${Date.now()}`,
    description: 'Created by node:test',
    taskDefaults: {
      goal: 'Default summary',
      acceptanceCriteria: ['Final deliverable'],
    },
    steps: [createStep(agent, 'A')],
  });
  createdIds.push(created.id);

  assert.equal(created.name.includes('Template CRUD'), true);
  assert.equal(created.steps.length, 1);
  assert.equal(created.steps[0].assignedAgentId, agent.id);
  assert.equal(created.taskDefaults?.goal, 'Default summary');

  const updated = updateTaskTemplate(created.id, {
    actor: 'test-suite',
    name: `${created.name} Updated`,
    description: 'Updated description',
    taskDefaults: {
      goal: 'Updated summary',
      acceptanceCriteria: ['Updated deliverable'],
    },
    steps: [createStep(agent, 'B')],
  });

  assert.equal(updated.name.endsWith('Updated'), true);
  assert.equal(updated.description, 'Updated description');
  assert.equal(updated.steps[0].title, 'Stage B');
  assert.equal(updated.taskDefaults?.acceptanceCriteria?.[0], 'Updated deliverable');

  const duplicated = duplicateTaskTemplate(created.id, {
    actor: 'test-suite',
    name: `${updated.name} Copy`,
  });
  createdIds.push(duplicated.id);

  assert.notEqual(duplicated.id, created.id);
  assert.equal(duplicated.name.endsWith('Copy'), true);
  assert.deepEqual(duplicated.steps, updated.steps);
  assert.deepEqual(duplicated.taskDefaults, updated.taskDefaults);

  deleteTaskTemplate(created.id);
  assert.equal(getTaskTemplateById(created.id), null);
  assert.ok(getTaskTemplateById(duplicated.id));
});
