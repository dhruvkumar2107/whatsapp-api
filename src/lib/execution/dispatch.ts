import prisma from '@/lib/prisma'
import { enqueueMessage } from '@/lib/workers/message-worker'
import { updateUsage } from '@/lib/usage'
import { createAuditLog } from '@/lib/audit'
import type { Prisma } from '@prisma/client'
import type { SendMessageInput, ExecutionContext } from '@/lib/execution/types'

function resolveTemplateParameters(
  input: SendMessageInput
): Array<{ type: 'header' | 'body' | 'button'; parameters: Array<{ type: string; text?: string }> }> | undefined {
  if (!input.parameters || input.parameters.length === 0) return undefined

  const params = input.parameters.map((p) => ({
    type: (p.type || 'text') as 'text' | 'image',
    ...(p.document ? { document: p.document } : {}),
    ...(p.image ? { image: p.image } : {}),
    ...(p.video ? { video: p.video } : {}),
    ...(p.text !== undefined ? { text: p.text } : {}),
  }))

  return [
    {
      type: 'body',
      parameters: params,
    },
  ]
}

export async function dispatchOutboundMessage(
  ctx: ExecutionContext,
  input: SendMessageInput,
  opts: {
    workspaceUserId?: string | null
    externalRef?: string
    skipUsage?: boolean
  } = {}
): Promise<{ message: { id: string }; messageId: string } | null> {
  let account
  if (ctx.conversation?.whatsappAccountId) {
    account = await prisma.whatsAppAccount.findFirst({
      where: {
        workspaceId: ctx.workspaceId,
        id: ctx.conversation.whatsappAccountId,
        status: 'CONNECTED',
      },
    })
  }
  if (!account) {
    account = await prisma.whatsAppAccount.findFirst({
      where: { workspaceId: ctx.workspaceId, status: 'CONNECTED' },
      orderBy: { createdAt: 'desc' },
    })
  }
  if (!account) {
    throw new Error('No connected WhatsApp account found for this workspace')
  }

  let conversationId = ctx.conversation?.id
  let conversation = ctx.conversation

  if (!conversationId) {
    conversation = await prisma.conversation.findFirst({
      where: {
        workspaceId: ctx.workspaceId,
        whatsappAccountId: account.id,
        contactId: ctx.contact.id,
      },
    })
    conversationId = conversation?.id
  }

  if (!conversationId) {
    conversation = await prisma.conversation.create({
      data: {
        workspaceId: ctx.workspaceId,
        whatsappAccountId: account.id,
        contactId: ctx.contact.id,
      },
    })
    conversationId = conversation.id
  }

  const inputContent: Prisma.InputJsonValue = (() => {
    if (input.type === 'TEXT') return { text: input.text ?? '' }
    if (input.type === 'TEMPLATE')
      return {
        name: input.templateName ?? '',
        language: input.language ?? 'en',
        components: resolveTemplateParameters(input),
      }
    if (input.type === 'INTERACTIVE')
      return {
        text: input.text ?? '',
        interactive: (input.interactive ?? {}) as Prisma.InputJsonValue,
      }
    return {
      mediaUrl: input.mediaUrl ?? '',
      caption: input.caption ?? undefined,
      filename: input.filename ?? undefined,
    }
  })()

  const message = await prisma.message.create({
    data: {
      conversationId,
      type: input.type,
      direction: 'OUTBOUND',
      status: 'QUEUED',
      content: inputContent,
      agentId: opts.workspaceUserId ?? null,
      externalId: opts.externalRef ?? null,
    },
  })

  if (!opts.skipUsage) {
    await updateUsage(ctx.workspaceId, { messagesUsed: 1 }).catch(() => {})
  }

  await prisma.conversation
    .update({
      where: { id: conversationId },
      data: {
        lastMessageAt: new Date(),
        lastMessagePreview:
          input.type === 'TEMPLATE'
            ? `Template: ${input.templateName ?? ''}`
            : input.text?.slice(0, 80) || input.type,
      },
    })
    .catch(() => {})

  await createAuditLog({
    workspaceId: ctx.workspaceId,
    userId: opts.workspaceUserId ?? ctx.contact.id,
    action: 'message.dispatch',
    resource: 'message',
    resourceId: message.id,
    metadata: { type: input.type, contactId: ctx.contact.id },
  }).catch(() => {})

  void enqueueMessage(message.id, conversationId).catch((err) => {
    console.error('[Dispatch] Failed to enqueue message:', err)
  })

  return { message: { id: message.id }, messageId: message.id }
}