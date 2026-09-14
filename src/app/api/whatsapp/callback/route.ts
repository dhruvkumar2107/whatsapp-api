import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { BadRequestError } from '@/lib/errors'
import { createWhatsAppProvider } from '@/lib/whatsapp'
import { cacheGet, cacheDel } from '@/lib/redis'
import prisma from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')

    if (error) {
      return NextResponse.redirect(
        new URL(`/whatsapp?error=${encodeURIComponent(error)}`, request.url)
      )
    }

    if (!code) {
      throw new BadRequestError('No authorization code provided')
    }

    // Verify CSRF state parameter
    if (!state) {
      throw new BadRequestError('Missing state parameter — possible CSRF attack')
    }

    const verifiedWorkspaceId = await cacheGet<string>(`whatsapp_oauth_state:${state}`)
    if (state) {
      await cacheDel(`whatsapp_oauth_state:${state}`)
    }

    const session = await auth()
    if (!session?.user?.id || !session.user.workspaceId) {
      return NextResponse.redirect(
        new URL('/auth/login?callback=/whatsapp', request.url)
      )
    }

    // Ensure the verified workspace matches the session workspace
    if (verifiedWorkspaceId && verifiedWorkspaceId !== session.user.workspaceId) {
      throw new BadRequestError('State mismatch — possible CSRF attack')
    }

    const provider = createWhatsAppProvider()
    const result = await provider.connect({
      workspaceId: session.user.workspaceId,
      code,
      redirectUri: `${process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin}/api/whatsapp/callback`,
    })

    if (result.status === 'CONNECTED') {
      await prisma.whatsAppAccount.update({
        where: { id: result.accountId },
        data: { status: 'CONNECTED', connectedAt: new Date() },
      })
    }

    return NextResponse.redirect(
      new URL('/whatsapp?connected=true', request.url)
    )
  } catch (error) {
    console.error('WhatsApp callback error:', error)
    const errorMessage = error instanceof Error ? error.message : 'unknown_error'
    return NextResponse.redirect(
      new URL(`/whatsapp?error=${encodeURIComponent(errorMessage)}`, request.url)
    )
  }
}
