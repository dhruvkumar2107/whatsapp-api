import { NextRequest } from 'next/server'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { successResponse } from '@/lib/api-utils'
import {
  handleApiError,
  UnauthorizedError,
  BadRequestError,
  ValidationError,
} from '@/lib/errors'
import { createAuditLog } from '@/lib/audit'

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters').max(128),
})

export async function PUT(request: NextRequest) {
  try {
    const session = await auth()
    const userId = session?.user?.id
    const workspaceId = session?.user?.workspaceId
    if (!userId) throw new UnauthorizedError()

    const body = await request.json().catch(() => null)
    const parsed = changePasswordSchema.safeParse(body ?? {})
    if (!parsed.success) {
      throw new ValidationError(parsed.error.flatten().fieldErrors as Record<string, string[]>)
    }

    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user || !user.passwordHash) {
      throw new UnauthorizedError('Password authentication is not enabled for this account')
    }

    const isValid = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash)
    if (!isValid) {
      throw new BadRequestError('Current password is incorrect')
    }

    const passwordHash = await bcrypt.hash(parsed.data.newPassword, 12)

    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    })

    if (workspaceId) {
      await createAuditLog({
        workspaceId,
        userId,
        action: 'user.password.change',
        resource: 'user',
        resourceId: userId,
        metadata: { ipAddress: request.headers.get('x-forwarded-for') },
      })
    }

    return successResponse({ message: 'Password updated successfully' })
  } catch (error) {
    return handleApiError(error)
  }
}