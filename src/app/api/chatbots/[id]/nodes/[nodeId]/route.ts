import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { handleApiError } from '@/lib/errors'
import { successResponse, errorResponse } from '@/lib/api-utils'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; nodeId: string }> }
) {
  try {
    const session = await auth()
    const workspaceId = session?.user?.workspaceId
    if (!workspaceId) {
      return errorResponse('Unauthorized', 401)
    }

    const { id, nodeId } = await params

    const chatbot = await prisma.chatbot.findFirst({
      where: { id, workspaceId },
    })

    if (!chatbot) {
      return errorResponse('Chatbot not found', 404)
    }

    const existingNode = await prisma.chatbotNode.findFirst({
      where: { id: nodeId, chatbotId: id },
    })

    if (!existingNode) {
      return errorResponse('Node not found', 404)
    }

    const body = await request.json()
    const { position, data, type } = body
    const updateData: Record<string, unknown> = {}

    if (position !== undefined) updateData.position = position
    if (data !== undefined) updateData.data = data
    if (type !== undefined) updateData.type = type

    const node = await prisma.chatbotNode.update({
      where: { id: nodeId },
      data: updateData,
    })

    return successResponse(node)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; nodeId: string }> }
) {
  try {
    const session = await auth()
    const workspaceId = session?.user?.workspaceId
    if (!workspaceId) {
      return errorResponse('Unauthorized', 401)
    }

    const { id, nodeId } = await params

    const chatbot = await prisma.chatbot.findFirst({
      where: { id, workspaceId },
    })

    if (!chatbot) {
      return errorResponse('Chatbot not found', 404)
    }

    const existingNode = await prisma.chatbotNode.findFirst({
      where: { id: nodeId, chatbotId: id },
    })

    if (!existingNode) {
      return errorResponse('Node not found', 404)
    }

    await prisma.chatbotEdge.deleteMany({
      where: {
        chatbotId: id,
        OR: [{ sourceNodeId: nodeId }, { targetNodeId: nodeId }],
      },
    })

    await prisma.chatbotNode.delete({ where: { id: nodeId } })

    return successResponse({ deleted: true })
  } catch (error) {
    return handleApiError(error)
  }
}
