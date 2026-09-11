import type { ChatbotNode, Contact, Conversation, Message } from '@prisma/client'

export interface ExecutionContext {
  workspaceId: string
  contact: Contact
  conversation?: Conversation | null
  message?: Message | null
  messageText?: string | null
  variables: Record<string, string | number | boolean | null>
  trigger?: {
    type: string
    campaignId?: string
    tagName?: string
  }
  flowNodes?: ChatbotNode[]
  chatbotId?: string
}

export interface SendMessageInput {
  type: 'TEXT' | 'TEMPLATE' | 'IMAGE' | 'VIDEO' | 'AUDIO' | 'DOCUMENT' | 'INTERACTIVE'
  text?: string
  templateName?: string
  language?: string
  parameters?: Array<{ type: string; text?: string; image?: { link: string }; video?: { link: string }; document?: { link: string; filename?: string } }>
  mediaUrl?: string
  caption?: string
  filename?: string
  externalRef?: string
  interactive?: Record<string, unknown>
}

export const templateBody = (body: string | unknown): string =>
  typeof body === 'string' ? body : typeof body === 'object' && body !== null ? JSON.stringify(body) : ''