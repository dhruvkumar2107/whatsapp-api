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

    const { sourceNodeId, targetNodeId, label, sourceHandle, targetHandle } = body

    if (!sourceNodeId || !targetNodeId) {
      return errorResponse('sourceNodeId and targetNodeId are required', 400)
    }

    if (sourceNodeId === targetNodeId) {
      return errorResponse('Cannot connect a node to itself', 400)
    }

    const sourceNode = await prisma.chatbotNode.findFirst({
      where: { id: sourceNodeId, chatbotId: id },
    })

    const targetNode = await prisma.chatbotNode.findFirst({
      where: { id: targetNodeId, chatbotId: id },
    })

    if (!sourceNode || !targetNode) {
      return errorResponse('One or both nodes not found', 404)
    }

    const existingEdge = await prisma.chatbotEdge.findFirst({
      where: {
        chatbotId: id,
        sourceNodeId,
        targetNodeId,
      },
    })

    if (existingEdge) {
      return errorResponse('Edge already exists', 409)
    }

    const edge = await prisma.chatbotEdge.create({
      data: {
        chatbotId: id,
        sourceNodeId,
        targetNodeId,
        label: label || null,
        sourceHandle: sourceHandle || null,
        targetHandle: targetHandle || null,
      },
    })

    return successResponse(edge, 201)
  } catch (error) {
    return handleApiError(error)
  }
}
