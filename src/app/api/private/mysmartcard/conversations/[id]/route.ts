import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getMySmartCardContext } from '@/lib/mysmartcard/auth'
import { handleApiError } from '@/lib/errors'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await getMySmartCardContext()
    const { id } = await params

    const conversation = await prisma.mySmartCardConversation.findFirst({
      where: { id, workspaceId: ctx.workspaceId },
      include: {
        conversation: {
          include: {
            messages: { orderBy: { createdAt: 'asc' } },
            contact: true,
          },
        },
        lead: { include: { product: true } },
        events: { orderBy: { createdAt: 'desc' } },
      },
    })

    if (!conversation) {
      return NextResponse.json({ success: false, error: { message: 'Conversation not found', code: 'NOT_FOUND' } }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: conversation })
  } catch (error) {
    return handleApiError(error)
  }
}
