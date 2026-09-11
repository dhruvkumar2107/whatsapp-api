import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { handleApiError } from '@/lib/errors'
import { successResponse, errorResponse } from '@/lib/api-utils'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    const workspaceId = session?.user?.workspaceId
    if (!workspaceId) {
      return errorResponse('Unauthorized', 401)
    }

    const { id } = await params
    const body = await request.json()

    const chatbot = await prisma.chatbot.findFirst({
      where: { id, workspaceId },
    })

    if (!chatbot) {
      return errorResponse('Chatbot not found', 404)
    }

    const { type, position, data } = body

    if (!type) {
      return errorResponse('Node type is required', 400)
    }

    const node = await prisma.chatbotNode.create({
      data: {
        chatbotId: id,
        type,
        position: position || { x: 0, y: 0 },
        data: data || {},
      },
    })

    return successResponse(node, 201)
  } catch (error) {
    return handleApiError(error)
  }
}
