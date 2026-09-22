import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { Prisma } from '@prisma/client'
import prisma from '@/lib/prisma'
import { createWhatsAppProvider } from '@/lib/whatsapp'
import { triggerAutomations } from '@/lib/automation/engine'
import { resumeChatbot, findAndRunChatbot } from '@/lib/chatbot/engine'
import { dispatchWebhook } from '@/lib/webhooks/dispatcher'
import { rateLimit } from '@/lib/rate-limit'
import { notifyConversationEvent } from '@/app/api/conversations/events/route'
import { handleMySmartCardMessage } from '@/lib/mysmartcard/webhook-handler'

const VERIFY_TOKEN = process.env.META_WEBHOOK_VERIFY_TOKEN || 'default_verify_token'

export async function GET(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const { allowed } = await rateLimit(`meta:${ip}`, 100, 60_000)
  if (!allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const { searchParams } = new URL(request.url)
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token === VERIFY_TOKEN && challenge) {
    return new NextResponse(challenge, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    })
  }

  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const { allowed } = await rateLimit(`meta:${ip}`, 100, 60_000)
  if (!allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  try {
    const rawBody = await request.text()

    const webhookSecret = process.env.META_WEBHOOK_SECRET
    const isProduction = process.env.NODE_ENV === 'production'

    if (isProduction && !webhookSecret) {
      console.error('[Webhook] META_WEBHOOK_SECRET is not configured — rejecting in production')
      return NextResponse.json({ error: 'Webhook misconfigured' }, { status: 500 })
    }

    if (webhookSecret) {
      const signature = request.headers.get('x-hub-signature-256')
      if (!signature) {
        return NextResponse.json({ error: 'Missing signature' }, { status: 401 })
      }

      const expectedSignature = `sha256=${crypto
        .createHmac('sha256', webhookSecret)
        .update(rawBody)
        .digest('hex')}`

      const sigBuffer = Buffer.from(signature)
      const expectedBuffer = Buffer.from(expectedSignature)

      if (sigBuffer.length !== expectedBuffer.length) {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
      }

      if (!crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
      }
    }

    let body
    try {
      body = JSON.parse(rawBody)
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const provider = createWhatsAppProvider()
    const event = await provider.processWebhook(body, Object.fromEntries(request.headers.entries()))

    if (event.type === 'message') {
      await handleIncomingMessage(event.payload)
    } else if (event.type === 'status') {
      await handleStatusUpdate(event.payload)
    } else if (event.type === 'template_status') {
      await handleTemplateStatus(event.payload)
    }

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error('Webhook processing error:', error)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}

async function handleIncomingMessage(payload: unknown) {
  const data = payload as {
    messages?: Array<{
      from: string
      id: string
      timestamp: string
      type: string
      text?: { body: string }
      image?: { id: string; mime_type: string }
      video?: { id: string; mime_type: string }
      audio?: { id: string; mime_type: string }
      document?: { id: string; mime_type: string; filename: string }
      interactive?: {
        type: string
        button?: { id: string; title: string }
        list_reply?: { id: string; title: string; description: string }
      }
      contacts?: Array<{ name: { formatted_name: string } }>
    }>
    metadata?: {
      display_phone_number: string
      phone_number_id: string
    }
  }

  if (!data.messages || !data.metadata?.phone_number_id) return

  const account = await prisma.whatsAppAccount.findFirst({
    where: { phoneNumberId: data.metadata.phone_number_id },
  })

  if (!account) return

  for (const message of data.messages) {
    const messageText =
      message.type === 'text' && message.text ? message.text.body : ''

    // Extract profile name from WhatsApp contacts array
    const profileName = message.contacts?.[0]?.name?.formatted_name || null

    let contact = await prisma.contact.findFirst({
      where: {
        workspaceId: account.workspaceId,
        phone: message.from,
      },
    })

    if (!contact) {
      contact = await prisma.contact.create({
        data: {
          workspaceId: account.workspaceId,
          phone: message.from,
          name: profileName,
          optIn: true,
          source: 'whatsapp_webhook',
        },
      })
      void dispatchWebhook(account.workspaceId, 'contact.created', {
        contact: { id: contact.id, phone: contact.phone, name: contact.name },
        workspaceId: account.workspaceId,
      }).catch(() => {})
      void triggerAutomations(
        { type: 'contact_created', contact, messageText },
        account.workspaceId
      ).catch(() => {})
    } else if (profileName && !contact.name) {
      // Update contact name from WhatsApp profile if we don't have one yet
      await prisma.contact.update({
        where: { id: contact.id },
        data: { name: profileName },
      })
      contact.name = profileName
    }

    let conversation = await prisma.conversation.findFirst({
      where: {
        workspaceId: account.workspaceId,
        contactId: contact.id,
        whatsappAccountId: account.id,
      },
    })

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          workspaceId: account.workspaceId,
          contactId: contact.id,
          whatsappAccountId: account.id,
        },
      })
    }

    let content: Prisma.InputJsonValue = ''
    let messageType: 'TEXT' | 'IMAGE' | 'VIDEO' | 'AUDIO' | 'DOCUMENT' | 'INTERACTIVE' = 'TEXT'

    if (message.type === 'text' && message.text) {
      content = message.text.body
      messageType = 'TEXT'
    } else if (message.type === 'image') {
      content = message.image?.id || 'Image received'
      messageType = 'IMAGE'
    } else if (message.type === 'video') {
      content = message.video?.id || 'Video received'
      messageType = 'VIDEO'
    } else if (message.type === 'audio') {
      content = message.audio?.id || 'Audio received'
      messageType = 'AUDIO'
    } else if (message.type === 'document') {
      content = message.document?.filename || 'Document received'
      messageType = 'DOCUMENT'
    } else if (message.type === 'interactive' && message.interactive) {
      if (message.interactive.button) {
        content = message.interactive.button.title
      } else if (message.interactive.list_reply) {
        content = message.interactive.list_reply.title
      }
      messageType = 'INTERACTIVE'
    } else {
      content = JSON.stringify(message)
    }

    const preview =
      typeof content === 'string'
        ? content
        : messageType === 'IMAGE'
          ? 'Photo'
          : messageType === 'VIDEO'
            ? 'Video'
            : messageType === 'AUDIO'
              ? 'Voice message'
              : messageType === 'DOCUMENT'
                ? 'Document'
                : 'Message'

    const createdMessage = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        externalId: message.id,
        type: messageType,
        direction: 'INBOUND',
        status: 'DELIVERED',
        content,
        contactPhone: message.from,
      },
    })

    await prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        lastMessageAt: new Date(),
        lastMessagePreview: preview,
        unreadCount: { increment: 1 },
      },
    })

    await prisma.contact.update({
      where: { id: contact.id },
      data: { lastMessageAt: new Date() },
    })

    // Count as campaign reply if this contact was a campaign recipient
    const campaignRecipient = await prisma.campaignRecipient.findFirst({
      where: {
        contactId: contact.id,
        status: { in: ['SENT', 'DELIVERED', 'READ'] },
      },
      orderBy: { sentAt: 'desc' },
    })
    if (campaignRecipient) {
      await prisma.campaign.update({
        where: { id: campaignRecipient.campaignId },
        data: { replies: { increment: 1 } },
      })
    }

    notifyConversationEvent(account.workspaceId, 'message.received', {
      conversationId: conversation.id,
      message: { id: createdMessage.id, content: createdMessage.content, type: createdMessage.type, direction: createdMessage.direction },
      contact: { id: contact.id, name: contact.name, phone: contact.phone },
    })

    void dispatchWebhook(account.workspaceId, 'message.received', {
      message: { from: message.from, id: message.id, type: messageType, text: preview },
      contact: { id: contact.id, phone: contact.phone },
      workspaceId: account.workspaceId,
    }).catch(() => {})

    const mySmartCardHandled = await handleMySmartCardMessage({
      workspaceId: account.workspaceId,
      phoneNumberId: account.phoneNumberId,
      contact,
      conversation,
      messageText,
      messageType,
      messageId: message.id,
      from: message.from,
    }).catch(() => false)

    if (!mySmartCardHandled) {
      void resumeChatbot(account.workspaceId, contact, conversation, messageText)
        .then(async (resumed) => {
          if (!resumed) {
            await findAndRunChatbot(account.workspaceId, contact, conversation, messageText)
          }
        })
        .catch(() => {})
    }

    void triggerAutomations(
      { type: 'message_received', contact, messageText, variables: { last_message: messageText } },
      account.workspaceId
    ).catch(() => {})
  }
}

async function handleStatusUpdate(payload: unknown) {
  const data = payload as {
    statuses?: Array<{
      id: string
      status: string
      timestamp: string
      recipient_id: string
      errors?: Array<{
        code: number
        title: string
        message: string
      }>
    }>
    metadata?: {
      phone_number_id?: string
    }
  }

  if (!data.statuses) return

  if (!data.metadata?.phone_number_id) {
    console.warn('[Webhook] Status update missing phone_number_id — skipping')
    return
  }

  const account = await prisma.whatsAppAccount.findFirst({
    where: { phoneNumberId: data.metadata.phone_number_id },
    select: { workspaceId: true },
  })
  if (!account) {
    console.warn(`[Webhook] No account found for phone_number_id=${data.metadata.phone_number_id} — skipping`)
    return
  }

  const workspaceFilter = { conversation: { workspaceId: account.workspaceId } }

  for (const status of data.statuses) {
    const statusMap: Record<string, 'SENT' | 'DELIVERED' | 'READ' | 'FAILED'> = {
      sent: 'SENT',
      delivered: 'DELIVERED',
      read: 'READ',
      played: 'READ',
      failed: 'FAILED',
      pending: 'SENT',
    }

    const mappedStatus = statusMap[status.status.toLowerCase()] || 'SENT'

    const updateData: {
      status: 'SENT' | 'DELIVERED' | 'READ' | 'FAILED'
      errorMessage?: string
      sentAt?: Date
      deliveredAt?: Date
      readAt?: Date
    } = {
      status: mappedStatus,
    }

    if (status.errors && status.errors.length > 0) {
      updateData.errorMessage = status.errors.map((e) => `${e.title}: ${e.message}`).join('; ')
    }

    if (mappedStatus === 'SENT') {
      updateData.sentAt = new Date(Number(status.timestamp) * 1000)
    } else if (mappedStatus === 'DELIVERED') {
      updateData.deliveredAt = new Date(Number(status.timestamp) * 1000)
    } else if (mappedStatus === 'READ') {
      updateData.readAt = new Date(Number(status.timestamp) * 1000)
    }

    const message = await prisma.message.findFirst({
      where: { externalId: status.id, ...workspaceFilter },
    })

    if (message) {
      const conversation = await prisma.conversation.findUnique({
        where: { id: message.conversationId },
      })

      await prisma.message.update({
        where: { id: message.id },
        data: updateData,
      })

      await prisma.messageEvent.create({
        data: {
          messageId: message.id,
          event: mappedStatus === 'FAILED' ? 'FAILED' : mappedStatus === 'READ' ? 'READ' : 'DELIVERED',
          timestamp: new Date(Number(status.timestamp) * 1000),
          metadata: {
            recipientId: status.recipient_id,
            errors: status.errors,
          },
        },
      })

      if (conversation && (mappedStatus === 'DELIVERED' || mappedStatus === 'READ' || mappedStatus === 'FAILED')) {
        const recipient = await prisma.campaignRecipient.findFirst({
          where: { messageId: message.id },
        })
        if (recipient) {
          await prisma.campaignRecipient.update({
            where: { id: recipient.id },
            data: {
              status:
                mappedStatus === 'READ'
                  ? 'READ'
                  : mappedStatus === 'FAILED'
                    ? 'FAILED'
                    : 'DELIVERED',
              deliveredAt: mappedStatus === 'DELIVERED' || mappedStatus === 'READ' ? new Date() : recipient.deliveredAt,
              readAt: mappedStatus === 'READ' ? new Date() : recipient.readAt,
            },
          })
          const campaignUpdate: Record<string, unknown> = {}
          if (mappedStatus === 'DELIVERED') campaignUpdate.delivered = { increment: 1 }
          if (mappedStatus === 'READ') campaignUpdate.read = { increment: 1 }
          if (mappedStatus === 'FAILED') campaignUpdate.failed = { increment: 1 }
          if (Object.keys(campaignUpdate).length > 0) {
            await prisma.campaign.update({
              where: { id: recipient.campaignId },
              data: campaignUpdate,
            })
          }
        }
      }

      if (conversation) {
        void dispatchWebhook(conversation.workspaceId, `message.${mappedStatus.toLowerCase()}`, {
          message: { id: message.id, externalId: message.externalId, status: mappedStatus },
          contact: { id: conversation.contactId },
          workspaceId: conversation.workspaceId,
        }).catch(() => {})
      }
    }
  }
}

async function handleTemplateStatus(payload: unknown) {
  const data = payload as {
    template_update?: {
      event: string
      message_template_id: string
      template_name: string
      template_language: string
      status: string
    }
  }

  if (!data.template_update) return

  const { message_template_id, status, template_name } = data.template_update

  console.log(
    `[Webhook] Template status update: ${template_name} (${message_template_id}) -> ${status}`
  )

  const statusMap: Record<string, 'APPROVED' | 'REJECTED' | 'DISABLED' | 'PENDING'> = {
    approved: 'APPROVED',
    rejected: 'REJECTED',
    disabled: 'DISABLED',
    pending: 'PENDING',
  }

  const mappedStatus = statusMap[status.toLowerCase()] || 'PENDING'

  // NOTE: metaTemplateId is a global Meta identifier, not scoped to a workspace.
  // This update is intentionally global — a template rejection should apply everywhere.
  await prisma.template.updateMany({
    where: { metaTemplateId: message_template_id },
    data: { status: mappedStatus },
  })

  if (mappedStatus === 'APPROVED' || mappedStatus === 'REJECTED') {
    const template = await prisma.template.findFirst({
      where: { metaTemplateId: message_template_id },
    })
    if (template) {
      const waba = await prisma.whatsAppAccount.findFirst({
        where: { id: template.wabaAccountId ?? '' },
      })
      if (waba) {
        const member = await prisma.workspaceMember.findFirst({
          where: { workspaceId: waba.workspaceId },
          orderBy: { createdAt: 'asc' },
        })
        if (member) {
          await prisma.notification.create({
            data: {
              userId: member.userId,
              workspaceId: waba.workspaceId,
              type: mappedStatus === 'APPROVED' ? 'TEMPLATE_APPROVED' : 'TEMPLATE_REJECTED',
              title: mappedStatus === 'APPROVED' ? 'Template approved' : 'Template rejected',
              message:
                mappedStatus === 'APPROVED'
                  ? `Your template "${template.name}" has been approved.`
                  : `Your template "${template.name}" was rejected.`,
              data: { templateId: template.id },
            },
          })
        }
      }
    }
  }
}
