import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockPrisma } from './setup'

describe('rate limiting', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('allows requests under the limit', async () => {
    const { rateLimit } = await import('@/lib/rate-limit')
    const result = await rateLimit('test:allow', 5, 60_000)
    expect(result.allowed).toBe(true)
    expect(result.remaining).toBeGreaterThanOrEqual(0)
  })

  it('returns correct structure', async () => {
    const { rateLimit } = await import('@/lib/rate-limit')
    const result = await rateLimit('test:structure', 10, 60_000)
    expect(result).toHaveProperty('allowed')
    expect(result).toHaveProperty('remaining')
    expect(result).toHaveProperty('resetAt')
    expect(typeof result.resetAt).toBe('number')
  })
})

describe('API rate limiting integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('blocks requests when rate limit exceeded', async () => {
    vi.doMock('@/lib/rate-limit', () => ({
      rateLimit: vi.fn().mockResolvedValue({ allowed: false, remaining: 0, resetAt: Date.now() + 60_000 }),
    }))

    const { POST } = await import('@/app/api/auth/forgot-password/route')
    const req = new Request('http://localhost:3000/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@test.com' }),
    })

    const res = await POST(req)
    expect(res.status).toBe(429)
  })
})
