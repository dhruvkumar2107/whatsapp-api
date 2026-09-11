import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { handleApiError } from '@/lib/errors'
import { successResponse, errorResponse } from '@/lib/api-utils'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    const workspaceId = session?.user?.workspaceId
    if (!workspaceId) {
      return errorResponse('Unauthorized', 401)
    }

    const { id } = await params

    const automation = await prisma.automation.findFirst({
      where: { id, workspaceId },
      include: {
        _count: { select: { executions: true } },
        executions: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: {
            contact: {
              select: { id: true, name: true, phone: true },
            },
          },
        },
      },
    })

    if (!automation) {
      return errorResponse('Automation not found', 404)
    }

    const executionStats = await prisma.automationExecution.aggregate({
      where: { automationId: id },
      _count: { id: true },
      _avg: { currentStep: true },
    })

    const successCount = await prisma.automationExecution.count({
      where: { automationId: id, status: 'COMPLETED' },
    })

    const totalExecutions = executionStats._count.id || 0
    const successRate = totalExecutions > 0 ? (successCount / totalExecutions) * 100 : 0

    return successResponse({
      ...automation,
      executionCount: automation._count.executions,
      stats: {
        totalRuns: totalExecutions,
        successRate: Math.round(successRate * 100) / 100,
        avgStep: executionStats._avg.currentStep || 0,
      },
      _count: undefined,
    })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function PUT(
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

    const existing = await prisma.automation.findFirst({
      where: { id, workspaceId },
    })

    if (!existing) {
      return errorResponse('Automation not found', 404)
    }

    const body = await request.json()
    const { name, description, trigger, conditions, actions, isActive } = body
    const data: Record<string, unknown> = {}

    if (name !== undefined) data.name = name.trim()
    if (description !== undefined) data.description = description?.trim() || null
    if (trigger !== undefined) data.trigger = trigger
    if (conditions !== undefined) data.conditions = conditions
    if (actions !== undefined) data.actions = actions
    if (isActive !== undefined) data.isActive = isActive

    const automation = await prisma.automation.update({
      where: { id },
      data,
    })

    return successResponse(automation)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    const workspaceId = session?.user?.workspaceId
    if (!workspaceId) {
      return errorResponse('Unauthorized', 401)
    }

    const { id } = await params

    const existing = await prisma.automation.findFirst({
      where: { id, workspaceId },
    })

    if (!existing) {
      return errorResponse('Automation not found', 404)
    }

    await prisma.automation.delete({ where: { id } })

    return successResponse({ deleted: true })
  } catch (error) {
    return handleApiError(error)
  }
}
