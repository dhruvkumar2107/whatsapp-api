import { NextRequest } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import {
  handleApiError,
  UnauthorizedError,
  NotFoundError,
  ValidationError,
} from '@/lib/errors'
import { successResponse } from '@/lib/api-utils'

const assignSchema = z.object({
  agentId: z.string().uuid(),
})

export async function POST(
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
    const { agentId } = assignSchema.parse(body)

    const conversation = await prisma.conversation.findFirst({
      where: { id, workspaceId },
    })
    if (!conversation) throw new NotFoundError('Conversation')

    const member = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: agentId } },
    })
    if (!member) {
      throw new ValidationError('Agent is not a member of this workspace')
    }

    const updated = await prisma.conversation.update({
      where: { id },
      data: {
        assignedAgentId: agentId,
        assignedAt: new Date(),
      },
    })

    await prisma.notification.create({
      data: {
        userId: agentId,
        workspaceId,
        type: 'CONVERSATION_ASSIGNED',
        title: 'Conversation assigned to you',
        message: 'A conversation has been assigned to you.',
        data: { conversationId: id },
      },
    })

    return successResponse(updated)
  } catch (error) {
    return handleApiError(error)
  }
}
