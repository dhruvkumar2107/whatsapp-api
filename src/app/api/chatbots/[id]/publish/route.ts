import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { handleApiError } from '@/lib/errors'
import { successResponse, errorResponse } from '@/lib/api-utils'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    const workspaceId = session?.user?.workspaceId
    if (!workspaceId) {
      return errorResponse('Unauthorized', 401)
    }

    const { id } = await params

    const chatbot = await prisma.chatbot.findFirst({
      where: { id, workspaceId },
      include: {
        nodes: true,
        edges: true,
      },
    })

    if (!chatbot) {
      return errorResponse('Chatbot not found', 404)
    }

    const hasStartNode = chatbot.nodes.some((n) => n.type === 'START')
    if (!hasStartNode) {
      return errorResponse('Chatbot must have a START node', 400)
    }

    const hasEndNode = chatbot.nodes.some((n) => n.type === 'END')
    if (!hasEndNode) {
      return errorResponse('Chatbot must have an END node', 400)
    }

    const connectedNodeIds = new Set<string>()
    for (const edge of chatbot.edges) {
      connectedNodeIds.add(edge.sourceNodeId)
      connectedNodeIds.add(edge.targetNodeId)
    }

    const orphans = chatbot.nodes.filter(
      (n) => n.type !== 'START' && !connectedNodeIds.has(n.id)
    )
    if (orphans.length > 0) {
      return errorResponse(
        `Found ${orphans.length} disconnected node(s). All nodes must be connected.`,
        400
      )
    }

    const startNode = chatbot.nodes.find((n) => n.type === 'START')!
    const outgoingFromStart = chatbot.edges.filter(
      (e) => e.sourceNodeId === startNode.id
    )
    if (outgoingFromStart.length === 0) {
      return errorResponse('START node must have at least one outgoing connection', 400)
    }

    await prisma.chatbot.updateMany({
      where: {
        workspaceId,
        isPublished: true,
        id: { not: id },
      },
      data: { isPublished: false, isActive: false },
    })

    const updated = await prisma.chatbot.update({
      where: { id },
      data: {
        isPublished: true,
        isActive: true,
        version: chatbot.version + 1,
      },
    })

    return successResponse(updated)
  } catch (error) {
    return handleApiError(error)
  }
}
