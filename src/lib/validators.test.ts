import { describe, it, expect } from 'vitest'
import {
  loginSchema,
  registerSchema,
  contactSchema,
  campaignSchema,
  messageSendSchema,
  templateSchema,
} from '@/lib/validators'

describe('loginSchema', () => {
  it('accepts a valid email/password', () => {
    expect(loginSchema.parse({ email: 'user@example.com', password: 'secret' })).toBeTruthy()
  })

  it('rejects an invalid email', () => {
    const result = loginSchema.safeParse({ email: 'not-an-email', password: 'secret' })
    expect(result.success).toBe(false)
  })
})

describe('registerSchema', () => {
  it('accepts matching passwords', () => {
    const result = registerSchema.safeParse({
      name: 'Alice',
      email: 'alice@example.com',
      password: 'password123',
      confirmPassword: 'password123',
      workspaceName: 'Acme',
    })
    expect(result.success).toBe(true)
  })

  it('rejects mismatched passwords', () => {
    const result = registerSchema.safeParse({
      name: 'Alice',
      email: 'alice@example.com',
      password: 'password123',
      confirmPassword: 'password456',
      workspaceName: 'Acme',
    })
    expect(result.success).toBe(false)
  })

  it('rejects a short password', () => {
    const result = registerSchema.safeParse({
      name: 'Alice',
      email: 'alice@example.com',
      password: 'short',
      confirmPassword: 'short',
      workspaceName: 'Acme',
    })
    expect(result.success).toBe(false)
  })
})

describe('contactSchema', () => {
  it('accepts a valid contact', () => {
    const result = contactSchema.safeParse({
      name: 'John Doe',
      phone: '+15551234567',
    })
    expect(result.success).toBe(true)
  })

  it('rejects a phone without country code', () => {
    const result = contactSchema.safeParse({
      name: 'John Doe',
      phone: '5551234567',
    })
    expect(result.success).toBe(false)
  })

  it('accepts an empty email', () => {
    const result = contactSchema.safeParse({
      name: 'John Doe',
      phone: '+15551234567',
      email: '',
    })
    expect(result.success).toBe(true)
  })
})

describe('campaignSchema', () => {
  const base = {
    name: 'Launch campaign',
    templateId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  }

  it('accepts a minimal campaign', () => {
    expect(campaignSchema.parse(base)).toBeTruthy()
  })

  it('rejects a non-uuid templateId', () => {
    const result = campaignSchema.safeParse({ ...base, templateId: 'abc' })
    expect(result.success).toBe(false)
  })

  it('accepts a scheduled campaign', () => {
    const result = campaignSchema.safeParse({
      ...base,
      scheduledAt: '2026-09-12T10:00:00Z',
    })
    expect(result.success).toBe(true)
  })
})

describe('messageSendSchema', () => {
  it('accepts a text message', () => {
    const result = messageSendSchema.safeParse({
      to: '+15551234567',
      type: 'TEXT',
      text: 'Hello!',
    })
    expect(result.success).toBe(true)
  })

  it('rejects text message without text', () => {
    const result = messageSendSchema.safeParse({
      to: '+15551234567',
      type: 'TEXT',
    })
    expect(result.success).toBe(false)
  })

  it('accepts a template message', () => {
    const result = messageSendSchema.safeParse({
      to: '+15551234567',
      type: 'TEMPLATE',
      template: {
        name: 'welcome',
        language: 'en_US',
      },
    })
    expect(result.success).toBe(true)
  })
})

describe('templateSchema', () => {
  it('accepts a minimal template', () => {
    const result = templateSchema.safeParse({
      name: 'welcome_message',
      language: 'en_US',
      category: 'UTILITY',
      components: [{ type: 'BODY', text: 'Hello {{1}}' }],
    })
    expect(result.success).toBe(true)
  })

  it('rejects an invalid category', () => {
    const result = templateSchema.safeParse({
      name: 'welcome_message',
      language: 'en_US',
      category: 'SPAM',
      components: [{ type: 'BODY', text: 'Hi' }],
    })
    expect(result.success).toBe(false)
  })
})