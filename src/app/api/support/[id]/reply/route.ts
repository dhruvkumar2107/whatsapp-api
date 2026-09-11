import { NextRequest } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { successResponse } from '@/lib/api-utils'
import {
  handleApiError,
  UnauthorizedError,
  NotFoundError,
  ValidationError,
} from '@/lib/errors'
import { ROLES } from '@/lib/constants'

const replySchema = z.object({
  content: z.string().min(1, 'Reply content is required').max(5000),
})

const MANAGE_ROLES: string[] = [ROLES.OWNER, ROLES.ADMIN, ROLES.MANAGER]

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    const workspaceId = session?.user?.workspaceId
    const userId = session?.user?.id
    const role = session?.user?.role
    if (!workspaceId || !userId) throw new UnauthorizedError()

    const { id } = await params

    const canManage = MANAGE_ROLES.includes(role ?? 'VIEWER')

    const ticket = await prisma.supportTicket.findFirst({
      where: {
        id,
        workspaceId,
        ...(canManage ? {} : { OR: [{ userId }, { assignedToId: userId }] }),
      },
      select: { id: true },
    })
    if (!ticket) throw new NotFoundError('Support ticket')

    const body = await request.json().catch(() => null)
    const parsed = replySchema.safeParse(body ?? {})
    if (!parsed.success) {
      throw new ValidationError(parsed.error.flatten().fieldErrors as Record<string, string[]>)
    }

    const ticketWithUser = await prisma.supportTicket.findUnique({
      where: { id },
      select: { userId: true, workspaceId: true, subject: true },
    })

    const reply = await prisma.supportTicketReply.create({
      data: {
        ticketId: id,
        userId,
        content: parsed.data.content,
      },
      include: {
        user: { select: { id: true, name: true, email: true, image: true } },
      },
    })

    if (ticketWithUser && ticketWithUser.userId !== userId) {
      await prisma.notification.create({
        data: {
          userId: ticketWithUser.userId,
          workspaceId: ticketWithUser.workspaceId,
          type: 'SUPPORT_REPLY',
          title: 'Support ticket reply',
          message: `Your ticket "${ticketWithUser.subject}" has received a reply.`,
          data: { ticketId: id },
        },
      })
    }

    return successResponse(reply, 201)
  } catch (error) {
    return handleApiError(error)
  }
}