import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { handleApiError, UnauthorizedError, NotFoundError } from '@/lib/errors'
import { successResponse } from '@/lib/api-utils'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) throw new UnauthorizedError()
    const workspaceId = session.user.workspaceId
    if (!workspaceId) throw new UnauthorizedError('No workspace')

    const { id } = await params

    const conversation = await prisma.conversation.findFirst({
      where: { id, workspaceId },
      select: { id: true },
    })
    if (!conversation) throw new NotFoundError('Conversation')

    await prisma.$transaction([
      prisma.message.updateMany({
        where: { conversationId: id, direction: 'INBOUND', readAt: null },
        data: { readAt: new Date() },
      }),
      prisma.conversation.update({
        where: { id },
        data: { unreadCount: 0 },
      }),
    ])

    return successResponse({ read: true })
  } catch (error) {
    return handleApiError(error)
  }
}