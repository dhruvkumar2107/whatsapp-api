import { NextRequest, NextResponse } from 'next/server'
import { PAGINATION_DEFAULTS } from './constants'
import { UnauthorizedError, handleApiError } from './errors'
import { hashApiKey } from './utils'
import prisma from './prisma'

export function successResponse(data: unknown, status: number = 200) {
  return NextResponse.json({ success: true, data }, { status })
}

export function errorResponse(error: unknown, status?: number) {
  if (error instanceof Error && 'statusCode' in error) {
    return handleApiError(error)
  }
  return NextResponse.json(
    {
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
        code: 'INTERNAL_ERROR',
      },
    },
    { status: status || 500 }
  )
}

export function paginateResponse(
  data: unknown[],
  total: number,
  page: number,
  limit: number
) {
  const totalPages = Math.ceil(total / limit)
  return NextResponse.json({
    success: true,
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  })
}

export function getSearchParams(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const page = Math.max(1, parseInt(searchParams.get('page') || String(PAGINATION_DEFAULTS.PAGE), 10))
  const limit = Math.min(
    PAGINATION_DEFAULTS.MAX_LIMIT,
    Math.max(1, parseInt(searchParams.get('limit') || String(PAGINATION_DEFAULTS.LIMIT), 10))
  )
  const search = searchParams.get('search') || ''
  const sortBy = searchParams.get('sortBy') || 'createdAt'
  const sortOrder = (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc'

  const filters: Record<string, string> = {}
  searchParams.forEach((value, key) => {
    if (!['page', 'limit', 'search', 'sortBy', 'sortOrder'].includes(key)) {
      filters[key] = value
    }
  })

  return { page, limit, search, sortBy, sortOrder, filters }
}

export async function authenticateApiKey(request: NextRequest) {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new UnauthorizedError('API key required')
  }

  const token = authHeader.slice(7)
  const hashedKey = hashApiKey(token)

  const apiKey = await prisma.apiKey.findUnique({
    where: { keyHash: hashedKey },
    include: {
      workspace: {
        select: { id: true, name: true },
      },
    },
  })

  if (!apiKey) {
    throw new UnauthorizedError('Invalid API key')
  }

  if (apiKey.expiresAt && new Date(apiKey.expiresAt) < new Date()) {
    throw new UnauthorizedError('API key has expired')
  }

  if (!apiKey.isActive) {
    throw new UnauthorizedError('API key has been revoked')
  }

  await prisma.apiKey.update({
    where: { id: apiKey.id },
    data: { lastUsedAt: new Date() },
  })

  return {
    workspaceId: apiKey.workspaceId,
    permissions: apiKey.permissions as string[],
    workspace: apiKey.workspace,
  }
}
