import { NextRequest } from 'next/server'
import crypto from 'crypto'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { webhookSchema } from '@/lib/validators'
import { successResponse } from '@/lib/api-utils'
import { handleApiError, UnauthorizedError, ValidationError, ForbiddenError } from '@/lib/errors'
import { requirePermission } from '@/lib/permissions'
import { createAuditLog } from '@/lib/audit'
import { PERMISSIONS, PLAN_LIMITS } from '@/lib/constants'

export async function GET() {
  try {
    const session = await auth()
    const workspaceId = session?.user?.workspaceId
    if (!workspaceId) throw new UnauthorizedError()

    const webhooks = await prisma.webhook.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        url: true,
        events: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { deliveries: true } },
      },
    })

    return successResponse(webhooks)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    const workspaceId = session?.user?.workspaceId
    const userId = session?.user?.id
    if (!workspaceId || !userId) throw new UnauthorizedError()

    requirePermission(session?.user?.role, PERMISSIONS.WEBHOOKS_MANAGE)

    const subscription = await prisma.subscription.findFirst({ where: { workspaceId, status: 'ACTIVE' } })
    const plan = subscription ? await prisma.plan.findUnique({ where: { id: subscription.planId } }) : null
    const planKey = plan?.name?.toUpperCase() || 'FREE'
    const limit = PLAN_LIMITS[planKey as keyof typeof PLAN_LIMITS]?.webhooks || PLAN_LIMITS.FREE.webhooks
    if (limit !== -1) {
      const count = await prisma.webhook.count({ where: { workspaceId } })
      if (count >= limit) throw new ForbiddenError('Webhook limit reached for your plan')
    }

    const body = await request.json().catch(() => null)
    const parsed = webhookSchema.safeParse(body ?? {})
    if (!parsed.success) {
      throw new ValidationError(parsed.error.flatten().fieldErrors as Record<string, string[]>)
    }

    const webhook = await prisma.webhook.create({
      data: {
        workspaceId,
        name: parsed.data.name,
        url: parsed.data.url,
        secret: parsed.data.secret || crypto.randomBytes(32).toString('hex'),
        events: parsed.data.events,
        isActive: parsed.data.isActive ?? true,
      },
    })

    await createAuditLog({
      workspaceId,
      userId,
      action: 'webhook.create',
      resource: 'webhook',
      resourceId: webhook.id,
      metadata: {
        name: webhook.name,
        url: webhook.url,
        ipAddress: request.headers.get('x-forwarded-for'),
      },
    })

    return successResponse(
      {
        id: webhook.id,
        name: webhook.name,
        url: webhook.url,
        events: webhook.events,
        isActive: webhook.isActive,
        createdAt: webhook.createdAt,
        updatedAt: webhook.updatedAt,
      },
      201
    )
  } catch (error) {
    return handleApiError(error)
  }
}