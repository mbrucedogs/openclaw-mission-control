import type { RuntimeEvent } from '@/lib/db/runtime'

type RuntimeHistoryInput = {
  totalCount: number
  latestCursor: number
  events: RuntimeEvent[]
}

type PayloadRow = {
  label: string
  value: string
}

function titleCase(value: string) {
  return value
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

function stringifyValue(value: unknown): string {
  if (typeof value === 'string') {
    return value
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }

  if (value === null || value === undefined) {
    return 'Unavailable'
  }

  return JSON.stringify(value)
}

function buildPayloadRows(payload: string): PayloadRow[] {
  try {
    const parsed = JSON.parse(payload) as Record<string, unknown>
    const rows = Object.entries(parsed).map(([key, value]) => ({
      label: titleCase(key.replace(/Id$/, '')),
      value: stringifyValue(value),
    }))

    return rows.length > 0 ? rows : [{ label: 'Payload', value: 'Unavailable' }]
  } catch {
    return [{ label: 'Payload', value: 'Unavailable' }]
  }
}

export function buildRuntimeHistoryModel({ totalCount, latestCursor, events }: RuntimeHistoryInput) {
  const ordered = [...events].sort((left, right) => right.cursor - left.cursor)

  return {
    summary: [
      { label: 'Events', value: String(totalCount) },
      { label: 'Latest cursor', value: String(latestCursor) },
      { label: 'Visible rows', value: String(ordered.length) },
    ],
    events: ordered.map((event) => ({
      id: event.id,
      eventType: event.event_type,
      actor: event.actor,
      cursor: event.cursor,
      createdAt: event.created_at,
      payloadRows: buildPayloadRows(event.payload),
    })),
  }
}
