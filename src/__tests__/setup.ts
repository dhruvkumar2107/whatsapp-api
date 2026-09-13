import { vi } from 'vitest'

const mockPrisma = {
  user: {
    findUnique: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
    update: vi.fn(),
  },
  workspace: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
  },
  workspaceMember: {
    findFirst: vi.fn(),
    create: vi.fn(),
  },
  subscription: {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
  },
  plan: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
  },
  usage: {
    findUnique: vi.fn(),
    upsert: vi.fn(),
  },
  whatsAppAccount: {
    findFirst: vi.fn(),
    create: vi.fn(),
  },
  contact: {
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  conversation: {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  message: {
    create: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
  },
  messageEvent: {
    create: vi.fn(),
  },
  template: {
    updateMany: vi.fn(),
    findFirst: vi.fn(),
  },
  campaign: {
    findMany: vi.fn(),
    update: vi.fn(),
  },
  campaignRecipient: {
    findFirst: vi.fn(),
    update: vi.fn(),
  },
  passwordResetToken: {
    findUnique: vi.fn(),
    deleteMany: vi.fn(),
    delete: vi.fn(),
    create: vi.fn(),
  },
  apiKey: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  notification: {
    create: vi.fn(),
  },
  invoice: {
    create: vi.fn(),
  },
  auditLog: {
    create: vi.fn(),
  },
  $transaction: vi.fn(async () => [{}, {}]),
}

vi.mock('@/lib/prisma', () => ({
  default: mockPrisma,
  prisma: mockPrisma,
}))

vi.mock('@/lib/audit', () => ({
  createAuditLog: vi.fn(),
}))

vi.mock('@/lib/email', () => ({
  sendEmail: vi.fn(),
  renderPasswordResetEmail: vi.fn((url: string) => ({ subject: 'Reset', html: `Reset: ${url}`, text: `Reset: ${url}` })),
}))

vi.mock('@/lib/whatsapp', () => ({
  createWhatsAppProvider: vi.fn(() => ({
    processWebhook: vi.fn(),
    sendMessage: vi.fn(),
  })),
}))

vi.mock('@/lib/whatsapp/send', () => ({
  enqueueMessageSend: vi.fn(),
}))

vi.mock('@/lib/automation/engine', () => ({
  triggerAutomations: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/lib/chatbot/engine', () => ({
  resumeChatbot: vi.fn().mockResolvedValue(undefined),
  findAndRunChatbot: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/lib/webhooks/dispatcher', () => ({
  dispatchWebhook: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/lib/workers/campaign-worker', () => ({
  processCampaign: vi.fn(),
}))

vi.mock('@/app/api/conversations/events/route', () => ({
  notifyConversationEvent: vi.fn(),
}))

vi.mock('@/lib/rate-limit', () => ({
  rateLimit: vi.fn().mockResolvedValue({ allowed: true, remaining: 29, resetAt: Date.now() + 60_000 }),
}))

vi.mock('@/lib/usage', () => ({
  incrementUsage: vi.fn(),
  checkAndFailUsageLimit: vi.fn().mockResolvedValue({ allowed: true, limit: 1000, current: 0 }),
  getCurrentUsage: vi.fn().mockResolvedValue({ messagesUsed: 0, contactsUsed: 0, apiCallsUsed: 0, automationsUsed: 0, storageUsed: BigInt(0) }),
}))

export { mockPrisma }
