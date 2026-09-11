import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { handleApiError, UnauthorizedError } from '@/lib/errors'
import { getSearchParams, paginateResponse } from '@/lib/api-utils'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) throw new UnauthorizedError()
    const workspaceId = session.user.workspaceId
    if (!workspaceId) throw new UnauthorizedError('No workspace')

    const { page, limit, search, filters } = getSearchParams(request)

    const where: Record<string, unknown> = { workspaceId }

    if (filters.status) {
      where.status = filters.status
    }

    if (filters.filter === 'unassigned') {
      where.assignedAgentId = null
    } else if (filters.filter === 'mine') {
      where.assignedAgentId = session.user.id
    }

    if (search) {
      where.OR = [
        { contact: { name: { contains: search, mode: 'insensitive' } } },
        { contact: { phone: { contains: search } } },
      ]
    }

    const [conversations, total] = await Promise.all([
      prisma.conversation.findMany({
        where,
        include: {
          contact: {
            select: { id: true, name: true, phone: true, email: true },
          },
          assignedAgent: {
            select: { id: true, name: true, email: true, image: true },
          },
        },
        orderBy: { lastMessageAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.conversation.count({ where }),
    ])

    return paginateResponse(conversations, total, page, limit)
  } catch (error) {
    return handleApiError(error)
  }
}
