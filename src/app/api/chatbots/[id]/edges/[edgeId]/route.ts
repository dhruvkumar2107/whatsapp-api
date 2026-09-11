import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { handleApiError } from '@/lib/errors'
import { successResponse, errorResponse } from '@/lib/api-utils'

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; edgeId: string }> }
) {
  try {
    const session = await auth()
    const workspaceId = session?.user?.workspaceId
    if (!workspaceId) {
      return errorResponse('Unauthorized', 401)
    }

    const { id, edgeId } = await params

    const chatbot = await prisma.chatbot.findFirst({
      where: { id, workspaceId },
    })

    if (!chatbot) {
      return errorResponse('Chatbot not found', 404)
    }

    const existingEdge = await prisma.chatbotEdge.findFirst({
      where: { id: edgeId, chatbotId: id },
    })

    if (!existingEdge) {
      return errorResponse('Edge not found', 404)
    }

    await prisma.chatbotEdge.delete({ where: { id: edgeId } })

    return successResponse({ deleted: true })
  } catch (error) {
    return handleApiError(error)
  }
}
