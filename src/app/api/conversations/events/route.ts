import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'

type EventListener = (data: string) => void
const listeners = new Map<string, Set<EventListener>>()

export function notifyConversationEvent(workspaceId: string, event: string, data: unknown) {
  const workspaceListeners = listeners.get(workspaceId)
  if (workspaceListeners) {
    const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
    workspaceListeners.forEach((listener) => listener(message))
  }
}

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.workspaceId) {
    return new Response('Unauthorized', { status: 401 })
  }

  const workspaceId = session.user.workspaceId
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    start(controller) {
      const listener: EventListener = (data) => {
        controller.enqueue(encoder.encode(data))
      }

      if (!listeners.has(workspaceId)) {
        listeners.set(workspaceId, new Set())
      }
      listeners.get(workspaceId)!.add(listener)

      controller.enqueue(encoder.encode('event: connected\ndata: {}\n\n'))

      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': heartbeat\n\n'))
        } catch {
          clearInterval(heartbeat)
        }
      }, 30000)

      request.signal.addEventListener('abort', () => {
        listeners.get(workspaceId)?.delete(listener)
        if (listeners.get(workspaceId)?.size === 0) {
          listeners.delete(workspaceId)
        }
        clearInterval(heartbeat)
        try { controller.close() } catch {}
      })
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
