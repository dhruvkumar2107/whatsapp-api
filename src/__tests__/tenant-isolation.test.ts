import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockPrisma } from './setup'

describe('Tenant isolation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('v1 API rejects requests without API key', async () => {
    const req = new Request('http://localhost:3000/api/v1/messages/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: '+15551234567', type: 'TEXT', text: 'Hi' }),
    })

    const { POST } = await import('@/app/api/v1/messages/send/route')
    const res = await POST(req)

    expect(res.status).toBe(401)
  })

  it('v1 API rejects expired API key', async () => {
    mockPrisma.apiKey.findUnique.mockResolvedValue({
      id: 'k1',
      workspaceId: 'w1',
      isActive: true,
      expiresAt: new Date('2020-01-01'),
      permissions: ['messages:send'],
      workspace: { id: 'w1', name: 'Test' },
    })

    const req = new Request('http://localhost:3000/api/v1/messages/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer wapro_test_key',
      },
      body: JSON.stringify({ to: '+15551234567', type: 'TEXT', text: 'Hi' }),
    })

    const { POST } = await import('@/app/api/v1/messages/send/route')
    const res = await POST(req)

    expect(res.status).toBe(401)
  })

  it('v1 API rejects revoked API key', async () => {
    mockPrisma.apiKey.findUnique.mockResolvedValue({
      id: 'k1',
      workspaceId: 'w1',
      isActive: false,
      expiresAt: null,
      permissions: ['messages:send'],
      workspace: { id: 'w1', name: 'Test' },
    })

    const req = new Request('http://localhost:3000/api/v1/messages/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer wapro_test_key',
      },
      body: JSON.stringify({ to: '+15551234567', type: 'TEXT', text: 'Hi' }),
    })

    const { POST } = await import('@/app/api/v1/messages/send/route')
    const res = await POST(req)

    expect(res.status).toBe(401)
  })

  it('v1 API rejects API key without required permission', async () => {
    mockPrisma.apiKey.findUnique.mockResolvedValue({
      id: 'k1',
      workspaceId: 'w1',
      isActive: true,
      expiresAt: null,
      permissions: ['contacts:read'],
      workspace: { id: 'w1', name: 'Test' },
    })

    const req = new Request('http://localhost:3000/api/v1/messages/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer wapro_test_key',
      },
      body: JSON.stringify({ to: '+15551234567', type: 'TEXT', text: 'Hi' }),
    })

    const { POST } = await import('@/app/api/v1/messages/send/route')
    const res = await POST(req)

    expect(res.status).toBe(403)
  })

  it('meta webhook ignores messages for unregistered phone numbers', async () => {
    const rl = await import('@/lib/rate-limit')
    vi.mocked(rl.rateLimit).mockResolvedValue({ allowed: true, remaining: 99, resetAt: Date.now() + 60000 })

    const { createWhatsAppProvider } = await import('@/lib/whatsapp')
    vi.mocked(createWhatsAppProvider).mockReturnValue({
      processWebhook: vi.fn().mockResolvedValue({
        type: 'message',
        payload: {
          messages: [{ from: '+15551234567', id: 'msg1', timestamp: '1234567890', type: 'text', text: { body: 'Hello' } }],
          metadata: { display_phone_number: '+1555000000', phone_number_id: 'unknown_number' },
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

    mockPrisma.whatsAppAccount.findFirst.mockResolvedValue(null)

    const webhookBody = {
      object: 'whatsapp_business_account',
      entry: [{
        changes: [{
          value: {
            messaging_product: 'whatsapp',
            metadata: { display_phone_number: '+1555000000', phone_number_id: 'unknown_number' },
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
    expect(mockPrisma.message.create).not.toHaveBeenCalled()
  })
})
