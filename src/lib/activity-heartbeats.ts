import { db } from '@/lib/db'
import { LIVE_AGENT_WINDOW_MS } from '@/lib/agent-presence'

export const HEARTBEAT_RETENTION_MS = 24 * 60 * 60 * 1000

export type StepHeartbeatRow = {
  agent_id: string
  agent_name: string
  step_id: string
  task_id: string
  run_id: string
  last_activity: string | null
  heartbeat_count: number
  is_stuck: number
  stuck_reason: string | null
  last_seen: string
  first_seen: string
  task_title?: string | null
  step_title?: string | null
}

export function pruneStaleStepHeartbeats(now = Date.now(), retentionMs = HEARTBEAT_RETENTION_MS) {
  const cutoff = new Date(now - retentionMs).toISOString()
  const result = db.prepare('DELETE FROM step_heartbeats WHERE updated_at < ?').run(cutoff)
  return result.changes
}

export function listFreshStepHeartbeats(now = Date.now(), windowMs = LIVE_AGENT_WINDOW_MS): StepHeartbeatRow[] {
  const cutoff = new Date(now - windowMs).toISOString()

  return db.prepare(`
    SELECT
      sh.agent_id,
      sh.agent_name,
      sh.step_id,
      sh.task_id,
      sh.run_id,
      sh.last_activity,
      sh.heartbeat_count,
      sh.is_stuck,
      sh.stuck_reason,
      sh.updated_at as last_seen,
      sh.created_at as first_seen,
      t.title as task_title,
      rs.title as step_title
    FROM step_heartbeats sh
    LEFT JOIN tasks t ON sh.task_id = t.id
    LEFT JOIN run_steps rs ON sh.step_id = rs.id
    WHERE sh.updated_at >= ?
      AND (rs.status IS NULL OR rs.status IN ('running', 'submitted', 'blocked'))
    ORDER BY sh.updated_at DESC
  `).all(cutoff) as StepHeartbeatRow[]
}
