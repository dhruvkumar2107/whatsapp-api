import prisma from '@/lib/prisma'
import { createWhatsAppProvider } from '@/lib/whatsapp'

export function enqueueMessageSend(messageId: string, conversationId: string): void {
  processMessageSend(messageId, conversationId).catch((err) => {
    console.error('[MessageQueue] Unhandled error:', messageId, err)
  })
}

async function processMessageSend(messageId: string, conversationId: string): Promise<void> {
  try {
    const message = await prisma.message.findUnique({ where: { id: messageId } })
    if (!message || message.status !== 'QUEUED') return

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        whatsappAccount: true,
        contact: { select: { phone: true } },
      },
    })

    if (!conversation?.whatsappAccount) {
      await markFailed(messageId, 'No WhatsApp account available')
      return
    }

    const provider = createWhatsAppProvider()
    const content = message.content as Record<string, unknown> | null
    const to = conversation.contact.phone
    const phoneNumberId = conversation.whatsappAccount.phoneNumberId

    let result: { whatsappMessageId: string }

    if (message.type === 'TEXT') {
      result = await provider.sendMessage({
        phoneNumberId,
        to,
        text: (content?.text as string) ?? '',
      })
    } else if (message.type === 'TEMPLATE') {
      result = await provider.sendTemplate({
        phoneNumberId,
        to,
        templateName: (content?.name as string) ?? '',
        language: (content?.language as string) ?? 'en',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        components: content?.components as any,
      })
    } else if (['IMAGE', 'VIDEO', 'AUDIO', 'DOCUMENT'].includes(message.type)) {
      result = await provider.sendMedia({
        phoneNumberId,
        to,
        mediaType: message.type.toLowerCase() as 'image' | 'video' | 'audio' | 'document',
        mediaUrl: (content?.mediaUrl as string) ?? (content?.url as string) ?? '',
        caption: content?.caption as string | undefined,
        filename: content?.filename as string | undefined,
      })
    } else {
      await markFailed(messageId, `Unsupported message type: ${message.type}`)
      return
    }

    await prisma.message.update({
      where: { id: messageId },
      data: {
        status: 'SENT',
        externalId: result.whatsappMessageId,
        sentAt: new Date(),
      },
    })

    await prisma.messageEvent.create({
      data: {
        messageId,
        event: 'SENT',
        timestamp: new Date(),
      },
    })
  } catch (error) {
    await markFailed(messageId, error instanceof Error ? error.message : 'Unknown send error')
  }
}

async function markFailed(messageId: string, errorMessage: string): Promise<void> {
  try {
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
  } catch (err) {
    console.error('[MessageQueue] Failed to mark message as failed:', err)
  }
}
