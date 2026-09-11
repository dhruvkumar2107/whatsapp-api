import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { handleApiError } from '@/lib/errors'
import { successResponse, errorResponse } from '@/lib/api-utils'

export async function GET(
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

    return successResponse(chatbot)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function PUT(
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

    const existing = await prisma.chatbot.findFirst({
      where: { id, workspaceId },
    })

    if (!existing) {
      return errorResponse('Chatbot not found', 404)
    }

    const { name, description, isActive } = body
    const data: Record<string, unknown> = {}

    if (name !== undefined) data.name = name.trim()
    if (description !== undefined) data.description = description?.trim() || null
    if (isActive !== undefined) data.isActive = isActive

    const chatbot = await prisma.chatbot.update({
      where: { id },
      data,
    })

    return successResponse(chatbot)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function DELETE(
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

    const existing = await prisma.chatbot.findFirst({
      where: { id, workspaceId },
    })

    if (!existing) {
      return errorResponse('Chatbot not found', 404)
    }

    await prisma.chatbot.delete({ where: { id } })

    return successResponse({ deleted: true })
  } catch (error) {
    return handleApiError(error)
  }
}
