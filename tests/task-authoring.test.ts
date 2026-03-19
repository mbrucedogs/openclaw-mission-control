import test from 'node:test';
import assert from 'node:assert/strict';

import { isTaskIntakeValid, toAcceptanceCriteria } from '../src/lib/task-authoring';
import { hasMeaningfulMultilineContent, normalizeMultilineItems, parseMultilineDraft } from '../src/lib/multiline-fields';

test('task intake validation only requires title and summary', () => {
  assert.equal(isTaskIntakeValid({ title: '', summary: 'Summarize a YouTube transcript' }), false);
  assert.equal(isTaskIntakeValid({ title: 'Summarize video', summary: '' }), false);
  assert.equal(isTaskIntakeValid({ title: 'Summarize video', summary: 'Create a markdown summary from the transcript' }), true);
});

test('final deliverable becomes a single acceptance criterion only when provided', () => {
  assert.deepEqual(toAcceptanceCriteria(''), []);
  assert.deepEqual(toAcceptanceCriteria('   '), []);
  assert.deepEqual(toAcceptanceCriteria('Markdown file saved to the local filesystem'), [
    'Markdown file saved to the local filesystem',
  ]);
});

test('multiline draft parsing preserves spaces while typing', () => {
  assert.deepEqual(parseMultilineDraft('YouTube URL'), ['YouTube URL']);
  assert.deepEqual(parseMultilineDraft('YouTube URL\nTask summary'), ['YouTube URL', 'Task summary']);
});

test('multiline helpers validate meaningful content and normalize on submit', () => {
  assert.equal(hasMeaningfulMultilineContent(['   ', '']), false);
  assert.equal(hasMeaningfulMultilineContent(['YouTube URL', '']), true);
  assert.deepEqual(normalizeMultilineItems(['  YouTube URL  ', '', '  Task summary  ']), [
    'YouTube URL',
    'Task summary',
  ]);
});
