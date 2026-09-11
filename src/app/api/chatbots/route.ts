import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { handleApiError } from '@/lib/errors'
import { successResponse, errorResponse, paginateResponse, getSearchParams } from '@/lib/api-utils'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    const workspaceId = session?.user?.workspaceId
    if (!workspaceId) {
      return errorResponse('Unauthorized', 401)
    }

    const { page, limit, search, sortBy, sortOrder } = getSearchParams(request)

    const where = {
      workspaceId,
      ...(search ? { name: { contains: search, mode: 'insensitive' as const } } : {}),
    }

    const [chatbots, total] = await Promise.all([
      prisma.chatbot.findMany({
        where,
        include: {
          nodes: { select: { id: true } },
          edges: { select: { id: true } },
        },
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.chatbot.count({ where }),
    ])

    return paginateResponse(chatbots, total, page, limit)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    const workspaceId = session?.user?.workspaceId
    if (!workspaceId) {
      return errorResponse('Unauthorized', 401)
    }

    const body = await request.json()
    const { name, description } = body

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return errorResponse('Name is required', 400)
    }

    const chatbot = await prisma.chatbot.create({
      data: {
        workspaceId,
        name: name.trim(),
        description: description?.trim() || null,
      },
    })

    return successResponse(chatbot, 201)
  } catch (error) {
    return handleApiError(error)
  }
}
