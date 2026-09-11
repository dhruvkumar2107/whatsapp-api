import crypto from 'crypto'
import prisma from '@/lib/prisma'
import { enqueueWebhookDelivery } from '@/lib/workers/webhook-worker'
import type { Prisma } from '@prisma/client'

type WebhookEventType = string

function computeSignature(payload: string, secret: string): string {
  return `sha256=${crypto.createHmac('sha256', secret).update(payload).digest('hex')}`
}

interface WebhookEndpoint {
  id: string
  url: string
  secret: string
  events: unknown
  isActive: boolean
  workspaceId: string
}

function matchesEvents(endpoint: WebhookEndpoint, eventType: string): boolean {
  const events = endpoint.events
  if (Array.isArray(events)) {
    if (events.includes('*') || events.includes('all')) return true
    return events.includes(eventType)
  }
  if (typeof events === 'string') {
    const split = (events as string).split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    if (split.includes('*') || split.includes('all')) return true
    return split.includes(eventType)
  }
  return false
}

export async function dispatchWebhook(
  workspaceId: string,
  eventType: WebhookEventType,
  ctx: Record<string, unknown>
): Promise<void> {
  const allEndpoints = await prisma.webhook.findMany({
    where: { workspaceId, isActive: true },
  })
  const endpoints = allEndpoints.filter((ep) => matchesEvents(ep as unknown as WebhookEndpoint, eventType))

  for (const ep of endpoints) {
    const body = JSON.stringify({
      type: eventType,
      timestamp: new Date().toISOString(),
      event: eventType,
      data: ctx,
    })
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Webhook-Signature': computeSignature(body, ep.secret),
    }

    try {
      const record = await prisma.webhookDelivery.create({
        data: {
          webhookId: ep.id,
          event: eventType,
          payload: body as Prisma.InputJsonValue,
          status: 'PENDING',
          attempts: 0,
        },
      })
      await enqueueWebhookDelivery(record.id, ep.url, headers).catch((err) => {
        console.error('[Webhook] enqueue failed:', err)
      })
    } catch (err) {
      console.error('[Webhook] dispatch failed:', ep.id, err)
    }
  }
}

export type { WebhookEventType }