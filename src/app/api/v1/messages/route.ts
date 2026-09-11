import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { successResponse, authenticateApiKey } from '@/lib/api-utils'
import { handleApiError, ForbiddenError } from '@/lib/errors'
import { PAGINATION_DEFAULTS } from '@/lib/constants'

export async function GET(request: NextRequest) {
  try {
    const authData = await authenticateApiKey(request)

    if (!authData.permissions.includes('messages:view')) {
      throw new ForbiddenError('Missing permission: messages:view')
    }

    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || String(PAGINATION_DEFAULTS.PAGE), 10))
    const limit = Math.min(
      PAGINATION_DEFAULTS.MAX_LIMIT,
      Math.max(1, parseInt(searchParams.get('limit') || String(PAGINATION_DEFAULTS.LIMIT), 10))
    )
    const conversationId = searchParams.get('conversationId')
    const status = searchParams.get('status')
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    const before = searchParams.get('before')

    const where: Record<string, unknown> = {
      conversation: { workspaceId: authData.workspaceId },
    }

    if (conversationId) where.conversationId = conversationId
    if (status) where.status = status

    if (from || to) {
      where.createdAt = {}
      if (from) (where.createdAt as Record<string, unknown>).gte = new Date(from)
      if (to) (where.createdAt as Record<string, unknown>).lte = new Date(to)
    }

    if (before) {
      where.createdAt = {
        ...(where.createdAt as Record<string, unknown>),
        lt: new Date(before),
      }
    }

    const [messages, total] = await Promise.all([
      prisma.message.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.message.count({ where }),
    ])

    const totalPages = Math.ceil(total / limit)

    return successResponse({
      messages,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    })
  } catch (error) {
    return handleApiError(error)
  }
}
