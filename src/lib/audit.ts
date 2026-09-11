import prisma from './prisma'

export async function createAuditLog(params: {
  workspaceId: string
  userId: string
  action: string
  resource: string
  resourceId?: string
  metadata?: Record<string, unknown>
  ipAddress?: string
}): Promise<void> {
  if (!params.workspaceId || !params.userId) return

  try {
    await prisma.auditLog.create({
      data: {
        workspaceId: params.workspaceId,
        userId: params.userId,
        action: params.action,
        resource: params.resource,
        resourceId: params.resourceId ?? null,
        metadata: params.metadata ? (params.metadata as object) : undefined,
        ipAddress: params.ipAddress ?? null,
      },
    })
  } catch (error) {
    console.error('[AuditLog] Failed to create audit entry:', error)
  }
}