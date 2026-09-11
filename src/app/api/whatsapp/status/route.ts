import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { handleApiError, UnauthorizedError } from '@/lib/errors'
import prisma from '@/lib/prisma'
import { decrypt } from '@/lib/encryption'
import { createWhatsAppProvider } from '@/lib/whatsapp'

export async function GET() {
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
      return NextResponse.json({
        success: true,
        data: null,
      })
    }

    const provider = createWhatsAppProvider()

    let status
    try {
      status = await provider.getAccountStatus(account.phoneNumberId)
    } catch {
      status = {
        phoneNumberId: account.phoneNumberId,
        phoneNumber: account.phoneNumber,
        businessName: account.businessName,
        verifiedName: account.businessName,
        qualityRating: account.qualityRating || 'UNKNOWN',
        messagingLimit: account.messagingLimit || 0,
        status: account.status,
        displayPhoneNumber: account.phoneNumber,
        throughputLevel: 'STANDARD',
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        id: account.id,
        businessName: account.businessName,
        phoneNumber: account.phoneNumber,
        phoneNumberId: account.phoneNumberId,
        wabaId: account.wabaId,
        status: status.status || account.status,
        qualityRating: status.qualityRating || account.qualityRating,
        messagingLimit: status.messagingLimit || account.messagingLimit,
        connectedAt: account.connectedAt?.toISOString() || null,
        displayPhoneNumber: status.displayPhoneNumber,
        verifiedName: status.verifiedName,
        throughputLevel: status.throughputLevel,
      },
    })
  } catch (error) {
    return handleApiError(error)
  }
}
