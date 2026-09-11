import { NextRequest } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { handleApiError, UnauthorizedError, NotFoundError } from '@/lib/errors'
import { successResponse } from '@/lib/api-utils'

const addTagSchema = z.object({
  name: z.string().min(1).max(50),
})

const removeTagSchema = z.object({
  tagId: z.string().uuid(),
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
    const { name } = addTagSchema.parse(body)

    const conversation = await prisma.conversation.findFirst({
      where: { id, workspaceId },
      select: { contactId: true },
    })
    if (!conversation) throw new NotFoundError('Conversation')

    let tag = await prisma.tag.findUnique({
      where: { workspaceId_name: { workspaceId, name } },
    })
    if (!tag) {
      tag = await prisma.tag.create({
        data: { workspaceId, name },
      })
    }

    const existing = await prisma.contactTag.findUnique({
      where: {
        contactId_tagId: {
          contactId: conversation.contactId,
          tagId: tag.id,
        },
      },
    })

    if (!existing) {
      await prisma.contactTag.create({
        data: { contactId: conversation.contactId, tagId: tag.id },
      })
    }

    return successResponse({ tag }, 201)
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
    if (!session?.user?.id) throw new UnauthorizedError()
    const workspaceId = session.user.workspaceId
    if (!workspaceId) throw new UnauthorizedError('No workspace')

    const { id } = await params
    const body = await request.json()
    const { tagId } = removeTagSchema.parse(body)

    const conversation = await prisma.conversation.findFirst({
      where: { id, workspaceId },
      select: { contactId: true },
    })
    if (!conversation) throw new NotFoundError('Conversation')

    await prisma.contactTag.deleteMany({
      where: { contactId: conversation.contactId, tagId },
    })

    return successResponse({ success: true })
  } catch (error) {
    return handleApiError(error)
  }
}
