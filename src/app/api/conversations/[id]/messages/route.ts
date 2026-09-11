import { NextRequest } from 'next/server'
import { z } from 'zod'
import { Prisma } from '@prisma/client'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { handleApiError, UnauthorizedError, NotFoundError } from '@/lib/errors'
import { successResponse } from '@/lib/api-utils'
import { enqueueMessageSend } from '@/lib/whatsapp/send'

const conversationMessageSchema = z.object({
  type: z.enum(['TEXT', 'TEMPLATE', 'IMAGE', 'VIDEO', 'AUDIO', 'DOCUMENT']),
  text: z.string().max(4096).optional(),
  template: z
    .object({
      name: z.string(),
      language: z.string(),
      components: z
        .array(
          z.object({
            type: z.string(),
            parameters: z
              .array(
                z.object({
                  type: z.string(),
                  text: z.string().optional(),
                })
              )
              .optional(),
          })
        )
        .optional(),
    })
    .optional(),
  media: z
    .object({
      url: z.string().url(),
      caption: z.string().max(1024).optional(),
      filename: z.string().optional(),
    })
    .optional(),
})

function getMessagePreview(content: unknown, type: string): string {
  if (typeof content === 'string') return content.slice(0, 80)
  if (typeof content === 'object' && content !== null) {
    const c = content as Record<string, unknown>
    if (typeof c.text === 'string') return c.text.slice(0, 80)
    if (typeof c.name === 'string') return `Template: ${c.name}`
    if (typeof c.caption === 'string') return c.caption.slice(0, 80)
  }
  if (type === 'IMAGE') return 'Photo'
  if (type === 'VIDEO') return 'Video'
  if (type === 'AUDIO') return 'Audio'
  if (type === 'DOCUMENT') return 'Document'
  return 'Message'
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) throw new UnauthorizedError()
    const workspaceId = session.user.workspaceId
    if (!workspaceId) throw new UnauthorizedError('No workspace')

    const { id } = await params
    const { searchParams } = new URL(request.url)
    const before = searchParams.get('before')
    const after = searchParams.get('after')
    const limit = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get('limit') || '50', 10))
    )

    const conversation = await prisma.conversation.findFirst({
      where: { id, workspaceId },
      select: { id: true },
    })
    if (!conversation) throw new NotFoundError('Conversation')

    if (after) {
      const cursor = await prisma.message.findUnique({
        where: { id: after },
        select: { createdAt: true },
      })
      const messages = await prisma.message.findMany({
        where: {
          conversationId: id,
          ...(cursor ? { createdAt: { gt: cursor.createdAt } } : {}),
        },
        orderBy: { createdAt: 'asc' },
        take: limit,
      })
      return successResponse(messages)
    }

    if (before) {
      const cursor = await prisma.message.findUnique({
        where: { id: before },
        select: { createdAt: true },
      })
      const messages = await prisma.message.findMany({
        where: {
          conversationId: id,
          ...(cursor ? { createdAt: { lt: cursor.createdAt } } : {}),
        },
        orderBy: { createdAt: 'asc' },
        take: limit,
      })
      return successResponse(messages)
    }

    const messages = await prisma.message.findMany({
      where: { conversationId: id },
      orderBy: { createdAt: 'asc' },
      take: -limit,
    })

    return successResponse(messages)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) throw new UnauthorizedError()
    const workspaceId = session.user.workspaceId
    if (!workspaceId) throw new UnauthorizedError('No workspace')

    const { id } = await params
    const body = await request.json()
    const validated = conversationMessageSchema.parse(body)

    const conversation = await prisma.conversation.findFirst({
      where: { id, workspaceId },
      include: { whatsappAccount: true },
    })
    if (!conversation) throw new NotFoundError('Conversation')
    if (!conversation.whatsappAccount) {
      throw new Error('No WhatsApp account connected to this workspace')
    }

    let content: unknown
    if (validated.type === 'TEXT') {
      content = { text: validated.text }
    } else if (validated.type === 'TEMPLATE') {
      content = validated.template
    } else {
      content = validated.media
    }

    const preview = getMessagePreview(content, validated.type)

    const message = await prisma.message.create({
      data: {
        conversationId: id,
        type: validated.type,
        direction: 'OUTBOUND',
        status: 'QUEUED',
        content: content as Prisma.InputJsonValue,
        agentId: session.user.id,
      },
    })

    await prisma.conversation.update({
      where: { id },
      data: {
        lastMessageAt: new Date(),
        lastMessagePreview: preview,
      },
    })

    enqueueMessageSend(message.id, id)

    return successResponse(message, 201)
  } catch (error) {
    return handleApiError(error)
  }
}
