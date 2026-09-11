import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { handleApiError, UnauthorizedError } from '@/lib/errors'
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

    const provider = createWhatsAppProvider()
    const result = await provider.connect({
      workspaceId: session.user.workspaceId,
    })

    return NextResponse.json({
      success: true,
      data: {
        url: result.url,
        status: result.status,
      },
    })
  } catch (error) {
    return handleApiError(error)
  }
}
