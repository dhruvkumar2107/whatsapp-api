import { NextRequest } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { contactSchema } from '@/lib/validators'
import { successResponse, paginateResponse, authenticateApiKey, getSearchParams } from '@/lib/api-utils'
import {
  handleApiError,
  ForbiddenError,
  ConflictError,
  ValidationError,
} from '@/lib/errors'

const contactWriteSchema = contactSchema.extend({
  country: z.string().max(100).optional().or(z.literal('')),
  source: z.string().max(120).optional().or(z.literal('')),
  optIn: z.boolean().optional(),
})

export async function GET(request: NextRequest) {
  try {
    const authData = await authenticateApiKey(request)

    if (!authData.permissions.includes('contacts:view')) {
      throw new ForbiddenError('Missing permission: contacts:view')
    }

    const { page, limit, search, sortBy, sortOrder } = getSearchParams(request)
    const { searchParams } = new URL(request.url)
    const tag = searchParams.get('tag')
    const source = searchParams.get('source')
    const optIn = searchParams.get('optIn')

    const where: Record<string, unknown> = { workspaceId: authData.workspaceId }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
        { email: { contains: search, mode: 'insensitive' } },
      ]
    }

    if (tag) {
      where.tags = { some: { tagId: tag } }
    }

    if (source) {
      where.source = source
    }

    if (optIn === 'true') {
      where.optIn = true
    } else if (optIn === 'false') {
      where.optIn = false
    }

    const allowedSorts: Record<string, string> = {
      createdAt: 'createdAt',
      name: 'name',
      lastMessage: 'lastMessageAt',
    }
    const orderByField = allowedSorts[sortBy] || 'createdAt'

    const [contacts, total] = await Promise.all([
      prisma.contact.findMany({
        where,
        orderBy: { [orderByField]: sortOrder },
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

    return paginateResponse(contacts, total, page, limit)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const authData = await authenticateApiKey(request)

    if (!authData.permissions.includes('contacts:create')) {
      throw new ForbiddenError('Missing permission: contacts:create')
    }

    const body = await request.json().catch(() => null)
    const parsed = contactWriteSchema.safeParse(body)
    if (!parsed.success) {
      throw new ValidationError(parsed.error.flatten().fieldErrors as Record<string, string[]>)
    }

    const { name, phone, email, country, source, optIn } = parsed.data

    const existing = await prisma.contact.findUnique({
      where: { workspaceId_phone: { workspaceId: authData.workspaceId, phone } },
      select: { id: true },
    })
    if (existing) {
      throw new ConflictError('A contact with this phone number already exists')
    }

    const contact = await prisma.contact.create({
      data: {
        workspaceId: authData.workspaceId,
        name,
        phone,
        email: email || null,
        country: country || null,
        source: source || 'api',
        optIn: optIn ?? false,
      },
      include: {
        tags: {
          include: { tag: { select: { id: true, name: true, color: true } } },
        },
      },
    })

    return successResponse(contact, 201)
  } catch (error) {
    if (
      error instanceof Error &&
      'code' in error &&
      (error as { code: string }).code === 'P2002'
    ) {
      return handleApiError(new ConflictError('A contact with this phone number already exists'))
    }
    return handleApiError(error)
  }
}
