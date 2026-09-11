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
import { contactSummary, resolveWorkspaceTags } from '@/lib/contacts'

const addTagsSchema = z.object({
  tagIds: z.array(z.string().min(1)).default([]),
  tagNames: z.array(z.string().min(1).max(50)).default([]),
})

const removeTagsSchema = z.object({
  tagIds: z.array(z.string().min(1)).min(1, 'At least one tag is required'),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    const workspaceId = session?.user?.workspaceId
    if (!workspaceId) throw new UnauthorizedError()

    const { id } = await params

    const contact = await prisma.contact.findFirst({
      where: { id, workspaceId },
      select: { id: true },
    })
    if (!contact) throw new NotFoundError('Contact')

    const body = await request.json().catch(() => null)
    const parsed = addTagsSchema.safeParse(body)
    if (!parsed.success) {
      throw new ValidationError(
        parsed.error.flatten().fieldErrors as Record<string, string[]>
      )
    }

    const { tagIds, tagNames } = parsed.data

    const resolvedNames = await resolveWorkspaceTags(workspaceId, tagNames)
    const candidateIds = new Set([...tagIds, ...resolvedNames.map((tag) => tag.id)])

    const validTags = await prisma.tag.findMany({
      where: { workspaceId, id: { in: [...candidateIds] } },
      select: { id: true },
    })

    await prisma.contactTag.createMany({
      data: validTags.map((tag) => ({ contactId: id, tagId: tag.id })),
      skipDuplicates: true,
    })

    const updated = await prisma.contact.findFirst({
      where: { id, workspaceId },
      include: {
        tags: {
          include: { tag: { select: { id: true, name: true, color: true } } },
        },
      },
    })

    if (!updated) throw new NotFoundError('Contact')

    return successResponse(contactSummary(updated).tags)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    const workspaceId = session?.user?.workspaceId
    if (!workspaceId) throw new UnauthorizedError()

    const { id } = await params

    const contact = await prisma.contact.findFirst({
      where: { id, workspaceId },
      select: { id: true },
    })
    if (!contact) throw new NotFoundError('Contact')

    const body = await request.json().catch(() => null)
    const parsed = removeTagsSchema.safeParse(body)
    if (!parsed.success) {
      throw new ValidationError(
        parsed.error.flatten().fieldErrors as Record<string, string[]>
      )
    }

    await prisma.contactTag.deleteMany({
      where: { contactId: id, tagId: { in: parsed.data.tagIds } },
    })

    const updated = await prisma.contact.findFirst({
      where: { id, workspaceId },
      include: {
        tags: {
          include: { tag: { select: { id: true, name: true, color: true } } },
        },
      },
    })

    if (!updated) throw new NotFoundError('Contact')

    return successResponse(contactSummary(updated).tags)
  } catch (error) {
    return handleApiError(error)
  }
}