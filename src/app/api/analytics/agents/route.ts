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

    const agents = await prisma.workspaceMember.findMany({
      where: {
        workspaceId,
        role: { in: ['AGENT', 'MANAGER', 'ADMIN'] },
      },
      select: {
        user: {
          select: { id: true, name: true, email: true, image: true },
        },
      },
    })

    const agentStats = await Promise.all(
      agents.map(async (agent) => {
        const conversations = await prisma.conversation.findMany({
          where: {
            workspaceId,
            assignedAgentId: agent.user.id,
            createdAt: { gte: startDate, lte: endDate },
          },
          select: { id: true },
        })
        const conversationIds = conversations.map((c) => c.id)

        const [totalMessages, outboundMessages, conversationsHandled, firstResponseTimes] =
          await Promise.all([
            prisma.message.count({
              where: {
                conversationId: { in: conversationIds },
                createdAt: { gte: startDate, lte: endDate },
              },
            }),
            prisma.message.count({
              where: {
                conversationId: { in: conversationIds },
                direction: 'OUTBOUND',
                createdAt: { gte: startDate, lte: endDate },
              },
            }),
            prisma.conversation.count({
              where: {
                workspaceId,
                assignedAgentId: agent.user.id,
                createdAt: { gte: startDate, lte: endDate },
              },
            }),
            prisma.$queryRawUnsafe<{ avg_ms: number | null }[]>(
              `SELECT AVG(EXTRACT(EPOCH FROM (m."createdAt" - c."createdAt")) * 1000)::int as avg_ms
               FROM "Conversation" c
               INNER JOIN "Message" m ON m."conversationId" = c."id"
               WHERE c."workspaceId" = $1
                 AND c."assignedAgentId" = $2
                 AND m."direction" = 'OUTBOUND'
                 AND c."createdAt" >= $3
                 AND c."createdAt" <= $4
                 AND c."createdAt" < m."createdAt"`,
              workspaceId,
              agent.user.id,
              startDate,
              endDate
            ),
          ])

        return {
          agent: agent.user,
          stats: {
            totalMessages,
            outboundMessages,
            conversationsHandled,
            avgResponseTimeMs: firstResponseTimes[0]?.avg_ms || 0,
          },
        }
      })
    )

    return successResponse({
      agents: agentStats.sort((a, b) => b.stats.conversationsHandled - a.stats.conversationsHandled),
      period: { startDate, endDate },
    })
  } catch (error) {
    return handleApiError(error)
  }
}
