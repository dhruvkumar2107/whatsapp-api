import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getMySmartCardContext } from '@/lib/mysmartcard/auth'
import { handleApiError } from '@/lib/errors'

export async function GET(request: NextRequest) {
  try {
    const ctx = await getMySmartCardContext()
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const status = searchParams.get('status') || ''
    const mode = searchParams.get('mode') || ''

    const where: Record<string, unknown> = { workspaceId: ctx.mySmartCardWorkspace.id, isActive: true }
    if (status) where.conversation = { status }
    if (mode) where.mode = mode

    const [conversations, total] = await Promise.all([
      prisma.mySmartCardConversation.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          conversation: {
            select: {
              id: true,
              status: true,
              lastMessageAt: true,
              lastMessagePreview: true,
              unreadCount: true,
            },
          },
          lead: { select: { id: true, name: true, phone: true, status: true } },
          events: { orderBy: { createdAt: 'desc' }, take: 5 },
        },
      }),
      prisma.mySmartCardConversation.count({ where }),
    ])

    return NextResponse.json({
      success: true,
      data: conversations,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    })
  } catch (error) {
    return handleApiError(error)
  }
}
