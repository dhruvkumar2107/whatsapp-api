import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { UnauthorizedError, ForbiddenError } from '@/lib/errors'
import { MYSMARTCARD_ROLES, type MySmartCardRole } from './constants'
import type { MySmartCardWorkspace } from '@prisma/client'

export interface MySmartCardContext {
  userId: string
  workspaceId: string
  role: string
  mySmartCardWorkspace: MySmartCardWorkspace
}

export async function getMySmartCardContext(): Promise<MySmartCardContext> {
  const session = await auth()
  const userId = session?.user?.id
  const workspaceId = session?.user?.workspaceId
  const role = session?.user?.role

  if (!userId) {
    throw new UnauthorizedError('Authentication required')
  }

  if (!workspaceId) {
    throw new ForbiddenError('No workspace associated with this account')
  }

  if (!role || !MYSMARTCARD_ROLES.includes(role as MySmartCardRole)) {
    throw new ForbiddenError('You do not have permission to access MySmartCard')
  }

  const mySmartCardWorkspace = await prisma.mySmartCardWorkspace.findUnique({
    where: { workspaceId },
  })

  if (!mySmartCardWorkspace || !mySmartCardWorkspace.isActive) {
    throw new ForbiddenError('MySmartCard is not enabled for this workspace')
  }

  return { userId, workspaceId, role, mySmartCardWorkspace }
}

export async function requireMySmartCardAdmin(): Promise<MySmartCardContext> {
  return getMySmartCardContext()
}
