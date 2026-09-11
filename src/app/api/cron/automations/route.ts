import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const automations = await prisma.automation.findMany({
      where: {
        isActive: true,
        trigger: { path: ['type'], equals: 'scheduled' },
      },
    })

    let processed = 0
    for (const automation of automations) {
      const trigger = automation.trigger as Record<string, unknown>
      const schedule = trigger.schedule as Record<string, unknown> | undefined
      if (!schedule) continue

      const now = new Date()
      const lastRun = automation.lastExecutedAt || new Date(0)
      const intervalMs = ((schedule.interval as number) || 3600) * 1000

      if (now.getTime() - lastRun.getTime() >= intervalMs) {
        const { triggerAutomations } = await import('@/lib/automation/engine')
        await triggerAutomations({ type: 'scheduled' }, automation.workspaceId)
        await prisma.automation.update({
          where: { id: automation.id },
          data: { lastExecutedAt: now },
        })
        processed++
      }
    }

    return NextResponse.json({ processed })
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
