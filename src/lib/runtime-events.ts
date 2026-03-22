export function parseRuntimeEventsCursor(url: URL, lastEventId: string | null): number | undefined {
  const cursorParam = url.searchParams.get('cursor');
  const rawValue = cursorParam ?? lastEventId;
  if (!rawValue) return undefined;

  const parsed = Number.parseInt(rawValue, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

export function buildRuntimeEventsStreamPath(cursor?: number): string {
  if (!cursor || cursor <= 0) return '/api/events/stream';
  return `/api/events/stream?cursor=${cursor}`;
}
