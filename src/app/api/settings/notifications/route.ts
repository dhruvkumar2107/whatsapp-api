import { NextRequest } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { successResponse } from '@/lib/api-utils'
import { handleApiError, UnauthorizedError, ValidationError } from '@/lib/errors'

const NOTIFICATION_TYPES = [
  'message.received',
  'message.sent',
  'message.failed',
  'contact.created',
  'campaign.completed',
  'campaign.failed',
  'conversation.assigned',
] as const

const preferenceSchema = z.object({
  preferences: z.array(
    z.object({
      type: z.enum(NOTIFICATION_TYPES),
      email: z.boolean(),
      inApp: z.boolean(),
    })
  ),
})

export async function GET() {
  try {
    const session = await auth()
    const userId = session?.user?.id
    const workspaceId = session?.user?.workspaceId
    if (!userId || !workspaceId) throw new UnauthorizedError()

    const existing = await prisma.notificationPreference.findMany({
      where: { userId, workspaceId },
      select: { type: true, email: true, inApp: true },
    })

    const preferences = NOTIFICATION_TYPES.map((type) => {
      const found = existing.find((e) => e.type === type)
      return {
        type,
        email: found?.email ?? true,
        inApp: found?.inApp ?? true,
      }
    })

    return successResponse({ preferences })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await auth()
    const userId = session?.user?.id
    const workspaceId = session?.user?.workspaceId
    if (!userId || !workspaceId) throw new UnauthorizedError()

    const body = await request.json().catch(() => null)
    const parsed = preferenceSchema.safeParse(body ?? {})
    if (!parsed.success) {
      throw new ValidationError(parsed.error.flatten().fieldErrors as Record<string, string[]>)
    }

    for (const pref of parsed.data.preferences) {
      await prisma.notificationPreference.upsert({
        where: {
          userId_workspaceId_type: {
            userId,
            workspaceId,
            type: pref.type,
          },
        },
        update: { email: pref.email, inApp: pref.inApp },
        create: { userId, workspaceId, type: pref.type, email: pref.email, inApp: pref.inApp },
      })
    }

    return successResponse({ updated: true })
  } catch (error) {
    return handleApiError(error)
  }
}
