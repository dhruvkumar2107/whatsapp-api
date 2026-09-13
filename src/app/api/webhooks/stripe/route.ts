import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/prisma'

const mockWebhookSchema = z.object({
  action: z.enum(['success', 'failure']),
  workspaceId: z.string().min(1),
  subscriptionId: z.string().optional(),
  planId: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = mockWebhookSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { action, workspaceId, subscriptionId, planId } = parsed.data

    if (action === 'success') {
      const sub = subscriptionId
        ? await prisma.subscription.findUnique({ where: { id: subscriptionId } })
        : await prisma.subscription.findFirst({
            where: { workspaceId, status: { in: ['ACTIVE', 'TRIALING'] } },
          })

      if (sub) {
        await prisma.subscription.update({
          where: { id: sub.id },
          data: {
            status: 'ACTIVE',
            currentPeriodStart: new Date(),
            currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            stripeSubscriptionId: sub.stripeSubscriptionId || `mock_sub_${Date.now()}`,
            stripeCustomerId: sub.stripeCustomerId || `mock_cust_${Date.now()}`,
          },
        })

        const member = await prisma.workspaceMember.findFirst({
          where: { workspaceId },
          orderBy: { createdAt: 'asc' },
        })
        if (member) {
          await prisma.notification.create({
            data: {
              userId: member.userId,
              workspaceId,
              type: 'PAYMENT_FAILED',
              title: 'Payment successful',
              message: 'Your subscription has been activated.',
              data: { subscriptionId: sub.id },
            },
          })
        }

        return NextResponse.json({ success: true, status: 'ACTIVE', subscriptionId: sub.id })
      }

      const now = new Date()
      const periodEnd = new Date(now)
      periodEnd.setMonth(periodEnd.getMonth() + 1)

      const newSub = await prisma.subscription.create({
        data: {
          workspaceId,
          planId: planId || '',
          status: 'ACTIVE',
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          stripeSubscriptionId: `mock_sub_${Date.now()}`,
          stripeCustomerId: `mock_cust_${Date.now()}`,
        },
      })

      return NextResponse.json({ success: true, status: 'ACTIVE', subscriptionId: newSub.id })
    }

    if (action === 'failure') {
      const sub = subscriptionId
        ? await prisma.subscription.findUnique({ where: { id: subscriptionId } })
        : await prisma.subscription.findFirst({
            where: { workspaceId, status: { in: ['ACTIVE', 'TRIALING'] } },
          })

      if (sub) {
        await prisma.subscription.update({
          where: { id: sub.id },
          data: { status: 'PAST_DUE' },
        })

        const member = await prisma.workspaceMember.findFirst({
          where: { workspaceId },
          orderBy: { createdAt: 'asc' },
        })
        if (member) {
          await prisma.notification.create({
            data: {
              userId: member.userId,
              workspaceId,
              type: 'PAYMENT_FAILED',
              title: 'Payment failed',
              message: 'Your latest payment failed. Please update your payment method.',
              data: { subscriptionId: sub.id },
            },
          })
        }

        return NextResponse.json({ success: true, status: 'PAST_DUE', subscriptionId: sub.id })
      }

      return NextResponse.json({ error: 'No active subscription found' }, { status: 404 })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error) {
    console.error('Mock Stripe webhook error:', error)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}
