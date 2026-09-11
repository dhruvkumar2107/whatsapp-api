import { NextRequest } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { successResponse, paginateResponse, getSearchParams } from '@/lib/api-utils'
import { handleApiError, UnauthorizedError, ValidationError } from '@/lib/errors'
import { ROLES } from '@/lib/constants'

const createTicketSchema = z.object({
  subject: z.string().min(3, 'Subject must be at least 3 characters').max(200),
  description: z.string().min(10, 'Description must be at least 10 characters').max(5000),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
})

const MANAGE_ROLES: string[] = [ROLES.OWNER, ROLES.ADMIN, ROLES.MANAGER]

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    const workspaceId = session?.user?.workspaceId
    const userId = session?.user?.id
    const role = session?.user?.role ?? 'VIEWER'
    if (!workspaceId || !userId) throw new UnauthorizedError()

    const { page, limit, search } = getSearchParams(request)

    const canSeeAll = MANAGE_ROLES.includes(role)

    const where: Record<string, unknown> = { workspaceId }
    if (!canSeeAll) where.userId = userId
    if (search) {
      where.subject = { contains: search, mode: 'insensitive' }
    }

    const [tickets, total] = await Promise.all([
      prisma.supportTicket.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          user: { select: { id: true, name: true, email: true, image: true } },
          _count: { select: { replies: true } },
        },
      }),
      prisma.supportTicket.count({ where }),
    ])

    return paginateResponse(tickets, total, page, limit)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    const workspaceId = session?.user?.workspaceId
    const userId = session?.user?.id
    if (!workspaceId || !userId) throw new UnauthorizedError()

    const body = await request.json().catch(() => null)
    const parsed = createTicketSchema.safeParse(body ?? {})
    if (!parsed.success) {
      throw new ValidationError(parsed.error.flatten().fieldErrors as Record<string, string[]>)
    }

    const ticket = await prisma.supportTicket.create({
      data: {
        workspaceId,
        userId,
        subject: parsed.data.subject,
        description: parsed.data.description,
        priority: parsed.data.priority,
      },
      include: {
        user: { select: { id: true, name: true, email: true, image: true } },
      },
    })

    return successResponse(ticket, 201)
  } catch (error) {
    return handleApiError(error)
  }
}