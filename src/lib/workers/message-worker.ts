import prisma from '@/lib/prisma'
import { enqueueJob, createWorker } from '@/lib/queue'
import { createWhatsAppProvider } from '@/lib/whatsapp'
import { notifyConversationEvent } from '@/app/api/conversations/events/route'
import type { TemplateComponentParam } from '@/lib/whatsapp/types'
import type { Job } from 'bullmq'

export interface MessageJob {
  messageId: string
  conversationId: string
}

export async function processOutgoingMessage(job: MessageJob): Promise<void> {
  const message = await prisma.message.findUnique({
    where: { id: job.messageId },
  })
  if (!message) return
  if (message.direction !== 'OUTBOUND') return
  if (message.status === 'SENT' || message.status === 'FAILED') return

  await prisma.message.update({
    where: { id: message.id },
    data: { status: 'SENDING' },
  })

  const conversation = await prisma.conversation.findUnique({
    where: { id: job.conversationId },
    include: {
      whatsappAccount: true,
      contact: { select: { phone: true } },
    },
  })

  if (!conversation?.whatsappAccount) {
    await markMessageFailed(message.id, 'No WhatsApp account connected for this conversation')
    return
  }

  const provider = createWhatsAppProvider()
  const content = (message.content ?? {}) as Record<string, unknown>
  const to = conversation.contact.phone
  const phoneNumberId = conversation.whatsappAccount.phoneNumberId

  try {
    let externalId: string

    if (message.type === 'TEXT') {
      const result = await provider.sendMessage({
        phoneNumberId,
        to,
        text: String(content.text ?? ''),
      })
      externalId = result.whatsappMessageId
    } else if (message.type === 'INTERACTIVE') {
      const rawInteractive = content.interactive
      const interactivePayload = (typeof rawInteractive === 'string'
        ? JSON.parse(rawInteractive)
        : typeof rawInteractive === 'object' && rawInteractive !== null
          ? rawInteractive
          : {}) as Record<string, unknown>
      const result = await provider.sendInteractive({
        phoneNumberId,
        to,
        interactive: interactivePayload,
      })
      externalId = result.whatsappMessageId
    } else if (message.type === 'TEMPLATE') {
      const result = await provider.sendTemplate({
        phoneNumberId,
        to,
        templateName: String(content.name ?? ''),
        language: String(content.language ?? 'en'),
        components: content.components as TemplateComponentParam[] | undefined,
      })
      externalId = result.whatsappMessageId
    } else if (['IMAGE', 'VIDEO', 'AUDIO', 'DOCUMENT'].includes(message.type)) {
      const result = await provider.sendMedia({
        phoneNumberId,
        to,
        mediaType: message.type.toLowerCase() as 'image' | 'video' | 'audio' | 'document',
        mediaUrl: String(content.mediaUrl ?? content.url ?? ''),
        caption: content.caption as string | undefined,
        filename: content.filename as string | undefined,
      })
      externalId = result.whatsappMessageId
    } else {
      await markMessageFailed(message.id, `Unsupported message type: ${message.type}`)
      return
    }

    await prisma.message.update({
      where: { id: message.id },
      data: {
        status: 'SENT',
        externalId,
        sentAt: new Date(),
        errorMessage: null,
      },
    })

    notifyConversationEvent(conversation.workspaceId, 'message.sent', {
      conversationId: message.conversationId,
      message: { id: message.id, status: 'SENT' },
    })

    await prisma.messageEvent.create({
      data: {
        messageId: message.id,
        event: 'SENT',
        timestamp: new Date(),
        metadata: { queue: 'messages', provider: 'whatsapp' },
      },
    })

    await prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        lastMessageAt: new Date(),
        lastMessagePreview: contentPreview(message.type, content),
        unreadCount: 0,
      },
    })

    await prisma.contact.update({
      where: { id: conversation.contactId },
      data: { lastMessageAt: new Date() },
    })

    const recipientUserId = message.agentId ?? conversation.assignedAgentId
    if (recipientUserId) {
      await prisma.notification.create({
        data: {
          userId: recipientUserId,
          workspaceId: conversation.workspaceId,
          type: 'message.sent',
          title: 'Message sent',
          message: `Message sent to ${conversation.contact.phone}`,
        },
      })
    }
  } catch (error) {
    const messageText = error instanceof Error ? error.message : 'Unknown send error'

    await prisma.messageEvent.create({
      data: {
        messageId: message.id,
        event: 'FAILED',
        timestamp: new Date(),
        metadata: { error: messageText, attempt: true },
      },
    })

    const failedAttempts = await prisma.messageEvent.count({
      where: { messageId: message.id, event: 'FAILED' },
    })

    if (failedAttempts >= 3) {
      await markMessageFailed(message.id, messageText)
      return
    }
    await prisma.message.update({
      where: { id: message.id },
      data: { status: 'QUEUED', errorMessage: messageText },
    })
    throw error
  }
}

async function markMessageFailed(messageId: string, errorMessage: string): Promise<void> {
  const message = await prisma.message.findUnique({
    where: { id: messageId },
    select: { id: true, conversationId: true },
  })

  await prisma.message.update({
    where: { id: messageId },
    data: { status: 'FAILED', errorMessage },
  })

  await prisma.messageEvent.create({
    data: {
      messageId,
      event: 'FAILED',
      timestamp: new Date(),
      metadata: { error: errorMessage },
    },
  })

  if (message) {
    const conversation = await prisma.conversation.findUnique({
      where: { id: message.conversationId },
      select: { assignedAgentId: true, workspaceId: true, contact: { select: { phone: true } } },
    })

    if (conversation?.assignedAgentId) {
      await prisma.notification.create({
        data: {
          userId: conversation.assignedAgentId,
          workspaceId: conversation.workspaceId,
          type: 'MESSAGE_FAILED',
          title: 'Message failed',
          message: `Message to ${conversation.contact.phone} failed to send.`,
          data: { messageId: message.id },
        },
      })
    }
  }
}

function contentPreview(type: string, content: Record<string, unknown>): string {
  if (type === 'TEMPLATE') return `Template: ${String(content.name ?? '')}`
  if (type === 'IMAGE') return 'Photo'
  if (type === 'VIDEO') return 'Video'
  if (type === 'AUDIO') return 'Voice message'
  if (type === 'DOCUMENT') return String(content.filename ?? 'Document')
  if (type === 'INTERACTIVE') {
    const text = content.text
    return typeof text === 'string' ? text.slice(0, 80) : 'Interactive message'
  }
  const text = content.text
  return typeof text === 'string' ? text.slice(0, 80) : type
}

export function initMessageWorker(): void {
  createWorker('messages', async (job: Job) => {
    const data = job.data as MessageJob
    await processOutgoingMessage(data)
  })
}

export async function enqueueMessage(messageId: string, conversationId: string): Promise<string> {
  const job = await enqueueJob('messages', {
    id: `${messageId}-${Date.now()}`,
    type: 'process-outgoing',
    payload: { messageId, conversationId },
  })
  return job.id?.toString() ?? ''
}
