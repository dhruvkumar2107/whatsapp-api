import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { handleApiError, ValidationError } from '@/lib/errors'
import { successResponse, errorResponse, paginateResponse, getSearchParams } from '@/lib/api-utils'
import { requirePermission } from '@/lib/permissions'
import { automationSchema } from '@/lib/validators'

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
    requirePermission(session?.user?.role, 'automations:manage')

    const body = await request.json().catch(() => null)
    const parsed = automationSchema.safeParse(body)
    if (!parsed.success) {
      throw new ValidationError(parsed.error.flatten().fieldErrors as Record<string, string[]>)
    }

    const { name, description, trigger, actions, isActive } = parsed.data

    const automation = await prisma.automation.create({
      data: {
        workspaceId,
        name,
        description: description || null,
        isActive,
        trigger: trigger as unknown as object,
        conditions: undefined,
        actions: actions as unknown as object[],
      },
    })

    return successResponse(automation, 201)
  } catch (error) {
    return handleApiError(error)
  }
}
