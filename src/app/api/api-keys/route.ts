import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { apiKeySchema } from '@/lib/validators'
import { successResponse } from '@/lib/api-utils'
import {
  handleApiError,
  UnauthorizedError,
  ValidationError,
  ForbiddenError,
} from '@/lib/errors'
import { generateApiKey } from '@/lib/utils'
import { PLAN_LIMITS } from '@/lib/constants'

export async function GET() {
  try {
    const session = await auth()
    const workspaceId = session?.user?.workspaceId
    if (!workspaceId) throw new UnauthorizedError()

    const keys = await prisma.apiKey.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        permissions: true,
        lastUsedAt: true,
        expiresAt: true,
        isActive: true,
        createdAt: true,
      },
    })

    const masked = keys.map((k) => ({
      ...k,
      key: `${k.keyPrefix}****`,
      permissions: (k.permissions as string[]) ?? [],
    }))

    return successResponse(masked)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    const workspaceId = session?.user?.workspaceId
    if (!workspaceId) throw new UnauthorizedError()

    const body = await request.json().catch(() => null)
    const parsed = apiKeySchema.safeParse(body)
    if (!parsed.success) {
      throw new ValidationError(parsed.error.flatten().fieldErrors as Record<string, string[]>)
    }

    const { name, permissions, expiresAt } = parsed.data

    const keyCount = await prisma.apiKey.count({
      where: { workspaceId, isActive: true },
    })

    const subscription = await prisma.subscription.findFirst({
      where: { workspaceId, status: { in: ['ACTIVE', 'TRIALING'] } },
      orderBy: { currentPeriodEnd: 'desc' },
      select: { plan: { select: { name: true } } },
    })

    const planName = subscription?.plan?.name || 'FREE'
    const planKey = planName.toUpperCase() as keyof typeof PLAN_LIMITS
    const limit = PLAN_LIMITS[planKey]?.apiKeys ?? PLAN_LIMITS.FREE.apiKeys

    if (limit !== -1 && keyCount >= limit) {
      throw new ForbiddenError(
        `API key limit reached for your current plan (${limit}). Please upgrade to create more keys.`
      )
    }

    const { key, hashed } = generateApiKey()
    const prefix = key.slice(0, 6)

    const apiKey = await prisma.apiKey.create({
      data: {
        workspaceId,
        name,
        keyHash: hashed,
        keyPrefix: prefix,
        permissions,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
    })

    return successResponse(
      {
        id: apiKey.id,
        name: apiKey.name,
        key,
        permissions: apiKey.permissions,
        expiresAt: apiKey.expiresAt,
        createdAt: apiKey.createdAt,
      },
      201
    )
  } catch (error) {
    return handleApiError(error)
  }
}
