import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse } from '@/lib/api-utils'
import { UnauthorizedError, ForbiddenError } from '@/lib/errors'

export async function DELETE() {
  try {
    const session = await auth()
    if (!session?.user?.id) throw new UnauthorizedError()

    const userId = session.user.id

    // Check if user is the only OWNER of any workspace
    const ownedWorkspaces = await prisma.workspaceMember.findMany({
      where: { userId, role: 'OWNER' },
    })

    for (const membership of ownedWorkspaces) {
      const otherOwners = await prisma.workspaceMember.count({
        where: { workspaceId: membership.workspaceId, role: 'OWNER', userId: { not: userId } },
      })
      if (otherOwners === 0) {
        throw new ForbiddenError('Cannot delete account: you are the only owner of a workspace. Transfer ownership or delete the workspace first.')
      }
    }

    // Remove user from all workspaces
    await prisma.workspaceMember.deleteMany({ where: { userId } })

    // Delete user's notifications, audit logs, etc.
    await prisma.notification.deleteMany({ where: { userId } })
    await prisma.notificationPreference.deleteMany({ where: { userId } })

    // Delete the user account
    await prisma.user.delete({ where: { id: userId } })

    return successResponse({ message: 'Account deleted' })
  } catch (error) {
    return errorResponse(error)
  }
}
