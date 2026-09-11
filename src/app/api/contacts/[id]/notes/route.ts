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

const createNoteSchema = z.object({
  content: z.string().min(1, 'Note content is required').max(2000),
})

export async function GET(
  _request: NextRequest,
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

    const notes = await prisma.note.findMany({
      where: { contactId: id },
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { id: true, name: true, email: true } } },
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
    const workspaceId = session?.user?.workspaceId
    const userId = session?.user?.id
    if (!workspaceId || !userId) throw new UnauthorizedError()

    const { id } = await params

    const contact = await prisma.contact.findFirst({
      where: { id, workspaceId },
      select: { id: true },
    })
    if (!contact) throw new NotFoundError('Contact')

    const body = await request.json().catch(() => null)
    const parsed = createNoteSchema.safeParse(body)
    if (!parsed.success) {
      throw new ValidationError(
        parsed.error.flatten().fieldErrors as Record<string, string[]>
      )
    }

    const note = await prisma.note.create({
      data: {
        contactId: id,
        userId,
        content: parsed.data.content,
      },
      include: { user: { select: { id: true, name: true, email: true } } },
    })

    return successResponse(note, 201)
  } catch (error) {
    return handleApiError(error)
  }
}