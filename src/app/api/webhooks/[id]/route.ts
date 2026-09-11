import { NextRequest } from 'next/server'
import { Prisma } from '@prisma/client'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { webhookSchema } from '@/lib/validators'
import { successResponse } from '@/lib/api-utils'
import {
  handleApiError,
  UnauthorizedError,
  NotFoundError,
  ValidationError,
  BadRequestError,
} from '@/lib/errors'
import { requirePermission } from '@/lib/permissions'
import { createAuditLog } from '@/lib/audit'
import { PERMISSIONS } from '@/lib/constants'

function maskSecret(secret: string | null): string | null {
  if (!secret) return null
  if (secret.length <= 8) return '********'
  return `${secret.slice(0, 4)}...${secret.slice(-4)}`
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    const workspaceId = session?.user?.workspaceId
    if (!workspaceId) throw new UnauthorizedError()

    const { id } = await params

    const webhook = await prisma.webhook.findFirst({
      where: { id, workspaceId },
      include: {
        deliveries: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    })

    if (!webhook) throw new NotFoundError('Webhook')

    return successResponse({
      ...webhook,
      secret: maskSecret(webhook.secret as string | null),
    })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function PUT(
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

    const existing = await prisma.webhook.findFirst({
      where: { id, workspaceId },
      select: { id: true },
    })
    if (!existing) throw new NotFoundError('Webhook')

    const body = await request.json().catch(() => null)
    const updateSchema = webhookSchema.partial()
    const parsed = updateSchema.safeParse(body ?? {})
    if (!parsed.success) {
      throw new ValidationError(parsed.error.flatten().fieldErrors as Record<string, string[]>)
    }

    const data: Prisma.WebhookUncheckedUpdateInput = {}
    if (parsed.data.name !== undefined) data.name = parsed.data.name
    if (parsed.data.url !== undefined) data.url = parsed.data.url
    if (parsed.data.events !== undefined) data.events = parsed.data.events
    if (parsed.data.secret !== undefined) {
      if (parsed.data.secret.trim().length === 0) {
        throw new BadRequestError('Webhook secret cannot be empty')
      }
      data.secret = parsed.data.secret
    }
    if (parsed.data.isActive !== undefined) data.isActive = parsed.data.isActive

    if (Object.keys(data).length === 0) {
      throw new BadRequestError('No valid fields provided to update')
    }

    const webhook = await prisma.webhook.update({
      where: { id },
      data,
    })

    await createAuditLog({
      workspaceId,
      userId,
      action: 'webhook.update',
      resource: 'webhook',
      resourceId: id,
      metadata: {
        updatedFields: Object.keys(data),
        ipAddress: request.headers.get('x-forwarded-for'),
      },
    })

    return successResponse({
      id: webhook.id,
      name: webhook.name,
      url: webhook.url,
      events: webhook.events,
      isActive: webhook.isActive,
      createdAt: webhook.createdAt,
      updatedAt: webhook.updatedAt,
    })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function DELETE(
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

    const result = await prisma.webhook.deleteMany({
      where: { id, workspaceId },
    })
    if (result.count === 0) throw new NotFoundError('Webhook')

    await createAuditLog({
      workspaceId,
      userId,
      action: 'webhook.delete',
      resource: 'webhook',
      resourceId: id,
      metadata: { ipAddress: request.headers.get('x-forwarded-for') },
    })

    return successResponse({ message: 'Webhook deleted' })
  } catch (error) {
    return handleApiError(error)
  }
}