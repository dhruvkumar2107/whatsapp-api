import { NextRequest } from 'next/server'
import { Prisma } from '@prisma/client'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { settingsSchema } from '@/lib/validators'
import { successResponse } from '@/lib/api-utils'
import { handleApiError, UnauthorizedError, ValidationError } from '@/lib/errors'
import { requirePermission } from '@/lib/permissions'
import { createAuditLog } from '@/lib/audit'
import { PERMISSIONS } from '@/lib/constants'

export async function GET() {
  try {
    const session = await auth()
    const workspaceId = session?.user?.workspaceId
    const userId = session?.user?.id
    if (!workspaceId) throw new UnauthorizedError()

    requirePermission(session?.user?.role, PERMISSIONS.SETTINGS_VIEW)

    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: {
        id: true,
        name: true,
        slug: true,
        logo: true,
        timezone: true,
        locale: true,
        businessProfile: true,
        autoReply: true,
      },
    })

    if (!workspace) throw new UnauthorizedError()

    const [sessions, apiKeys] = await Promise.all([
      prisma.session.findMany({
        where: { userId: userId ?? '' },
        orderBy: { expires: 'desc' },
        take: 10,
        select: {
          id: true,
          sessionToken: true,
          expires: true,
        },
      }),
      prisma.apiKey.findMany({
        where: { workspaceId },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          name: true,
          keyPrefix: true,
          isActive: true,
          lastUsedAt: true,
          expiresAt: true,
          createdAt: true,
        },
      }),
    ])

    return successResponse({
      workspace,
      security: {
        twoFactorEnabled: false,
        sessions: sessions.map((sessionItem) => ({
          id: sessionItem.id,
          token: `${sessionItem.sessionToken.slice(0, 12)}...`,
          expires: sessionItem.expires,
        })),
        apiKeys,
      },
    })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await auth()
    const workspaceId = session?.user?.workspaceId
    const userId = session?.user?.id
    if (!workspaceId || !userId) throw new UnauthorizedError()

    requirePermission(session?.user?.role, PERMISSIONS.SETTINGS_MANAGE)

    const body = await request.json().catch(() => null)
    const parsed = settingsSchema.safeParse(body ?? {})
    if (!parsed.success) {
      throw new ValidationError(
        parsed.error.flatten().fieldErrors as Record<string, string[]>
      )
    }

    const data: Prisma.WorkspaceUncheckedUpdateInput = {}

    if (parsed.data.workspaceName !== undefined) {
      data.name = parsed.data.workspaceName
    }
    if (parsed.data.timezone !== undefined) {
      data.timezone = parsed.data.timezone
    }
    if (parsed.data.locale !== undefined) {
      data.locale = parsed.data.locale
    }
    if (parsed.data.businessProfile !== undefined) {
      data.businessProfile = JSON.parse(JSON.stringify(parsed.data.businessProfile as object))
    }
    if (parsed.data.autoReply !== undefined) {
      data.autoReply = JSON.parse(JSON.stringify(parsed.data.autoReply as object))
    }

    const workspace = await prisma.workspace.update({
      where: { id: workspaceId },
      data,
      select: {
        id: true,
        name: true,
        slug: true,
        logo: true,
        timezone: true,
        locale: true,
        businessProfile: true,
        autoReply: true,
      },
    })

    await createAuditLog({
      workspaceId,
      userId,
      action: 'workspace.settings.update',
      resource: 'workspace',
      resourceId: workspaceId,
      metadata: {
        updatedFields: Object.keys(data),
        ipAddress: request.headers.get('x-forwarded-for'),
      },
    })

    return successResponse({ workspace })
  } catch (error) {
    return handleApiError(error)
  }
}