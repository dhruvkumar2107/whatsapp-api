import { NextRequest } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { successResponse } from '@/lib/api-utils'
import { handleApiError, UnauthorizedError, ValidationError } from '@/lib/errors'
import { createAuditLog } from '@/lib/audit'

const updateProfileSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100).optional(),
  phone: z
    .union([
      z.string().regex(/^\+[1-9]\d{1,14}$/, 'Invalid phone number (include country code)'),
      z.literal(''),
    ])
    .optional(),
})

export async function GET() {
  try {
    const session = await auth()
    const userId = session?.user?.id
    if (!userId) throw new UnauthorizedError()

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        image: true,
        createdAt: true,
      },
    })

    if (!user) throw new UnauthorizedError('Account not found')

    return successResponse({ user })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await auth()
    const userId = session?.user?.id
    const workspaceId = session?.user?.workspaceId
    if (!userId) throw new UnauthorizedError()

    const body = await request.json().catch(() => null)
    const parsed = updateProfileSchema.safeParse(body ?? {})
    if (!parsed.success) {
      throw new ValidationError(parsed.error.flatten().fieldErrors as Record<string, string[]>)
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
        ...(parsed.data.phone !== undefined
          ? { phone: parsed.data.phone === '' ? null : parsed.data.phone }
          : {}),
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        image: true,
        createdAt: true,
      },
    })

    if (workspaceId) {
      await createAuditLog({
        workspaceId,
        userId,
        action: 'user.profile.update',
        resource: 'user',
        resourceId: userId,
        metadata: { ipAddress: request.headers.get('x-forwarded-for') },
      })
    }

    return successResponse({ user })
  } catch (error) {
    return handleApiError(error)
  }
}