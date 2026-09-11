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
      select: { id: true, isActive: true },
    })
    if (!webhook) throw new NotFoundError('Webhook')

    const updated = await prisma.webhook.update({
      where: { id },
      data: { isActive: !webhook.isActive },
    })

    await createAuditLog({
      workspaceId,
      userId,
      action: 'webhook.toggle',
      resource: 'webhook',
      resourceId: id,
      metadata: {
        isActive: updated.isActive,
        ipAddress: request.headers.get('x-forwarded-for'),
      },
    })

    return successResponse({
      id: updated.id,
      isActive: updated.isActive,
    })
  } catch (error) {
    return handleApiError(error)
  }
}