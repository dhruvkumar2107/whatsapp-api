import { enqueueJob, createWorker } from '@/lib/queue'
import prisma from '@/lib/prisma'
import type { Job } from 'bullmq'

export interface WebhookDeliveryJob {
  deliveryId: string
  url: string
  headers: Record<string, string>
}

async function processWebhookDelivery(job: WebhookDeliveryJob): Promise<void> {
  const delivery = await prisma.webhookDelivery.findUnique({ where: { id: job.deliveryId } })
  if (!delivery) return

  const attempts = delivery.attempts + 1
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 15000)
  let responseBody = ''

  try {
    const res = await fetch(job.url, {
      method: 'POST',
      headers: job.headers,
      body: String(delivery.payload ?? '{}'),
      signal: controller.signal,
    })
    responseBody = await res.text()
    if (responseBody === '') responseBody = '{}'

    await prisma.webhookDelivery.update({
      where: { id: delivery.id },
      data: {
        status: res.ok ? 'DELIVERED' : 'FAILED',
        attempts,
        statusCode: res.status,
        response: responseBody.slice(0, 20_000),
      },
    })

    if (!res.ok) {
      throw new Error(`Webhook endpoint returned HTTP ${res.status}`)
    }
  } catch (err) {
    await prisma.webhookDelivery
      .update({
        where: { id: delivery.id },
        data: {
          status: 'FAILED',
          attempts,
          statusCode: err instanceof Error && err.name === 'AbortError' ? 408 : null,
          response: responseBody || (err instanceof Error ? err.message : 'Webhook delivery failed'),
        },
      })
      .catch(() => {})
    throw err
  } finally {
    clearTimeout(timeout)
  }
}

export function initWebhookWorker(): void {
  createWorker('webhooks', async (job: Job) => {
    const data = job.data as WebhookDeliveryJob
    await processWebhookDelivery(data)
  })
}

export async function enqueueWebhookDelivery(deliveryId: string, url: string, headers: Record<string, string>): Promise<string> {
  const job = await enqueueJob('webhooks', {
    id: deliveryId,
    type: 'webhook-delivery',
    payload: { deliveryId, url, headers },
  })
  return job.id?.toString() ?? ''
}
