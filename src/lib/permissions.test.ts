import { describe, it, expect } from 'vitest'
import { hasPermission, requirePermission } from '@/lib/permissions'
import { PERMISSIONS, ROLES } from '@/lib/constants'
import { ForbiddenError } from '@/lib/errors'

describe('hasPermission', () => {
  it('grants manage permissions to OWNER', () => {
    expect(hasPermission(ROLES.OWNER, PERMISSIONS.TEAM_MANAGE)).toBe(true)
  })

  it('grants analytics access to every role', () => {
    for (const role of Object.values(ROLES)) {
      expect(hasPermission(role, PERMISSIONS.ANALYTICS_VIEW)).toBe(true)
    }
  })

  it('denies team management to AGENT', () => {
    expect(hasPermission(ROLES.AGENT, PERMISSIONS.TEAM_MANAGE)).toBe(false)
  })

  it('denies bulk messaging to VIEWER', () => {
    expect(hasPermission(ROLES.VIEWER, PERMISSIONS.MESSAGES_SEND_BULK)).toBe(false)
  })

  it('returns false for unknown roles', () => {
    expect(hasPermission('ROBOT', PERMISSIONS.MESSAGES_VIEW)).toBe(false)
  })

  it('returns false for null/undefined roles', () => {
    expect(hasPermission(null, PERMISSIONS.MESSAGES_VIEW)).toBe(false)
    expect(hasPermission(undefined, PERMISSIONS.MESSAGES_VIEW)).toBe(false)
  })

  it('grants SUPER_ADMIN every permission', () => {
    for (const permission of Object.values(PERMISSIONS)) {
      expect(hasPermission(ROLES.SUPER_ADMIN, permission)).toBe(true)
    }
  })
})

describe('requirePermission', () => {
  it('does not throw for allowed permission', () => {
    expect(() => requirePermission(ROLES.ADMIN, PERMISSIONS.TEAM_INVITE)).not.toThrow()
  })

  it('throws ForbiddenError for denied permission', () => {
    expect(() => requirePermission(ROLES.AGENT, PERMISSIONS.TEAM_INVITE)).toThrow(
      ForbiddenError
    )
  })
})