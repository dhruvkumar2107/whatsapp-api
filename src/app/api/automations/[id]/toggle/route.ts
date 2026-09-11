import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { handleApiError } from '@/lib/errors'
import { successResponse, errorResponse } from '@/lib/api-utils'

export async function POST(
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

    const updated = await prisma.automation.update({
      where: { id },
      data: { isActive: !existing.isActive },
    })

    return successResponse(updated)
  } catch (error) {
    return handleApiError(error)
  }
}
