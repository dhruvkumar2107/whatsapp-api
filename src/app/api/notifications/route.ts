import { NextRequest } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { successResponse, paginateResponse, getSearchParams } from '@/lib/api-utils'
import { handleApiError, UnauthorizedError, ValidationError } from '@/lib/errors'

const markReadSchema = z.object({
  notificationIds: z.array(z.string().min(1)).min(1, 'At least one notification id is required'),
})

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    const userId = session?.user?.id
    const workspaceId = session?.user?.workspaceId
    if (!userId) throw new UnauthorizedError()

    const { page, limit } = getSearchParams(request)

    const where = {
      userId,
      ...(workspaceId ? { workspaceId } : {}),
    }

    const [items, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: [{ isRead: 'asc' }, { createdAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          type: true,
          title: true,
          message: true,
          data: true,
          isRead: true,
          createdAt: true,
        },
      }),
      prisma.notification.count({ where }),
    ])

    return paginateResponse(items, total, page, limit)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    const userId = session?.user?.id
    if (!userId) throw new UnauthorizedError()

    const body = await request.json().catch(() => null)
    const parsed = markReadSchema.safeParse(body ?? {})
    if (!parsed.success) {
      throw new ValidationError(parsed.error.flatten().fieldErrors as Record<string, string[]>)
    }

    const result = await prisma.notification.updateMany({
      where: {
        id: { in: parsed.data.notificationIds },
        userId,
      },
      data: { isRead: true },
    })

    return successResponse({ updated: result.count })
  } catch (error) {
    return handleApiError(error)
  }
}