import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockPrisma } from './setup'

vi.mock('@/lib/email', () => ({
  sendEmail: vi.fn(),
  renderPasswordResetEmail: vi.fn((url: string) => ({
    subject: 'Reset Password',
    html: `<a href="${url}">Reset</a>`,
    text: `Reset: ${url}`,
  })),
}))

function makeRequest(body: unknown) {
  return new Request('http://localhost:3000/api/auth/forgot-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/auth/forgot-password', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('always returns 200 to prevent user enumeration', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null)

    const { POST } = await import('@/app/api/auth/forgot-password/route')
    const res = await POST(makeRequest({ email: 'nobody@test.com' }))

    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.success).toBe(true)
  })

  it('sends reset email when user exists', async () => {
    const { sendEmail } = await import('@/lib/email')
    mockPrisma.user.findUnique.mockResolvedValue({ id: 'u1', email: 'alice@test.com' })
    mockPrisma.passwordResetToken.deleteMany.mockResolvedValue({})
    mockPrisma.passwordResetToken.create.mockResolvedValue({})

    const { POST } = await import('@/app/api/auth/forgot-password/route')
    const res = await POST(makeRequest({ email: 'alice@test.com' }))

    expect(res.status).toBe(200)
    expect(sendEmail).toHaveBeenCalled()
    expect(mockPrisma.passwordResetToken.create).toHaveBeenCalled()
  })

  it('handles invalid email format gracefully', async () => {
    const { POST } = await import('@/app/api/auth/forgot-password/route')
    const res = await POST(makeRequest({ email: 'not-an-email' }))

    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.success).toBe(true)
  })
})
