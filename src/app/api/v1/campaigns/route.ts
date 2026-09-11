import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { campaignSchema } from '@/lib/validators'
import { successResponse, paginateResponse, authenticateApiKey, getSearchParams } from '@/lib/api-utils'
import { handleApiError, ForbiddenError, ValidationError } from '@/lib/errors'

export async function GET(request: NextRequest) {
  try {
    const authData = await authenticateApiKey(request)

    if (!authData.permissions.includes('campaigns:view')) {
      throw new ForbiddenError('Missing permission: campaigns:view')
    }

    const { page, limit, search, sortBy, sortOrder, filters } = getSearchParams(request)

    const where: Record<string, unknown> = { workspaceId: authData.workspaceId }
    if (filters.status) where.status = filters.status
    if (search) {
      where.name = { contains: search, mode: 'insensitive' }
    }

    const [campaigns, total] = await Promise.all([
      prisma.campaign.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          template: {
            select: { id: true, name: true, category: true },
          },
        },
      }),
      prisma.campaign.count({ where }),
    ])

    return paginateResponse(campaigns, total, page, limit)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const authData = await authenticateApiKey(request)

    if (!authData.permissions.includes('campaigns:create')) {
      throw new ForbiddenError('Missing permission: campaigns:create')
    }

    const body = await request.json()
    const parsed = campaignSchema.safeParse(body)
    if (!parsed.success) {
      return handleApiError(
        new ValidationError(parsed.error.flatten().fieldErrors as Record<string, string[]>)
      )
    }

    const template = await prisma.template.findFirst({
      where: { id: parsed.data.templateId, workspaceId: authData.workspaceId },
    })

    if (!template) {
      return handleApiError(new ValidationError('Template not found'))
    }

    if (template.status !== 'APPROVED') {
      return handleApiError(
        new ValidationError('Only approved templates can be used in campaigns')
      )
    }

    const campaign = await prisma.campaign.create({
      data: {
        workspaceId: authData.workspaceId,
        name: parsed.data.name,
        templateId: parsed.data.templateId,
        audience: (parsed.data.contactFilter as unknown as object) || undefined,
        scheduledAt: parsed.data.scheduledAt ? new Date(parsed.data.scheduledAt) : undefined,
        status: parsed.data.scheduledAt ? 'SCHEDULED' : 'DRAFT',
      },
    })

    return successResponse(campaign, 201)
  } catch (error) {
    return handleApiError(error)
  }
}
