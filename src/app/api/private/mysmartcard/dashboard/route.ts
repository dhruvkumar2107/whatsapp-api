import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getMySmartCardContext } from '@/lib/mysmartcard/auth'
import { handleApiError } from '@/lib/errors'

export async function GET() {
  try {
    const ctx = await getMySmartCardContext()
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    const [
      totalConversations,
      conversationsToday,
      totalLeads,
      newLeads,
      qualifiedLeads,
      aiHandledConversations,
      humanHandoffs,
      totalProducts,
      totalMessages,
      recentLeads,
      recentConversations,
      intentDistribution,
      leadStatusDistribution,
      conversationsOverTime,
    ] = await Promise.all([
      prisma.mySmartCardConversation.count({ where: { workspaceId: ctx.workspaceId, isActive: true } }),
      prisma.mySmartCardConversation.count({ where: { workspaceId: ctx.workspaceId, createdAt: { gte: todayStart } } }),
      prisma.mySmartCardLead.count({ where: { workspaceId: ctx.workspaceId } }),
      prisma.mySmartCardLead.count({ where: { workspaceId: ctx.workspaceId, status: 'NEW' } }),
      prisma.mySmartCardLead.count({ where: { workspaceId: ctx.workspaceId, status: 'QUALIFIED' } }),
      prisma.mySmartCardConversation.count({ where: { workspaceId: ctx.workspaceId, mode: 'AI' } }),
      prisma.mySmartCardConversation.count({ where: { workspaceId: ctx.workspaceId, mode: 'HUMAN' } }),
      prisma.mySmartCardProduct.count({ where: { workspaceId: ctx.workspaceId } }),
      prisma.message.count({
        where: {
          conversation: { workspaceId: ctx.workspaceId },
          createdAt: { gte: thirtyDaysAgo },
        },
      }),
      prisma.mySmartCardLead.findMany({
        where: { workspaceId: ctx.workspaceId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: { product: { select: { name: true } } },
      }),
      prisma.mySmartCardConversation.findMany({
        where: { workspaceId: ctx.workspaceId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          conversation: { select: { lastMessagePreview: true, lastMessageAt: true } },
          lead: { select: { name: true, phone: true } },
        },
      }),
      prisma.mySmartCardConversation.groupBy({
        by: ['detectedIntent'],
        where: { workspaceId: ctx.workspaceId, detectedIntent: { not: null } },
        _count: true,
      }),
      prisma.mySmartCardLead.groupBy({
        by: ['status'],
        where: { workspaceId: ctx.workspaceId },
        _count: true,
      }),
      (async () => {
        const days: Array<{ date: string; count: number }> = []
        for (let i = 6; i >= 0; i--) {
          const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
          const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate())
          const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000)
          const count = await prisma.mySmartCardConversation.count({
            where: {
              workspaceId: ctx.workspaceId,
              createdAt: { gte: dayStart, lt: dayEnd },
            },
          })
          days.push({ date: dayStart.toISOString().split('T')[0], count })
        }
        return days
      })(),
    ])

    const unreadConversations = await prisma.conversation.count({
      where: {
        workspaceId: ctx.workspaceId,
        unreadCount: { gt: 0 },
        mySmartCardConversation: { isNot: null },
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        totalConversations,
        conversationsToday,
        totalLeads,
        newLeads,
        qualifiedLeads,
        aiHandledConversations,
        humanHandoffs,
        totalProducts,
        totalMessages,
        unreadConversations,
        recentLeads,
        recentConversations,
        intentDistribution: intentDistribution.map((i) => ({ intent: i.detectedIntent, count: i._count })),
        leadStatusDistribution: leadStatusDistribution.map((s) => ({ status: s.status, count: s._count })),
        conversationsOverTime,
      },
    })
  } catch (error) {
    return handleApiError(error)
  }
}
