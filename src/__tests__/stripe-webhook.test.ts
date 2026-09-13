import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockPrisma } from './setup'

function makeRequest(body: unknown) {
  return new Request('http://localhost:3000/api/webhooks/stripe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/webhooks/stripe', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('activates subscription on success with existing sub', async () => {
    mockPrisma.subscription.findFirst.mockResolvedValue({
      id: 'sub1',
      status: 'TRIALING',
      stripeSubscriptionId: 'stripe_sub_123',
      stripeCustomerId: 'stripe_cust_123',
    })
    mockPrisma.subscription.update.mockResolvedValue({})
    mockPrisma.workspaceMember.findFirst.mockResolvedValue({ userId: 'u1' })
    mockPrisma.notification.create.mockResolvedValue({})

    const { POST } = await import('@/app/api/webhooks/stripe/route')
    const res = await POST(makeRequest({ action: 'success', workspaceId: 'w1' }))

    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.success).toBe(true)
    expect(data.status).toBe('ACTIVE')
    expect(mockPrisma.subscription.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'ACTIVE' }) })
    )
  })

  it('sets subscription to PAST_DUE on failure', async () => {
    mockPrisma.subscription.findFirst.mockResolvedValue({
      id: 'sub1',
      status: 'ACTIVE',
    })
    mockPrisma.subscription.update.mockResolvedValue({})
    mockPrisma.workspaceMember.findFirst.mockResolvedValue({ userId: 'u1' })
    mockPrisma.notification.create.mockResolvedValue({})

    const { POST } = await import('@/app/api/webhooks/stripe/route')
    const res = await POST(makeRequest({ action: 'failure', workspaceId: 'w1' }))

    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.success).toBe(true)
    expect(data.status).toBe('PAST_DUE')
  })

  it('returns 404 on failure with no active subscription', async () => {
    mockPrisma.subscription.findFirst.mockResolvedValue(null)

    const { POST } = await import('@/app/api/webhooks/stripe/route')
    const res = await POST(makeRequest({ action: 'failure', workspaceId: 'w1' }))

    expect(res.status).toBe(404)
  })

  it('creates new subscription on success when none exists', async () => {
    mockPrisma.subscription.findFirst.mockResolvedValue(null)
    mockPrisma.subscription.create.mockResolvedValue({ id: 'sub_new' })

    const { POST } = await import('@/app/api/webhooks/stripe/route')
    const res = await POST(makeRequest({ action: 'success', workspaceId: 'w1', planId: 'plan1' }))

    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.success).toBe(true)
    expect(data.status).toBe('ACTIVE')
    expect(mockPrisma.subscription.create).toHaveBeenCalled()
  })

  it('rejects invalid action', async () => {
    const { POST } = await import('@/app/api/webhooks/stripe/route')
    const res = await POST(makeRequest({ action: 'invalid', workspaceId: 'w1' }))

    expect(res.status).toBe(400)
  })

  it('rejects missing workspaceId', async () => {
    const { POST } = await import('@/app/api/webhooks/stripe/route')
    const res = await POST(makeRequest({ action: 'success' }))

    expect(res.status).toBe(400)
  })
})
