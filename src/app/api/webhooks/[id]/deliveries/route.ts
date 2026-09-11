import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { paginateResponse, getSearchParams } from '@/lib/api-utils'
import { handleApiError, UnauthorizedError, NotFoundError } from '@/lib/errors'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    const workspaceId = session?.user?.workspaceId
    if (!workspaceId) throw new UnauthorizedError()

    const { id } = await params
    const { page, limit } = getSearchParams(request)

    const webhook = await prisma.webhook.findFirst({
      where: { id, workspaceId },
      select: { id: true },
    })
    if (!webhook) throw new NotFoundError('Webhook')

    const where = { webhookId: id }

    const [deliveries, total] = await Promise.all([
      prisma.webhookDelivery.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.webhookDelivery.count({ where }),
    ])

    return paginateResponse(deliveries, total, page, limit)
  } catch (error) {
    return handleApiError(error)
  }
}