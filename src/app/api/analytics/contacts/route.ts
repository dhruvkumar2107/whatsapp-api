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

    const [totalContacts, contactsBySource, contactsByCountry, newContactsByDay] = await Promise.all([
      prisma.contact.count({ where: { workspaceId } }),
      prisma.contact.groupBy({
        by: ['source'],
        where: { workspaceId },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
      }),
      prisma.contact.groupBy({
        by: ['country'],
        where: { workspaceId },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
      }),
      prisma.$queryRawUnsafe<{ date: string; count: bigint }[]>(
        `SELECT DATE(created_at) as date, COUNT(*) as count
         FROM "Contact"
         WHERE "workspaceId" = $1 AND "createdAt" >= $2 AND "createdAt" <= $3
         GROUP BY DATE(created_at)
         ORDER BY date ASC`,
        workspaceId,
        startDate,
        endDate
      ),
    ])

    const newContacts = newContactsByDay.map((row) => ({
      date: row.date,
      count: Number(row.count),
    }))

    const totalNewContacts = newContacts.reduce((sum, c) => sum + c.count, 0)

    return successResponse({
      totalContacts,
      totalNewContacts,
      contactsBySource: contactsBySource.map((s) => ({
        source: s.source || 'Unknown',
        count: s._count.id,
      })),
      contactsByCountry: contactsByCountry.map((c) => ({
        country: c.country || 'Unknown',
        count: c._count.id,
      })),
      newContactsByDay: newContacts,
    })
  } catch (error) {
    return handleApiError(error)
  }
}
