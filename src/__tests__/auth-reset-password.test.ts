import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockPrisma } from './setup'

vi.mock('bcryptjs', () => ({
  default: { hash: vi.fn().mockResolvedValue('$2a$12$hashedpassword') },
}))

function makeRequest(body: unknown) {
  return new Request('http://localhost:3000/api/auth/reset-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/auth/reset-password', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('resets password with valid token', async () => {
    mockPrisma.passwordResetToken.findUnique.mockResolvedValue({
      id: 't1',
      userId: 'u1',
      token: 'hashedtoken',
      expiresAt: new Date(Date.now() + 3600_000),
    })
    mockPrisma.$transaction.mockResolvedValue([{}, {}])

    const { POST } = await import('@/app/api/auth/reset-password/route')
    const res = await POST(makeRequest({ token: 'rawtoken', password: 'newpassword123' }))

    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.success).toBe(true)
  })

  it('rejects expired token', async () => {
    mockPrisma.passwordResetToken.findUnique.mockResolvedValue({
      id: 't1',
      userId: 'u1',
      token: 'hashedtoken',
      expiresAt: new Date(Date.now() - 3600_000),
    })
    mockPrisma.passwordResetToken.delete.mockResolvedValue({})

    const { POST } = await import('@/app/api/auth/reset-password/route')
    const res = await POST(makeRequest({ token: 'expiredtoken', password: 'newpassword123' }))

    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error.code).toBe('TOKEN_EXPIRED')
  })

  it('rejects invalid token', async () => {
    mockPrisma.passwordResetToken.findUnique.mockResolvedValue(null)

    const { POST } = await import('@/app/api/auth/reset-password/route')
    const res = await POST(makeRequest({ token: 'badtoken', password: 'newpassword123' }))

    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error.code).toBe('INVALID_TOKEN')
  })

  it('rejects short password', async () => {
    const { POST } = await import('@/app/api/auth/reset-password/route')
    const res = await POST(makeRequest({ token: 'tok', password: 'short' }))

    expect(res.status).toBe(400)
  })

  it('rejects missing token', async () => {
    const { POST } = await import('@/app/api/auth/reset-password/route')
    const res = await POST(makeRequest({ password: 'newpassword123' }))

    expect(res.status).toBe(400)
  })
})
