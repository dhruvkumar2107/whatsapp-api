import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { successResponse } from '@/lib/api-utils'
import { handleApiError, UnauthorizedError } from '@/lib/errors'

export async function GET() {
  try {
    const session = await auth()
    const workspaceId = session?.user?.workspaceId
    if (!workspaceId) throw new UnauthorizedError()

    const subscription = await prisma.subscription.findFirst({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
      include: {
        plan: true,
      },
    })

    return successResponse(subscription || null)
  } catch (error) {
    return handleApiError(error)
  }
}
