import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { createWhatsAppProvider } from '@/lib/whatsapp'
import { generateAIResponse } from '@/lib/mysmartcard/ai-engine'
import { calculateLeadScore, getLeadStatusFromScore } from '@/lib/mysmartcard/lead-scoring'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { phoneNumberId, from, messageText, messageId, messageType } = body

    if (!phoneNumberId || !from || !messageText) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const mySmartCardWorkspace = await prisma.mySmartCardWorkspace.findFirst({
      where: { phoneNumberId, isActive: true },
    })

    if (!mySmartCardWorkspace) {
      return NextResponse.json({ success: true, skipped: true })
    }

    const aiConfig = await prisma.mySmartCardAIConfig.findUnique({
      where: { workspaceId: mySmartCardWorkspace.workspaceId },
    })

    if (!aiConfig || !aiConfig.isActive) {
      return NextResponse.json({ success: true, skipped: true, reason: 'AI inactive' })
    }

    const account = await prisma.whatsAppAccount.findFirst({
      where: { phoneNumberId, workspaceId: mySmartCardWorkspace.workspaceId },
    })

    if (!account) {
      return NextResponse.json({ success: true, skipped: true, reason: 'No WhatsApp account' })
    }

    let contact = await prisma.contact.findFirst({
      where: { workspaceId: mySmartCardWorkspace.workspaceId, phone: from },
    })

    if (!contact) {
      contact = await prisma.contact.create({
        data: {
          workspaceId: mySmartCardWorkspace.workspaceId,
          phone: from,
          optIn: true,
          source: 'mysmartcard_whatsapp',
        },
      })
    }

    let conversation = await prisma.conversation.findFirst({
      where: {
        workspaceId: mySmartCardWorkspace.workspaceId,
        contactId: contact.id,
        whatsappAccountId: account.id,
      },
    })

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          workspaceId: mySmartCardWorkspace.workspaceId,
          contactId: contact.id,
          whatsappAccountId: account.id,
        },
      })
    }

    let mySmartCardConv = await prisma.mySmartCardConversation.findUnique({
      where: { conversationId: conversation.id },
    })

    if (!mySmartCardConv) {
      mySmartCardConv = await prisma.mySmartCardConversation.create({
        data: {
          workspaceId: mySmartCardWorkspace.workspaceId,
          conversationId: conversation.id,
          mode: 'AI',
        },
      })
    }

    if (mySmartCardConv.mode === 'HUMAN') {
      return NextResponse.json({ success: true, handoff: true })
    }

    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        externalId: messageId || `mc_${Date.now()}`,
        type: messageType === 'text' ? 'TEXT' : 'TEXT',
        direction: 'INBOUND',
        status: 'DELIVERED',
        content: messageText,
        contactPhone: from,
      },
    })

    await prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        lastMessageAt: new Date(),
        lastMessagePreview: messageText.slice(0, 100),
        unreadCount: { increment: 1 },
      },
    })

    const conversationHistory = await prisma.message.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }).then((msgs) =>
      msgs.reverse().map((m) => ({
        role: (m.direction === 'INBOUND' ? 'user' : 'assistant') as 'user' | 'assistant',
        content: typeof m.content === 'string' ? m.content : '',
      }))
    )

    const aiResult = await generateAIResponse(
      mySmartCardWorkspace.workspaceId,
      messageText,
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
      where: { workspaceId: mySmartCardWorkspace.workspaceId, phone: from },
    })

    if (!lead) {
      lead = await prisma.mySmartCardLead.create({
        data: {
          workspaceId: mySmartCardWorkspace.workspaceId,
          contactId: contact.id,
          phone: from,
          name: contact.name,
          source: 'whatsapp',
          intent: aiResult.intent,
          status: 'NEW',
        },
      })
    }

    const messageHistory = conversationHistory.map((m) => m.content).concat([messageText])
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

      return NextResponse.json({
        success: true,
        handoff: true,
        response: aiResult.response,
      })
    }

    const provider = createWhatsAppProvider()

    try {
      await provider.sendMessage({
        phoneNumberId: account.phoneNumberId,
        to: from,
        text: aiResult.response,
      })

      await prisma.message.create({
        data: {
          conversationId: conversation.id,
          type: 'TEXT',
          direction: 'OUTBOUND',
          status: 'SENT',
          content: aiResult.response,
          contactPhone: from,
        },
      })

      await prisma.conversation.update({
        where: { id: conversation.id },
        data: { lastMessageAt: new Date() },
      })
    } catch (sendError) {
      console.error('[MySmartCard] Failed to send AI response:', sendError)
    }

    if (aiResult.mediaToSend && aiResult.mediaToSend.length > 0) {
      for (const media of aiResult.mediaToSend) {
        try {
          await provider.sendMedia({
            phoneNumberId: account.phoneNumberId,
            to: from,
            mediaType: media.type as 'image' | 'video' | 'document',
            mediaUrl: media.url,
            caption: media.caption,
          })
        } catch (mediaError) {
          console.error('[MySmartCard] Failed to send media:', mediaError)
        }
      }
    }

    return NextResponse.json({
      success: true,
      response: aiResult.response,
      intent: aiResult.intent,
      confidence: aiResult.confidence,
    })
  } catch (error) {
    console.error('[MySmartCard Webhook] Error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
