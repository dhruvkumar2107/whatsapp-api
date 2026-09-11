import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { successResponse } from '@/lib/api-utils'
import { handleApiError, UnauthorizedError } from '@/lib/errors'

export async function POST() {
  try {
    const session = await auth()
    const userId = session?.user?.id
    const workspaceId = session?.user?.workspaceId
    if (!userId) throw new UnauthorizedError()

    const result = await prisma.notification.updateMany({
      where: {
        userId,
        isRead: false,
        ...(workspaceId ? { workspaceId } : {}),
      },
      data: { isRead: true },
    })

    return successResponse({ updated: result.count })
  } catch (error) {
    return handleApiError(error)
  }
}