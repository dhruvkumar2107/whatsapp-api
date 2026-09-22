import prisma from '@/lib/prisma'
import { generateAIResponse } from '@/lib/mysmartcard/ai-engine'
import { calculateLeadScore, getLeadStatusFromScore } from '@/lib/mysmartcard/lead-scoring'
import { createWhatsAppProvider } from '@/lib/whatsapp'
import type { Contact, Conversation } from '@prisma/client'

interface MessageContext {
  workspaceId: string
  phoneNumberId: string
  contact: Contact
  conversation: Conversation
  messageText: string
  messageType: string
  messageId: string
  from: string
}

export async function handleMySmartCardMessage(ctx: MessageContext): Promise<boolean> {
  const mySmartCardWorkspace = await prisma.mySmartCardWorkspace.findFirst({
    where: { workspaceId: ctx.workspaceId, isActive: true },
  })

  if (!mySmartCardWorkspace) return false

  const aiConfig = await prisma.mySmartCardAIConfig.findUnique({
    where: { workspaceId: mySmartCardWorkspace.id },
  })

  if (!aiConfig || !aiConfig.isActive) return false

  if (!ctx.messageText && ctx.messageType === 'text') return false

  let mySmartCardConv = await prisma.mySmartCardConversation.findUnique({
    where: { conversationId: ctx.conversation.id },
  })

  if (!mySmartCardConv) {
    mySmartCardConv = await prisma.mySmartCardConversation.create({
      data: {
        workspaceId: mySmartCardWorkspace.id,
        conversationId: ctx.conversation.id,
        mode: 'AI',
      },
    })
  }

  if (mySmartCardConv.mode === 'HUMAN') {
    return false
  }

  const conversationHistory = await prisma.message.findMany({
    where: { conversationId: ctx.conversation.id },
    orderBy: { createdAt: 'desc' },
    take: 10,
  }).then((msgs) =>
    msgs.reverse().map((m) => ({
      role: (m.direction === 'INBOUND' ? 'user' : 'assistant') as 'user' | 'assistant',
      content: typeof m.content === 'string' ? m.content : '',
    }))
  )

  const aiResult = await generateAIResponse(
    mySmartCardWorkspace.id,
    ctx.messageText,
    conversationHistory
  )

  await prisma.mySmartCardConversationEvent.create({
    data: {
      conversationId: mySmartCardConv.id,
      type: 'ai_response',
      data: {
        intent: aiResult.intent,
        confidence: aiResult.confidence,
        shouldHandoff: aiResult.shouldHandoff,
      },
    },
  })

  await prisma.mySmartCardConversation.update({
    where: { id: mySmartCardConv.id },
    data: {
      detectedIntent: aiResult.intent,
      confidence: aiResult.confidence,
    },
  })

  let lead = await prisma.mySmartCardLead.findFirst({
    where: { workspaceId: mySmartCardWorkspace.id, phone: ctx.from },
  })

  if (!lead) {
    lead = await prisma.mySmartCardLead.create({
      data: {
        workspaceId: mySmartCardWorkspace.id,
        contactId: ctx.contact.id,
        phone: ctx.from,
        name: ctx.contact.name,
        source: 'whatsapp',
        intent: aiResult.intent,
        status: 'NEW',
      },
    })
  }

  const messageHistory = conversationHistory.map((m) => m.content).concat([ctx.messageText])
  const { score, reasons } = calculateLeadScore(aiResult.intent, messageHistory, !!lead.email)

  await prisma.mySmartCardLead.update({
    where: { id: lead.id },
    data: {
      leadScore: score,
      scoreReasons: reasons,
      intent: aiResult.intent,
      status: getLeadStatusFromScore(score) as never,
    },
  })

  if (!mySmartCardConv.leadId) {
    await prisma.mySmartCardConversation.update({
      where: { id: mySmartCardConv.id },
      data: { leadId: lead.id },
    })
  }

  if (aiResult.shouldHandoff) {
    await prisma.mySmartCardConversation.update({
      where: { id: mySmartCardConv.id },
      data: {
        mode: 'HUMAN',
        humanHandoffAt: new Date(),
        handoffReason: `AI intent: ${aiResult.intent}`,
      },
    })

    await prisma.mySmartCardConversationEvent.create({
      data: {
        conversationId: mySmartCardConv.id,
        type: 'handoff',
        data: { reason: aiResult.intent, confidence: aiResult.confidence },
      },
    })

    return false
  }

  const provider = createWhatsAppProvider()

  try {
    await provider.sendMessage({
      phoneNumberId: ctx.phoneNumberId,
      to: ctx.from,
      text: aiResult.response,
    })

    await prisma.message.create({
      data: {
        conversationId: ctx.conversation.id,
        type: 'TEXT',
        direction: 'OUTBOUND',
        status: 'SENT',
        content: aiResult.response,
        contactPhone: ctx.from,
      },
    })

    await prisma.conversation.update({
      where: { id: ctx.conversation.id },
      data: { lastMessageAt: new Date() },
    })
  } catch (sendError) {
    console.error('[MySmartCard] Failed to send AI response:', sendError)
  }

  if (aiResult.mediaToSend && aiResult.mediaToSend.length > 0) {
    for (const media of aiResult.mediaToSend) {
      try {
        await provider.sendMedia({
          phoneNumberId: ctx.phoneNumberId,
          to: ctx.from,
          mediaType: media.type as 'image' | 'video' | 'document',
          mediaUrl: media.url,
          caption: media.caption,
        })
      } catch (mediaError) {
        console.error('[MySmartCard] Failed to send media:', mediaError)
      }
    }
  }

  return true
}
