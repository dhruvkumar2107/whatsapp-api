import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { successResponse } from '@/lib/api-utils'
import { handleApiError, UnauthorizedError } from '@/lib/errors'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    const workspaceId = session?.user?.workspaceId
    if (!workspaceId) throw new UnauthorizedError()

    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get('days') || '30', 10)

    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(endDate.getDate() - days)

    const conversations = await prisma.conversation.findMany({
      where: { workspaceId },
      select: { id: true },
    })
    const conversationIds = conversations.map((c) => c.id)

    const messages = await prisma.message.findMany({
      where: {
        conversationId: { in: conversationIds },
        direction: 'OUTBOUND',
        createdAt: { gte: startDate, lte: endDate },
      },
      select: {
        status: true,
        type: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    })

    const dailyCounts: Record<string, { sent: number; delivered: number; read: number; failed: number }> = {}
    const typeBreakdown: Record<string, number> = {}

    for (const msg of messages) {
      const day = msg.createdAt.toISOString().slice(0, 10)
      if (!dailyCounts[day]) {
        dailyCounts[day] = { sent: 0, delivered: 0, read: 0, failed: 0 }
      }
      dailyCounts[day].sent += 1
      if (msg.status === 'DELIVERED' || msg.status === 'READ') {
        dailyCounts[day].delivered += 1
      }
      if (msg.status === 'READ') {
        dailyCounts[day].read += 1
      }
      if (msg.status === 'FAILED') {
        dailyCounts[day].failed += 1
      }

      typeBreakdown[msg.type] = (typeBreakdown[msg.type] || 0) + 1
    }

    const timeSeries = Object.entries(dailyCounts).map(([date, counts]) => ({
      date,
      ...counts,
    }))

    const typeDistribution = Object.entries(typeBreakdown).map(([type, count]) => ({
      type,
      count,
      percentage: messages.length > 0 ? Math.round((count / messages.length) * 10000) / 100 : 0,
    }))

    const totalSent = messages.length
    const totalDelivered = messages.filter((m) => ['DELIVERED', 'READ'].includes(m.status)).length
    const totalRead = messages.filter((m) => m.status === 'READ').length
    const totalFailed = messages.filter((m) => m.status === 'FAILED').length

    return successResponse({
      timeSeries,
      typeDistribution,
      totals: {
        sent: totalSent,
        delivered: totalDelivered,
        read: totalRead,
        failed: totalFailed,
      },
    })
  } catch (error) {
    return handleApiError(error)
  }
}
