import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get('stripe-signature')

    if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
    }

    const event = JSON.parse(body)

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object
        const subscriptionId = session.subscription
        const customerId = session.customer

        await prisma.subscription.updateMany({
          where: { stripeCustomerId: customerId },
          data: {
            stripeSubscriptionId: subscriptionId,
            status: 'ACTIVE',
            currentPeriodStart: new Date(),
            currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          },
        })
        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object
        await prisma.invoice.create({
          data: {
            workspaceId: invoice.metadata?.workspaceId || '',
            subscriptionId: invoice.metadata?.subscriptionId || '',
            amount: invoice.amount_paid / 100,
            status: 'PAID',
            stripeInvoiceId: invoice.id,
            invoiceUrl: invoice.hosted_invoice_url,
            paidAt: new Date(),
          },
        })
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object
        await prisma.subscription.updateMany({
          where: { stripeSubscriptionId: invoice.subscription },
          data: { status: 'PAST_DUE' },
        })
        const sub = await prisma.subscription.findFirst({
          where: { stripeSubscriptionId: invoice.subscription },
        })
        if (sub) {
          const member = await prisma.workspaceMember.findFirst({
            where: { workspaceId: sub.workspaceId },
            orderBy: { createdAt: 'asc' },
          })
          if (member) {
            await prisma.notification.create({
              data: {
                userId: member.userId,
                workspaceId: sub.workspaceId,
                type: 'PAYMENT_FAILED',
                title: 'Payment failed',
                message: 'Your latest payment failed. Please update your payment method.',
                data: { subscriptionId: sub.id },
              },
            })
          }
        }
        break
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object
        await prisma.subscription.updateMany({
          where: { stripeSubscriptionId: sub.id },
          data: { status: 'CANCELLED', cancelledAt: new Date() },
        })
        break
      }
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Stripe webhook error:', error)
    return NextResponse.json({ error: 'Webhook error' }, { status: 500 })
  }
}
