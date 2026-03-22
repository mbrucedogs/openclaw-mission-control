import { NextRequest } from 'next/server'
import { getLatestCursor, replayEvents } from '@/lib/db/runtime'
import { parseRuntimeEventsCursor } from '@/lib/runtime-events'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const HEARTBEAT_INTERVAL = 30000 // 30 seconds

function createEvent(eventType: string, data: unknown, cursor?: number): string {
  const lines = [`event: ${eventType}`, `data: ${JSON.stringify(data)}`]
  if (cursor !== undefined) {
    lines.push(`id: ${cursor}`)
  }
  return lines.join('\n') + '\n\n'
}

export async function GET(request: NextRequest) {
  const encoder = new TextEncoder()

  const afterCursor = parseRuntimeEventsCursor(
    new URL(request.url),
    request.headers.get('Last-Event-ID'),
  )

  let cursor = afterCursor ?? getLatestCursor()

  const stream = new ReadableStream({
    start(controller) {
      // Send initial replay of missed events if Last-Event-ID provided
      if (afterCursor !== undefined) {
        const missedEvents = replayEvents(afterCursor)
        for (const event of missedEvents) {
          const payload = JSON.parse(event.payload)
          const sseData = {
            id: event.id,
            type: event.event_type,
            actor: event.actor,
            payload,
            cursor: event.cursor,
            createdAt: event.created_at,
          }
          controller.enqueue(encoder.encode(createEvent('event', sseData, event.cursor)))
        }
      }
      
      // Send initial connection event
      const connectEvent = {
        type: 'connected',
        cursor,
        message: 'SSE stream connected',
        timestamp: new Date().toISOString(),
      }
      controller.enqueue(encoder.encode(createEvent('connection', connectEvent, cursor)))
      
      // Heartbeat interval
      const heartbeatTimer = setInterval(() => {
        try {
          const ping = `: heartbeat ${new Date().toISOString()}\n\n`
          controller.enqueue(encoder.encode(ping))
        } catch {
          clearInterval(heartbeatTimer)
        }
      }, HEARTBEAT_INTERVAL)
      
      // Subscribe to runtime events via polling (simple approach)
      // In production, this would integrate with an event bus or pub/sub
      const pollInterval = setInterval(() => {
        try {
          const latestCursor = getLatestCursor()
          if (latestCursor > cursor) {
            const newEvents = replayEvents(cursor)
            for (const event of newEvents) {
              const payload = JSON.parse(event.payload)
              const sseData = {
                id: event.id,
                type: event.event_type,
                actor: event.actor,
                payload,
                cursor: event.cursor,
                createdAt: event.created_at,
              }
              controller.enqueue(encoder.encode(createEvent('event', sseData, event.cursor)))
            }
            cursor = latestCursor
          }
        } catch {
          clearInterval(pollInterval)
          clearInterval(heartbeatTimer)
        }
      }, 2000) // Poll every 2 seconds
      
      // Cleanup on close
      request.signal.addEventListener('abort', () => {
        clearInterval(heartbeatTimer)
        clearInterval(pollInterval)
        try {
          controller.close()
        } catch {
          // Already closed
        }
      })
    },
  })
  
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable nginx buffering
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Last-Event-ID',
    },
  })
}

// Handle CORS preflight
export async function OPTIONS() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Last-Event-ID',
    },
  })
}
