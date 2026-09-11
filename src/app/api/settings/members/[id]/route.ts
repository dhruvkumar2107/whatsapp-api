import { NextRequest } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { successResponse } from '@/lib/api-utils'
import {
  handleApiError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '@/lib/errors'
import { requirePermission } from '@/lib/permissions'
import { createAuditLog } from '@/lib/audit'
import { PERMISSIONS } from '@/lib/constants'

const updateRoleSchema = z.object({
  role: z.enum(['OWNER', 'ADMIN', 'MANAGER', 'AGENT', 'VIEWER']),
})

async function findMember(workspaceId: string, id: string) {
  const member = await prisma.workspaceMember.findFirst({
    where: { id, workspaceId },
    include: {
      user: { select: { id: true, name: true, email: true, image: true } },
    },
  })
  if (!member) throw new NotFoundError('Workspace member')
  return member
}

async function assertNotLastOwner(workspaceId: string, memberRole: string, id: string) {
  if (memberRole !== 'OWNER') return
  const ownerCount = await prisma.workspaceMember.count({
    where: { workspaceId, role: 'OWNER' },
  })
  if (ownerCount <= 1 && id) {
    throw new ForbiddenError('Cannot modify the last owner of the workspace')
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    const workspaceId = session?.user?.workspaceId
    const userId = session?.user?.id
    if (!workspaceId || !userId) throw new UnauthorizedError()

    requirePermission(session?.user?.role, PERMISSIONS.TEAM_MANAGE)

    const { id } = await params
    const member = await findMember(workspaceId, id)

    if (member.userId === userId) {
      throw new ForbiddenError('You cannot change your own role')
    }

    await assertNotLastOwner(workspaceId, member.role, id)

    const body = await request.json().catch(() => null)
    const parsed = updateRoleSchema.safeParse(body ?? {})
    if (!parsed.success) {
      throw new ValidationError(parsed.error.flatten().fieldErrors as Record<string, string[]>)
    }

    const updated = await prisma.workspaceMember.update({
      where: { id },
      data: { role: parsed.data.role },
      include: {
        user: { select: { id: true, name: true, email: true, image: true } },
      },
    })

    await createAuditLog({
      workspaceId,
      userId,
      action: 'workspace.member.role.update',
      resource: 'workspace',
      resourceId: workspaceId,
      metadata: {
        memberId: member.userId,
        fromRole: member.role,
        toRole: parsed.data.role,
        ipAddress: request.headers.get('x-forwarded-for'),
      },
    })

    return successResponse({
      id: updated.id,
      role: updated.role,
      updatedAt: updated.updatedAt,
      user: updated.user,
    })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    const workspaceId = session?.user?.workspaceId
    const userId = session?.user?.id
    if (!workspaceId || !userId) throw new UnauthorizedError()

    requirePermission(session?.user?.role, PERMISSIONS.TEAM_MANAGE)

    const { id } = await params
    const member = await findMember(workspaceId, id)

    if (member.userId === userId) {
      throw new ForbiddenError('You cannot remove yourself from the workspace')
    }

    await assertNotLastOwner(workspaceId, member.role, id)

    await prisma.workspaceMember.delete({ where: { id } })

    await createAuditLog({
      workspaceId,
      userId,
      action: 'workspace.member.remove',
      resource: 'workspace',
      resourceId: workspaceId,
      metadata: {
        memberId: member.userId,
        role: member.role,
        ipAddress: request.headers.get('x-forwarded-for'),
      },
    })

    return successResponse({ message: 'Member removed from workspace' })
  } catch (error) {
    return handleApiError(error)
  }
}