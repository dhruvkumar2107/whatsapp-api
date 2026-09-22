import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getMySmartCardContext } from '@/lib/mysmartcard/auth'
import { handleApiError } from '@/lib/errors'

export async function GET(request: NextRequest) {
  try {
    const ctx = await getMySmartCardContext()
    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || '30'

    const days = parseInt(period)
    const now = new Date()
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)

    const [
      totalConversations,
      uniqueCustomers,
      aiHandled,
      humanHandled,
      totalLeads,
      qualifiedLeads,
      convertedLeads,
      conversationsOverTime,
      intentBreakdown,
      productInterest,
      leadStatusDistribution,
      modeBreakdown,
    ] = await Promise.all([
      prisma.mySmartCardConversation.count({
        where: { workspaceId: ctx.mySmartCardWorkspace.id, createdAt: { gte: startDate } },
      }),
      prisma.mySmartCardConversation.findMany({
        where: { workspaceId: ctx.mySmartCardWorkspace.id, createdAt: { gte: startDate } },
        select: { conversationId: true },
        distinct: ['conversationId'],
      }).then((r) => r.length),
      prisma.mySmartCardConversation.count({
        where: { workspaceId: ctx.mySmartCardWorkspace.id, mode: 'AI', createdAt: { gte: startDate } },
      }),
      prisma.mySmartCardConversation.count({
        where: { workspaceId: ctx.mySmartCardWorkspace.id, mode: 'HUMAN', createdAt: { gte: startDate } },
      }),
      prisma.mySmartCardLead.count({
        where: { workspaceId: ctx.mySmartCardWorkspace.id, createdAt: { gte: startDate } },
      }),
      prisma.mySmartCardLead.count({
        where: { workspaceId: ctx.mySmartCardWorkspace.id, status: 'QUALIFIED', createdAt: { gte: startDate } },
      }),
      prisma.mySmartCardLead.count({
        where: { workspaceId: ctx.mySmartCardWorkspace.id, status: 'CONVERTED', createdAt: { gte: startDate } },
      }),
      (async () => {
        const daysArr: Array<{ date: string; conversations: number; leads: number }> = []
        for (let i = days - 1; i >= 0; i--) {
          const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
          const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate())
          const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000)
          const [convCount, leadCount] = await Promise.all([
            prisma.mySmartCardConversation.count({
              where: { workspaceId: ctx.mySmartCardWorkspace.id, createdAt: { gte: dayStart, lt: dayEnd } },
            }),
            prisma.mySmartCardLead.count({
              where: { workspaceId: ctx.mySmartCardWorkspace.id, createdAt: { gte: dayStart, lt: dayEnd } },
            }),
          ])
          daysArr.push({ date: dayStart.toISOString().split('T')[0], conversations: convCount, leads: leadCount })
        }
        return daysArr
      })(),
      prisma.mySmartCardConversation.groupBy({
        by: ['detectedIntent'],
        where: { workspaceId: ctx.mySmartCardWorkspace.id, detectedIntent: { not: null }, createdAt: { gte: startDate } },
        _count: true,
      }),
      prisma.mySmartCardLead.groupBy({
        by: ['productId'],
        where: { workspaceId: ctx.mySmartCardWorkspace.id, productId: { not: null }, createdAt: { gte: startDate } },
        _count: true,
      }),
      prisma.mySmartCardLead.groupBy({
        by: ['status'],
        where: { workspaceId: ctx.mySmartCardWorkspace.id, createdAt: { gte: startDate } },
        _count: true,
      }),
      prisma.mySmartCardConversation.groupBy({
        by: ['mode'],
        where: { workspaceId: ctx.mySmartCardWorkspace.id, createdAt: { gte: startDate } },
        _count: true,
      }),
    ])

    const conversionRate = totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0
    const handoffRate = totalConversations > 0 ? (humanHandled / totalConversations) * 100 : 0

    const productIds = productInterest.map((p) => p.productId).filter(Boolean) as string[]
    const products = productIds.length > 0 ? await prisma.mySmartCardProduct.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true },
    }) : []
    const productMap = new Map(products.map((p) => [p.id, p.name]))

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalConversations,
          uniqueCustomers,
          aiHandled,
          humanHandled,
          totalLeads,
          qualifiedLeads,
          convertedLeads,
          conversionRate: Math.round(conversionRate * 100) / 100,
          handoffRate: Math.round(handoffRate * 100) / 100,
        },
        conversationsOverTime,
        intentBreakdown: intentBreakdown.map((i) => ({ intent: i.detectedIntent, count: i._count })),
        productInterest: productInterest.map((p) => ({ productId: p.productId, name: productMap.get(p.productId || '') || 'Unknown', count: p._count })),
        leadStatusBreakdown: leadStatusDistribution.map((s) => ({ status: s.status, count: s._count })),
        modeBreakdown: modeBreakdown.map((m) => ({ mode: m.mode, count: m._count })),
      },
    })
  } catch (error) {
    return handleApiError(error)
  }
}
