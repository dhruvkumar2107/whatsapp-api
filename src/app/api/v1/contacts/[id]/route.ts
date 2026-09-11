import { NextRequest } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { successResponse, authenticateApiKey } from '@/lib/api-utils'
import { handleApiError, ForbiddenError, NotFoundError, ConflictError, ValidationError } from '@/lib/errors'

const contactUpdateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  phone: z.string().regex(/^\+[1-9]\d{1,14}$/, 'Invalid phone number').optional(),
  email: z.string().email().optional().or(z.literal('')),
  country: z.string().max(100).optional().or(z.literal('')),
  source: z.string().max(120).optional().or(z.literal('')),
  optIn: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authData = await authenticateApiKey(request)

    if (!authData.permissions.includes('contacts:view')) {
      throw new ForbiddenError('Missing permission: contacts:view')
    }

    const { id } = await params

    const contact = await prisma.contact.findFirst({
      where: { id, workspaceId: authData.workspaceId },
      include: {
        tags: {
          include: { tag: { select: { id: true, name: true, color: true } } },
        },
        customFields: true,
      },
    })

    if (!contact) throw new NotFoundError('Contact')

    return successResponse(contact)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authData = await authenticateApiKey(request)

    if (!authData.permissions.includes('contacts:edit')) {
      throw new ForbiddenError('Missing permission: contacts:edit')
    }

    const { id } = await params

    const existing = await prisma.contact.findFirst({
      where: { id, workspaceId: authData.workspaceId },
      select: { id: true, phone: true },
    })
    if (!existing) throw new NotFoundError('Contact')

    const body = await request.json().catch(() => null)
    const parsed = contactUpdateSchema.safeParse(body)
    if (!parsed.success) {
      throw new ValidationError(parsed.error.flatten().fieldErrors as Record<string, string[]>)
    }

    const { name, phone, email, country, source, optIn } = parsed.data

    if (phone && phone !== existing.phone) {
      const clash = await prisma.contact.findUnique({
        where: { workspaceId_phone: { workspaceId: authData.workspaceId, phone } },
        select: { id: true },
      })
      if (clash) throw new ConflictError('A contact with this phone already exists')
    }

    const updated = await prisma.contact.update({
      where: { id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(phone !== undefined ? { phone } : {}),
        ...(email !== undefined ? { email: email || null } : {}),
        ...(country !== undefined ? { country: country || null } : {}),
        ...(source !== undefined ? { source: source || null } : {}),
        ...(optIn !== undefined ? { optIn } : {}),
      },
      include: {
        tags: {
          include: { tag: { select: { id: true, name: true, color: true } } },
        },
        customFields: true,
      },
    })

    return successResponse(updated)
  } catch (error) {
    if (
      error instanceof Error &&
      'code' in error &&
      (error as { code: string }).code === 'P2002'
    ) {
      return handleApiError(new ConflictError('A contact with this phone already exists'))
    }
    return handleApiError(error)
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authData = await authenticateApiKey(request)

    if (!authData.permissions.includes('contacts:delete')) {
      throw new ForbiddenError('Missing permission: contacts:delete')
    }

    const { id } = await params

    const result = await prisma.contact.deleteMany({
      where: { id, workspaceId: authData.workspaceId },
    })

    if (result.count === 0) throw new NotFoundError('Contact')

    return successResponse({ message: 'Contact deleted' })
  } catch (error) {
    return handleApiError(error)
  }
}
