import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { handleApiError, ValidationError } from '@/lib/errors'
import { successResponse, errorResponse, paginateResponse, getSearchParams } from '@/lib/api-utils'
import { requirePermission } from '@/lib/permissions'
import { chatbotSchema } from '@/lib/validators'

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
    requirePermission(session?.user?.role, 'chatbot:manage')

    const body = await request.json().catch(() => null)
    const parsed = chatbotSchema.safeParse(body)
    if (!parsed.success) {
      throw new ValidationError(parsed.error.flatten().fieldErrors as Record<string, string[]>)
    }

    const { name, isActive } = parsed.data

    const chatbot = await prisma.chatbot.create({
      data: {
        workspaceId,
        name,
        isActive,
      },
    })

    return successResponse(chatbot, 201)
  } catch (error) {
    return handleApiError(error)
  }
}
