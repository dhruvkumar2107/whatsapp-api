import { NextRequest } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { successResponse } from '@/lib/api-utils'
import {
  handleApiError,
  UnauthorizedError,
  ValidationError,
} from '@/lib/errors'
import { resolveWorkspaceTags, zodErrorsToRecord } from '@/lib/contacts'

const bulkSchema = z.object({
  action: z.enum(['tag', 'delete', 'update']),
  contactIds: z.array(z.string().min(1)).min(1, 'At least one contact is required'),
  tagIds: z.array(z.string().min(1)).optional(),
  tagNames: z.array(z.string().min(1)).optional(),
  data: z
    .object({
      name: z.string().min(1).max(200).optional(),
      phone: z
        .string()
        .regex(/^\+[1-9]\d{1,14}$/, 'Invalid phone number')
        .optional(),
      email: z.string().email().optional().or(z.literal('')),
      country: z.string().max(100).optional().or(z.literal('')),
      source: z.string().max(120).optional().or(z.literal('')),
      optIn: z.boolean().optional(),
    })
    .optional(),
})

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    const workspaceId = session?.user?.workspaceId
    if (!workspaceId) throw new UnauthorizedError()

    const body = await request.json().catch(() => null)
    const parsed = bulkSchema.safeParse(body)
    if (!parsed.success) {
      throw new ValidationError(zodErrorsToRecord(parsed.error))
    }

    const { action, contactIds, tagIds, tagNames, data } = parsed.data

    const owned = await prisma.contact.findMany({
      where: { workspaceId, id: { in: contactIds } },
      select: { id: true },
    })

    if (owned.length === 0) {
      throw new ValidationError('No matching contacts found in this workspace')
    }

    const ownedIds = owned.map((contact) => contact.id)

    if (action === 'delete') {
      const result = await prisma.contact.deleteMany({
        where: { id: { in: ownedIds }, workspaceId },
      })
      return successResponse({
        message: `${result.count} contact${result.count === 1 ? '' : 's'} deleted`,
        count: result.count,
        ids: ownedIds,
      })
    }

    if (action === 'tag') {
      const resolvedNames = await resolveWorkspaceTags(workspaceId, tagNames ?? [])
      const tagIdSet = new Set([
        ...(tagIds ?? []),
        ...resolvedNames.map((tag) => tag.id),
      ])

      const validTags = await prisma.tag.findMany({
        where: { workspaceId, id: { in: [...tagIdSet] } },
        select: { id: true },
      })

      if (validTags.length === 0) {
        throw new ValidationError('No valid tags provided')
      }

      const result = await prisma.contactTag.createMany({
        data: ownedIds.flatMap((contactId) =>
          validTags.map((tag) => ({ contactId, tagId: tag.id }))
        ),
        skipDuplicates: true,
      })

      return successResponse({
        message: `Tagged ${ownedIds.length} contact${ownedIds.length === 1 ? '' : 's'}`,
        count: result.count,
        ids: ownedIds,
        tags: validTags.map((tag) => tag.id),
      })
    }

    if (action === 'update') {
      if (!data || Object.keys(data).length === 0) {
        throw new ValidationError('Update data is required')
      }

      const updateData: Record<string, unknown> = {}
      if (data.name !== undefined) updateData.name = data.name
      if (data.phone !== undefined) updateData.phone = data.phone
      if (data.email !== undefined) updateData.email = data.email || null
      if (data.country !== undefined) updateData.country = data.country || null
      if (data.source !== undefined) updateData.source = data.source || null
      if (data.optIn !== undefined) updateData.optIn = data.optIn

      const result = await prisma.contact.updateMany({
        where: { id: { in: ownedIds }, workspaceId },
        data: updateData,
      })

      return successResponse({
        message: `Updated ${result.count} contact${result.count === 1 ? '' : 's'}`,
        count: result.count,
        ids: ownedIds,
      })
    }

    throw new ValidationError('Unsupported bulk action')
  } catch (error) {
    return handleApiError(error)
  }
}