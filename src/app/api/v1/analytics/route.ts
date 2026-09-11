import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { successResponse, authenticateApiKey } from '@/lib/api-utils'
import { handleApiError, ForbiddenError, ValidationError } from '@/lib/errors'

function getDateRange(period: string, startDate?: string, endDate?: string) {
  if (startDate && endDate) {
    return { from: new Date(startDate), to: new Date(endDate) }
  }

  const now = new Date()
  const to = new Date(now)

  switch (period) {
    case 'today': {
      const from = new Date(now)
      from.setHours(0, 0, 0, 0)
      return { from, to }
    }
    case '7d': {
      const from = new Date(now)
      from.setDate(from.getDate() - 7)
      return { from, to }
    }
    case '30d': {
      const from = new Date(now)
      from.setDate(from.getDate() - 30)
      return { from, to }
    }
    case '90d': {
      const from = new Date(now)
      from.setDate(from.getDate() - 90)
      return { from, to }
    }
    default: {
      const from = new Date(now)
      from.setDate(from.getDate() - 30)
      return { from, to }
    }
  }
}

export async function GET(request: NextRequest) {
  try {
    const authData = await authenticateApiKey(request)

    if (!authData.permissions.includes('analytics:view')) {
      throw new ForbiddenError('Missing permission: analytics:view')
    }

    const { searchParams } = new URL(request.url)
    const metric = searchParams.get('metric') || 'messages'
    const period = searchParams.get('period') || '30d'
    const startDate = searchParams.get('startDate') || undefined
    const endDate = searchParams.get('endDate') || undefined

    const { from, to } = getDateRange(period, startDate, endDate)
    const workspaceId = authData.workspaceId

    const whereBase = { workspaceId }

    if (metric === 'messages') {
      const [total, sent, delivered, read, failed, byDay] = await Promise.all([
        prisma.message.count({
          where: { conversation: whereBase, createdAt: { gte: from, lte: to } },
        }),
        prisma.message.count({
          where: { conversation: whereBase, direction: 'OUTBOUND', createdAt: { gte: from, lte: to } },
        }),
        prisma.message.count({
          where: { conversation: whereBase, direction: 'OUTBOUND', status: 'DELIVERED', createdAt: { gte: from, lte: to } },
        }),
        prisma.message.count({
          where: { conversation: whereBase, direction: 'OUTBOUND', status: 'READ', createdAt: { gte: from, lte: to } },
        }),
        prisma.message.count({
          where: { conversation: whereBase, direction: 'OUTBOUND', status: 'FAILED', createdAt: { gte: from, lte: to } },
        }),
        prisma.$queryRaw`
          SELECT DATE("createdAt") as date, COUNT(*)::int as count
          FROM "Message"
          WHERE "conversationId" IN (SELECT id FROM "Conversation" WHERE "workspaceId" = ${workspaceId})
            AND "createdAt" >= ${from} AND "createdAt" <= ${to}
          GROUP BY DATE("createdAt")
          ORDER BY date ASC
        `,
      ])

      return successResponse({
        metric: 'messages',
        period,
        total,
        sent,
        delivered,
        read,
        failed,
        byDay,
      })
    }

    if (metric === 'contacts') {
      const [total, newInPeriod, optedIn] = await Promise.all([
        prisma.contact.count({ where: whereBase }),
        prisma.contact.count({
          where: { ...whereBase, createdAt: { gte: from, lte: to } },
        }),
        prisma.contact.count({
          where: { ...whereBase, optIn: true },
        }),
      ])

      return successResponse({
        metric: 'contacts',
        period,
        total,
        newInPeriod,
        optedIn,
      })
    }

    if (metric === 'campaigns') {
      const [total, completed, running, byStatus] = await Promise.all([
        prisma.campaign.count({ where: whereBase }),
        prisma.campaign.count({
          where: { ...whereBase, status: 'COMPLETED' },
        }),
        prisma.campaign.count({
          where: { ...whereBase, status: 'RUNNING' },
        }),
        prisma.campaign.groupBy({
          by: ['status'],
          where: { ...whereBase, createdAt: { gte: from, lte: to } },
          _count: { status: true },
        }),
      ])

      return successResponse({
        metric: 'campaigns',
        period,
        total,
        completed,
        running,
        byStatus: byStatus.map((s) => ({ status: s.status, count: s._count.status })),
      })
    }

    throw new ValidationError('Invalid metric. Use: messages, contacts, or campaigns')
  } catch (error) {
    return handleApiError(error)
  }
}
