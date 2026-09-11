import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    const workspaceId = session?.user?.workspaceId
    if (!workspaceId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const range = parseInt(request.nextUrl.searchParams.get('days') || '30')
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - range)

    const messages = await prisma.message.findMany({
      where: { conversation: { workspaceId }, createdAt: { gte: startDate } },
      select: { id: true, type: true, direction: true, status: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    })

    const headers = 'id,type,direction,status,created_at\n'
    const rows = messages
      .map((m) => `${m.id},${m.type},${m.direction},${m.status},${m.createdAt.toISOString()}`)
      .join('\n')

    return new NextResponse(headers + rows, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="analytics-${range}d.csv"`,
      },
    })
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
