import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { handleApiError, UnauthorizedError, NotFoundError } from '@/lib/errors'
import prisma from '@/lib/prisma'
import { createWhatsAppProvider } from '@/lib/whatsapp'

export async function POST() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      throw new UnauthorizedError()
    }

    if (!session.user.workspaceId) {
      throw new UnauthorizedError('No workspace associated with this account')
    }

    const account = await prisma.whatsAppAccount.findFirst({
      where: {
        workspaceId: session.user.workspaceId,
        status: { not: 'DISCONNECTED' },
      },
      orderBy: { createdAt: 'desc' },
    })

    if (!account) {
      throw new NotFoundError('WhatsApp account')
    }

    const provider = createWhatsAppProvider()

    try {
      await provider.disconnect(account.id)
    } catch (error) {
      console.error('Error calling provider disconnect:', error)
    }

    await prisma.whatsAppAccount.update({
      where: { id: account.id },
      data: {
        status: 'DISCONNECTED',
        disconnectedAt: new Date(),
      },
    })

    const member = await prisma.workspaceMember.findFirst({
      where: { workspaceId: session.user.workspaceId! },
      orderBy: { createdAt: 'asc' },
    })
    if (member) {
      await prisma.notification.create({
        data: {
          userId: member.userId,
          workspaceId: session.user.workspaceId!,
          type: 'WHATSAPP_DISCONNECTED',
          title: 'WhatsApp disconnected',
          message: 'Your WhatsApp connection has been disconnected.',
        },
      })
    }

    return NextResponse.json({
      success: true,
      data: { message: 'WhatsApp account disconnected successfully' },
    })
  } catch (error) {
    return handleApiError(error)
  }
}
