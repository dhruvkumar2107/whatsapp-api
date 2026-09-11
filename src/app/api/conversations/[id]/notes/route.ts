import { NextRequest } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { handleApiError, UnauthorizedError, NotFoundError } from '@/lib/errors'
import { successResponse } from '@/lib/api-utils'

const addNoteSchema = z.object({
  content: z.string().min(1).max(2000),
})

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
      select: { contactId: true },
    })
    if (!conversation) throw new NotFoundError('Conversation')

    const notes = await prisma.note.findMany({
      where: { contactId: conversation.contactId },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    return successResponse(notes)
  } catch (error) {
    return handleApiError(error)
  }
}

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
    const { content } = addNoteSchema.parse(body)

    const conversation = await prisma.conversation.findFirst({
      where: { id, workspaceId },
      select: { contactId: true },
    })
    if (!conversation) throw new NotFoundError('Conversation')

    const note = await prisma.note.create({
      data: {
        contactId: conversation.contactId,
        userId: session.user.id,
        content,
      },
      include: { user: { select: { id: true, name: true } } },
    })

    return successResponse(note, 201)
  } catch (error) {
    return handleApiError(error)
  }
}
