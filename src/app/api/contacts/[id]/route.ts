import { NextRequest } from 'next/server'
import { Prisma } from '@prisma/client'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { contactSchema } from '@/lib/validators'
import { successResponse } from '@/lib/api-utils'
import {
  handleApiError,
  UnauthorizedError,
  NotFoundError,
  ConflictError,
  ValidationError,
} from '@/lib/errors'
import { contactSummary, resolveWorkspaceTags, zodErrorsToRecord } from '@/lib/contacts'

const contactUpdateSchema = contactSchema
  .extend({
    country: z.string().max(100).optional().or(z.literal('')),
    source: z.string().max(120).optional().or(z.literal('')),
    optIn: z.boolean().optional(),
  })
  .partial()

function isDuplicateError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  )
}

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
      include: {
        tags: {
          include: { tag: { select: { id: true, name: true, color: true } } },
        },
        customFields: true,
        notes: {
          orderBy: { createdAt: 'desc' },
          include: { user: { select: { id: true, name: true, email: true } } },
        },
        conversations: {
          orderBy: { lastMessageAt: 'desc' },
          take: 20,
          include: {
            whatsappAccount: {
              select: { id: true, phoneNumber: true, businessName: true },
            },
          },
        },
        _count: { select: { conversations: true, notes: true } },
      },
    })

    if (!contact) throw new NotFoundError('Contact')

    return successResponse({
      ...contactSummary(contact),
      customFields: contact.customFields,
      notes: contact.notes,
      conversations: contact.conversations,
      conversationCount: contact._count.conversations,
      noteCount: contact._count.notes,
    })
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
    if (!workspaceId || !userId) throw new UnauthorizedError()

    const { id } = await params

    const existing = await prisma.contact.findFirst({
      where: { id, workspaceId },
      select: { id: true, phone: true },
    })
    if (!existing) throw new NotFoundError('Contact')

    const body = await request.json().catch(() => null)
    const parsed = contactUpdateSchema.safeParse(body)
    if (!parsed.success) {
      throw new ValidationError(zodErrorsToRecord(parsed.error))
    }

    const {
      name,
      phone,
      email,
      country,
      source,
      optIn,
      tags,
      customFields,
      notes,
    } = parsed.data

    if (phone && phone !== existing.phone) {
      const clash = await prisma.contact.findUnique({
        where: { workspaceId_phone: { workspaceId, phone } },
        select: { id: true },
      })
      if (clash) throw new ConflictError('A contact with this phone already exists')
    }

    let tagObjects: { id: string; name: string; color: string | null }[] = []
    if (tags) {
      tagObjects = await resolveWorkspaceTags(workspaceId, tags)
    }

    const hasCustomFields = customFields && Object.keys(customFields).length > 0

    await prisma.$transaction([
      prisma.contact.update({
        where: { id },
        data: {
          ...(name !== undefined ? { name } : {}),
          ...(phone !== undefined ? { phone } : {}),
          ...(email !== undefined ? { email: email || null } : {}),
          ...(country !== undefined ? { country: country || null } : {}),
          ...(source !== undefined ? { source: source || null } : {}),
          ...(optIn !== undefined ? { optIn } : {}),
        },
      }),
      ...(tags
        ? [
            prisma.contactTag.deleteMany({ where: { contactId: id } }),
            prisma.contactTag.createMany({
              data: tagObjects.map((tag) => ({ contactId: id, tagId: tag.id })),
            }),
          ]
        : []),
      ...(hasCustomFields
        ? [
            prisma.customFieldValue.deleteMany({ where: { contactId: id } }),
            prisma.customFieldValue.createMany({
              data: Object.entries(customFields).map(([fieldName, fieldValue]) => ({
                contactId: id,
                fieldName,
                fieldValue: String(fieldValue ?? ''),
              })),
            }),
          ]
        : []),
      ...(notes
        ? [prisma.note.create({ data: { contactId: id, userId, content: notes } })]
        : []),
    ])

    const updated = await prisma.contact.findFirst({
      where: { id, workspaceId },
      include: {
        tags: {
          include: { tag: { select: { id: true, name: true, color: true } } },
        },
        customFields: true,
      },
    })

    if (!updated) throw new NotFoundError('Contact')

    return successResponse(contactSummary(updated))
  } catch (error) {
    if (isDuplicateError(error)) {
      return handleApiError(
        new ConflictError('A contact with this phone already exists')
      )
    }
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

    const result = await prisma.contact.deleteMany({
      where: { id, workspaceId },
    })

    if (result.count === 0) throw new NotFoundError('Contact')

    return successResponse({ message: 'Contact deleted' })
  } catch (error) {
    return handleApiError(error)
  }
}