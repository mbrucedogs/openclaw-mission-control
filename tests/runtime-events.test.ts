import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

function makeTempDbPath() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mission-control-runtime-'));
  return path.join(dir, 'mission-control.db');
}

async function loadFreshRuntimeModules() {
  process.env.DATABASE_URL = makeTempDbPath();

  const stamp = `${Date.now()}-${Math.random()}`;
  const runtimeModule = await import(`../src/lib/db/runtime.ts?runtime=${stamp}`);
  const helpersModule = await import(`../src/lib/runtime-events.ts?helpers=${stamp}`);

  return { ...runtimeModule, ...helpersModule };
}

test('runtime events persist with cursors and stream cursor helpers support replay', async () => {
  const {
    appendRuntimeEvent,
    getLatestCursor,
    replayEvents,
    parseRuntimeEventsCursor,
    buildRuntimeEventsStreamPath,
  } = await loadFreshRuntimeModules();

  const first = appendRuntimeEvent({
    eventType: 'runtime.test',
    actor: 'main',
    payload: { sessionCount: 1 },
  });
  const second = appendRuntimeEvent({
    eventType: 'runtime.test',
    actor: 'main',
    payload: { sessionCount: 2 },
  });

  assert.equal(first.cursor, 1);
  assert.equal(second.cursor, 2);
  assert.equal(getLatestCursor(), 2);

  const replayed = replayEvents(1);
  assert.equal(replayed.length, 1);
  assert.equal(replayed[0].cursor, 2);

  assert.equal(
    parseRuntimeEventsCursor(new URL('http://localhost:4000/api/events/stream?cursor=7'), null),
    7,
  );
  assert.equal(
    parseRuntimeEventsCursor(new URL('http://localhost:4000/api/events/stream'), '5'),
    5,
  );
  assert.equal(buildRuntimeEventsStreamPath(9), '/api/events/stream?cursor=9');
  assert.equal(buildRuntimeEventsStreamPath(0), '/api/events/stream');
});

test('runtime events can return the newest event for a specific type', async () => {
  const {
    appendRuntimeEvent,
    getLatestEventByType,
  } = await loadFreshRuntimeModules();

  const first = appendRuntimeEvent({
    eventType: 'openclaw.runtime.snapshot',
    actor: 'main',
    payload: { seq: 1 },
  });
  const second = appendRuntimeEvent({
    eventType: 'openclaw.runtime.snapshot',
    actor: 'main',
    payload: { seq: 2 },
  });

  const latest = getLatestEventByType('openclaw.runtime.snapshot');

  assert.equal(latest?.id, second.id);
  assert.equal(latest?.cursor > first.cursor, true);
});
