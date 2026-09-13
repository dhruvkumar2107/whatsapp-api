import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockPrisma } from './setup'

describe('GET /api/webhooks/meta (verification)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns challenge on valid verify token', async () => {
    process.env.META_WEBHOOK_VERIFY_TOKEN = '313aadb3b2c39183fd0cf84b6660df93'
    const url = 'http://localhost:3000/api/webhooks/meta?hub.mode=subscribe&hub.verify_token=313aadb3b2c39183fd0cf84b6660df93&hub.challenge=CHALLENGE_ACCEPTED'
    const req = new Request(url, { method: 'GET' })

    const { rateLimit } = await import('@/lib/rate-limit')
    vi.mocked(rateLimit).mockResolvedValue({ allowed: true, remaining: 99, resetAt: Date.now() + 60000 })

    const { GET } = await import('@/app/api/webhooks/meta/route')
    const res = await GET(req)

    expect(res.status).toBe(200)
    const text = await res.text()
    expect(text).toBe('CHALLENGE_ACCEPTED')
  })

  it('returns 403 on invalid verify token', async () => {
    const url = 'http://localhost:3000/api/webhooks/meta?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=test'
    const req = new Request(url, { method: 'GET' })

    const { GET } = await import('@/app/api/webhooks/meta/route')
    const res = await GET(req)

    expect(res.status).toBe(403)
  })

  it('returns 403 when mode is not subscribe', async () => {
    const url = 'http://localhost:3000/api/webhooks/meta?hub.mode=unsubscribe&hub.verify_token=313aadb3b2c39183fd0cf84b6660df93&hub.challenge=test'
    const req = new Request(url, { method: 'GET' })

    const { GET } = await import('@/app/api/webhooks/meta/route')
    const res = await GET(req)

    expect(res.status).toBe(403)
  })
})

describe('POST /api/webhooks/meta (incoming messages)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('processes incoming text message', async () => {
    const { rateLimit } = await import('@/lib/rate-limit')
    vi.mocked(rateLimit).mockResolvedValue({ allowed: true, remaining: 99, resetAt: Date.now() + 60000 })

    const { createWhatsAppProvider } = await import('@/lib/whatsapp')
    vi.mocked(createWhatsAppProvider).mockReturnValue({
      processWebhook: vi.fn().mockResolvedValue({
        type: 'message',
        payload: {
          messages: [{
            from: '+15551234567',
            id: 'msg1',
            timestamp: '1234567890',
            type: 'text',
            text: { body: 'Hello' },
          }],
          metadata: {
            display_phone_number: '+15551234567',
            phone_number_id: '123456',
          },
        },
      }),
      sendMessage: vi.fn(),
      getOAuthURL: vi.fn(),
      exchangeCode: vi.fn(),
      getPhoneNumbers: vi.fn(),
      getTemplates: vi.fn(),
      createTemplate: vi.fn(),
      deleteTemplate: vi.fn(),
    } as never)

    mockPrisma.whatsAppAccount.findFirst.mockResolvedValue({
      id: 'wa1',
      workspaceId: 'w1',
      phoneNumberId: '123456',
    })
    mockPrisma.contact.findFirst.mockResolvedValue(null)
    mockPrisma.contact.create.mockResolvedValue({ id: 'c1', name: null, phone: '+15551234567' })
    mockPrisma.conversation.findFirst.mockResolvedValue(null)
    mockPrisma.conversation.create.mockResolvedValue({ id: 'conv1' })
    mockPrisma.message.create.mockResolvedValue({ id: 'm1', content: 'Hello', type: 'TEXT', direction: 'INBOUND' })
    mockPrisma.conversation.update.mockResolvedValue({})
    mockPrisma.contact.update.mockResolvedValue({})

    const webhookBody = {
      object: 'whatsapp_business_account',
      entry: [{
        changes: [{
          value: {
            messaging_product: 'whatsapp',
            metadata: { display_phone_number: '+15551234567', phone_number_id: '123456' },
            messages: [{
              from: '+15551234567',
              id: 'msg1',
              timestamp: '1234567890',
              type: 'text',
              text: { body: 'Hello' },
            }],
          },
          field: 'messages',
        }],
      }],
    }

    const req = new Request('http://localhost:3000/api/webhooks/meta', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(webhookBody),
    })

    const { POST } = await import('@/app/api/webhooks/meta/route')
    const res = await POST(req)

    expect(res.status).toBe(200)
    expect(mockPrisma.message.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: 'TEXT',
          direction: 'INBOUND',
        }),
      })
    )
  })

  it('returns 401 on missing webhook signature in production', async () => {
    const originalEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'production'
    process.env.META_WEBHOOK_SECRET = 'secret123'

    const req = new Request('http://localhost:3000/api/webhooks/meta', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })

    const { POST } = await import('@/app/api/webhooks/meta/route')
    const res = await POST(req)

    expect(res.status).toBe(401)

    process.env.NODE_ENV = originalEnv
  })
})
