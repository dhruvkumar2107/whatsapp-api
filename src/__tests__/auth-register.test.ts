import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockPrisma } from './setup'

vi.mock('bcryptjs', () => ({
  default: { hash: vi.fn().mockResolvedValue('$2a$12$hashedpassword'), compare: vi.fn() },
}))

function makeRequest(body: unknown) {
  return new Request('http://localhost:3000/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/auth/register', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates user and workspace on valid registration', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null)
    mockPrisma.user.create.mockResolvedValue({ id: 'u1', name: 'Alice', email: 'alice@test.com' })
    mockPrisma.workspace.findUnique.mockResolvedValue(null)
    mockPrisma.workspace.create.mockResolvedValue({ id: 'w1', name: 'Acme', slug: 'acme' })
    mockPrisma.workspaceMember.create.mockResolvedValue({})

    const { POST } = await import('@/app/api/auth/register/route')
    const res = await POST(makeRequest({
      name: 'Alice',
      email: 'alice@test.com',
      password: 'password123',
      confirmPassword: 'password123',
      workspaceName: 'Acme',
    }))

    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.success).toBe(true)
    expect(data.data.workspaceName).toBe('Acme')
  })

  it('returns 409 for duplicate email', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: 'existing' })

    const { POST } = await import('@/app/api/auth/register/route')
    const res = await POST(makeRequest({
      name: 'Alice',
      email: 'alice@test.com',
      password: 'password123',
      confirmPassword: 'password123',
      workspaceName: 'Acme',
    }))

    expect(res.status).toBe(409)
    const data = await res.json()
    expect(data.error.code).toBe('EMAIL_TAKEN')
  })

  it('returns 400 for invalid body', async () => {
    const { POST } = await import('@/app/api/auth/register/route')
    const res = await POST(makeRequest({ name: 'Alice' }))

    expect(res.status).toBe(400)
  })

  it('returns 400 for mismatched passwords', async () => {
    const { POST } = await import('@/app/api/auth/register/route')
    const res = await POST(makeRequest({
      name: 'Alice',
      email: 'alice@test.com',
      password: 'password123',
      confirmPassword: 'password456',
      workspaceName: 'Acme',
    }))

    expect(res.status).toBe(400)
  })

  it('cleans up on workspace creation failure', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null)
    mockPrisma.user.create.mockResolvedValue({ id: 'u1', name: 'Alice', email: 'alice@test.com' })
    mockPrisma.workspace.findUnique.mockResolvedValue(null)
    mockPrisma.workspace.create.mockRejectedValue(new Error('DB error'))
    mockPrisma.user.delete.mockResolvedValue({})

    const { POST } = await import('@/app/api/auth/register/route')
    const res = await POST(makeRequest({
      name: 'Alice',
      email: 'alice@test.com',
      password: 'password123',
      confirmPassword: 'password123',
      workspaceName: 'Acme',
    }))

    expect(res.status).toBe(500)
    expect(mockPrisma.user.delete).toHaveBeenCalledWith({ where: { id: 'u1' } })
  })
})
