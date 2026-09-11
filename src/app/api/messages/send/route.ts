import { NextRequest } from 'next/server'
import { Prisma } from '@prisma/client'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { handleApiError, UnauthorizedError } from '@/lib/errors'
import { successResponse, authenticateApiKey } from '@/lib/api-utils'
import { messageSendSchema } from '@/lib/validators'
import { enqueueMessageSend } from '@/lib/whatsapp/send'

export async function POST(request: NextRequest) {
  try {
    let workspaceId: string | null = null

    const session = await auth()
    if (session?.user?.id && session.user.workspaceId) {
      workspaceId = session.user.workspaceId
    } else {
      try {
        const apiKeyData = await authenticateApiKey(request)
        workspaceId = apiKeyData.workspaceId
      } catch {
        throw new UnauthorizedError('Authentication required')
      }
    }

    if (!workspaceId) throw new UnauthorizedError('No workspace')

    const body = await request.json()
    const validated = messageSendSchema.parse(body)

    let contact = await prisma.contact.findFirst({
      where: { workspaceId, phone: validated.to },
    })
    if (!contact) {
      contact = await prisma.contact.create({
        data: {
          workspaceId,
          phone: validated.to,
          source: 'api',
        },
      })
    }

    const whatsappAccount = await prisma.whatsAppAccount.findFirst({
      where: { workspaceId, status: 'CONNECTED' },
      orderBy: { createdAt: 'desc' },
    })
    if (!whatsappAccount) {
      throw new Error('No connected WhatsApp account found for this workspace')
    }

    let conversation = await prisma.conversation.findFirst({
      where: {
        workspaceId,
        contactId: contact.id,
        whatsappAccountId: whatsappAccount.id,
      },
    })
    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          workspaceId,
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
      data: {
        lastMessageAt: new Date(),
        lastMessagePreview: preview,
      },
    })

    await prisma.contact.update({
      where: { id: contact.id },
      data: { lastMessageAt: new Date() },
    })

    enqueueMessageSend(message.id, conversation.id)

    return successResponse({ messageId: message.id }, 201)
  } catch (error) {
    return handleApiError(error)
  }
}
