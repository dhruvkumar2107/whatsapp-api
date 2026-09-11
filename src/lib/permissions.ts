import { ROLE_PERMISSIONS, type Role } from './constants'
import { ForbiddenError } from './errors'

export function hasPermission(
  role: Role | string | null | undefined,
  permission: string
): boolean {
  if (!role) return false
  const allowed = ROLE_PERMISSIONS[role as Role]
  if (!allowed) return false
  return (allowed as string[]).includes(permission)
}

export function requirePermission(
  role: Role | string | null | undefined,
  permission: string
): void {
  if (!hasPermission(role, permission)) throw new ForbiddenError()
}