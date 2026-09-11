import crypto from 'crypto'
import {
  WhatsAppProvider,
  ConnectParams,
  ConnectResult,
  SendMessageParams,
  SendMessageResult,
  SendTemplateParams,
  SendMediaParams,
  TemplateResult,
  CreateTemplateParams,
  CreateTemplateResult,
  AccountStatus,
  WebhookParams,
  WebhookEvent,
} from './types'

function generateMockId(): string {
  return crypto.randomBytes(16).toString('hex')
}

function generateMockWabaId(): string {
  return `${Math.floor(Math.random() * 9000000000000) + 1000000000000}`
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export class MockProvider implements WhatsAppProvider {
  async connect(params: ConnectParams): Promise<ConnectResult> {
    console.log('[MockWhatsApp] connect called with params:', {
      workspaceId: params.workspaceId,
      hasCode: !!params.code,
    })

    if (params.code) {
      console.log('[MockWhatsApp] Exchanging code for token (simulated)')
      return {
        accountId: generateMockId(),
        status: 'CONNECTED',
      }
    }

    const mockUrl = `https://www.facebook.com/v18.0/dialog/oauth?client_id=mock_app_id&redirect_uri=${encodeURIComponent(params.redirectUri || '')}&scope=whatsapp_business_management,whatsapp_business_messaging`

    console.log('[MockWhatsApp] Generated OAuth URL:', mockUrl)
    return {
      url: mockUrl,
      accountId: '',
      status: 'CONNECTING',
    }
  }

  async disconnect(accountId: string): Promise<void> {
    console.log('[MockWhatsApp] disconnect called for accountId:', accountId)
    await delay(100)
  }

  async sendMessage(params: SendMessageParams): Promise<SendMessageResult> {
    console.log('[MockWhatsApp] sendMessage:', {
      to: params.to,
      textPreview: params.text.substring(0, 50),
      phoneNumberId: params.phoneNumberId,
    })

    await delay(50)

    const messageId = `mock_msg_${generateMockId()}`

    console.log('[MockWhatsApp] Message sent with ID:', messageId)
    return {
      messagingProduct: 'whatsapp',
      whatsappMessageId: messageId,
      status: 'SENT',
      timestamp: Math.floor(Date.now() / 1000).toString(),
    }
  }

  async sendTemplate(params: SendTemplateParams): Promise<SendMessageResult> {
    console.log('[MockWhatsApp] sendTemplate:', {
      to: params.to,
      templateName: params.templateName,
      language: params.language,
      componentCount: params.components?.length || 0,
    })

    await delay(50)

    const messageId = `mock_tpl_${generateMockId()}`

    console.log('[MockWhatsApp] Template message sent with ID:', messageId)
    return {
      messagingProduct: 'whatsapp',
      whatsappMessageId: messageId,
      status: 'SENT',
      timestamp: Math.floor(Date.now() / 1000).toString(),
    }
  }

  async sendMedia(params: SendMediaParams): Promise<SendMessageResult> {
    console.log('[MockWhatsApp] sendMedia:', {
      to: params.to,
      mediaType: params.mediaType,
      mediaUrl: params.mediaUrl,
      hasCaption: !!params.caption,
    })

    await delay(50)

    const messageId = `mock_med_${generateMockId()}`

    console.log('[MockWhatsApp] Media message sent with ID:', messageId)
    return {
      messagingProduct: 'whatsapp',
      whatsappMessageId: messageId,
      status: 'SENT',
      timestamp: Math.floor(Date.now() / 1000).toString(),
    }
  }

  async getTemplates(wabaId: string): Promise<TemplateResult[]> {
    console.log('[MockWhatsApp] getTemplates for WABA:', wabaId)

    const templates: TemplateResult[] = [
      {
        id: `mock_tpl_${generateMockId()}`,
        name: 'welcome_message',
        language: 'en',
        status: 'APPROVED',
        category: 'UTILITY',
        components: [
          { type: 'BODY', text: 'Welcome {{1}}! Thank you for connecting with us.' },
        ],
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: `mock_tpl_${generateMockId()}`,
        name: 'order_confirmation',
        language: 'en',
        status: 'APPROVED',
        category: 'UTILITY',
        components: [
          {
            type: 'BODY',
            text: 'Your order #{{1}} has been confirmed. Total: {{2}}. Expected delivery: {{3}}.',
          },
        ],
        createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: `mock_tpl_${generateMockId()}`,
        name: 'marketing_promo',
        language: 'en',
        status: 'PENDING',
        category: 'MARKETING',
        components: [
          { type: 'HEADER', text: 'Special Offer' },
          {
            type: 'BODY',
            text: 'Get {{1}}% off on your next purchase! Use code {{2}} at checkout.',
          },
        ],
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: `mock_tpl_${generateMockId()}`,
        name: 'otp_verification',
        language: 'en',
        status: 'APPROVED',
        category: 'AUTHENTICATION',
        components: [
          { type: 'BODY', text: 'Your verification code is {{1}}. It expires in 5 minutes.' },
        ],
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]

    console.log('[MockWhatsApp] Returning', templates.length, 'mock templates')
    return templates
  }

  async createTemplate(params: CreateTemplateParams): Promise<CreateTemplateResult> {
    console.log('[MockWhatsApp] createTemplate:', {
      wabaId: params.wabaId,
      name: params.name,
      language: params.language,
      category: params.category,
      componentCount: params.components.length,
    })

    await delay(100)

    const templateId = generateMockId()
    console.log('[MockWhatsApp] Template created with ID:', templateId)

    return {
      id: templateId,
      status: 'PENDING',
      name: params.name,
    }
  }

  async getAccountStatus(phoneNumberId: string): Promise<AccountStatus> {
    console.log('[MockWhatsApp] getAccountStatus for:', phoneNumberId)

    return {
      phoneNumberId,
      phoneNumber: '+1 (555) 123-4567',
      businessName: 'Mock Business Inc.',
      verifiedName: 'Mock Business Inc.',
      qualityRating: 'GREEN',
      messagingLimit: 1000,
      status: 'CONNECTED',
      displayPhoneNumber: '+1 (555) 123-4567',
      throughputLevel: 'STANDARD',
    }
  }

  async registerWebhook(params: WebhookParams): Promise<void> {
    console.log('[MockWhatsApp] registerWebhook:', {
      callbackUrl: params.callbackUrl,
      verifyToken: params.verifyToken,
      fields: params.fields,
    })
  }

  async processWebhook(
    body: unknown,
    headers: Record<string, string>
  ): Promise<WebhookEvent> {
    console.log('[MockWhatsApp] processWebhook called')
    return {
      type: 'verification',
      payload: body,
      timestamp: new Date().toISOString(),
    }
  }

  simulateWebhookEvent(
    type: 'delivered' | 'read' | 'message_received',
    messageId: string
  ): WebhookEvent {
    console.log('[MockWhatsApp] Simulating webhook event:', type, messageId)

    if (type === 'delivered') {
      return {
        type: 'status',
        payload: {
          statuses: [
            {
              id: messageId,
              status: 'delivered',
              timestamp: Math.floor(Date.now() / 1000).toString(),
              recipient_id: '15551234567',
            },
          ],
        },
        timestamp: new Date().toISOString(),
      }
    }

    if (type === 'read') {
      return {
        type: 'status',
        payload: {
          statuses: [
            {
              id: messageId,
              status: 'read',
              timestamp: Math.floor(Date.now() / 1000).toString(),
              recipient_id: '15551234567',
            },
          ],
        },
        timestamp: new Date().toISOString(),
      }
    }

    return {
      type: 'message',
      payload: {
        messages: [
          {
            from: '15551234567',
            id: `mock_received_${generateMockId()}`,
            timestamp: Math.floor(Date.now() / 1000).toString(),
            type: 'text',
            text: { body: 'This is a simulated incoming message' },
          },
        ],
        metadata: {
          display_phone_number: '+1 (555) 123-4567',
          phone_number_id: generateMockId(),
        },
      },
      timestamp: new Date().toISOString(),
    }
  }
}
