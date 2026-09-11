import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { handleApiError, UnauthorizedError, NotFoundError } from '@/lib/errors'
import { successResponse } from '@/lib/api-utils'

export async function GET(
  request: NextRequest,
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
      include: {
        contact: {
          include: {
            tags: {
              include: { tag: { select: { id: true, name: true, color: true } } },
            },
            customFields: true,
            notes: {
              include: { user: { select: { id: true, name: true } } },
              orderBy: { createdAt: 'desc' as const },
              take: 50,
            },
          },
        },
        assignedAgent: {
          select: { id: true, name: true, email: true, image: true },
        },
      },
    })

    if (!conversation) throw new NotFoundError('Conversation')

    if (conversation.unreadCount > 0) {
      await prisma.conversation.update({
        where: { id },
        data: { unreadCount: 0 },
      })
      conversation.unreadCount = 0
    }

    return successResponse(conversation)
  } catch (error) {
    return handleApiError(error)
  }
}
