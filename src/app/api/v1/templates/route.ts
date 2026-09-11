import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { successResponse, paginateResponse, authenticateApiKey, getSearchParams } from '@/lib/api-utils'
import { handleApiError, ForbiddenError } from '@/lib/errors'

export async function GET(request: NextRequest) {
  try {
    const authData = await authenticateApiKey(request)

    if (!authData.permissions.includes('templates:view')) {
      throw new ForbiddenError('Missing permission: templates:view')
    }

    const { page, limit, search, sortBy, sortOrder, filters } = getSearchParams(request)

    const where: Record<string, unknown> = { workspaceId: authData.workspaceId }
    if (filters.status) where.status = filters.status
    if (filters.category) where.category = filters.category
    if (filters.language) where.language = filters.language
    if (search) {
      where.name = { contains: search, mode: 'insensitive' }
    }

    const [templates, total] = await Promise.all([
      prisma.template.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          name: true,
          category: true,
          language: true,
          status: true,
          header: true,
          body: true,
          footer: true,
          buttons: true,
          rejectionReason: true,
          metaTemplateId: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.template.count({ where }),
    ])

    return paginateResponse(templates, total, page, limit)
  } catch (error) {
    return handleApiError(error)
  }
}
