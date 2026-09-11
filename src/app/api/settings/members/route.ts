import { NextRequest } from 'next/server'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { successResponse } from '@/lib/api-utils'
import {
  handleApiError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  ValidationError,
} from '@/lib/errors'
import { requirePermission, hasPermission } from '@/lib/permissions'
import { createAuditLog } from '@/lib/audit'
import { PERMISSIONS } from '@/lib/constants'

const addMemberSchema = z.object({
  email: z.string().email('Invalid email address'),
  name: z.string().min(1).max(100).optional(),
  role: z.enum(['OWNER', 'ADMIN', 'MANAGER', 'AGENT', 'VIEWER']).default('AGENT'),
})

export async function GET() {
  try {
    const session = await auth()
    const workspaceId = session?.user?.workspaceId
    if (!workspaceId) throw new UnauthorizedError()

    const canView =
      hasPermission(session?.user?.role, PERMISSIONS.SETTINGS_VIEW) ||
      hasPermission(session?.user?.role, PERMISSIONS.TEAM_MANAGE)
    if (!canView) throw new ForbiddenError()

    const members = await prisma.workspaceMember.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'asc' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            createdAt: true,
          },
        },
      },
    })

    return successResponse(
      members.map((member) => ({
        id: member.id,
        role: member.role,
        createdAt: member.createdAt,
        updatedAt: member.updatedAt,
        user: member.user,
      }))
    )
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    const workspaceId = session?.user?.workspaceId
    const userId = session?.user?.id
    if (!workspaceId || !userId) throw new UnauthorizedError()

    requirePermission(session?.user?.role, PERMISSIONS.TEAM_INVITE)

    const body = await request.json().catch(() => null)
    const parsed = addMemberSchema.safeParse(body ?? {})
    if (!parsed.success) {
      throw new ValidationError(parsed.error.flatten().fieldErrors as Record<string, string[]>)
    }

    const normalizedEmail = parsed.data.email.toLowerCase().trim()
    const displayName = parsed.data.name || normalizedEmail.split('@')[0]

    let user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true },
    })

    if (!user) {
      const temporaryHash = await bcrypt.hash(crypto.randomBytes(24).toString('hex'), 12)
      user = await prisma.user.create({
        data: {
          email: normalizedEmail,
          name: displayName,
          passwordHash: temporaryHash,
        },
        select: { id: true },
      })
    }

    const existing = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: user.id } },
      select: { id: true },
    })
    if (existing) throw new ConflictError('This user is already a member of the workspace')

    const member = await prisma.workspaceMember.create({
      data: {
        workspaceId,
        userId: user.id,
        role: parsed.data.role,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            createdAt: true,
          },
        },
      },
    })

    await createAuditLog({
      workspaceId,
      userId,
      action: 'workspace.member.add',
      resource: 'workspace',
      resourceId: workspaceId,
      metadata: {
        memberId: member.userId,
        role: member.role,
        ipAddress: request.headers.get('x-forwarded-for'),
      },
    })

    return successResponse(
      {
        id: member.id,
        role: member.role,
        createdAt: member.createdAt,
        updatedAt: member.updatedAt,
        user: member.user,
      },
      201
    )
  } catch (error) {
    return handleApiError(error)
  }
}