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
    const range = searchParams.get('range') || '30'

    const endDate = new Date()
    const startDate = new Date()
    if (range === '1') {
      startDate.setDate(endDate.getDate() - 1)
    } else if (range === '7') {
      startDate.setDate(endDate.getDate() - 7)
    } else if (range === '30') {
      startDate.setDate(endDate.getDate() - 30)
    } else if (range === '90') {
      startDate.setDate(endDate.getDate() - 90)
    } else if (range === 'custom') {
      const s = searchParams.get('startDate')
      const e = searchParams.get('endDate')
      if (s) startDate.setTime(new Date(s).getTime())
      if (e) endDate.setTime(new Date(e).getTime())
    }

    const conversations = await prisma.conversation.findMany({
      where: { workspaceId },
      select: { id: true },
    })
    const conversationIds = conversations.map((c) => c.id)

    const [totalMessages, deliveredCount, readCount, failedCount, totalContacts, newContacts, activeCampaigns] =
      await Promise.all([
        prisma.message.count({
          where: {
            conversationId: { in: conversationIds },
            direction: 'OUTBOUND',
            createdAt: { gte: startDate, lte: endDate },
          },
        }),
        prisma.message.count({
          where: {
            conversationId: { in: conversationIds },
            direction: 'OUTBOUND',
            status: 'DELIVERED',
            createdAt: { gte: startDate, lte: endDate },
          },
        }),
        prisma.message.count({
          where: {
            conversationId: { in: conversationIds },
            direction: 'OUTBOUND',
            status: 'READ',
            createdAt: { gte: startDate, lte: endDate },
          },
        }),
        prisma.message.count({
          where: {
            conversationId: { in: conversationIds },
            direction: 'OUTBOUND',
            status: 'FAILED',
            createdAt: { gte: startDate, lte: endDate },
          },
        }),
        prisma.contact.count({ where: { workspaceId } }),
        prisma.contact.count({
          where: { workspaceId, createdAt: { gte: startDate, lte: endDate } },
        }),
        prisma.campaign.count({
          where: { workspaceId, status: { in: ['RUNNING', 'SCHEDULED'] } },
        }),
      ])

    const deliveryRate = totalMessages > 0 ? (deliveredCount / totalMessages) * 100 : 0
    const readRate = totalMessages > 0 ? (readCount / totalMessages) * 100 : 0
    const failureRate = totalMessages > 0 ? (failedCount / totalMessages) * 100 : 0

    const daysDiff = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)))
    const messagesPerDay = totalMessages / daysDiff

    return successResponse({
      totalMessages,
      deliveredCount,
      readCount,
      failedCount,
      deliveryRate: Math.round(deliveryRate * 100) / 100,
      readRate: Math.round(readRate * 100) / 100,
      failureRate: Math.round(failureRate * 100) / 100,
      totalContacts,
      newContacts,
      activeCampaigns,
      messagesPerDay: Math.round(messagesPerDay * 100) / 100,
    })
  } catch (error) {
    return handleApiError(error)
  }
}
