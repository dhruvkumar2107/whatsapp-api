import { NextRequest } from 'next/server'
import { Prisma } from '@prisma/client'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { contactSchema } from '@/lib/validators'
import { successResponse, paginateResponse, getSearchParams } from '@/lib/api-utils'
import {
  handleApiError,
  UnauthorizedError,
  ConflictError,
  ValidationError,
} from '@/lib/errors'
import {
  buildContactsWhere,
  contactOrderBy,
  contactSummary,
  resolveWorkspaceTags,
  zodErrorsToRecord,
} from '@/lib/contacts'

const contactWriteSchema = contactSchema.extend({
  country: z.string().max(100).optional().or(z.literal('')),
  source: z.string().max(120).optional().or(z.literal('')),
  optIn: z.boolean().optional(),
})

function isDuplicateError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  )
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    const workspaceId = session?.user?.workspaceId
    if (!workspaceId) throw new UnauthorizedError()

    const { page, limit, search, sortBy, sortOrder, filters } =
      getSearchParams(request)

    const where = buildContactsWhere(workspaceId, filters, search)
    const orderBy = contactOrderBy(sortBy, sortOrder)

    const [contacts, total] = await Promise.all([
      prisma.contact.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          tags: {
            include: { tag: { select: { id: true, name: true, color: true } } },
          },
        },
      }),
      prisma.contact.count({ where }),
    ])

    return paginateResponse(
      contacts.map((contact) => contactSummary(contact)),
      total,
      page,
      limit
    )
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
    const parsed = contactWriteSchema.safeParse(body)
    if (!parsed.success) {
      throw new ValidationError(zodErrorsToRecord(parsed.error))
    }

    const { name, phone, email, country, source, optIn, tags, customFields, notes } =
      parsed.data

    const existing = await prisma.contact.findUnique({
      where: { workspaceId_phone: { workspaceId, phone } },
      select: { id: true },
    })
    if (existing) {
      throw new ConflictError('A contact with this phone number already exists')
    }

    const tagObjects = await resolveWorkspaceTags(workspaceId, tags ?? [])

    const hasCustomFields = customFields && Object.keys(customFields).length > 0

    const contact = await prisma.contact.create({
      data: {
        workspaceId,
        name,
        phone,
        email: email || null,
        country: country || null,
        source: source || null,
        optIn: optIn ?? false,
        tags: {
          create: tagObjects.map((tag) => ({ tagId: tag.id })),
        },
        customFields: hasCustomFields
          ? {
              create: Object.entries(customFields).map(([fieldName, fieldValue]) => ({
                fieldName,
                fieldValue: String(fieldValue ?? ''),
              })),
            }
          : undefined,
        notes: notes
          ? { create: { userId, content: notes } }
          : undefined,
      },
      include: {
        tags: {
          include: { tag: { select: { id: true, name: true, color: true } } },
        },
        customFields: true,
      },
    })

    return successResponse(contactSummary(contact), 201)
  } catch (error) {
    if (isDuplicateError(error)) {
      return handleApiError(
        new ConflictError('A contact with this phone number already exists')
      )
    }
    return handleApiError(error)
  }
}