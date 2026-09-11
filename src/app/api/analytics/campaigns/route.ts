import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { successResponse } from '@/lib/api-utils'
import { handleApiError, UnauthorizedError } from '@/lib/errors'

export async function GET() {
  try {
    const session = await auth()
    const workspaceId = session?.user?.workspaceId
    if (!workspaceId) throw new UnauthorizedError()

    const [campaignsByStatus, topCampaigns, totals] = await Promise.all([
      prisma.campaign.groupBy({
        by: ['status'],
        where: { workspaceId },
        _count: { id: true },
        _sum: {
          totalRecipients: true,
          sent: true,
          delivered: true,
          read: true,
          failed: true,
          replies: true,
        },
      }),
      prisma.campaign.findMany({
        where: { workspaceId },
        orderBy: { sent: 'desc' },
        take: 10,
        select: {
          id: true,
          name: true,
          status: true,
          totalRecipients: true,
          sent: true,
          delivered: true,
          read: true,
          failed: true,
          replies: true,
          createdAt: true,
        },
      }),
      prisma.campaign.aggregate({
        where: { workspaceId },
        _count: { id: true },
        _sum: {
          totalRecipients: true,
          sent: true,
          delivered: true,
          read: true,
          failed: true,
          replies: true,
        },
      }),
    ])

    const totalSent = totals._sum.sent || 0
    const totalDelivered = totals._sum.delivered || 0
    const totalRead = totals._sum.read || 0
    const totalFailed = totals._sum.failed || 0

    const topCampaignsWithRates = topCampaigns.map((c) => ({
      ...c,
      deliveryRate: c.sent > 0 ? Math.round((c.delivered / c.sent) * 10000) / 100 : 0,
      readRate: c.sent > 0 ? Math.round((c.read / c.sent) * 10000) / 100 : 0,
    }))

    return successResponse({
      campaignsByStatus: campaignsByStatus.map((s) => ({
        status: s.status,
        count: s._count.id,
        totalRecipients: s._sum.totalRecipients || 0,
        sent: s._sum.sent || 0,
        delivered: s._sum.delivered || 0,
        read: s._sum.read || 0,
        failed: s._sum.failed || 0,
        replies: s._sum.replies || 0,
      })),
      topCampaigns: topCampaignsWithRates,
      totals: {
        totalCampaigns: totals._count.id,
        totalRecipients: totals._sum.totalRecipients || 0,
        totalSent,
        totalDelivered,
        totalRead,
        totalFailed,
        overallDeliveryRate: totalSent > 0 ? Math.round((totalDelivered / totalSent) * 10000) / 100 : 0,
        overallReadRate: totalSent > 0 ? Math.round((totalRead / totalSent) * 10000) / 100 : 0,
      },
    })
  } catch (error) {
    return handleApiError(error)
  }
}
