import { Session } from 'next-auth'
import { ForbiddenError, UnauthorizedError } from './errors'
import { ROLE_PERMISSIONS, Role, Permission } from './constants'
import prisma from './prisma'

export async function getCurrentWorkspace(session: Session | null) {
  if (!session?.user?.workspaceId) return null

  const workspace = await prisma.workspace.findUnique({
    where: { id: session.user.workspaceId },
    select: {
      id: true,
      name: true,
      slug: true,
      status: true,
    },
  })

  return workspace
}

export function requireAuth(session: Session | null): asserts session is Session & { user: { id: string; workspaceId: string; role: Role } } {
  if (!session?.user?.id) {
    throw new UnauthorizedError()
  }
  if (!session.user.workspaceId) {
    throw new UnauthorizedError('No workspace associated with this account')
  }
}

export function requireWorkspace(session: Session | null): asserts session is Session & { user: { workspaceId: string } } {
  requireAuth(session)
  if (!session!.user.workspaceId) {
    throw new ForbiddenError('No workspace selected')
  }
}

export function requireRole(
  session: Session | null,
  roles: Role[]
): asserts session is Session & { user: { id: string; workspaceId: string; role: Role } } {
  requireWorkspace(session)
  const userRole = session!.user.role as Role
  if (!roles.includes(userRole)) {
    throw new ForbiddenError(`Requires one of the following roles: ${roles.join(', ')}`)
  }
}

export async function checkPermission(
  workspaceId: string,
  permission: Permission,
  role?: Role
): Promise<boolean> {
  if (role) return hasPermission(role, permission)

  const session = await import('@/lib/auth').then((m) => m.auth().then((s) => s)).catch(() => null)
  const userRole = session?.user?.role as Role | undefined
  if (!userRole) return false
  return hasPermission(userRole, permission)
}

export function hasPermission(userRole: Role, permission: Permission): boolean {
  const rolePermissions = ROLE_PERMISSIONS[userRole]
  if (!rolePermissions) return false
  return rolePermissions.includes(permission)
}

export async function getWorkspaceMembers(workspaceId: string) {
  return prisma.workspaceMember.findMany({
    where: { workspaceId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
    },
  })
}
