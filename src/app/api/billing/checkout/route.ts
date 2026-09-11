import { NextRequest } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { successResponse } from '@/lib/api-utils'
import { handleApiError, UnauthorizedError, ValidationError, ForbiddenError } from '@/lib/errors'

const checkoutSchema = z.object({
  planId: z.string().min(1, 'Plan ID is required'),
})

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    const workspaceId = session?.user?.workspaceId
    if (!workspaceId) throw new UnauthorizedError()

    const body = await request.json().catch(() => null)
    const parsed = checkoutSchema.safeParse(body)
    if (!parsed.success) {
      throw new ValidationError(parsed.error.flatten().fieldErrors as Record<string, string[]>)
    }

    const plan = await prisma.plan.findUnique({
      where: { id: parsed.data.planId, isActive: true },
    })

    if (!plan) {
      throw new ValidationError('Invalid or inactive plan')
    }

    const existingSub = await prisma.subscription.findFirst({
      where: { workspaceId, status: { in: ['ACTIVE', 'TRIALING'] } },
      include: { plan: true },
    })

    if (existingSub && existingSub.planId === plan.id) {
      throw new ValidationError('You are already on this plan')
    }

    const currentPlanPrice = existingSub ? Number(existingSub.plan?.price ?? 0) : 0
    const planPrice = Number(plan.price)
    const isDowngradeToFree = planPrice === 0
    const checkoutUrl = process.env.STRIPE_CHECKOUT_URL || null

    if (planPrice > 0 && !checkoutUrl && currentPlanPrice < planPrice) {
      throw new ForbiddenError(
        'Upgrading to a paid plan requires payment. Configure STRIPE_CHECKOUT_URL to enable paid upgrades.'
      )
    }

    if (planPrice === 0 || isDowngradeToFree) {
      if (existingSub) {
        await prisma.subscription.update({
          where: { id: existingSub.id },
          data: {
            planId: plan.id,
            status: planPrice === 0 ? 'ACTIVE' : existingSub.status,
          },
        })
      } else {
        const now = new Date()
        const periodEnd = new Date(now)
        periodEnd.setMonth(periodEnd.getMonth() + 1)

        await prisma.subscription.create({
          data: {
            workspaceId,
            planId: plan.id,
            status: 'ACTIVE',
            currentPeriodStart: now,
            currentPeriodEnd: periodEnd,
          },
        })
      }

      return successResponse({
        checkoutUrl: null,
        message: 'Plan updated successfully',
      })
    }

    if (!checkoutUrl) {
      throw new ForbiddenError(
        'Payment gateway is not configured. Please set STRIPE_CHECKOUT_URL.'
      )
    }

    return successResponse({
      checkoutUrl: `${checkoutUrl}?plan=${plan.id}&workspace=${workspaceId}`,
      planId: plan.id,
      planName: plan.name,
      price: planPrice,
      billingCycle: plan.billingCycle,
    })
  } catch (error) {
    return handleApiError(error)
  }
}