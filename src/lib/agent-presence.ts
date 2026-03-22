export const LIVE_AGENT_WINDOW_MS = 15 * 60 * 1000

type PresenceEntry = {
  age?: number
  ageMs?: number
  updatedAt?: number | string
}

function normalizeAgeMs(entry: PresenceEntry, now = Date.now()): number | null {
  if (Number.isFinite(entry.ageMs)) {
    return Number(entry.ageMs)
  }

  if (Number.isFinite(entry.age)) {
    return Number(entry.age)
  }

  if (typeof entry.updatedAt === 'number' && Number.isFinite(entry.updatedAt)) {
    return Math.max(0, now - entry.updatedAt)
  }

  if (typeof entry.updatedAt === 'string' && entry.updatedAt) {
    const updatedAt = new Date(entry.updatedAt).getTime()
    if (Number.isFinite(updatedAt)) {
      return Math.max(0, now - updatedAt)
    }
  }

  return null
}

export function isPresenceFresh(
  entry: PresenceEntry | null | undefined,
  now = Date.now(),
  windowMs = LIVE_AGENT_WINDOW_MS,
): boolean {
  if (!entry) {
    return false
  }

  const ageMs = normalizeAgeMs(entry, now)
  return ageMs !== null && ageMs <= windowMs
}

export function hasFreshPresence(
  entries: PresenceEntry[] | null | undefined,
  now = Date.now(),
  windowMs = LIVE_AGENT_WINDOW_MS,
): boolean {
  return Array.isArray(entries) && entries.some((entry) => isPresenceFresh(entry, now, windowMs))
}
