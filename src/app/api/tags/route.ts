import { NextRequest } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { successResponse } from '@/lib/api-utils'
import {
  handleApiError,
  UnauthorizedError,
  ConflictError,
  ValidationError,
} from '@/lib/errors'

const createTagSchema = z.object({
  name: z.string().min(1).max(50),
  color: z.string().max(20).optional(),
})

export async function GET() {
  try {
    const session = await auth()
    const workspaceId = session?.user?.workspaceId
    if (!workspaceId) throw new UnauthorizedError()

    const tags = await prisma.tag.findMany({
      where: { workspaceId },
      orderBy: { name: 'asc' },
      include: { _count: { select: { contacts: true } } },
    })

    return successResponse(
      tags.map((tag) => ({
        id: tag.id,
        name: tag.name,
        color: tag.color,
        createdAt: tag.createdAt,
        contactCount: tag._count.contacts,
      }))
    )
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    const workspaceId = session?.user?.workspaceId
    if (!workspaceId) throw new UnauthorizedError()

    const body = await request.json().catch(() => null)
    const parsed = createTagSchema.safeParse(body)
    if (!parsed.success) {
      throw new ValidationError(
        parsed.error.flatten().fieldErrors as Record<string, string[]>
      )
    }

    const name = parsed.data.name.trim()
    if (!name) throw new ValidationError('Tag name is required')

    const existing = await prisma.tag.findUnique({
      where: { workspaceId_name: { workspaceId, name } },
      select: { id: true },
    })
    if (existing) throw new ConflictError('A tag with this name already exists')

    const tag = await prisma.tag.create({
      data: {
        workspaceId,
        name,
        color: parsed.data.color ?? null,
      },
    })

    return successResponse(tag, 201)
  } catch (error) {
    return handleApiError(error)
  }
}