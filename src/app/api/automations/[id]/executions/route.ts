import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { handleApiError } from '@/lib/errors'
import { errorResponse, paginateResponse, getSearchParams } from '@/lib/api-utils'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    const workspaceId = session?.user?.workspaceId
    if (!workspaceId) {
      return errorResponse('Unauthorized', 401)
    }

    const { id } = await params
    const { page, limit } = getSearchParams(request)

    const existing = await prisma.automation.findFirst({
      where: { id, workspaceId },
    })

    if (!existing) {
      return errorResponse('Automation not found', 404)
    }

    const where = { automationId: id }

    const [executions, total] = await Promise.all([
      prisma.automationExecution.findMany({
        where,
        include: {
          contact: {
            select: { id: true, name: true, phone: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.automationExecution.count({ where }),
    ])

    return paginateResponse(executions, total, page, limit)
  } catch (error) {
    return handleApiError(error)
  }
}
