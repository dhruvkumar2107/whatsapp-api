import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { paginateResponse, getSearchParams } from '@/lib/api-utils'
import { handleApiError, UnauthorizedError } from '@/lib/errors'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    const workspaceId = session?.user?.workspaceId
    if (!workspaceId) throw new UnauthorizedError()

    const { page, limit } = getSearchParams(request)

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where: { workspaceId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          subscription: {
            include: { plan: { select: { name: true } } },
          },
        },
      }),
      prisma.invoice.count({ where: { workspaceId } }),
    ])

    return paginateResponse(invoices, total, page, limit)
  } catch (error) {
    return handleApiError(error)
  }
}
