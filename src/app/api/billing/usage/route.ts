import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { successResponse } from '@/lib/api-utils'
import { handleApiError, UnauthorizedError } from '@/lib/errors'
import { PLAN_LIMITS } from '@/lib/constants'
import { getUsageWarnings } from '@/lib/usage'

export async function GET() {
  try {
    const session = await auth()
    const workspaceId = session?.user?.workspaceId
    if (!workspaceId) throw new UnauthorizedError()

    const now = new Date()
    const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

    const [subscription, usage, warnings] = await Promise.all([
      prisma.subscription.findFirst({
        where: { workspaceId, status: { in: ['ACTIVE', 'TRIALING'] } },
        orderBy: { createdAt: 'desc' },
        include: { plan: true },
      }),
      prisma.usage.findUnique({
        where: { workspaceId_period: { workspaceId, period } },
      }),
      getUsageWarnings(workspaceId),
    ])

    const planName = subscription?.plan?.name?.toUpperCase() || 'FREE'
    const planKey = planName as keyof typeof PLAN_LIMITS
    const limits = PLAN_LIMITS[planKey] || PLAN_LIMITS.FREE

    const currentUsage = {
      messages: usage?.messagesUsed || 0,
      contacts: usage?.contactsUsed || 0,
      apiCalls: usage?.apiCallsUsed || 0,
      automations: usage?.automationsUsed || 0,
    }

    const planLimits = {
      messages: limits.messagesPerDay,
      contacts: limits.contacts,
      apiCalls: -1,
      automations: limits.automations,
    }

    return successResponse({
      period,
      currentUsage,
      planLimits,
      warnings,
      subscription: subscription
        ? {
            planName: subscription.plan.name,
            status: subscription.status,
            currentPeriodStart: subscription.currentPeriodStart,
            currentPeriodEnd: subscription.currentPeriodEnd,
          }
        : null,
    })
  } catch (error) {
    return handleApiError(error)
  }
}
