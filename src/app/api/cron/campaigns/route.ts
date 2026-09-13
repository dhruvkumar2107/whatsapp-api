import { NextRequest, NextResponse } from 'next/server'
import { processCampaign } from '@/lib/workers/campaign-worker'
import prisma from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()

  // Pick up scheduled campaigns that are due
  const dueCampaigns = await prisma.campaign.findMany({
    where: {
      status: 'SCHEDULED',
      scheduledAt: { lte: now },
    },
    select: { id: true },
  })

  // Pick up RUNNING campaigns that might be stalled (have QUEUED recipients)
  const stalledCampaigns = await prisma.campaign.findMany({
    where: {
      status: 'RUNNING',
      recipients: { some: { status: 'QUEUED' } },
    },
    select: { id: true },
  })

  const allCampaigns = [...dueCampaigns, ...stalledCampaigns]
  const processed = []

  for (const { id } of allCampaigns) {
    try {
      await processCampaign({ campaignId: id })
      processed.push(id)
    } catch (error) {
      console.error(`[Cron] Failed to process campaign ${id}:`, error)
    }
  }

  return NextResponse.json({ processed: processed.length, campaigns: processed })
}

export const maxDuration = 300