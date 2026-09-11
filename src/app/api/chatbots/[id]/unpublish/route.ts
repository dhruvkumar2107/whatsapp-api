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
    })

    if (!chatbot) {
      return errorResponse('Chatbot not found', 404)
    }

    const updated = await prisma.chatbot.update({
      where: { id },
      data: {
        isPublished: false,
        isActive: false,
      },
    })

    return successResponse(updated)
  } catch (error) {
    return handleApiError(error)
  }
}
