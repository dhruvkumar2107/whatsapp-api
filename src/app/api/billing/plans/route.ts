import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { successResponse } from '@/lib/api-utils'
import { handleApiError, UnauthorizedError } from '@/lib/errors'

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.workspaceId) throw new UnauthorizedError()

    const plans = await prisma.plan.findMany({
      where: { isActive: true },
      orderBy: { price: 'asc' },
    })

    return successResponse(plans)
  } catch (error) {
    return handleApiError(error)
  }
}
