import prisma from '@/lib/prisma'
import { PLAN_LIMITS, type Role } from './constants'

function periodKey(date = new Date()): string {
  const y = date.getUTCFullYear()
  const m = String(date.getUTCMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

export async function getWorkspacePlan(workspaceId: string) {
  const subscription = await prisma.subscription.findFirst({
    where: { workspaceId, status: { in: ['ACTIVE', 'TRIALING', 'PAST_DUE'] } },
    orderBy: { currentPeriodEnd: 'desc' },
    include: { plan: true },
  })
  return subscription?.plan ?? null
}

export async function getPlanKey(workspaceId: string): Promise<keyof typeof PLAN_LIMITS> {
  const plan = await getWorkspacePlan(workspaceId)
  const name = (plan?.name || 'Free').toUpperCase() as keyof typeof PLAN_LIMITS
  return name in PLAN_LIMITS ? name : 'FREE'
}

export async function incrementUsage(
  workspaceId: string,
  deltas: Partial<{
    messagesUsed: number
    contactsUsed: number
    apiCallsUsed: number
    automationsUsed: number
    storageUsed: bigint | number
  }>
) {
  const period = periodKey()
  const data: Record<string, number | bigint> = {}
  if (deltas.messagesUsed) data.messagesUsed = deltas.messagesUsed
  if (deltas.contactsUsed) data.contactsUsed = deltas.contactsUsed
  if (deltas.apiCallsUsed) data.apiCallsUsed = deltas.apiCallsUsed
  if (deltas.automationsUsed) data.automationsUsed = deltas.automationsUsed
  if (deltas.storageUsed) data.storageUsed = deltas.storageUsed

  if (Object.keys(data).length === 0) return

  await prisma.usage.upsert({
    where: { workspaceId_period: { workspaceId, period } },
    create: { workspaceId, period, ...data },
    update: {
      messagesUsed: data.messagesUsed ? { increment: Number(data.messagesUsed) } : undefined,
      contactsUsed: data.contactsUsed ? { increment: Number(data.contactsUsed) } : undefined,
      apiCallsUsed: data.apiCallsUsed ? { increment: Number(data.apiCallsUsed) } : undefined,
      automationsUsed: data.automationsUsed ? { increment: Number(data.automationsUsed) } : undefined,
      storageUsed: data.storageUsed ? { increment: data.storageUsed } : undefined,
    },
  })

  const planKey = await getPlanKey(workspaceId)
  const limits = PLAN_LIMITS[planKey]
  const usageAfter = await prisma.usage.findUnique({
    where: { workspaceId_period: { workspaceId, period } },
  })
  if (!usageAfter) return

  const metricLimitMap: Array<{ key: string; field: keyof typeof usageAfter; limit: number }> = [
    { key: 'messagesUsed', field: 'messagesUsed', limit: limits.messagesPerDay },
    { key: 'contactsUsed', field: 'contactsUsed', limit: limits.contacts },
    { key: 'apiCallsUsed', field: 'apiCallsUsed', limit: limits.apiKeys },
    { key: 'automationsUsed', field: 'automationsUsed', limit: limits.automations },
  ]

  for (const { key, field, limit } of metricLimitMap) {
    if (limit === -1 || limit === 0) continue
    const currentUsage = Number(usageAfter[field])
    if (currentUsage > limit * 0.8) {
      const member = await prisma.workspaceMember.findFirst({
        where: { workspaceId },
        orderBy: { createdAt: 'asc' },
      })
      if (member) {
        await prisma.notification.create({
          data: {
            userId: member.userId,
            workspaceId,
            type: 'USAGE_LIMIT_WARNING',
            title: 'Usage limit warning',
            message: `You've used ${Math.round((currentUsage / limit) * 100)}% of your ${key.replace('Used', '')} limit.`,
            data: { type: key, currentUsage, limit },
          },
        })
      }
      break
    }
  }
}

export const updateUsage = incrementUsage

export async function getCurrentUsage(workspaceId: string) {
  const where = { workspaceId, period: periodKey() }
  const usage = await prisma.usage.findUnique({ where: { workspaceId_period: where } })
  return {
    messagesUsed: usage?.messagesUsed ?? 0,
    contactsUsed: usage?.contactsUsed ?? 0,
    apiCallsUsed: usage?.apiCallsUsed ?? 0,
    automationsUsed: usage?.automationsUsed ?? 0,
    storageUsed: usage?.storageUsed ?? BigInt(0),
  }
}

export async function checkAndFailUsageLimit(
  workspaceId: string,
  metric: 'messagesUsed' | 'contactsUsed' | 'apiCallsUsed' | 'automationsUsed',
  plannedIncrement = 1
): Promise<{ allowed: boolean; limit: number; current: number; message?: string }> {
  const planKey = await getPlanKey(workspaceId)
  const limits = PLAN_LIMITS[planKey]

  const limitMap: Record<string, number> = {
    messagesUsed: limits.messagesPerDay,
    contactsUsed: limits.contacts,
    apiCallsUsed: limits.apiKeys,
    automationsUsed: limits.automations,
  }
  const limit = limitMap[metric]

  if (limit === -1) return { allowed: true, limit, current: 0 }

  const usage = await getCurrentUsage(workspaceId)
  const current = Number(usage[metric])
  if (current + plannedIncrement > limit) {
    return {
      allowed: false,
      limit,
      current,
      message: `${metric.replace('Used', '')} limit reached for your current plan (${limit}). Please upgrade.`,
    }
  }
  return { allowed: true, limit, current }
}

export function canManageRole(role: Role | string | null | undefined): boolean {
  return !!role && ['SUPER_ADMIN', 'OWNER', 'ADMIN', 'MANAGER'].includes(role)
}

export async function getUsageWarnings(workspaceId: string) {
  const period = periodKey()
  const usage = await prisma.usage.findUnique({ where: { workspaceId_period: { workspaceId, period } } })
  if (!usage) return []

  const subscription = await prisma.subscription.findFirst({ where: { workspaceId, status: 'ACTIVE' } })
  const plan = subscription ? await prisma.plan.findUnique({ where: { id: subscription.planId } }) : null

  const warnings: Array<{ type: string; current: number; limit: number; percentage: number }> = []
  const metrics = ['messagesUsed', 'contactsUsed', 'apiCallsUsed', 'automationsUsed'] as const

  for (const metric of metrics) {
    const planKey = (plan?.name?.toUpperCase() || 'FREE') as keyof typeof PLAN_LIMITS
    const limits = PLAN_LIMITS[planKey] || PLAN_LIMITS.FREE
    const limitKey = metric === 'messagesUsed' ? 'messagesPerDay' : metric === 'contactsUsed' ? 'contacts' : metric === 'apiCallsUsed' ? 'apiKeys' : 'automations'
    const limit = limits[limitKey]
    const current = usage[metric] || 0
    if (limit && limit !== -1 && current > limit * 0.8) {
      warnings.push({ type: metric, current, limit, percentage: Math.round((current / limit) * 100) })
    }
  }
  return warnings
}