import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { successResponse } from '@/lib/api-utils'
import { handleApiError, UnauthorizedError, NotFoundError } from '@/lib/errors'

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

export async function DELETE() {
  try {
    const session = await auth()
    const workspaceId = session?.user?.workspaceId
    if (!workspaceId) throw new UnauthorizedError()

    const subscription = await prisma.subscription.findFirst({
      where: { workspaceId, status: { in: ['ACTIVE', 'PAST_DUE'] } },
    })
    if (!subscription) throw new NotFoundError('Active subscription')

    if (subscription.stripeSubscriptionId && process.env.STRIPE_SECRET_KEY) {
      // In production, use Stripe SDK:
      // await stripe.subscriptions.update(subscription.stripeSubscriptionId, { cancel_at_period_end: true })
    }

    await prisma.subscription.update({
      where: { id: subscription.id },
      data: { cancelledAt: new Date(), status: 'CANCELLED' },
    })

    const freePlan = await prisma.plan.findFirst({ where: { name: 'Free' } })
    if (freePlan) {
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: { planId: freePlan.id },
      })
    }

    return successResponse({ message: 'Subscription cancelled' })
  } catch (error) {
    return handleApiError(error)
  }
}
