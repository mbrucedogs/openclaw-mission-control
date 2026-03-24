import test from 'node:test';
import assert from 'node:assert/strict';

import { getMaxControlsCopy, getStagePrimaryAction } from '../src/app/tasks/max-controls';

test('getStagePrimaryAction only exposes a single relevant stage action', () => {
  assert.deepEqual(getStagePrimaryAction('ready'), { label: 'Start Stage' });
  assert.deepEqual(getStagePrimaryAction('blocked'), { label: 'Restart Stage' });
  assert.equal(getStagePrimaryAction('running'), null);
  assert.equal(getStagePrimaryAction('submitted'), null);
  assert.equal(getStagePrimaryAction('complete'), null);
  assert.equal(getStagePrimaryAction('failed'), null);
  assert.equal(getStagePrimaryAction('draft'), null);
  assert.equal(getStagePrimaryAction(undefined), null);
});

test('getMaxControlsCopy reflects the simplified operator workflow', () => {
  assert.equal(
    getMaxControlsCopy(false),
    'This task is saved in backlog. Start it when the plan is ready to execute.',
  );

  assert.equal(
    getMaxControlsCopy(true),
    'Run the active stage, capture operator notes, and review the structured handoff.',
  );
});
