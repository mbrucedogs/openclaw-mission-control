import { db, ensureInit } from './index'
import { randomUUID } from 'crypto'

export interface RuntimeEvent {
  id: string
  event_type: string
  actor: string
  payload: string
  cursor: number
  created_at: string
}

export interface AppendEventOptions {
  eventType: string
  actor: string
  payload?: Record<string, unknown>
}

/**
 * Appends a runtime event to the runtime_events table.
 * Returns the inserted event with its assigned cursor.
 */
export function appendRuntimeEvent(opts: AppendEventOptions): RuntimeEvent {
  ensureInit()
  
  const id = randomUUID()
  const payload = JSON.stringify(opts.payload ?? {})
  const now = new Date().toISOString()

  const stmt = db.prepare(`
    INSERT INTO runtime_events (id, event_type, actor, payload, created_at)
    VALUES (?, ?, ?, ?, ?)
  `)
  
  stmt.run(id, opts.eventType, opts.actor, payload, now)
  
  // Retrieve the inserted event with its cursor
  const event = db.prepare('SELECT * FROM runtime_events WHERE id = ?').get(id) as RuntimeEvent
  
  return event
}

/**
 * Replay events from a given cursor position.
 * If cursor is null/undefined, returns all events from the beginning.
 * Returns events with cursor > afterCursor, ordered by cursor ASC.
 */
export function replayEvents(afterCursor?: number): RuntimeEvent[] {
  ensureInit()
  
  let rows: RuntimeEvent[]
  
  if (afterCursor === undefined || afterCursor === null) {
    rows = db.prepare('SELECT * FROM runtime_events ORDER BY cursor ASC').all() as RuntimeEvent[]
  } else {
    rows = db.prepare('SELECT * FROM runtime_events WHERE cursor > ? ORDER BY cursor ASC').all(afterCursor) as RuntimeEvent[]
  }
  
  return rows
}

/**
 * Get the latest cursor position (highest cursor value).
 * Returns 0 if no events exist.
 */
export function getLatestCursor(): number {
  ensureInit()
  
  const row = db.prepare('SELECT MAX(cursor) as maxCursor FROM runtime_events').get() as { maxCursor: number | null }
  return row?.maxCursor ?? 0
}

/**
 * Get a paginated slice of events for testing/inspection.
 */
export function getEvents(offset: number = 0, limit: number = 100): RuntimeEvent[] {
  ensureInit()
  
  return db.prepare('SELECT * FROM runtime_events ORDER BY cursor ASC LIMIT ? OFFSET ?').all(limit, offset) as RuntimeEvent[]
}

/**
 * Count total runtime events.
 */
export function getEventCount(): number {
  ensureInit()
  
  const row = db.prepare('SELECT COUNT(*) as count FROM runtime_events').get() as { count: number }
  return row?.count ?? 0
}
