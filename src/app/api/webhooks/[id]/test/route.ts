import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { successResponse } from '@/lib/api-utils'
import { handleApiError, UnauthorizedError, NotFoundError } from '@/lib/errors'
import { requirePermission } from '@/lib/permissions'
import { createAuditLog } from '@/lib/audit'
import { PERMISSIONS } from '@/lib/constants'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    const workspaceId = session?.user?.workspaceId
    const userId = session?.user?.id
    if (!workspaceId || !userId) throw new UnauthorizedError()

    requirePermission(session?.user?.role, PERMISSIONS.WEBHOOKS_MANAGE)

    const { id } = await params

    const webhook = await prisma.webhook.findFirst({
      where: { id, workspaceId },
    })
    if (!webhook) throw new NotFoundError('Webhook')

    const payload = {
      event: 'test.event',
      timestamp: new Date().toISOString(),
      webhookId: webhook.id,
      workspaceId,
      data: {
        message: 'This is a test webhook event sent from the dashboard.',
      },
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'Whaatopro-Webhook/1.0',
    }
    if (webhook.secret) {
      headers['X-Webhook-Secret'] = webhook.secret
    }

    let statusCode: number | null = null
    let response: string | null = null
    let status: 'DELIVERED' | 'FAILED' = 'DELIVERED'
    let errorMessage: string | null = null

    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 10000)

      const res = await fetch(webhook.url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal,
      })

      clearTimeout(timeout)
      statusCode = res.status
      response = await res.text().then((t) => t.slice(0, 2000)).catch(() => null)

      if (statusCode < 200 || statusCode >= 300) {
        status = 'FAILED'
        errorMessage = `Webhook endpoint responded with status ${statusCode}`
      }
    } catch (error) {
      status = 'FAILED'
      errorMessage = error instanceof Error ? error.message : 'Failed to reach webhook endpoint'
    }

    const delivery = await prisma.webhookDelivery.create({
      data: {
        webhookId: webhook.id,
        event: 'test.event',
        payload,
        status,
        statusCode,
        response,
        attempts: 1,
      },
    })

    await createAuditLog({
      workspaceId,
      userId,
      action: 'webhook.test',
      resource: 'webhook',
      resourceId: webhook.id,
      metadata: {
        deliveryId: delivery.id,
        status,
        statusCode,
        ipAddress: request.headers.get('x-forwarded-for'),
      },
    })

    return successResponse({
      deliveryId: delivery.id,
      status: delivery.status,
      statusCode: delivery.statusCode,
      errorMessage,
    })
  } catch (error) {
    return handleApiError(error)
  }
}