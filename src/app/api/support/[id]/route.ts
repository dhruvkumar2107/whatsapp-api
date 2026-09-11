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

const updateStatusSchema = z.object({
  status: z.enum(['OPEN', 'IN_PROGRESS', 'WAITING', 'RESOLVED', 'CLOSED']),
})

const MANAGE_ROLES: string[] = [ROLES.OWNER, ROLES.ADMIN, ROLES.MANAGER]

async function findTicket(workspaceId: string, userId: string, role: string, id: string) {
  const canSeeAll = MANAGE_ROLES.includes(role)

  const ticket = await prisma.supportTicket.findFirst({
    where: {
      id,
      workspaceId,
      ...(canSeeAll ? {} : { OR: [{ userId }, { assignedToId: userId }] }),
    },
    include: {
      user: { select: { id: true, name: true, email: true, image: true } },
      replies: {
        orderBy: { createdAt: 'asc' },
        include: {
          user: { select: { id: true, name: true, email: true, image: true } },
        },
      },
    },
  })

  if (!ticket) throw new NotFoundError('Support ticket')
  return ticket
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    const workspaceId = session?.user?.workspaceId
    const userId = session?.user?.id
    const role = session?.user?.role
    if (!workspaceId || !userId || !role) throw new UnauthorizedError()

    const { id } = await params
    const ticket = await findTicket(workspaceId, userId, role, id)

    return successResponse(ticket)
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
    const userId = session?.user?.id
    const role = session?.user?.role
    if (!workspaceId || !userId || !role) throw new UnauthorizedError()

    const { id } = await params
    const ticket = await findTicket(workspaceId, userId, role, id)

    const body = await request.json().catch(() => null)
    const parsed = updateStatusSchema.safeParse(body ?? {})
    if (!parsed.success) {
      throw new ValidationError(parsed.error.flatten().fieldErrors as Record<string, string[]>)
    }

    const updated = await prisma.supportTicket.update({
      where: { id: ticket.id },
      data: { status: parsed.data.status },
      include: {
        user: { select: { id: true, name: true, email: true, image: true } },
        replies: {
          orderBy: { createdAt: 'asc' },
          include: {
            user: { select: { id: true, name: true, email: true, image: true } },
          },
        },
      },
    })

    return successResponse(updated)
  } catch (error) {
    return handleApiError(error)
  }
}