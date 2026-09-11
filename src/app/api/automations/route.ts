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

    const [automations, total] = await Promise.all([
      prisma.automation.findMany({
        where,
        include: {
          _count: { select: { executions: true } },
        },
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.automation.count({ where }),
    ])

    const data = automations.map((a) => ({
      ...a,
      executionCount: a._count.executions,
      _count: undefined,
    }))

    return paginateResponse(data, total, page, limit)
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
    const { name, description, trigger, conditions, actions, isActive } = body

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return errorResponse('Name is required', 400)
    }

    if (!trigger || !trigger.type) {
      return errorResponse('Trigger is required', 400)
    }

    if (!Array.isArray(actions) || actions.length === 0) {
      return errorResponse('At least one action is required', 400)
    }

    const automation = await prisma.automation.create({
      data: {
        workspaceId,
        name: name.trim(),
        description: description?.trim() || null,
        isActive: isActive ?? false,
        trigger,
        conditions: conditions || null,
        actions,
      },
    })

    return successResponse(automation, 201)
  } catch (error) {
    return handleApiError(error)
  }
}
