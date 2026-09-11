import { NextRequest } from 'next/server'
import { Prisma } from '@prisma/client'
import prisma from '@/lib/prisma'
import { messageSendSchema } from '@/lib/validators'
import { successResponse, authenticateApiKey } from '@/lib/api-utils'
import { handleApiError, UnauthorizedError, ForbiddenError, RateLimitError } from '@/lib/errors'
import { enqueueMessageSend } from '@/lib/whatsapp/send'
import { checkAndFailUsageLimit, incrementUsage } from '@/lib/usage'
import { rateLimit } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
  try {
    const authData = await authenticateApiKey(request)

    if (!authData.permissions.includes('messages:send')) {
      throw new ForbiddenError('Missing permission: messages:send')
    }

    const { allowed } = rateLimit(`v1:send:${authData.workspaceId}`, 30, 60_000)
    if (!allowed) {
      throw new RateLimitError('Too many requests. Please try again later.')
    }

    const usageCheck = await checkAndFailUsageLimit(authData.workspaceId, 'messagesUsed', 1)
    if (!usageCheck.allowed) {
      throw new ForbiddenError(usageCheck.message)
    }

    const body = await request.json()
    const validated = messageSendSchema.parse(body)

    let contact = await prisma.contact.findFirst({
      where: { workspaceId: authData.workspaceId, phone: validated.to },
    })
    if (!contact) {
      contact = await prisma.contact.create({
        data: {
          workspaceId: authData.workspaceId,
          phone: validated.to,
          source: 'api',
        },
      })
    }

    const whatsappAccount = await prisma.whatsAppAccount.findFirst({
      where: { workspaceId: authData.workspaceId, status: 'CONNECTED' },
      orderBy: { createdAt: 'desc' },
    })
    if (!whatsappAccount) {
      throw new UnauthorizedError('No connected WhatsApp account found for this workspace')
    }

    let conversation = await prisma.conversation.findFirst({
      where: {
        workspaceId: authData.workspaceId,
        contactId: contact.id,
        whatsappAccountId: whatsappAccount.id,
      },
    })
    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          workspaceId: authData.workspaceId,
          contactId: contact.id,
          whatsappAccountId: whatsappAccount.id,
        },
      })
    }

    let content: unknown
    if (validated.type === 'TEXT') {
      content = { text: validated.text }
    } else if (validated.type === 'TEMPLATE') {
      content = validated.template
    } else if (validated.media) {
      content = validated.media
    } else if (validated.interactive) {
      content = validated.interactive
    }

    const message = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        type: validated.type,
        direction: 'OUTBOUND',
        status: 'QUEUED',
        content: content as Prisma.InputJsonValue,
      },
    })

    let preview: string = validated.type
    if (typeof content === 'object' && content !== null) {
      const c = content as Record<string, unknown>
      if (typeof c.text === 'string') preview = c.text.slice(0, 80)
      else if (typeof c.name === 'string') preview = `Template: ${c.name}`
      else if (typeof c.caption === 'string') preview = c.caption.slice(0, 80)
    }

    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { lastMessageAt: new Date(), lastMessagePreview: preview },
    })

    await prisma.contact.update({
      where: { id: contact.id },
      data: { lastMessageAt: new Date() },
    })

    enqueueMessageSend(message.id, conversation.id)

    void incrementUsage(authData.workspaceId, { messagesUsed: 1 }).catch(() => {})

    return successResponse({ messageId: message.id, status: 'QUEUED' }, 201)
  } catch (error) {
    return handleApiError(error)
  }
}
