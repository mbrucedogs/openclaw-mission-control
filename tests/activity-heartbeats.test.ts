import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'

function makeTempDbPath() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mission-control-heartbeats-'))
  return path.join(dir, 'mission-control.db')
}

async function loadFreshActivityModules() {
  process.env.DATABASE_URL = makeTempDbPath()

  const stamp = `${Date.now()}-${Math.random()}`
  const dbModule = await import(`../src/lib/db/index.ts?db=${stamp}`)
  const heartbeatsModule = await import(`../src/lib/activity-heartbeats.ts?heartbeats=${stamp}`)

  return { ...dbModule, ...heartbeatsModule }
}

test('pruneStaleStepHeartbeats removes only rows older than the retention window', async () => {
  const { db, pruneStaleStepHeartbeats, listFreshStepHeartbeats, HEARTBEAT_RETENTION_MS } = await loadFreshActivityModules()
  const now = Date.now()
  const staleAt = new Date(now - HEARTBEAT_RETENTION_MS - 60_000).toISOString()
  const freshAt = new Date(now - 60_000).toISOString()

  db.prepare(`
    INSERT INTO step_heartbeats (id, step_id, agent_id, agent_name, run_id, task_id, last_activity, heartbeat_count, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run('stale-row', 'step-1', 'rita', 'Rita', 'run-1', 'task-1', 'old', 2, staleAt, staleAt)

  db.prepare(`
    INSERT INTO step_heartbeats (id, step_id, agent_id, agent_name, run_id, task_id, last_activity, heartbeat_count, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run('fresh-row', 'step-2', 'ben', 'Ben', 'run-2', 'task-2', 'new', 1, freshAt, freshAt)

  const deleted = pruneStaleStepHeartbeats(now)

  assert.equal(deleted, 1)
  assert.deepEqual(
    listFreshStepHeartbeats(now).map((row) => row.agent_id),
    ['ben'],
  )
})
