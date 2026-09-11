import { NextRequest } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { handleApiError, UnauthorizedError, NotFoundError } from '@/lib/errors'
import { successResponse } from '@/lib/api-utils'

const statusSchema = z.object({
  status: z.enum(['OPEN', 'CLOSED', 'PENDING']),
})

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) throw new UnauthorizedError()
    const workspaceId = session.user.workspaceId
    if (!workspaceId) throw new UnauthorizedError('No workspace')

    const { id } = await params
    const body = await request.json()
    const { status } = statusSchema.parse(body)

    const conversation = await prisma.conversation.findFirst({
      where: { id, workspaceId },
    })
    if (!conversation) throw new NotFoundError('Conversation')

    const updated = await prisma.conversation.update({
      where: { id },
      data: { status },
    })

    return successResponse(updated)
  } catch (error) {
    return handleApiError(error)
  }
}
