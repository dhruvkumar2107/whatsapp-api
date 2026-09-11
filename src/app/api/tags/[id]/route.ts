import { NextRequest } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { successResponse } from '@/lib/api-utils'
import {
  handleApiError,
  UnauthorizedError,
  NotFoundError,
  ConflictError,
  ValidationError,
} from '@/lib/errors'

const updateTagSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  color: z.string().max(20).optional().nullable(),
})

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    const workspaceId = session?.user?.workspaceId
    if (!workspaceId) throw new UnauthorizedError()

    const { id } = await params

    const existing = await prisma.tag.findFirst({
      where: { id, workspaceId },
      select: { id: true },
    })
    if (!existing) throw new NotFoundError('Tag')

    const body = await request.json().catch(() => null)
    const parsed = updateTagSchema.safeParse(body)
    if (!parsed.success) {
      throw new ValidationError(
        parsed.error.flatten().fieldErrors as Record<string, string[]>
      )
    }

    const data: { name?: string; color?: string | null } = {}
    if (parsed.data.name !== undefined) {
      const name = parsed.data.name.trim()
      if (!name) throw new ValidationError('Tag name is required')
      data.name = name

      const clash = await prisma.tag.findFirst({
        where: { workspaceId, name, id: { not: id } },
        select: { id: true },
      })
      if (clash) throw new ConflictError('A tag with this name already exists')
    }
    if (parsed.data.color !== undefined) {
      data.color = parsed.data.color
    }

    const tag = await prisma.tag.update({
      where: { id },
      data,
    })

    return successResponse(tag)
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
    if (!workspaceId) throw new UnauthorizedError()

    const { id } = await params

    const existing = await prisma.tag.findFirst({
      where: { id, workspaceId },
      select: { id: true },
    })
    if (!existing) throw new NotFoundError('Tag')

    await prisma.tag.delete({ where: { id } })

    return successResponse({ message: 'Tag deleted' })
  } catch (error) {
    return handleApiError(error)
  }
}